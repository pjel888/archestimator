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
| `viewer` | Yes, RLS-scoped workspace data. | No (blocked by `is_workspace_editor`). | No unless `can_edit_estimate` passes for the target estimate. | No publishing power. |
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
  (`src/lib/publication/actions.ts:376`) AND the public-read sanitizer
  `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:112`)
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

The real redaction control is therefore **what the snapshot builder serializes
into `snapshot_json`**, not a runtime filter on a live endpoint. The builder is
`buildSnapshotForProject` (`src/lib/publication/actions.ts:376`), which selects an
EXPLICIT column allowlist on `estimate_row_items` (`id, estimate_id, node_id,
description, designation, discipline, material, quantity, unit, unit_cost,
misc_cost, contingency_percentage, imageUrl`, `:399`) and **never queries
`cost_library_items` or `cost_library_item_price_history`** (grep-confirmed zero
hits), so raw Library source metadata cannot enter the snapshot; it assembles the
snapshot via `buildProjectPublicationSnapshot` (`src/lib/publication/snapshot.ts:265`),
and `buildSnapshotForProject` is the function whose `snapshot_json` write the
caller persists at `actions.ts:566` / `:636` / `:697`. (`activity-helpers.ts`
only READS labels back OUT of an already-built snapshot —
`createSharedLinkTargetLabelMap`, `:33`, parses `snapshot_json` into
`estimateLabels`/`rowLabels` maps for the activity/comment routes — it does NOT
compose what is serialized; do not audit it as the field-selection surface.)
Redaction work means auditing that builder's field selection so private Library
metadata is never copied into the snapshot in the first place.

There is also a **second, dedicated public-read redaction layer** that this doc
must not omit: `sanitizeProjectPublicationSnapshotForPublicRead`
(`src/lib/publication/snapshot.ts:112`) and `sanitizeSnapshotRow` (`snapshot.ts:95`)
rebuild each public-read row from a FIXED allowlist — `id`, `description`,
`designation`, `discipline`, `material`, `quantity`, `unit`, `rowTotal`,
`imageUrl`, `nodeId`, `tabId` — and **drop `unitCost` / `miscCost` /
`contingencyPercentage`** so the raw per-unit costs never reach the public reader.
This sanitizer runs in TWO places: inside `buildProjectPublicationSnapshot` at
build time (`snapshot.ts:284`) AND at the public-read API route
(`src/app/api/share/[token]/route.ts:78`). So exposure control is defense-in-depth:
(a) `buildSnapshotForProject` never pulls Library source tables, and (b) the
public-read sanitizer re-derives each row from a fixed allowlist. Redaction tests
must pin BOTH the builder field-selection and this sanitizer allowlist.

Phase 0A snapshot-redaction evidence (pre-registered as `ADV-PUBLIC-REDACTION` in
`24-EXECUTION-EVIDENCE-LEDGER.md`; command
`vitest run tests/vitest/share-snapshot-redaction.test.tsx`, owner Phase 0A
Contract Lock, gate `bun run test:dom`):

- assert the snapshot built by `buildSnapshotForProject` (`actions.ts:376`) does
  NOT include `pricing_source` (raw source URL), `confidence` free text, internal
  supplier notes, or rows from `cost_library_item_price_history` (the builder
  never queries those Library tables)
- assert the public-read output of
  `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:112`) carries
  only the fixed-allowlist row fields above and drops `unitCost` / `miscCost` /
  `contingencyPercentage`
- because the snapshot is frozen and versioned, a regression in either the
  builder or the sanitizer is the only path to exposure — pin the redaction with
  a test on the builder + sanitizer, not on the render route

## Data Classification

Redaction below is enforced at build time by the **snapshot builder**
`buildSnapshotForProject` (`src/lib/publication/actions.ts:376`, which never
queries `cost_library_items` / `cost_library_item_price_history`) AND at read time
by the **public-read sanitizer** `sanitizeProjectPublicationSnapshotForPublicRead`
(`src/lib/publication/snapshot.ts:112`, fixed-allowlist rows dropping
`unitCost`/`miscCost`), not by a live-endpoint filter — the "Public/Share Default"
column describes the field that survives this defense-in-depth into the
public-read `snapshot_json`.

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

## Cache And Session Risks

The cache-bleed surface is **precisely one key**, not the whole cache. Per the
keystone, the rows-library and templates keys are already workspace-scoped and
cross-workspace tested; only `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY =
["workspace-component-library"]` (`src/lib/component-library/query-keys.ts`) is
**un-scoped** and can show prior-workspace data after a switch. Its primary READER is
`TemplateEditorClient.tsx:160` (`useQuery`, via the inline literal
`["workspace-component-library"]` — same cache entry, so symbol greps miss it); it is also
invalidated by `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:335`, and
`EstimateSheetContent.tsx:1238/1241` (the in-estimate dock).

| Key | Scoped? | Risk |
| --- | --- | --- |
| `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` | NO | the only real workspace-switch bleed surface |
| `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` + `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)` | by workspace | already cross-workspace tested |
| `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY` + `workspaceEstimateTemplatesQueryKey({userId, workspaceId})` | by workspace+user | scoped |

Required controls (the fix is doc 13's cache work, Phase 0A/0B):

- scope `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` by `workspaceId`, mirroring
  `workspaceComponentRowsLibraryQueryKey`, so a workspace switch cannot reuse the
  prior workspace's entry
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
events should be debuggable.

## Security No-Go Conditions

Do not ship implementation if:

- a `viewer` can mutate library data (`is_workspace_editor` must deny at the
  action layer, not only hide the UI)
- the snapshot builder `buildSnapshotForProject` (`src/lib/publication/actions.ts:376`)
  serializes `pricing_source` (raw source URL), internal supplier notes,
  `confidence` free text, or `cost_library_item_price_history` into `snapshot_json`,
  OR the public-read sanitizer `sanitizeProjectPublicationSnapshotForPublicRead`
  (`src/lib/publication/snapshot.ts:112`) stops dropping `unitCost` / `miscCost`
  from public-read rows
- cross-workspace IDs (`cost_library_items.id`, `library_folder_id`, template,
  estimate, project) reveal object existence or data across `workspace_id`
- a workspace switch shows previous-workspace data through the un-scoped
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (it must be scoped by `workspaceId`)
- a stale insert target from `resolveEstimateTemplateInsertTarget` mutates the
  wrong estimate (must re-check `can_edit_estimate(target_estimate_id)`)
- upload/import route handlers (doc 15) lack server-side authz and validation
