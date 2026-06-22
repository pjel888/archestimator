# Storage Buckets & Upload Lifecycle — Evidence & Verification

**Date:** 2026-06-19 · **Pass:** adversarial verification (try-to-refute) of
`01-AUDIT-FINDINGS.md` · **Live project:** `ebxxqidacheyapmmzavr`
**Method:** Read of every cited source file + live Supabase MCP read-only SQL
(buckets, object counts, RLS policies via `pg_policies`, reference-join orphan
analysis, table grants, `get_advisors(security)`). READ-ONLY on source + DB.

## Verdict summary

| ID | Title | Prior sev / blocker | Verdict | Final sev / blocker |
|---|---|---|---|---|
| STORAGE-01 | No orphan GC (replace/abandon/non-project-delete leak) | medium / false | **adjusted** (mechanism confirmed; live-leak framing corrected) | medium / false |
| STORAGE-02 | No per-workspace storage quota | medium / false | **confirmed** | medium / false |
| STORAGE-03 | `component-images` public + enumerable | low / false | **confirmed** | low / false |
| STORAGE-04 | Bucket RLS prefix isolation sound (closes F-UPLOAD-06) | info / false | **confirmed** | info / false |
| STORAGE-05 | Private serving = authed proxy, short TTL, not signed URL | info / false | **confirmed** | info / false |
| STORAGE-06 | Public-read policy fences `project-images` paths | info / false | **confirmed** | info / false |
| STORAGE-07 | Service-role used for all object writes; routes are chokepoint | low / false | **confirmed** | low / false |
| STORAGE-08 | Component image/attachment cleanup not wired on delete/archive | low / false | **confirmed** | low / false |

**Refuted:** none. **Launch-blockers after verification: 0.** No severity inflation
was found; one finding (STORAGE-01) had **evidence overstatement** corrected
(see below) without changing its severity or non-blocker status.

---

## Live DB facts (re-proven 2026-06-19)

**Buckets** (`storage.buckets`):

| id | public | file_size_limit | mime allowlist |
|---|---|---|---|
| component-attachments | **false** | 20 MiB (20971520) | pdf, vnd.ms-excel, xlsx |
| component-images | **true** | 12 MiB (12582912) | image/webp |
| project-images | **false** | 12 MiB (12582912) | image/webp |

Matches `01-AUDIT-FINDINGS.md` scope table exactly.

**Object inventory** (`storage.objects`): component-attachments 1 obj / 1766 kB;
component-images 840 obj / 28 MB; project-images 6 obj / 561 kB. Matches.

**RLS policies** (`pg_policies`, storage.objects): 12 policies confirmed live
(SELECT/INSERT/UPDATE/DELETE per bucket). All write/update/delete policies pin
`(storage.foldername(name))[2] = auth.uid()::text` + `is_workspace_member([1]::uuid)`
with a strict UUID regex on `[1]`. `project-images` write requires
`[3]='project-images'`, UUID `[4]`, and `can_edit_project([4])`. `project-images`
read requires the `projects` row's `workspace_id` match **and**
`can_access_project(p.id)`. Public SELECT on `component-images` is
`bucket_id='component-images' AND coalesce((storage.foldername(name))[3],'') <> 'project-images'`
granted to role `public`. All as described.

**Security advisors** (`get_advisors security`): 74 findings, **all WARN**, **0
ERROR**, **0 storage/bucket/objects-related**. No RLS-disabled or missing-policy
finding on storage. Confirms STORAGE-04 posture.

**Table grants** (`information_schema.role_table_grants`, storage.objects):
`anon` and `authenticated` each hold SELECT/INSERT/UPDATE/DELETE/etc. — the
Supabase default. Actual access is gated by RLS policies (correct model). The
`anon` SELECT grant + `public`-role SELECT policy is what makes STORAGE-03's
"enumerable via `list()`" claim true.

---

## Per-finding adjudication & honest proof gate

### STORAGE-01 — adjusted (mechanism CONFIRMED; live-leak framing CORRECTED)

