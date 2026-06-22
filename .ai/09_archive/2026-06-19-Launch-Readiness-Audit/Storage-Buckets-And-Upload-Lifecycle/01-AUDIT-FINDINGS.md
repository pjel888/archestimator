# Storage Buckets & Upload Lifecycle — Audit Findings

**Domain:** Storage Buckets & Upload Lifecycle (Phase-2 gap pack)
**Date:** 2026-06-19 · **Auditor pass:** read-only (rg + Read + Supabase MCP read-only)
**Live project verified:** `ebxxqidacheyapmmzavr`

## Scope & coverage

Three Storage buckets exist (confirmed live):

| bucket | public | size cap | mime allowlist | live objects | live bytes |
|---|---|---|---|---|---|
| `component-images` | **true** | 12 MiB | `image/webp` | 840 | 28 MB |
| `component-attachments` | false | 20 MiB | pdf/xls/xlsx | 1 | 1.77 MB |
| `project-images` | false | 12 MiB | `image/webp` | 6 | 561 kB |

Twelve `storage.objects` RLS policies confirmed live (SELECT/INSERT/UPDATE/DELETE per
bucket). Files read in full: the 6 storage migrations
(`component_image_storage`, `component_brand_library`, `component_variant_assets_cost_entries`
[component-attachments bucket+policies], `private_project_image_storage`,
`qualify_project_image_storage_policies`, `harden_project_image_cleanup_targets`),
`src/lib/mass-deletion/storage-cleanup.ts`, the 3 upload routes, `next.config.ts`,
plus the client upload/replace UX (`ProjectDetailsModal.tsx`, `project-image-client.ts`,
`AddComponentModal.tsx`).

**Headline:** The bucket **RLS is sound** — workspace/owner prefix isolation is
correctly enforced on all three buckets (closes the prior audit's deferred
F-UPLOAD-06). The real launch gaps are **lifecycle**: there is **no orphan GC** and
**no per-workspace storage quota**, and the orphan leak is already materialized
(~686 of 840 component-image objects appear unreferenced in the live DB).

## Reconciliation table

| Prior item | This pack | Status |
|---|---|---|
| `2026-06-01-security-owasp` F-UPLOAD-06 "Verify Storage bucket RLS / object-prefix; ensure keys not user-controllable" (audit did **not** read bucket policies) | STORAGE-04 (RLS verified sound) | **closes** the deferral |
| `2026-06-01-security-owasp` F-UPLOAD-05 "service-role used for object writes" (Low) | STORAGE-07 (confirmed; compensating controls hold) | covered-by prior |
| API pack API-04 "content-length bypass backstopped by file.size" | out of scope (request validation) | covered-by API pack |
| API pack API-01 (AI quota) / Library T19 (per-workspace **creation** quota) | STORAGE-02 (storage-bytes quota is a *separate*, unbuilt axis) | none — distinct axis |
| `decisions.md` "Storage deletion is best-effort, DB-derived allowlisted paths, recorded to mass_deletion_events" | STORAGE-01 (covers *delete-project* only; not replace/abandon/non-project) | partial |
| `current-state.md` Codex project-images finding (closed): private bucket + authed route | STORAGE-04/STORAGE-06 (re-confirmed live) | covered-by prior |

---

## Findings

