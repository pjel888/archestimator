# Storage Buckets & Upload Lifecycle — Remediation Plan

**Domain:** Storage Buckets & Upload Lifecycle (Phase-2 gap pack)
**Date:** 2026-06-19 · **Author:** adversarial verifier + remediation planner
**Live project:** `ebxxqidacheyapmmzavr` (verified read-only)
**Gate verdict:** **No hard launch blocker** for wider/external exposure from this
surface. RLS isolation, private serving, public-by-design intent, and object-key
non-guessability are all live-verified sound. The two materially-growing risks
(orphan GC, per-workspace quota) are cost/abuse liabilities — schedule before, or
monitor immediately after, opening to external users.

This plan is **prioritized launch-blockers-first** (there are none here), then by
risk-under-external-load. Each item lists concrete steps, exact files,
migration/RLS/authorization notes, risk, effort, and cross-domain deps.

> **Blast-radius note.** Any item below that adds storage DDL/RLS, a trigger, or a
> `pg_cron` job is HIGH-BLAST-RADIUS and MUST run the full dated plan-pack loop +
> `get_advisors(security)` = 0-new gate + Codex review before merge (per
> `AGENT_OPERATING_PROTOCOL.md`). The route-only changes (R2 client→server cleanup,
> R5 GET authz tighten) are ordinary reversible work.

---

## Priority 0 — Launch blockers

**None.** No item on this surface must be fixed before exposing the app to wider
users. The owner may proceed to external exposure with the Priority-1 items either
scheduled-soon or actively monitored, plus the cheap guard tests in R6.

---

## Priority 1 — Schedule before external exposure (cost / abuse bounds)

### R1 — Orphan reconciliation for upload buckets (STORAGE-01, STORAGE-08)

**Why:** Objects are written to Storage immediately on upload, before/independently
of any owning row. The only server GC is mass-project-delete. Replace/abandon
cleanup is client-side fire-and-forget and does **not** fire when the modal is
closed with the X after an upload (verified: `ProjectDetailsModal.tsx:165-167,174`
only clean on explicit replace/remove). Component objects are never reclaimed
because the destructive UX is archive-only. Under external load this leaks
monotonically and (for `project-images`) retains client-identifying covers with no
referencing row.

**Scope correction (from verification):** The live 686 "unreferenced"
`component-images` objects are **dominated by seed/catalog assets**, not user
replace/abandon orphans (530 `internet-component-thumbnails/`, 308
`seeded-component-thumbnails/`, only **2** under a workspace-UUID prefix = actual
user uploads). The reconciler MUST therefore be **prefix-scoped to user-upload
paths** (workspace-UUID first segment) and MUST NOT treat seeded catalog prefixes
as orphans. It must also recognize that a referenced `…-thumb.webp` implies its
full-size `…​.webp` sibling is intentional (and vice-versa) — do not delete a
sibling of a referenced object.

**Approach (recommended): scheduled `pg_cron` reconcile, not a row trigger.**
A trigger that deletes the old object on path-column change is tempting but couples
storage IO to the transaction and races in-flight uploads. Prefer a periodic
reconcile with a grace window.

**Steps:**
1. New migration `…_storage_orphan_reconcile.sql`:
   - A `SECURITY DEFINER` function `reconcile_orphan_storage_objects()` that, per
     bucket, is explicitly locked down after creation:
     `revoke all on function public.reconcile_orphan_storage_objects() from public, anon, authenticated;`
     grant execute only to the scheduled owner/service-role path. Do not rely on
     default function privileges.
   - The function, per
     upload bucket, selects `storage.objects` whose first path segment is a UUID
     (user-upload prefix) **and** `created_at < now() - interval '24 hours'`
     (grace window to avoid racing in-flight uploads) **and** whose `name` is not
     referenced by an allowlisted column. Reference extraction must mirror how
     paths are stored: `cost_library_items.thumbnail_path` and the
     `cost_library_item_price_options.image_path|thumbnail_path` columns store
     **full public URLs** (verified live), so strip the
     `^.*/public/component-images/` prefix before comparing; `project-images`
     references live in project rows / metadata and are stored as the bare object
     path — confirm the exact column(s) at implementation time
     (`rg "thumbnailPath|projectImagePath|image_path"` across repositories).
     For each candidate, also exclude the `-thumb`/full-size sibling of any
     referenced object.
   - Deletes via the storage admin path **only** after re-validating through the
     existing TS allowlist discipline (`isAllowedComponentImageCleanupTarget` /
     `isAllowedComponentAttachmentCleanupTarget` /
     `isAllowedProjectImageCleanupTarget` in
     `src/lib/mass-deletion/storage-cleanup.ts`). If the delete is done in SQL,
     re-encode the same prefix/extension/path-traversal guards in the function.
   - Record reclaimed paths to `mass_deletion_events` (or a new
     `storage_reconcile_events`) for auditability, mirroring the existing
     best-effort-cleanup audit pattern (`decisions.md` line 917).