**Confirmed (code):** Objects upload immediately (`upsert:false`) independent of an
owning row (`route.ts` all three). Server GC exists only for mass-project-delete
(`storage-cleanup.ts` + `preview_bulk_delete_projects`). Replace/abandon cleanup is
client fire-and-forget: `project-image-client.ts:38`
`removeProjectImageUpload(...).catch(()=>undefined)`, fired only on explicit replace
(`ProjectDetailsModal.tsx:165-167`) or remove (`:174`). **Verified:** closing the
modal with the X after an upload runs neither path → leak. Component objects are
never reclaimed (archive-only UX, `decisions.md:915`; STORAGE-08). The leak
mechanism is **real and code-verified.**

**Correction (DB evidence overstated):** The audit's "≈686 of 840 (≈82%) component
images are orphaned, the leak is already materialized" conflates **seed/catalog
data** with **user replace/abandon orphans**. Live prefix breakdown of the 840
objects:

| prefix | count | nature |
|---|---|---|
| `internet-component-thumbnails/` | 530 | seeded/scraped catalog assets |
| `seeded-component-thumbnails/` | 308 | seeded catalog assets |
| `{workspace-uuid}/…` | **2** | actual user uploads |

There are only **154** `cost_library_items`, each with exactly one
`thumbnail_path` (stored as a **full public URL**, not a bare object name — the
audit's exact-`name` join returned 0 and undercounted; corrected join: **154
objects referenced, 686 unreferenced**). So the raw 686/82% number reproduces, but
its composition is **seed/catalog assets and full-size siblings of referenced
`-thumb` thumbnails — not 686 user-created orphans.** The true user-upload-driven
orphan surface today is ~0 (2 user objects total). The risk is **forward-looking**:
once external users upload/replace/abandon at volume, the verified mechanism makes
it grow. Severity **medium / non-blocker stands** (forward cost + privacy tail), but
the remediation reconciler MUST be **user-prefix-scoped and seed-aware** (see
02-REMEDIATION-PLAN R1) or it would mass-delete the seeded catalog.

**Proof gate:** Code paths and the absence of server GC are **fully provable**
locally (done). The leak-on-abandon is provable by reading the modal handlers
(done). What a read-only pass **cannot** prove: the exact `project-images`
reference column(s) for the reconciler's allowlist (needs an implementation-time
`rg`), and runtime behavior under concurrent in-flight uploads (needs the dry-run
cycle in R1). `existing_plan_overlap`: **partial** — `decisions.md:917`
best-effort/DB-derived-allowlist covers project-delete only; replace/abandon/
component-archive uncovered. Confirmed accurate.

### STORAGE-02 — confirmed

Routes (`component-library/images:141-159`, `attachments:125-161`,
`projects/images:209-298`) authenticate + authorize + per-file cap + mime check,
but **never** count existing workspace bytes/objects before `upload`. No
`storage`-bytes analogue to `checkAiAskQuota`. **Proof gate:** fully provable by
code read (done). Whether unbounded spend is *exploited* is not provable read-only,
but the *absence of any bound* is certain. `existing_plan_overlap`: **none** —
confirmed (Library T19 governs row creation, a distinct axis).

### STORAGE-03 — confirmed

`public=true` (live), public SELECT policy `[3] <> 'project-images'` granted to
`public` role (live `pg_policies`), `anon` holds table SELECT grant (live),
`next.config.ts` whitelists `…/object/public/component-images/**`. Net: anon
read + enumerate of component thumbnail names is real and **intentional**
(CDN delivery). Project covers fenced out (STORAGE-06). **Proof gate:** the public
+ grant + policy facts are fully provable (done). "Intentional per design" rests on
`decisions.md` rationale (verified present). `existing_plan_overlap`:
**covered-by:current-state.md** (Codex project-images closure) — accurate.

### STORAGE-04 — confirmed (retires F-UPLOAD-06 / R-49)

