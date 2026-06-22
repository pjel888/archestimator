# 14 - Security, Authz, And Data Exposure

> Binds to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone) for all
> table/column/enum/RLS/action/RPC/route names. Where this doc and the keystone
> disagree, the keystone wins. Phase labels follow the canonical phase map
> (0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5). The authz-test scaffolding here lands in
> **Phase 0A Contract Lock**; the un-scoped-key fix lands with doc 13's cache
> work in **Phase 0A/0B**.

## Threat Model

The Library (`public.cost_library_items` + `estimate_templates` +
`cost_library_item_price_history`) contains proprietary estimating intelligence:
unit costs, `pricing_source` source URLs, supplier/brand details, template
structure, and price history. **Reality check (per keystone):** cross-workspace
authorization is **already strong** — RLS plus app-layer `is_workspace_editor` /
`can_edit_estimate` guards (see RLS section). This doc therefore does NOT claim a
live authz hole; the real, in-scope gaps are (a) missing **authz/cache tests**,
(b) the one **un-scoped query key**, and (c) **snapshot-builder redaction**. The
highest-risk failures, reframed to real surfaces, are:

- cross-workspace IDOR through `cost_library_items.id` / `library_folder_id` /
  template / estimate / project IDs (mitigated by RLS + guards; the gap is test
  coverage, not enforcement)
- leakage of private source metadata into the **frozen**
  `project_publications.snapshot_json` rendered at `src/app/share/[token]`
  (NOT a live library query — see Public/Share Threat Model)