### STORAGE-01 — No orphan garbage-collection: replaced / abandoned / non-project-deleted upload objects leak forever
- **Severity:** medium · **launch_blocker:** false
- **Files:** `src/app/api/component-library/images/route.ts`, `src/app/api/projects/images/route.ts`, `src/app/api/component-library/attachments/route.ts`, `src/components/workshop/ProjectDetailsModal.tsx:165-178`, `src/components/workshop/project-image-client.ts:31-39`, `src/lib/mass-deletion/storage-cleanup.ts`
- **Evidence:** Objects are written to Storage *immediately* on upload (`upload(... upsert:false)`), before (and independently of) any owning row being persisted. The **only** server-side GC is mass **project** deletion (`storage-cleanup.ts` → `preview_bulk_delete_projects` emits `project-images` targets). There is **no** GC for: (a) component-image / component-attachment objects when a library row is archived/deleted, (b) an image **replaced** in a modal, or (c) an upload **abandoned** without saving. Replace/remove cleanup is *client-side, fire-and-forget*: `removeProjectImageUpload(...).catch(() => undefined)` (`project-image-client.ts:38`) and only fires on explicit replace/remove (`ProjectDetailsModal.tsx:165-167,174`) — closing the modal with the X after an upload performs **no** cleanup; a dropped network call silently leaks. Live DB confirms the leak is real: of **840** `component-images` objects, **~686 (≈82%)** are not referenced by any `cost_library_items.thumbnail_path` / `cost_library_item_price_options.image_path|thumbnail_path` (Supabase MCP read query, 2026-06-19). Even discounting `-thumb` siblings, the orphan share is large and monotonically growing.
- **Impact:** Unbounded storage cost growth and a privacy tail — orphaned `project-images` objects retain client-identifying covers with no referencing row to ever delete them. Under wider/external load this compounds (every replace/abandon leaks). At owner-only beta it is cost-only, hence not a blocker; it becomes a real cost + data-retention liability with external users.
- **Recommendation:** Add server-driven orphan reconciliation: either a trigger that deletes the old object when a row's path column changes / row is deleted (mirroring the mass-delete allowlist discipline), or a scheduled `pg_cron` reconcile that lists `storage.objects` per bucket and removes any not referenced by an allowlisted column, with a grace window (e.g. ignore objects < 24h old to avoid racing in-flight uploads). Move replace/abandon cleanup server-side so it is not dependent on a best-effort client fetch.
- **Effort:** L · **Confidence:** high · **existing_plan_overlap:** partial:2026-06-19-Launch-Readiness mass-deletion (decisions.md "best-effort, DB-derived allowlist" covers project-delete only)

### STORAGE-02 — No per-workspace storage quota: upload growth is unbounded (abuse / cost vector)
- **Severity:** medium · **launch_blocker:** false
- **Files:** `src/app/api/component-library/images/route.ts:141-159`, `src/app/api/component-library/attachments/route.ts:125-161`, `src/app/api/projects/images/route.ts:209-298`, `supabase/migrations/20260524062000_component_image_storage.sql:10`, `…/20260603222628_private_project_image_storage.sql:11`
- **Evidence:** Buckets enforce only a **per-file** `file_size_limit` (12/20 MiB) and a mime allowlist. There is **no aggregate cap** on object count or total bytes per workspace/user. The upload routes authenticate + authorize but never count existing objects/bytes before `upload`. Contrast the AI surface, which has a durable `security_rate_limit_events`-backed quota (`checkAiAskQuota`); no analogous limiter exists for Storage. The Library plan's "T19 per-workspace creation quota" governs *row* creation, not storage bytes.
- **Impact:** An authenticated external workspace can drive effectively unbounded Storage spend (12 MiB × N images, 20 MiB × N attachments) and object count, with no throttle. Owner-only beta = self-limited, so not a blocker; wider/external exposure makes this a denial-of-wallet / abuse vector.
- **Recommendation:** Add a per-workspace storage budget (max bytes and/or object count) checked in each upload route before write, returning 429/413 on exceed; reuse the durable quota pattern. Pair with STORAGE-01 so reconciliation keeps the counter honest. Optionally add a soft per-user-per-minute upload rate-limit.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** none