Live `pg_policies` exactly match: owner-pin `[2]=auth.uid()`, workspace
`is_workspace_member([1])`, UUID regex on `[1]`, `project-images` extra
`[3]='project-images'` + UUID `[4]` + `can_edit_project`/`can_access_project`. TS
allowlist re-validates bucket+prefix+ext+traversal (`storage-cleanup.ts:30-48`).
Object keys embed server `randomUUID()` (routes) → not attacker-controllable.
**Proof gate:** RLS expressions are fully provable from `pg_policies` (done). What a
static read **cannot** prove: that `is_workspace_member` / `can_edit_project` /
`can_access_project` are themselves correct — but those are pre-existing,
separately-audited authz primitives, out of this surface's scope.
`existing_plan_overlap`: **covered-by:2026-06-01-security-owasp** (F-UPLOAD-06
deferral) — accurate; this resolves it affirmatively.

### STORAGE-05 — confirmed

Private covers served via `GET /api/projects/images?path=` (route.ts:176-207):
path re-parse/validate, `getCurrentUserContext()`, project-exists +
`workspace_id === parsedPath.workspaceId`, service-role download,
`Cache-Control: private, max-age=300` + `nosniff`; error path no-store. No public
remote pattern for `project-images`. The audit's defense-in-depth note — GET does
**not** call `can_access_project` whereas the RLS read policy **does** (confirmed
live) — is accurate and actionable (R5). **Proof gate:** route + config fully
provable (done). The single-workspace-exactness claim holds only while one
workspace per user; flagged for multi-workspace. `existing_plan_overlap`:
**covered-by:current-state.md** — accurate.

### STORAGE-06 — confirmed

Public SELECT policy `coalesce([3],'') <> 'project-images'` confirmed live verbatim.
Belt-and-suspenders fence sound. **Proof gate:** fully provable (done).

### STORAGE-07 — confirmed

All three routes build a `SUPABASE_SERVICE_ROLE_KEY` client (cookie-client fallback
only if env absent) for upload/remove/download → RLS bypassed; authz enforced in
route (workspace from `ensureDefaultWorkspace`, ownership via
`isOwnedUploadPath`/`parseProjectImageStoragePath`/`isOwnedAttachmentPath`, project
existence/workspace match). DELETE ownership filter constrains removal to
`{workspace}/{user}/…`. **Proof gate:** code fully provable (done). The risk
statement ("RLS is second line, route regression not caught by RLS") is logically
sound. Not provable read-only: that the service key is never bundled to a public
edge — recommend the grep/build guard in R6. `existing_plan_overlap`:
**covered-by:2026-06-01-security-owasp (F-UPLOAD-05)** — accurate.

### STORAGE-08 — confirmed

`storage-cleanup.ts:37-48` has component allowlist predicates, but destructive UX
is archive-only (`decisions.md:915`) so component objects are never hard-deleted /
reclaimed; the `cost_library_item_variant_attachments` cascade deletes the **row**,
not the **object**. This is the component manifestation of STORAGE-01. **Proof
gate:** code + decisions fully provable (done). Whether the cascade leaves a live
attachment object is provable from the 1 live attachment vs its row — not
independently re-checked here, but the mechanism (cascade deletes row only) is
certain from the migration. `existing_plan_overlap`: **partial:decisions.md**
(archive-only) — accurate.

---

## What this verification can and cannot prove (honest gate)

**Proven (static + DB-read):** bucket flags/caps/mime; object counts; all 12 RLS
policy expressions; public-vs-private posture; object-key non-guessability;
route-level authz/path-validation; absence of server-side GC for
replace/abandon/component-archive; absence of any aggregate quota; the corrected
orphan composition (seed-dominated, ~0 true user orphans today); 0 storage security
advisors.

**Not provable without runtime / write tests (deferred to remediation):**
correctness of `is_workspace_member`/`can_edit_project`/`can_access_project`
internals (out of scope); live cross-workspace read/write *attempt* results (would
require a second authed session — RLS expressions are sufficient evidence here);
concurrent-upload race behavior of any future reconciler (R1 dry-run);
that `SUPABASE_SERVICE_ROLE_KEY` is never edge-bundled (R6 build guard); real-world
abuse of the missing quota (R3).