- stale cache showing prior-workspace data after a workspace switch, scoped to
  the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`
- writable server actions exposed to a `viewer` (the only read-only role)
- import/export or file handling leaking internal data (see doc 15)
- stale insert targets resolved by `resolveEstimateTemplateInsertTarget`
  mutating the wrong estimate

## Actor Capability Matrix

Actors are the real `workspace_role` enum values (`owner | admin | member |
viewer`) plus the unauthenticated / public-link / service tiers. The authz
predicate is `is_workspace_editor` = role in (`owner`, `admin`, `member`) — only
`viewer` is read-only. `is_workspace_member` = any membership (read access).
There is no separate "editor" role to grant: `member` already carries write.

| Actor (`workspace_role`) | Read Library (`is_workspace_member`) | Mutate Library (`is_workspace_editor`) | Insert Into Estimate (`can_edit_estimate`) | Public/Share Data |
| --- | --- | --- | --- | --- |
| Unauthenticated | No | No | No | Only the frozen `snapshot_json` at `src/app/share/[token]`. |
| Public/share-link viewer | No live library access. | No | No | Frozen `project_publications.snapshot_json` only (no live query). |
| `viewer` | Yes, RLS-scoped workspace data. | No (blocked by `is_workspace_editor`). | No — a viewer never satisfies `can_edit_estimate(target_estimate_id)` (editor = owner/admin/member); the guard is defense-in-depth, NOT a viewer escape hatch. | No publishing power. |
| `member` | Yes | Create/update/archive via guarded actions. | Yes where `can_edit_estimate(target_estimate_id)` passes. | No publishing power by default. |
| `admin` | Yes | Full workspace library management. | Yes | Manages publishing settings. |
| `owner` | Yes | Full workspace library management. | Yes | Manages publishing settings. |
| Service job | Scoped internal read/write (service-role, bypasses RLS). | Scoped only. | No direct user insert. | No public exposure. |

Server-side checks already enforce this matrix even when the UI hides actions:
every write action in `actions.ts` calls `supabase.rpc("is_workspace_editor",
{target_workspace_id})` (and `rpc("can_edit_estimate",{target_estimate_id})` for
inserts) as defense-in-depth over RLS. The Phase 0A test scaffold must prove a
`viewer` is denied at the action layer, not only hidden in the UI.

## Object-Level Authorization

Every mutation or protected read verifies current-workspace ownership for the
following IDs. This is **already enforced** by RLS + the action guards; the
Phase 0A work is to add the cross-workspace **tests**, not to add enforcement.

| Object | Real column / table | Guard path |
| --- | --- | --- |
| Component | `cost_library_items.id` (`workspace_id` tenancy key) | RLS + `is_workspace_editor` in `create/update/...LifecycleState` actions |
| Folder | `library_folder_id` (FK) | RLS + `is_workspace_editor`; `delete_library_folder` / `reorder_library_folders` RPCs |
| Template | `estimate_templates.id` | RLS + template hardening (`20260615145915`) + `template-editor-actions.ts` |
| Estimate (insert target) | `estimate_row_items` / `estimate_template_row_items` | `can_edit_estimate(target_estimate_id)` via `resolveEstimateTemplateInsertTarget` |
| Project | `project_id` | RLS |
| Price / source | `cost_library_item_price_history` (workspace-scoped, RLS) | RLS + `upsertCostLibraryComponentPriceOption` guard |
| Attachment / storage object | `thumbnail_path` / storage bucket | doc 15 (route-handler authz if uploads are added) |

Cross-workspace attempts return a permission-safe not-found or denied state from
`action-errors.ts`. Do not reveal object names, workspace names, or existence.

## RLS And Server-Side Enforcement

RLS is active for every table holding workspace library data and is defined
across `supabase/migrations`. Server actions in
`src/lib/component-library/actions.ts` (`"use server"`) and
`template-editor-actions.ts` derive the workspace from the authenticated session
and re-check it via RPC — they never trust a client-provided `workspace_id` as
authority. The real authz primitives:

| Migration | Covers |
| --- | --- |
| `20260613192344` | `is_workspace_editor` RPC (role in owner/admin/member) |
| `20260613201302` | `is_workspace_member` RPC (any membership) |
| `20260614144136` | core RLS policies |
| `20260615145915` | template hardening policies |

App-layer guards (defense-in-depth over RLS, already implemented): each write
action calls `supabase.rpc("is_workspace_editor",{target_workspace_id})`, and
insert-target resolution calls `rpc("can_edit_estimate",{target_estimate_id})`.
`can_edit_estimate` is also a real RPC. **Cross-workspace authz is already
strong** — the open gap is test coverage, not enforcement.

Implementation evidence (net-new in **Phase 0A Contract Lock**, run under
`bun run test:dom` per the corrected test commands in doc 06 / keystone 19):

- `viewer`-denied vs `member`/`admin`/`owner`-allowed action tests against
  `is_workspace_editor` (assert the action throws/denies for `viewer`)
- cross-workspace ID tests (workspace A actor cannot read/mutate workspace B's
  `cost_library_items` / folders / templates / price history)
- snapshot-redaction tests against the builder `buildSnapshotForProject`
  (`src/lib/publication/actions.ts:389`) AND the public-read sanitizer
  `sanitizeProjectPublicationSnapshotForPublicRead` (`src/lib/publication/snapshot.ts:301`)
  (pre-registered as `ADV-PUBLIC-REDACTION` in
  `24-EXECUTION-EVIDENCE-LEDGER.md`; see Public/Share Threat Model)
- route-handler / storage-access tests only if doc 15 adds upload/import handlers

## Public/Share Threat Model

The live public surface is the share route `src/app/share/[token]/page.tsx` and
its API at `src/app/api/share/[token]/route.ts`. It renders a **frozen
snapshot** read from `project_publications.snapshot_json` (versioned by
`snapshot_version`) — it does **NOT** run a live Library query, so there is no
live library endpoint to leak. The earlier "public/shared route exposes a live
library payload" framing was wrong.

> **Line-binding note (2026-06-21 re-verification):** earlier drafts of this
> section cited line numbers that drifted from `main`. The numbers below were
> re-verified with `rg -n` against `src/lib/publication/` and
> `src/app/api/share/` and WIN over any stale cite in a sibling doc:
> `buildSnapshotForProject` = `actions.ts:389`; the `estimate_row_items`
> `.from()` = `actions.ts:415`; `buildProjectPublicationSnapshot` =
> `snapshot.ts:470`; `sanitizeSnapshotRow` = `snapshot.ts:235`;
> `sanitizeProjectPublicationSnapshotForPublicRead` = `snapshot.ts:301`;
> `createSharedLinkTargetLabelMap` = `activity-helpers.ts:45`.

The real redaction control is therefore **what the snapshot builder serializes
into `snapshot_json`**, not a runtime filter on a live endpoint. The builder is
`buildSnapshotForProject` (`src/lib/publication/actions.ts:389`), which selects an
EXPLICIT column allowlist on `estimate_row_items` (`id, estimate_id, node_id,
description, designation, discipline, material, quantity, unit, unit_cost,
misc_cost, contingency_percentage, imageUrl`, `.from()` at `:415`) and **never
queries `cost_library_items` or `cost_library_item_price_history`**
(grep-confirmed zero hits), so raw Library source metadata cannot enter the
snapshot; it assembles the snapshot via `buildProjectPublicationSnapshot`
(`src/lib/publication/snapshot.ts:470`), and the caller persists the
`snapshot_json` at `actions.ts:577` / `:653` / `:716` (the three `p_snapshot_json`
/ `snapshot_json` write sites). (`activity-helpers.ts` only READS labels back OUT
of an already-built snapshot — `createSharedLinkTargetLabelMap`, `:45`, parses
`snapshot_json` into `estimateLabels`/`rowLabels` maps for the activity/comment
routes — it does NOT compose what is serialized; do not audit it as the
field-selection surface.) Redaction work means auditing that builder's field
selection so private Library metadata is never copied into the snapshot in the
first place.

There is also a **second, dedicated public-read redaction layer** that this doc
must not omit: `sanitizeProjectPublicationSnapshotForPublicRead`
(`src/lib/publication/snapshot.ts:301`) and `sanitizeSnapshotRow`
(`snapshot.ts:235`) rebuild each public-read row from a FIXED allowlist — `id`,
`description`, `designation`, `discipline`, `material`, `quantity`, `unit`,
`rowTotal`, `imageUrl`, `nodeId`, `tabId` (verified at `snapshot.ts:235-251`).
**Redaction nuance (re-verified):** the sanitizer does NOT drop `unitCost` /
`miscCost` / `contingencyPercentage` "at source" — those three are still READ
(`snapshot.ts:199-201`) to compute `rowTotal` (`:202-203`), but the FIXED
allowlist at `:235-251` only EMITS `rowTotal` (not the three raw inputs), so the
raw per-unit costs never appear as own-properties on the public-read row even
though they were consumed for the total. So exposure control is
defense-in-depth: (a) `buildSnapshotForProject` never pulls Library source
tables, and (b) the public-read sanitizer re-derives each row from a fixed
allowlist that emits `rowTotal` only. Redaction tests must pin BOTH the builder
field-selection and this sanitizer allowlist.

> **Sanitizer call-site status (re-verified 2026-06-21):**
> `rg -n sanitizeProjectPublicationSnapshotForPublicRead src/` returns the EXPORT
> at `src/lib/publication/snapshot.ts:301` AND ONE call site at
> `src/lib/publication/public-repository.ts:771`
> (`snapshot: sanitizeProjectPublicationSnapshotForPublicRead(data.snapshot_json as ProjectPublicationSnapshot)`
> inside the publication row resolver consumed by the share route). The share
> route handler at `src/app/api/share/[token]/route.ts:78` passes
> `publication.snapshot` through — but `publication` is the resolved access row
> from `public-repository.ts`, so the sanitizer HAS already run by the time the
> route sees it. Earlier drafts claiming "the sanitizer runs at route.ts:78" were
> wrong about the LOCATION (it runs at the repo layer, not the route), but the
> redaction IS in the live public-read path. The Phase 0A redaction work is
> therefore (i) pin the existing repo-layer sanitizer call with a test, AND
> (ii) confirm no code path bypasses the resolver to read `snapshot_json` raw.
> This is tracked as a Phase 0A verification item (`ADV-PUBLIC-REDACTION`).

Phase 0A snapshot-redaction evidence (pre-registered as `ADV-PUBLIC-REDACTION` in
`24-EXECUTION-EVIDENCE-LEDGER.md`; command
`vitest run tests/vitest/share-snapshot-redaction.test.tsx`, owner Phase 0A
Contract Lock, gate `bun run test:dom`):

- assert the snapshot built by `buildSnapshotForProject` (`actions.ts:389`) does
  NOT include `pricing_source` (raw source URL), `confidence` free text, internal
  supplier notes, or rows from `cost_library_item_price_history` (the builder
  never queries those Library tables)
- assert the public-read output of
  `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:301`) carries
  only the fixed-allowlist row fields (`id, description, designation, discipline,
  material, quantity, unit, rowTotal, imageUrl, nodeId, tabId`) — specifically,
  the public row object has NO own `unitCost` / `miscCost` /
  `contingencyPercentage` keys, while `rowTotal` IS present (the three inputs are
  consumed at `snapshot.ts:199-203` but not emitted)
- because the snapshot is frozen and versioned, a regression in either the
  builder or the sanitizer is the only path to exposure — pin the redaction with
  a test on the builder + sanitizer, not on the render route

## Data Classification

Redaction below is enforced at build time by the **snapshot builder**
`buildSnapshotForProject` (`src/lib/publication/actions.ts:389`, which never
queries `cost_library_items` / `cost_library_item_price_history`) AND at read time
by the **public-read sanitizer** `sanitizeProjectPublicationSnapshotForPublicRead`
(`src/lib/publication/snapshot.ts:301`, fixed-allowlist rows that emit `rowTotal`
without emitting `unitCost`/`miscCost`/`contingencyPercentage` as own-properties),
not by a live-endpoint filter — the "Public/Share Default" column describes the
field that survives this defense-in-depth into the public-read `snapshot_json`.
(Sanitizer wiring into the read path is itself a Phase 0A item — see the call-site
status note in Public/Share Threat Model.)

| Data | Real column / table | Protected Workspace | Estimate Snapshot (`snapshot_json`) | Public/Share Default |
| --- | --- | --- | --- | --- |
| Component name/category/unit/cost | `name` / `category` / `unit` / `unit_cost` | Visible to `is_workspace_member`. | Included as client-safe values when published. | Client-safe value only. |
| Supplier/brand | `supplier`/`supplier_id`, `brand`/`brand_id` | Visible. | Optional; simplified if included. | Usually redacted or simplified. |
| Raw source URL | `pricing_source` (free text) | Visible in protected detail/edit. | Excluded by builder. | Redacted (must not enter `snapshot_json`). |
| Internal supplier notes | supplier free-text fields | Visible by permission. | Excluded by builder. | Redacted. |
| Confidence | `confidence` (free text) | Visible in protected Library. | Excluded by builder. | Redacted by default. |
| Pricing freshness | derived from `pricing_date` (90-day window) | Visible. | Client-safe summary optional. | Client-safe summary only. |
| Price history | `cost_library_item_price_history` | Visible by permission. | Excluded by builder. | Redacted. |
| Attachments/provider evidence | `thumbnail_path` / storage | Visible by permission. | Excluded unless explicitly published. | Redacted. |
| Template structure | `estimate_templates` + `estimate_template_row_items` | Visible by permission. | Snapshot / inserted rows only. | Client-safe output only. |

## Surface State Matrix (public/share vs protected-library vs denied-access)

Which surfaces each actor sees, and what redaction applies. The "denied" column
is the permission-safe not-found/denied state from `action-errors.ts` (never
reveals object existence).

| Surface | Public/share-link viewer | Protected-library (live workspace) | Denied access |
| --- | --- | --- | --- |
| Live Library query (`/workshop/library/*`, `loadCurrentWorkspace*` actions) | NOT reachable — share route reads only frozen `snapshot_json`; no live library endpoint exists for the public actor | `is_workspace_member` (any role); RLS-scoped to `workspace_id`; reads via `is_workspace_editor` for writes | Cross-workspace ID or unauthenticated -> permission-safe not-found/denied from `action-errors.ts`; no object-name leakage |
| Frozen snapshot (`project_publications.snapshot_json`, `src/app/share/[token]`) | Allowlist-built snapshot only: NO `pricing_source`, `confidence`, supplier notes, `cost_library_item_price_history`, raw `unitCost`/`miscCost`/`contingencyPercentage` (consumed for `rowTotal` only — see Public/Share Threat Model) | n/a (protected workspace never reads the frozen snapshot) | invalid/expired token -> not-found; no enumeration |
| Trust chips (freshness/confidence/lifecycle/link) | **REDACTED from public snapshots** (C-012). Public snapshots show ONLY the `trust.public_snapshot.label` copy — "Snapshot verified on {date}" (doc 22 §8) — never the live trust chips | Render over real columns (`pricing_date`, free-text `confidence`, `lifecycle_state`) on live workspace rows/cards/inspector (chip, NOT badge — C-002; doc 22 §3) | denied surface shows no trust chips at all |
| Bulk archive / lifecycle write | NOT reachable by public actor | `is_workspace_editor` (owner/admin/member); `viewer` denied at action layer | `viewer` or cross-workspace -> action throws/denies; UI hides the action (defense-in-depth, not the only guard) |
| Storage objects (`thumbnail_path` / image buckets) | NOT in the frozen snapshot unless explicitly published | workspace-scoped paths keyed by `workspace_id`; ownership verified before read/delete | cross-workspace object ID -> denied before read/delete |

### C-012 — trust chips redacted from public snapshots

Trust/freshness/confidence/lifecycle/link chips are **live-workspace-only** and
are REDACTED from public/shared snapshots. The public snapshot surface shows a
single verification line — copy key `trust.public_snapshot.label`, value
**"Snapshot verified on {date}"** (doc 22 §8; ICU `{date}` interpolation, doc 28
§6) — and nothing about live trust state. This means the freshness helper
(`getComponentPricingFreshness`) and the confidence/lifecycle derivations never
run on the public path; they run only on protected-library rows. A redaction
regression (a live trust chip leaking into a public snapshot) is a no-go (see
Security No-Go Conditions) and emits the `redaction_regression` telemetry event
(doc 20 §6A).

## Cache And Session Risks

The cache-bleed surface is **precisely one key**, not the whole cache. Per the
keystone, the rows-library and templates keys are already workspace-scoped and
cross-workspace tested; only `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY =
["workspace-component-library"]` (declared `src/lib/component-library/query-keys.ts:7`)
is **un-scoped** and can show prior-workspace data after a switch. Its primary READER is
`TemplateEditorClient.tsx:160` (`useQuery`, via the inline literal
`["workspace-component-library"]` — same cache entry, so symbol greps miss it); it is also
self-invalidated at `TemplateEditorClient.tsx:166` (inline literal), and invalidated by
`LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:406`, and
`EstimateSheetContent.tsx:1299`+`:1302` (the in-estimate dock — two invalidations).
Line numbers re-verified 2026-06-21 against `main` (keystone 19 still carries
the stale `:335` / `:1238/1241` — flagged in `LOOP_LEDGER.md` §3).

| Key | Scoped? | Risk |
| --- | --- | --- |
| `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` | NO | the only real workspace-switch bleed surface |
| `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` + `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)` | by workspace | already cross-workspace tested |
| `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY` + `workspaceEstimateTemplatesQueryKey({userId, workspaceId})` | by workspace+user | scoped |

Required controls (the canonical cache-bleed fix is the C-007 key migration,
Phase 0A/0B with doc 13):

- **scope `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` by `workspaceId`** (C-007),
  mirroring `workspaceComponentRowsLibraryQueryKey`, so a workspace switch cannot
  reuse the prior workspace's entry. This migration MUST cover ALL FIVE call
  sites — the symbol AND the `TemplateEditorClient.tsx:160` inline literal
  `["workspace-component-library"]` (the same cache entry; a symbol-name grep
  misses it), the self-invalidate at `TemplateEditorClient.tsx:166` (inline
  literal), plus the writers at `LibraryPageClient.tsx:126`,
  `use-estimate-row-mutations.ts:406`, and `EstimateSheetContent.tsx:1299`+`:1302`.
  Do NOT invent a `library:<workspace_id>:<surface>` key shape — extend the
  existing factory. The scoped ROWS/TEMPLATES keys are already cross-workspace
  tested and are NOT the bleed surface.
- workspace switch refetches protected library data under the now-scoped key
- stale `?component=<id>` route params (Phase 0B route state) resolve against the
  current workspace, never the prior one
- the share route never hydrates protected Library payloads (it reads only the
  frozen `snapshot_json` — see Public/Share Threat Model)
- server-rendered protected data is scoped to the current authenticated session
- a Phase 0A test asserts no cross-workspace bleed through the now-scoped key

## CSRF And Route Handler Posture

All protected Library mutations stay in server actions
(`src/lib/component-library/actions.ts`, `template-editor-actions.ts`); keep them
there rather than introducing route handlers. The only Library-adjacent route
handler today is the read-only public share API at
`src/app/api/share/[token]/route.ts`. If doc 15 adds route handlers for
uploads/imports, each must:

- require authenticated context (no anonymous write path)
- verify same-workspace object ownership via `is_workspace_editor`
- validate method / content type
- check origin / CSRF posture if cookie-authenticated
- rate-limit expensive operations (rate limiting is Postgres-backed here, not
  Redis)
- return permission-safe errors from `action-errors.ts`

## Audit And Abuse Controls

Implementation should log or make observable (event names per
`20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`):

- bulk archive via `previewBulkArchiveLibraryComponents` /
  `executeBulkArchiveLibraryComponents` (and the underlying
  `preview_bulk_archive_library_components` /
  `execute_bulk_archive_library_components` RPCs)
- lifecycle transitions via `changeCostLibraryComponentLifecycleState`
- import/export (doc 15)
- repeated cross-workspace denied attempts (`is_workspace_editor` failures)
- file upload rejection (if doc 15 adds uploads)
- publish / share setting changes on `project_publications`

Closed beta does not need heavy analytics, but destructive and exposure-relevant
events should be debuggable. (Closed-beta sink = `console.warn` is sufficient,
C-009; prod sink is Phase-later via `setLibraryTelemetrySink`, doc 20 §4.)

### Authz/cache/redaction test-file mappings (Phase 0A)

Each actor/object row in this doc maps to a concrete jsdom test (run with
`bun run test:dom` / `vitest run tests/vitest/<file>`, C-005). These are
pre-registered in `24-EXECUTION-EVIDENCE-LEDGER.md`; the file names below are the
resolved slots, not invented values.

| Actor / object row (this doc) | Test file | Pass criterion | Evidence ID |
| --- | --- | --- | --- |
| `viewer` denied at action layer (Actor Matrix) | `tests/vitest/library-authz-role-deny.test.tsx` (Phase 0A net-new) | every guarded action throws/denies for `viewer`; allowed for member/admin/owner | EV-SEC-01 |
| cross-workspace IDOR (Object-Level Authorization) | `tests/vitest/library-authz-cross-workspace.test.tsx` (Phase 0A net-new) | workspace-A actor cannot read/mutate workspace-B `cost_library_items`/folders/templates/price history; returns not-found | EV-SEC-01 |
| Snapshot redaction (Public/Share) | `tests/vitest/share-snapshot-redaction.test.tsx` | builder + sanitizer emit allowlist only; no `pricing_source`/`confidence`/`unitCost` own-properties; `rowTotal` present | ADV-PUBLIC-REDACTION |
| Cache-bleed (Cache And Session Risks) | `tests/vitest/library-cache-bleed-scoped-key.test.tsx` (Phase 0A net-new, depends on C-007 migration) | after workspace switch, no prior-workspace data under the now-scoped key | EV-SEC-01 |
| Stale insert target (Threat Model) | `tests/vitest/library-insert-target-stale.test.tsx` (Phase 4) | `resolveEstimateTemplateInsertTarget` re-resolves; wrong-estimate insert blocked by `can_edit_estimate` | EV-FRONTEND-07 |
| Public/share emits no Library telemetry (doc 20 §11) | grep assertion `rg "recordLibraryEvent" src/app/share src/app/api/share` | 0 matches | EV-SEC-02 |

### Security telemetry events (cross-ref [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §6A)

Security/abuse events are REGISTERED in doc 20 §6A (EV-TELEMETRY-SEC). Closed
beta sink = `console.warn` (C-009); code owner Security lead; payloads are
ID-only and workspace-scoped (no raw user identity in beta). The events this doc
owns (denial / redaction-failure / cache-bleed):

| Event | Trigger | Payload (privacy-safe) | Severity | Phase |
| --- | --- | --- | --- | --- |
| `authz_denied` | user attempts an action their role lacks (Actor Matrix denial) | `workspaceId`, `action`, `role` (NO user_id in beta) | Info | 0B |
| `idor_attempt` | user attempts a resource outside their workspace (Object-Level Authorization) | `workspaceId`, `resourceId` | Warn | 0B |
| `cache_bleed_detected` | cross-workspace data detected in cache (Cache And Session Risks; the C-007 migration is the mitigation) | `workspaceAId`, `workspaceBId`, `cacheKey` | Error | 0A |
| `redaction_regression` | a trust chip / private field appears in a public snapshot (Public/Share Threat Model; C-012) | `snapshotId`, `componentId` | Error | 0B |
| `snapshot_bypass_attempt` | attempt to access live component via a shared URL | `workspaceId`, `url` | Warn | 0B |

These are net-new (no call sites today; Phase 0A/0B insertion targets per doc 20
§6 "Instrumentation status"). The C-007 cache-key migration is the canonical
cache-bleed mitigation; `cache_bleed_detected` is the detection event, not the
fix.

## User-Facing Denial Copy

Denial/denied-access states use permission-safe copy from
`22-COPY-DECK-AND-MICROCOPY.md` (copy verbatim; do not reveal object existence,
workspace names, or that an object exists). Every denial is announced assertively
(`permission.denied_announcement`, doc 22 §12A — "You do not have permission to
{action}.") in addition to its visible copy.

| Denial state | Copy key (doc 22) | Copy |
| --- | --- | --- |
| Workspace-level library access denied | `library.permission_denied` | You do not have access to this workspace's library. |
| Components-tab read-only (viewer) | `components.permission_denied` | You can view but not edit this library. |
| Component not found / cross-workspace ID | `component_inspector.invalid` | That component could not be found here. |
| Folder write denied (viewer) | `folder.error.permission` | You do not have permission to change folders in this workspace. |
| Folder delete denied (viewer) | `folder.delete.error.permission` | You do not have permission to delete folders in this workspace. |
| Insert target not editable | `insert_target.permission` | You cannot edit {estimateName}. Choose a target you can edit. |
| Public snapshot verification line (C-012, NOT a denial — the only trust signal on the public path) | `trust.public_snapshot.label` | Snapshot verified on {date} |

Rules: denial copy is generic (never names the hidden object); it states the
issue then the next step (Switch workspace / Clear selection / Reselect target).
Denial copy uses the `secondary`/`danger` tokens, never `tertiary` (#7F7F7F,
fails AA — doc 22 §2).

## Security No-Go Conditions

Do not ship implementation if:

- a `viewer` can mutate library data (`is_workspace_editor` must deny at the
  action layer, not only hide the UI)
- a live trust chip (freshness/confidence/lifecycle/link) leaks into a public
  snapshot (C-012 — public snapshots show ONLY `trust.public_snapshot.label`
  "Snapshot verified on {date}"; a leak emits `redaction_regression`)
- the snapshot builder `buildSnapshotForProject` (`src/lib/publication/actions.ts:389`)
  serializes `pricing_source` (raw source URL), internal supplier notes,
  `confidence` free text, or `cost_library_item_price_history` into `snapshot_json`,
  OR the public-read sanitizer `sanitizeProjectPublicationSnapshotForPublicRead`
  (`src/lib/publication/snapshot.ts:301`) emits `unitCost` / `miscCost` /
  `contingencyPercentage` as own-properties on public-read rows (the sanitizer
  must emit `rowTotal` only)
- cross-workspace IDs (`cost_library_items.id`, `library_folder_id`, template,
  estimate, project) reveal object existence or data across `workspace_id`
- a workspace switch shows previous-workspace data through the un-scoped
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (it must be scoped by `workspaceId`)
- a stale insert target from `resolveEstimateTemplateInsertTarget` mutates the
  wrong estimate (must re-check `can_edit_estimate(target_estimate_id)`)
- upload/import route handlers (doc 15) lack server-side authz and validation

## UI-State Decision Contract: permission-denied vs not-found vs redacted-public (closes §3 gap)

The three error/no-access UI states are easy to conflate. This contract
disambiguates them by the SURFACE the user is on and the ACTOR they are, and
binds each to its copy key (doc 22) + telemetry event (doc 20). The rule: the
UI state is chosen by the surface, not inferred from the error.

| Trigger | Surface / actor | UI state rendered | Copy key (doc 22) | Telemetry (doc 20) | Existence leak? |
| --- | --- | --- | --- | --- | --- |
| Cross-workspace `?component=<id>` / `templateId` (RLS via `is_workspace_member` migration `20260613201302` returns no row) | Protected library route; authenticated user; foreign-workspace ID | **Permission-safe not-found** (indistinguishable from a real not-found; inspector stays closed, browse context preserved) | `component_inspector.invalid` / `library.template_not_found` | `route_state_authz_denied` `{outcome:"denied"}` | No — copy is generic, never names the object |
| `viewer` attempts a write action on a workspace they can READ | Protected library; authenticated `viewer` | **Permission-denied (viewer)** — write actions hidden/disabled; if somehow triggered, action throws at the action layer | `library.permission_denied` / `components.permission_denied` / `folder.error.permission` | `authz_denied` `{action, role:"viewer"}` | n/a (user is already in the workspace) |
| Unauthenticated or foreign-workspace actor hits a protected library route | Protected library route; unauthenticated / foreign-workspace session | **Permission-denied (workspace-level)** — route guard redirects or shows the workspace-denied state | `library.permission_denied` | `authz_denied` / `idor_attempt` | No — generic denial |
| Public/share-link viewer opens `src/app/share/[token]` | Public share surface; unauthenticated or share-link session | **Redacted-public** — frozen `snapshot_json` only; trust chips REDACTED (C-012); only `trust.public_snapshot.label` "Snapshot verified on {date}" shown | `trust.public_snapshot.label` | (no Library telemetry on public path — `rg "recordLibraryEvent" src/app/share src/app/api/share` must return 0, `EV-SEC-02`) | n/a — public snapshot is allowlist-built |
| Invalid / expired / revoked share token | Public share surface | **Not-found (share)** — share-route not-found; no enumeration | `share.not_found` (doc 22) | `snapshot_bypass_attempt` if the URL pattern suggests a live-library probe | No |

Decision rule (load-bearing): a **permission-safe not-found** and a **real
not-found** render IDENTICALLY to the user (same copy, same telemetry
`outcome:"denied"`/`"not_found"` distinction is server-side only) — this is the
existence-leak prevention invariant. A **redacted-public** surface is
structurally different (different route, different actor, different copy key);
never render trust chips or protected-library copy on it.

## Object-Level Authz Test-File Mapping (closes §3 "no test-file mapping per object-level authz row")

The "Authz/cache/redaction test-file mappings" table above covers the actor +
cache + redaction rows. This table extends it to every OBJECT row in
"Object-Level Authorization", so each object's cross-workspace protection is
pinned by a named test. All run under `bun run test:dom` (C-005); evidence
`EV-SEC-01` (Phase 0A Contract Lock, owner Security lead per doc 27).

| Object (this doc §"Object-Level Authorization") | Test file | Pass criterion | Evidence |
| --- | --- | --- | --- |
| Component (`cost_library_items.id`, `workspace_id`) | `tests/vitest/library-authz-cross-workspace.test.tsx` (Phase 0A net-new) | workspace-A actor cannot read/mutate workspace-B `cost_library_items` via any guarded action; returns permission-safe not-found | EV-SEC-01 |
| Folder (`library_folder_id`) | `tests/vitest/library-authz-folder-cross-workspace.test.tsx` (Phase 0A net-new) | workspace-A actor cannot create/rename/delete/reorder/move in workspace-B folders; `delete_library_folder` / `reorder_library_folders` RPCs enforce `workspace_id` | EV-SEC-01 |
| Template (`estimate_templates.id`) | `tests/vitest/library-authz-template-cross-workspace.test.tsx` (Phase 0A net-new) | workspace-A actor cannot read/mutate workspace-B templates; template hardening (`20260615145915`) + `template-editor-actions.ts` enforce | EV-SEC-01 |
| Estimate insert target (`estimate_row_items` / `estimate_template_row_items`) | `tests/vitest/library-insert-target-stale.test.tsx` (Phase 4) | `resolveEstimateTemplateInsertTarget` re-resolves; wrong-estimate insert blocked by `can_edit_estimate({target_estimate_id})` | EV-FRONTEND-07 |
| Project (`project_id`) | `tests/vitest/library-authz-project-scoped.test.tsx` (Phase 0A net-new) | `project_id`-scoped reads/mutations are RLS-bounded; cross-project access denied | EV-SEC-01 |
| Price / source (`cost_library_item_price_history`) | `tests/vitest/library-authz-price-history.test.tsx` (Phase 0A net-new) | workspace-scoped price history table returns no rows for foreign-workspace `workspace_id`; `upsertCostLibraryComponentPriceOption` guard denies | EV-SEC-01 |
| Attachment / storage (`thumbnail_path` / bucket) | `tests/vitest/library-authz-storage-ownership.test.tsx` (Phase-later, conditional on doc 15 uploads landing) | ownership verified before read/delete; cross-workspace object ID denied before read/delete | EV-SEC-03 |

The first six rows land in Phase 0A; the storage row is Phase-later (conditional
on doc 15's upload/import handlers landing).

## Telemetry Schema for Security Events (closes §3 "no telemetry schema")

The five security events in "Security telemetry events" above need a pinned
payload schema so a downstream sink can parse them without re-derivation. Sink
= `console.warn` for closed beta (C-009); prod sink Phase-later via
`setLibraryTelemetrySink` (doc 20 §4). All payloads are ID-only and
workspace-scoped — NO raw user identity in beta.

| Event | Schema (JSON) | Sample |
| --- | --- | --- |
| `authz_denied` | `{workspaceId: string, action: string, role: "owner"\|"admin"\|"member"\|"viewer", outcome: "denied", ts: ISO8601}` | `{workspaceId:"w-1", action:"createCostLibraryComponent", role:"viewer", outcome:"denied", ts:"2026-06-21T12:00:00Z"}` |
| `idor_attempt` | `{workspaceId: string, resourceId: string, resourceType: "component"\|"folder"\|"template"\|"estimate"\|"project", outcome: "not_found", ts: ISO8601}` | `{workspaceId:"w-1", resourceId:"c-foreign", resourceType:"component", outcome:"not_found", ts:"..."}` |
| `cache_bleed_detected` | `{workspaceAId: string, workspaceBId: string, cacheKey: "workspace-component-library", ts: ISO8601}` | `{workspaceAId:"w-1", workspaceBId:"w-2", cacheKey:"workspace-component-library", ts:"..."}` |
| `redaction_regression` | `{snapshotId: string, componentId?: string, leakedField: "pricing_source"\|"confidence"\|"unitCost"\|"miscCost"\|"contingencyPercentage"\|string, ts: ISO8601}` | `{snapshotId:"pub-1", leakedField:"pricing_source", ts:"..."}` |
| `snapshot_bypass_attempt` | `{workspaceId?: string, url: string, pattern: "live_library_probe"\|"token_enumeration", ts: ISO8601}` | `{url:"/workshop/library?component=...", pattern:"live_library_probe", ts:"..."}` |

Schema rules: `ts` is always ISO 8601 UTC; `workspaceId` is the CURRENT
workspace of the actor (never the target foreign workspace); `resourceId` /
`snapshotId` are opaque IDs (no names, no URLs except in `snapshot_bypass_attempt.url`
which is the probe URL itself); `role` is the enum value (never a free label).
A redaction_regression with `leakedField` set is a no-go (see Security No-Go
Conditions); the event is the DETECTION, not the fix.

## Storage / File-Upload Authz Appendix (closes §3 "no storage/file-upload authz matrix")

The Library does NOT have upload/import route handlers today (doc 15 owns the
future surface). When they land, each must satisfy this matrix — the matrix is
pre-registered here so doc 15 can bind to it rather than re-deriving authz. The
only storage-adjacent surface today is `thumbnail_path` (a text column on
`cost_library_items`, not a Storage bucket object); true bucket uploads are
deferred.

| Future surface | Authz rule | Guard primitive | Test (Phase-later) |
| --- | --- | --- | --- |
| Component thumbnail upload | same-workspace ownership + `is_workspace_editor` | `supabase.rpc("is_workspace_editor",{target_workspace_id})` + RLS on `cost_library_items` | `tests/vitest/library-authz-thumbnail-upload.test.tsx` (Phase-later) |
| Bulk import (CSV/JSON) | same-workspace ownership + `is_workspace_editor` + per-row validation | server action in `src/lib/component-library/actions.ts` + `action-errors.ts` for per-row rejection | `tests/vitest/library-authz-bulk-import.test.tsx` (Phase-later) |
| Export (CSV/JSON) | `is_workspace_member` (read) + workspace-scoped query | RLS on `cost_library_items` + export action in `actions.ts` | `tests/vitest/library-authz-export.test.tsx` (Phase-later) |
| Storage bucket object read/delete | ownership verified against `workspace_id` before any read/delete | route-handler authz (doc 15) + RLS | `tests/vitest/library-authz-storage-ownership.test.tsx` (Phase-later, `EV-SEC-03`) |

Rules (bind to doc 15 when it lands): every upload/import/export route handler
requires authenticated context (no anonymous write path); verifies
same-workspace object ownership via `is_workspace_editor` (writes) or
`is_workspace_member` (reads); validates method/content-type/size; checks
origin/CSRF posture if cookie-authenticated; rate-limits expensive operations
(rate limiting is Postgres-backed, not Redis); returns permission-safe errors
from `action-errors.ts`. Do not invent a parallel authz layer — extend the
existing RPC guards.

## Copy Contract: denial / redaction / safe-not-found (closes §3 "no copy contract")

The "User-Facing Denial Copy" table above is the canonical copy source; this
section binds it to the UI states in the UI-State Decision Contract so a copy
change has exactly one home. All copy is owned by `22-COPY-DECK-AND-MICROCOPY.md`
— this doc never invents inline strings.

| UI state (UI-State Decision Contract) | Copy key (doc 22) | Announcement (doc 22 §12A, assertive) | Token (doc 22 §2) |
| --- | --- | --- | --- |
| Permission-safe not-found (component) | `component_inspector.invalid` | `route.not_found_announcement` "The selected component is not available." | `secondary` (never `tertiary` #7F7F7F — fails AA) |
| Permission-safe not-found (template) | `library.template_not_found` | `route.not_found_announcement` "The selected template is not available." | `secondary` |
| Permission-denied (viewer) | `library.permission_denied` / `components.permission_denied` / `folder.error.permission` / `folder.delete.error.permission` | `permission.denied_announcement` "You do not have permission to {action}." | `danger` for destructive denials; `secondary` for read-only denials |
| Permission-denied (workspace-level) | `library.permission_denied` | `permission.denied_announcement` "You do not have access to this workspace's library." | `danger` |
| Insert target not editable | `insert_target.permission` | `permission.denied_announcement` "You cannot edit {estimateName}. Choose a target you can edit." | `secondary` |
| Redacted-public snapshot (C-012) | `trust.public_snapshot.label` "Snapshot verified on {date}" | (no announcement — this is a verification line, not an error) | `success` |
| Share not-found (invalid/expired token) | `share.not_found` | (no announcement — share surface is a full-page state) | `secondary` |

Rules: denial copy is GENERIC (never names the hidden object, workspace, or
that an object exists); it states the issue then the next step (Switch
workspace / Clear selection / Reselect target). Denial copy uses the
`secondary`/`danger` semantic tokens, never `tertiary` (#7F7F7F, fails AA — doc
22 §2, MEMORY.md "DESIGN.md tertiary fails AA"). The redacted-public
verification line is the ONLY trust signal on the public path and uses
`success`, not a denial token.