### STORAGE-03 — `component-images` is a public **and listable** bucket; component thumbnails are world-readable + enumerable
- **Severity:** low · **launch_blocker:** false
- **Files:** `supabase/migrations/20260524062000_component_image_storage.sql:5-26`, `…/20260603222628_private_project_image_storage.sql:19-25`, `next.config.ts` (`…/object/public/component-images/**`)
- **Evidence:** Bucket `public=true` (live-confirmed). The public SELECT policy is `bucket_id='component-images' AND coalesce((storage.foldername(name))[3],'') <> 'project-images'` (live `pg_get_expr`). Public buckets serve objects with no auth via `/storage/v1/object/public/…`, and the public path is whitelisted in `images.remotePatterns`. Object keys are `{workspaceId}/{userId}/{name}-{uuid}.webp` — non-guessable per object, but the bucket being public means any object whose URL leaks is world-readable, and (depending on anon `list` policy) keys can be enumerable. This is **intentional** per the design (`decisions.md` 2026-05-24: component media is workspace component thumbnails, deliberately public-read for fast CDN delivery), and project covers were deliberately moved OUT to the private `project-images` bucket precisely because they carry client-identifying context.
- **Impact:** Component thumbnails (material photos) are public by design — low confidentiality. The residual risk is (a) a future code path accidentally writing client-identifying imagery here, and (b) cross-workspace thumbnail enumeration revealing what materials a competitor catalogs. For a B2B estimating tool with external users this is a minor information-exposure, not a breach.
- **Recommendation:** Keep public (intentional) but: assert in a test that no client/project imagery is ever routed to `component-images`; confirm anon `list` is not granted on the bucket (only object-by-key read); document the public-by-design decision so a later reviewer doesn't "fix" it and break CDN delivery.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:current-state.md (Codex project-images closure rationale)

### STORAGE-04 — Bucket RLS prefix isolation is correctly enforced (no cross-workspace read/write) — closes deferred F-UPLOAD-06
- **Severity:** info · **launch_blocker:** false
- **Files:** `…/20260524062000_component_image_storage.sql:28-59`, `…/20260524131204_component_variant_assets_cost_entries.sql:780-819`, `…/20260603224800_qualify_project_image_storage_policies.sql:13-86`
- **Evidence:** All write/update/delete policies pin `(storage.foldername(name))[2] = auth.uid()::text` (owner) **and** `is_workspace_member(((storage.foldername(name))[1])::uuid)` (workspace), with a strict UUID regex on the workspace segment. `project-images` additionally requires segment `[3]='project-images'`, a UUID project segment `[4]`, and `can_edit_project(...)` (write) / `can_access_project(...)` + `projects.workspace_id` match (read). The `qualify_…` migration fixed a real latent bug — unqualified `name` could bind to the inner `projects.name` column inside the EXISTS — by switching to `storage.objects.name`. The TS allowlist (`storage-cleanup.ts:30-48`) re-validates bucket + workspace-prefix + `.webp`/extension + path-traversal before any service-role `remove`. Object keys embed a server-generated `randomUUID()` (`route.ts` `safeUploadName(...)-randomUUID()`), so keys are not attacker-controllable.
- **Impact:** A member of workspace A cannot read, overwrite, or delete workspace B's objects via the authenticated Storage API; the prior audit's open question (F-UPLOAD-06, "did not read the Storage bucket policies") is resolved in the affirmative.
- **Recommendation:** None functional. Carry this as the evidence that retires F-UPLOAD-06 / R-49.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-01-security-owasp (F-UPLOAD-06 deferred → now resolved)

### STORAGE-05 — `project-images` private serving is an authenticated proxy with short TTL, not a signed URL — scope is correct
- **Severity:** info · **launch_blocker:** false
- **Files:** `src/app/api/projects/images/route.ts:176-207` (GET), `next.config.ts` (`localPatterns: { pathname: "/api/projects/images" }`)
- **Evidence:** Private covers are NOT served via `createSignedUrl`; they are streamed through `GET /api/projects/images?path=…` which (1) re-parses+validates the storage path, (2) requires `getCurrentUserContext()`, (3) re-checks the project exists and `project.workspace_id === parsedPath.workspaceId` before downloading via service-role, (4) returns `Cache-Control: private, max-age=300` + `X-Content-Type-Options: nosniff`. Error path is `private, no-cache, no-store … must-revalidate` + generic 404. No public remote pattern exists for `project-images` (only `…/public/component-images/**`).
- **Impact:** No long-lived signed URL to leak; every fetch is authorization-checked server-side and cached only privately for 5 min. This is a *stronger* posture than signed URLs for confidential covers.
- **Recommendation:** Note the GET authz checks `project.workspace_id === parsedPath.workspaceId` and membership-by-session but does not additionally call `can_access_project(projectId)` — it relies on the session being a member of that workspace. For single-workspace-per-user beta this is exact; before multi-workspace/external sharing, tighten GET to `can_access_project` to match the RLS read policy's project-membership granularity (defense in depth). Low priority.
- **Effort:** S · **Confidence:** medium · **existing_plan_overlap:** covered-by:current-state.md (Codex project-images closure)