2. Schedule via `pg_cron` (e.g. daily). Confirm `pg_cron` is enabled
   (`list_extensions`); the roadmap notes rate-limiting is Postgres-not-Redis, so
   pg_cron infra is already the chosen scheduling lane.
3. When component hard-delete is eventually introduced, route it through the
   already-built `cleanupStorageTargets({kind:"component", workspaceId})` — do not
   re-implement (STORAGE-08).

**Files:** new migration under `supabase/migrations/`; reuse
`src/lib/mass-deletion/storage-cleanup.ts` (allowlist), or port its guards into SQL.

**Authorization / RLS notes:** the reconcile runs as service-role/`SECURITY
DEFINER` (storage RLS does not gate it), so the **allowlist + grace-window + UUID
user-prefix scoping is the entire safety boundary** — it must be conservative.
A bug here deletes live user covers. Start in **dry-run / report-only** mode
(log candidates, delete nothing) for one cycle; verify candidate set is sane
(should be ~0 user-prefix orphans today) before arming deletion.

**Risk:** HIGH-BLAST-RADIUS (storage DDL + service-role deletes). Over-aggressive
matching deletes referenced covers. Mitigations: dry-run first, 24h grace, UUID
user-prefix scope, sibling-aware, audit log, PG-level prove.

**Effort:** L · **Cross-domain deps:** mass-deletion pack (shares allowlist +
audit-event pattern); Library pack (component hard-delete future hook).

### R2 — Move replace/abandon cleanup server-side (STORAGE-01 sub-fix, cheap)

**Why:** Independent of R1's reconciler, the replace/abandon leak can be largely
closed at the source. Today `removeProjectImageUpload(...).catch(()=>undefined)` is
best-effort client fetch and does not fire on modal-close-after-upload.

**Steps:**
1. In `ProjectDetailsModal.tsx` (and `AddComponentModal.tsx`), trigger cleanup of
   an uploaded-but-unsaved object on modal close/unmount, not only on explicit
   replace/remove. Easiest: track `uploadedButUnsaved` draft paths and on close
   (when not persisted) call the DELETE route.
2. Better/longer-term: have the upload routes return enough to let the server
   reconcile on the next save (R1 handles the residue regardless).

**Files:** `src/components/workshop/ProjectDetailsModal.tsx`,
`src/components/workshop/AddComponentModal.tsx`,
`src/components/workshop/project-image-client.ts` (DELETE helper already exists).

**Risk:** Low (route-only/client-only, reversible). Does not replace R1 — a dropped
network call still leaks; R1's reconciler is the durable backstop.

**Effort:** S–M · **Cross-domain deps:** none.

### R3 — Per-workspace storage quota (STORAGE-02)

**Why:** Buckets enforce only per-file caps (12/20 MiB) + mime allowlist. No
aggregate byte/object cap per workspace. Routes authenticate + authorize but never
count existing usage before `upload`. An authenticated external workspace can drive
unbounded Storage spend (denial-of-wallet).

**Steps:**
1. New migration / RPC: a per-workspace storage budget check (max total bytes
   and/or object count), backed durably like the AI quota
   (`security_rate_limit_events` → `checkAiAskQuota`). Two viable sources of truth:
   - **(a)** Sum `storage.objects.metadata->>'size'` for the workspace prefix at
     check time (accurate, but a count/scan per upload). Acceptable at current
     scale (847 objects total live).
   - **(b)** A maintained `workspace_storage_usage` counter incremented on upload /
     decremented on delete+reconcile (faster, but must be kept honest by R1's
     reconcile — pair them).
2. Call the check in each upload route **before** `upload`, returning **413** (over
   budget) or **429** (rate). Add an optional soft per-user-per-minute upload rate
   limit reusing the existing limiter.

**Files:** `src/app/api/component-library/images/route.ts:141-159`,
`src/app/api/component-library/attachments/route.ts:125-161`,
`src/app/api/projects/images/route.ts:209-298`; new migration/RPC;
possibly `src/lib/**` quota helper alongside the AI quota.

**Authorization notes:** the count must be scoped to the caller's workspace prefix
(`workspace.id/…`) and computed server-side; never trust a client-supplied total.