### STORAGE-06 — Public-read policy correctly fences `project-images`-shaped paths out of the public bucket
- **Severity:** info · **launch_blocker:** false
- **Files:** `…/20260603222628_private_project_image_storage.sql:19-25` (live `pg_get_expr` confirms `coalesce((storage.foldername(name))[3],'') <> 'project-images'`)
- **Evidence:** Even within the public `component-images` bucket, the public SELECT policy excludes any object whose 3rd path segment is `project-images`, a belt-and-suspenders guard against a legacy/migrated cover ever being public-readable from the component bucket.
- **Impact:** Defense-in-depth against the historical "project covers in a public listable bucket" finding recurring via stray paths. Sound.
- **Recommendation:** None.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:current-state.md

### STORAGE-07 — Service-role used for all object writes/serves; routes are the only chokepoint
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/app/api/projects/images/route.ts:126-144`, `…/component-library/images/route.ts:92-110`, `…/attachments/route.ts:105-123`
- **Evidence:** All three routes build a `SUPABASE_SERVICE_ROLE_KEY` client (falling back to the cookie client only if the env is absent) to upload/remove/download — bypassing storage RLS. Authorization is enforced *in the route* (workspace from `ensureDefaultWorkspace`, ownership via `isOwnedUploadPath` / `parseProjectImageStoragePath`, project existence/workspace match). The path-ownership filter on DELETE (`isOwnedUploadPath`) constrains removal to `{workspace}/{user}/…` so a caller cannot delete another user's object even through the service-role client.
- **Impact:** The service-role key means the storage-RLS policies (STORAGE-04) are a *second* line, not the primary, for these routes — so a route-level authz regression would not be caught by RLS. Compensating controls (server-only routes, prefix checks, path validation) currently hold. Re-stated from prior F-UPLOAD-05.
- **Recommendation:** Keep route authz under test (the prefix/ownership checks are the real gate). Ensure `SUPABASE_SERVICE_ROLE_KEY` is never exposed to a public/edge bundle. Consider, post-beta, performing user-token writes (RLS-enforced) where feasible to make RLS the primary gate.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-01-security-owasp (F-UPLOAD-05)

### STORAGE-08 — Component-image & attachment cleanup on row delete/archive is not wired (orphan sub-case)
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/lib/mass-deletion/storage-cleanup.ts:37-48` (component allowlist exists), `supabase/migrations/…component_variant_assets_cost_entries.sql:151-171` (attachments table; `on delete cascade` on the **row** only)
- **Evidence:** `storage-cleanup.ts` *has* `isAllowedComponentImageCleanupTarget` / `isAllowedComponentAttachmentCleanupTarget`, but the component-library destructive UX is **archive-only** (`decisions.md`: "Component library first-release destructive UX is archive-only … Hard delete remains out of the UI"). So component objects are never cleaned because rows are never hard-deleted; archived rows keep their objects, and the cascade on `cost_library_item_variant_attachments` deletes the **DB row** but never the **storage object**. This is the component-side manifestation of STORAGE-01.
- **Impact:** Component images/attachments accumulate with no reclamation path even when their owning component is archived or a variant attachment row is cascade-deleted. Reinforces the ≈82% orphan rate measured in STORAGE-01.
- **Recommendation:** Fold into STORAGE-01's reconciliation; when component hard-delete is introduced, route it through `cleanupStorageTargets({kind:"component", workspaceId})` which is already built. Until then, the scheduled reconcile is the only reclaim path.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** partial:decisions.md (component archive-only)

## Launch-gate summary

**No hard launch blocker for wider/external exposure from this surface.** Bucket RLS,
private-bucket privacy, public-bucket intent, object-key non-guessability, and private
serving are all sound (STORAGE-04/05/06). The two materially-growing risks —
**STORAGE-01 (orphan GC)** and **STORAGE-02 (per-workspace quota)** — are cost/abuse
liabilities that are self-limited at owner-only beta but should be scheduled before, or
monitored immediately after, opening to external users. The ≈82% live orphan rate shows
STORAGE-01 is not theoretical.