**Risk:** Medium. DDL if option (b). A too-tight budget blocks legit uploads — pick
a generous default (e.g. a few GB / few thousand objects per workspace) and make it
configurable.

**Effort:** M · **Cross-domain deps:** pairs with R1 (counter honesty); reuse AI
quota durable pattern.

---

## Priority 2 — Hardening / defense-in-depth (low, optional)

### R4 — Confirm `component-images` enumeration is acceptable; document public-by-design (STORAGE-03)

**Why (verified):** `component-images` is `public=true`; the SELECT policy grants
the `public` role rows where `[3] <> 'project-images'`; the table-level `anon`
grant includes SELECT (Supabase default). Net: an anon caller can `list()` and read
component thumbnail object names across workspaces. This is **intentional**
(CDN-fast public component media) and project covers are deliberately fenced out
(STORAGE-06, verified). Residual: cross-workspace thumbnail enumeration reveals
what materials a competitor catalogs; and a future code path could accidentally
write client imagery here.

**Steps:**
1. Record the public-by-design decision in `.ai/10_state/decisions.md` so a later
   reviewer does not "fix" it and break CDN delivery.
2. Add a guard test asserting no project/client imagery path shape is ever routed
   to `component-images` (the route already prefixes user uploads with the
   workspace UUID, not `project-images/`).
3. (Optional, only if competitor-enumeration is judged a real concern at external
   launch) move `component-images` to private + serve via an authenticated proxy
   like `project-images`. This trades CDN speed for confidentiality — **owner
   decision, not a launch gate.**

**Files:** `next.config.ts` (documents the single public remote pattern), a new
test under the upload-route suite, `.ai/10_state/decisions.md`.

**Risk:** Low. **Effort:** S.

### R5 — Tighten `GET /api/projects/images` to `can_access_project` (STORAGE-05)

**Why (verified):** The private-cover GET proxy checks `getCurrentUserContext()` +
`project.workspace_id === parsedPath.workspaceId`, but does **not** call
`can_access_project(projectId)` — whereas the RLS read policy **does**
(`…can_access_project(p.id)`, verified live). For single-workspace-per-user beta
the workspace match is exact; before multi-workspace/external project sharing,
align the route to the RLS granularity for defense-in-depth.

**Steps:** In `src/app/api/projects/images/route.ts` GET (lines 176-207), after the
workspace match, add a membership/access check matching the RLS policy
(`can_access_project` via RPC, or the existing project-access helper).

**Files:** `src/app/api/projects/images/route.ts:176-207`.

**Risk:** Low (route-only). **Effort:** S. **Cross-domain deps:** membership/project
sharing model (becomes relevant only when multi-workspace sharing ships).

### R6 — Lock in the verified-good posture with regression tests (STORAGE-04/05/06/07)

**Why:** RLS isolation, private serving, public-fence, and service-role chokepoint
are all sound **today** but are guarded by route-level authz (service-role bypasses
RLS, STORAGE-07). A route-authz regression would not be caught by RLS. Cheap
insurance: keep the prefix/ownership/path-validation checks under test.

**Steps:**
1. Vitest assertions on `isOwnedUploadPath` / `parseProjectImageStoragePath` /
   `isOwnedAttachmentPath` / the `storage-cleanup.ts` allowlist (cross-workspace
   prefix, path-traversal, extension, `project-images` fence).
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is never imported into a client/edge bundle
   (grep guard in CI-equivalent / build check).

**Files:** upload-route test suite; `storage-cleanup.ts` already exports the
predicates for unit testing.

**Risk:** None (tests only). **Effort:** S.

---

## Sequencing & validation

1. **R6 + R4 first** (cheap, no DDL): lock the good posture, document public intent,
   add guard tests. Ship these before external exposure regardless.
2. **R2** (server-side replace/abandon cleanup): reduces new orphan creation at the
   source; route/client only.
3. **R3** (quota) and **R1** (reconcile) are the two durable Priority-1 items; do
   R1 in **dry-run first**, arm after a clean cycle. Pair the quota counter with R1.
4. **R5** when multi-workspace/sharing is on the table.

**Validation gate (per 00-README):** `bun run validate` is known-red on `main` —
gate on `bun run build` + the focused upload-route Vitest suite + a **PG-level
prove** of any new quota/GC RPC + `get_advisors(security)` = **0 new** findings
after any storage DDL (today: 74 WARN, 0 ERROR, **0 storage-related** — verified).
For R1/R3 (HIGH-BLAST-RADIUS): full dated plan-pack loop + Codex review gate.
