# 19 — Verified Codebase Bindings and Phase Map (Keystone)

Status: authoritative. Last verified against `main` on 2026-06-21.

## Purpose

This is the single source of truth for the Library Page Overall Improvement
pack. Every other doc in this pack defers to the names here. When a sibling doc
disagrees with this one on a path, column, enum value, query key, action name,
RPC name, constant, or test command, **this doc wins** and the sibling is wrong
until reconciled.

This doc exists to close the gap that capped pack readiness: earlier drafts
specified behavior abstractly ("the right dock", "Active/Deleted states", "the
review date", "stale-response race", "leaking library endpoint", "run
`bun test`") that did not bind to real code. Each of those is corrected below
with the on-disk fact. An implementer should be able to build every phase from
this doc plus the per-phase spec docs **without any further codebase
spelunking** — every binding here was confirmed by reading the file, not
inferred.

Scope of authority for this doc:

- Real file paths for every cited surface
- Table/column inventory and what is migration-gated
- Exact enum values (lifecycle, link_state, workspace_role)
- Confidence and freshness models (free-text + the three 90-day constants)
- Query keys and the one un-scoped cache-bleed key
- Server action and RPC names
- RLS/authz primitives and the public/share snapshot surface
- Performance reality (client-side search, eager nested detail, virtualization)
- Test commands
- The canonical phase map (0A/0B/1-5) with each prior phase id mapped
- The canonical glossary and the Quick Add contract

Sibling docs and how they bind here:

| Doc | Binds to this keystone for |
|-----|-----------------------------|
| `00-PLAN.md` | non-goals (no schema change), in/out-of-scope file list, phase order |
| `02-USER-FLOWS-AND-ACTION-PATHS.md` | action/RPC names, Flow 7 insert resolver |
| `05-IMPLEMENTATION-ROADMAP.md` | phase labels and order |
| `06-QA-AND-VALIDATION-PLAN.md` | test commands (corrects the `bun test` bug) |
| `10-LIBRARY-SURFACE-SPECS.md` | Quick Add contract, surface file paths |
| `11-SOURCE-TRUST-STATE-MATRIX.md` | enum values (corrects Active/Deleted) |
| `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` | virtualization reuse, a11y harness reality |
| `13-DATA-CONTRACTS-ROUTE-CACHE.md` | query keys, columns, the un-scoped key |
| `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` | snapshot-redaction reframing, RLS primitives |
| `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` | client-side search, eager detail, perf seed gap |
| `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | phase labels for sequencing |
| `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` | event surface names |
| `21-FEATURE-FLAGS-AND-ROLLOUT.md` | per-phase rollback flags |
| `22-COPY-DECK-AND-MICROCOPY.md` | the copy strings cited below |
| `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` | overlay primitives, z-index tiers |
| `24-EXECUTION-EVIDENCE-LEDGER.md` | the **test commands** in "Test Commands" below (it pre-registers each render/test/migration proof against those commands) |

A 30-second "Re-verification commands" appendix at the end lets an implementer
confirm each binding still holds before coding.

## Verified File Paths

Routes on disk (all four exist; `[templateId]` detail route already ships):

| Route | File |
|-------|------|
| `/workshop/library` | `src/app/workshop/library/page.tsx` |
| `/workshop/library/components` | `src/app/workshop/library/components/page.tsx` -> `LibraryComponentsRoute.tsx` -> `LibraryPageClient.tsx` -> dynamic-imports `ComponentLibraryManager` |
| `/workshop/library/templates` | `src/app/workshop/library/templates/page.tsx` |
| `/workshop/library/templates/[templateId]` | `src/app/workshop/library/templates/[templateId]/page.tsx` (ships today) |

Route-state ruling: template selection/preview uses the shipped
`/workshop/library/templates/[templateId]` segment route — do **NOT** introduce a
`?template=<id>` query param. `?component=<id>` is the components-tab inspector
selector **only** (components has no segment route).

Surfaces (note: the three most-cited surfaces are NOT under
`component-library-manager/`):

| Surface | Real path | Notes |
|---------|-----------|-------|
| Inspector dock | `src/components/workshop/library/ComponentInspectorDock.tsx` | 315 lines; glossary term "inspector dock" |
| Facet filter | `src/components/workshop/library/component-facet-filter.tsx` | exports `COMPONENT_FACET_STALE_DAYS=90` (:12), `ComponentPricingFreshness = "any"|"fresh"|"stale"|"missing"` (:17), `getComponentPricingFreshness(item, now)` (:61) |
| Overview | `src/components/workshop/library/overview/LibraryOverview.tsx` | hardcoded "90 days" UI string at :114 |
| Overview search input | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` | Phase 1 continuity entry point; `SearchInput` rendered at :258, `inputRef` :40 |
| Components-tab search input | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | `searchQuery`/`searchOpen`/`searchInputRef` state at :844-846, `<input>` rendered at :383. This is where the components search lives — NOT `LibraryPageClient.tsx` (which has zero `input`/`onFocus`/`search` occurrences) |
| Bulk toolbar | `src/components/workshop/BulkActionToolbar.tsx` | shared primitive at `src/components/ui/bulk-action-toolbar.tsx` |
| Bulk archive modal | `src/components/workshop/BulkDestructivePreviewModal.tsx` | `confirmationHint` at :107-108 |
| Route client | `src/components/workshop/LibraryPageClient.tsx` | route-state owner FOR THE NEW `?component=<id>` param (Phase 0B target — net-new). No `useSearchParams`/`usePathname`/`router.replace`/`component`-param handling exists in this file today (0 hits); it currently owns data load + the dynamic import of `ComponentLibraryManager` only. The components-tab click handler that sets the selection lives in `ComponentLibraryManager.tsx`, not here |
| Repository | `src/lib/repositories/component-library-repository.ts` | `LIBRARY_OVERVIEW_STALE_PRICING_DAYS=90` at :827 |

The only four files in `src/components/workshop/component-library-manager/`:

| File | Lines | Native-overlay debt to migrate |
|------|-------|--------------------------------|
| `AddComponentModal.tsx` | 2359 | `window.confirm("Discard this component draft?")` at :963 |
| `ComponentLibraryManager.tsx` | 1695 | `window.prompt("Folder name")` create :1493, rename :1515; `window.confirm` delete :1534; client-side synchronous search at :876-882 |
| `LibraryFolderTree.tsx` | — | folder tree UI |
| `library-folder-tree-shared.ts` | — | shared folder-tree logic |

In-scope adjacent live file the prose plan omits but `00-PLAN.md` scope covers:

| File | Native-overlay debt | Disposition |
|------|---------------------|-------------|
| `src/components/workshop/component-library/index.tsx` | `window.confirm("Discard component changes?")` :939, `window.prompt("Folder name")` :1428 | estimate-page panel; Phase-later, but list it — do not silently drop |

Already migrated off native prompts (verified: the remaining `window.*` matches
are comments, not calls):

| File | Pattern used |
|------|--------------|
| `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` | `ConfirmDialog` + child `<input>` + local text-prompt state |
| `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` | the canonical inline pattern, `:531-883` — **copy this for folder create/rename** |
| `src/components/workshop/.../InsertIntoEstimatePicker.tsx` | a `Modal` |

## Data Layer

Table is `public.cost_library_items` (NOT "components"). Existing columns —
build against these; no migration needed for any column listed here:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | text | Quick Add required |
| `category` | text | required taxonomy axis; plain text, **not** an enum |
| `unit` | text | Quick Add required |
| `unit_cost` | numeric | Quick Add required |
| `misc_cost` | numeric | optional |
| `supplier` / `supplier_id` | text / FK `component_suppliers` | optional |
| `brand` / `brand_id` | text / FK `component_brands` | optional |
| `lifecycle_state` | enum `component_lifecycle_state` | see Enums |
| `lifecycle_state_changed_at` | timestamptz | |
| `pricing_date` | date / null | freshness input |
| `pricing_source` | text / null | this IS the "source URL"; URL validity is app-side over free text |
| `confidence` | text / null | FREE TEXT, **not** an enum |
| `thumbnail_path` | text | |
| `updated_at` | timestamptz | the real trust-cue fallback for "last touched" |
| `workspace_id` | FK `workspaces` | tenancy key |
| `library_folder_id` | FK / null | optional org axis (the "folder" axis) |

What exists vs what would need a migration — the trust-cue boundary:

| Trust cue | Status | Implication |
|-----------|--------|-------------|
| Price freshness | exists | derive from `pricing_date` via existing helpers |
| Source URL | exists | `pricing_source` free text, app-side URL validation |
| "Last touched" | exists | use `updated_at` |
| **`last_reviewed` / `reviewed_at`** | **does NOT exist** anywhere (`cost_library_items` or `estimate_templates`) | **migration-gated** |
| **Confidence as controlled vocabulary** | **does NOT exist** (`confidence` is free text) | **migration-gated** |

These two — a real `last_reviewed` timestamp and an enum/CHECK-constrained
confidence — are the **only** migration-gated trust cues in this pack. Doc 11's
"Last reviewed" and any "template review metadata" do not exist: either re-scope
those cues to `updated_at`, or explicitly gate them behind the Data Migration
Gate. `estimate_templates` has only `category`, `name`, `description`,
`metadata`, `sort_order`, `created_by`, `updated_at`, `workspace_id` — no review
column.

Related tables:

| Table | Purpose |
|-------|---------|
| `cost_library_item_price_history` | price history, workspace-scoped, RLS |
| `estimate_row_items` | has `source_library_item_id` (FK), `source_snapshot` (Json), `link_state` (enum) |
| `estimate_template_row_items` | same three linkage columns |

Template trust counts are a **computed JOIN** over the linkage columns above, not
stored fields. Doc 04/10/11 "template trust summary" must compute, not read a
column.

## Enums

Bind every state spec to these exact values. Do not invent labels.

`component_lifecycle_state` (five values):

| Value | UI meaning |
|-------|------------|
| `draft` | not yet usable / work-in-progress |
| `in_production` | being built/priced; missing from doc 11, must be specified |
| `available` | the value doc 11 mislabels "Active" |
| `discontinued` | no longer offered |
| `archived` | hidden from default browse; recoverable |

Doc 11's "Active / Draft / Discontinued / Archived / Deleted" is wrong on two
counts: "Active" is `available`, and "Deleted" is **not an enum value** — it is
a row-removal / not-listed recovery UI concept, not a lifecycle state. Define
browse and insert behavior for **all five** real values.

`estimate_row_link_state` (five values):

| Value | Meaning |
|-------|---------|
| `unlinked` | no source library item |
| `linked-clean` | linked, matches source |
| `linked-overridden` | linked, locally edited |
| `detached` | deliberately severed from source |
| `source-changed` | source moved since snapshot |

Doc 11's link/snapshot taxonomy must map to these. "Missing source" is a
**derived UI state** (source item was deleted), not an enum value.

`workspace_role` (four values): `owner | admin | member | viewer`.

| Predicate | Definition |
|-----------|------------|
| `is_workspace_editor` | role in (`owner`, `admin`, `member`) — only `viewer` is read-only |
| `is_workspace_member` | any membership |

## Confidence and Freshness Models

Confidence (canonical): `confidence` is a free-text `string | null` today. The
UI derives a label/badge over the free text. A controlled vocabulary
(enum/CHECK) is **deferred** behind a migration. `category` is likewise plain
text, not a controlled enum. Phase 2/3 trust chips must render over free text,
not assume a fixed set.

Freshness (canonical, single source of truth): the 90-day window lives in
**three places that must change together**:

| Location | Symbol / value |
|----------|----------------|
| `src/components/workshop/library/component-facet-filter.tsx:12` | `COMPONENT_FACET_STALE_DAYS = 90` |
| `src/lib/repositories/component-library-repository.ts:827` | `LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90` |
| `src/components/workshop/library/overview/LibraryOverview.tsx:114` | hardcoded `"prices older than 90 days"` UI string |

Reuse the existing freshness logic rather than inventing new logic:

| Helper | Location | Returns |
|--------|----------|---------|
| `getComponentPricingFreshness(item, now)` | `component-facet-filter.tsx:61` | `"fresh" | "stale" | "missing"` |
| `getStalenessTone(pricingDate?)` | `component-library/helpers.ts:667` | `"success" | "warning" | "danger" | undefined` |
| `getStalenessLabel(pricingDate?)` | `component-library/helpers.ts:675` | label string |

Any new "very stale" tier (e.g. 180-day) is **net-new** and must extend these
three constants and helpers in lockstep, not diverge into a fourth source of
truth.

## Query Keys

Real keys from `src/lib/component-library/query-keys.ts`:

| Key / factory | Scoped? | Notes |
|---------------|---------|-------|
| `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` | **NO** | the ONLY real workspace-switch cache-bleed surface. PRIMARY READER: `TemplateEditorClient.tsx:160` (`useQuery`, the template-editor library dock) — it uses the inline literal `["workspace-component-library"]`, so a symbol-name grep misses it; it is the same cache entry. WRITERS (`invalidateQueries`): `LibraryPageClient.tsx:126`, `src/hooks/use-estimate-row-mutations.ts:335`, `EstimateSheetContent.tsx:1238/1241` (the in-estimate dock). query-keys.ts:5-6 documents it as "used by the Library management surfaces (template editor, component manager)." Scoping the key MUST migrate ALL these call sites — especially the editor's read at :160 — or the bleed stays open |
| `WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY = ["workspace-component-library","lite"]` | partial | |
| `workspaceComponentLibraryLiteQueryKey(projectId)` | by project | |
| `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` + `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)` | by workspace | already cross-workspace tested |
| `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY` + `workspaceEstimateTemplatesQueryKey({userId, workspaceId})` | by workspace+user | scoped |

The un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is the cache-bleed surface
doc 13 must close (scope it by `workspaceId`, mirroring the rows-library key).
Every mutation-cache row in doc 13 must name the **exact** key(s) to invalidate;
do not write "invalidate the library cache" abstractly.

## Server Actions and RPCs

Server actions — `src/lib/component-library/actions.ts`, `"use server"`:

`loadCurrentWorkspaceComponentLibrary`, `...Lite`, `...RowsLibrary`,
`loadCurrentWorkspaceEstimateTemplates`, `createCostLibraryComponent`,
`updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`,
`changeCostLibraryComponentLifecycleState`,
`previewBulkArchiveLibraryComponents`, `executeBulkArchiveLibraryComponents`,
`createLibraryFolder`, `renameLibraryFolder`, `deleteLibraryFolder`,
`reorderLibraryFolders`, `moveCostLibraryComponentToFolder`,
`listEstimateInsertTargets`, **`resolveEstimateTemplateInsertTarget`** (RESOLVES
the insert target — returns `targetParentNodeId`; it is **NOT** the insert
mutation — name this in docs 02/13 Flow 7),
`getCostLibraryComponentUsage`, `searchLibraryOverview` (overview search).

The single-library-COMPONENT-into-ESTIMATE insert action is **NOT** in this
`component-library/actions.ts` file — it lives in `src/lib/estimates/actions.ts`:
**`insertEstimateRowItemFromLibrary`** (`:2580`), with siblings
**`replaceEstimateRowItemWithLibrary`** (`:2675`) and
**`detachEstimateRowItemFromLibrary`** (`:2713`). This is the action a component
insert flow (and doc 20's component-path `insert_target_confirmed`) must call.

Insert mutations (resolve ≠ insert): for **template -> ESTIMATE**, the
`InsertIntoEstimatePicker.tsx` submit handler (`:99-118`) calls
`resolveEstimateTemplateInsertTarget` to get the parent node, then performs the
insert via **`insertEstimateTemplateIntoEstimate`** (`@/lib/estimates/actions`).
For **template -> template** (editor dock), the insert is
**`insertTemplateIntoTemplate`** (`template-editor-actions.ts:484`). For a single
library **COMPONENT -> ESTIMATE**, the insert action is
**`insertEstimateRowItemFromLibrary`** (`src/lib/estimates/actions.ts:2580`); the
related ops are **`replaceEstimateRowItemWithLibrary`** (`:2675`) and
**`detachEstimateRowItemFromLibrary`** (`:2713`). Do not conflate these with the
template inserts above, and do not conflate the resolver with any insert action.

Writes guard via `supabase.rpc("is_workspace_editor",{target_workspace_id})` and
`rpc("can_edit_estimate",{target_estimate_id})` as defense-in-depth over RLS
(already implemented). Errors live in `action-errors.ts`; the template editor in
`template-editor-actions.ts`.

RPCs (real): `is_workspace_editor`, `is_workspace_member`, `can_edit_estimate`,
`create_cost_library_component`, `update_cost_library_component`,
`upsert_cost_library_component_price_option`,
`set_cost_library_component_lifecycle_state`,
`preview_bulk_archive_library_components`,
`execute_bulk_archive_library_components`, `delete_library_folder`,
`reorder_library_folders`.

## RLS / Authz Primitives

RLS and policies are defined across `supabase/migrations`:

| Migration | Covers |
|-----------|--------|
| `20260614144136` | core policies |
| `20260615145915` | template hardening |
| `20260613192344` | `is_workspace_editor` |
| `20260613201302` | `is_workspace_member` |

Cross-workspace authorization is **already strong**. The real gaps for this pack
are: missing **tests**, the **un-scoped query key**, and **snapshot redaction** —
not missing authz. Doc 14 must not claim an authz hole that does not exist.

## Public / Share Snapshot Surface

The live public surface is `src/app/share/[token]` +
`src/app/api/share/[token]/route.ts`. It renders a **frozen snapshot** from
`project_publications.snapshot_json` (versioned by `snapshot_version`), NOT a
live Library query. There is no live library endpoint to leak.

Redaction is therefore about what the **snapshot builder puts into**
`snapshot_json` (estimates / row labels, per `activity-helpers.ts`), not about a
live endpoint. Doc 14 must reframe: audit the snapshot builder's field
selection, not a hypothetical leaking library API.

## Performance Reality

Corrected facts (docs 12/16 must align):

| Claim in earlier drafts | Reality |
|-------------------------|---------|
| "stale/out-of-order server-search race" | Components-tab search/filter is 100% **client-side synchronous** filtering over an in-memory dataset (`ComponentLibraryManager.tsx:876-882`) — no async race exists today. Scope server-search/FTS/trigram/out-of-order handling as **FUTURE if budget exceeded**, not current. |
| "partial section failure on overview" | Overview does **not** load sections independently; that claim is wrong. |
| (under-stated) | The REAL perf risk: the browse fetch (`loadCurrentWorkspaceComponentRowsLibrary`) eagerly loads the FULL nested detail graph (versions, price history, state history, attachments) per item. Target: shrink the browse payload / make detail lazy and inspector-scoped. |

Infrastructure already present, reuse it:

| Capability | Where | Reuse note |
|------------|-------|------------|
| Virtualization | `src/lib/workshop/virtualization-flags.ts` (`WORKSHOP_VIRTUALIZATION_FLAGS` + `@tanstack/react-virtual`; tree `minRows` wired) | a Phase 5 card-grid/table fallback should REUSE these flags, not add a parallel virtualizer |
| FTS / trigram index | none | does not exist yet; only relevant if budget is exceeded |
| Perf seed | `scripts/seed-performance-test-data.ts` | does **NOT** cover `cost_library_items` — Phase 0A must extend it to seed N components and MEASURE before any budget number is claimed |

## Test Commands

From the real `package.json`:

| Command | Runs |
|---------|------|
| `bun run test:dom` | `vitest run --maxWorkers=1` — the jsdom suites under `tests/vitest/*.test.tsx` |
| `vitest run tests/vitest/<file>` | one jsdom suite |
| `bun test` | `tests/unit` ONLY — will NOT run the vitest suites |
| `bun run validate` | `type-check && lint && lint:design-system && lint:design && test && test:dom` |
| `bun run test:e2e` | playwright |

Doc 06's instruction to run `bun test tests/vitest/<f>` is a **BUG**: `bun test`
is bound to `tests/unit` and silently ignores the vitest suites. Correct usage
is `bun run test:dom` (all) or `vitest run tests/vitest/<file>` (one).

There is **no axe / jest-axe a11y harness**. A11y tests are manual ARIA/focus
assertions in Testing Library. Any "axe" assertion in doc 06/12 is a net-new
prerequisite: adding `jest-axe` must be listed explicitly before it can be used.

## Canonical Phase Map

These labels resolve the P0A/P0/0-6/2b/1-9 drift. Docs 00/05/16/17/18 must use
THESE labels. Canonical priority order: **0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5**.

| Phase | Name | Scope | Maps from prior ids |
|-------|------|-------|---------------------|
| 0A | Contract Lock | lock docs 13/14/15/16/17 + this keystone's bindings; scaffold route-state / authz / cache / stale-target tests; extend the perf seed + measure baseline | old 00 "Phase 0a", 05 "P0A", 17 slice 1 |
| 0B | Overlay & Route-State Reliability | replace folder native prompts (`ComponentLibraryManager`) + Add dirty-discard confirm (`AddComponentModal`) with the inline `ConfirmDialog`+input pattern; add `?component=<id>` route state; fix bulk-archive copy. Folder-prompt replacement lands HERE (early), NOT after Quick Add | old 00 "Phase 0b", 05 "P0", parts of 03 |
| 1 | Findability & Applied Filters | overview search continuity to `?component=<id>`; visible applied-filter chips + reset; result count/scope strip | old "phase 1", 05 "P1" |
| 2 | Source Trust at Decision Points | trust chips on overview/recent/template rows + inspector + insert, bound to real columns/helpers | old "phase 2", 05 "P2", doc 11 |
| 3 | Add/Edit Component Flow Split (Quick Add) | quick-add required-field path + progressive advanced; normalize Add/Edit source fields | old "phase 2b/3", 05 "P3", docs 09/10 |
| 4 | Templates Browse/Insert/Editor Clarity | explicit insert target (`resolveEstimateTemplateInsertTarget`), creatable-combobox move, template trust summary | old "phase 4", 05 "P4" |
| 5 | Dense Maintenance Mode & Browser-Proven Polish | card/dense toggle (the density toggle does NOT exist yet — net-new), table-vs-grid per doc 12, browser proof. LAST | old "phase 5/6", 05 "P5" |

Per-phase rollback maps to feature flags — see
`21-FEATURE-FLAGS-AND-ROLLOUT.md`.

## Canonical Glossary

One term each. Do not introduce synonyms.

| Term | Definition | Do NOT call it |
|------|------------|----------------|
| inspector dock | `ComponentInspectorDock.tsx` detail surface | "right dock", "panel", "drawer" |
| stale | PRICING freshness only (`pricing_date` aged past 90 days) | do not use for link/snapshot state |
| source-changed | the link/snapshot-divergence state (enum `source-changed`) | "stale source" |
| folder | `library_folder_id`, optional organization axis | never conflate with category |
| category | `cost_library_items.category` text, required taxonomy axis | never conflate with folder |
| text-prompt dialog | the inline `ConfirmDialog`+`<input>` pattern (no standalone primitive exists) | "prompt", "PromptDialog", "InputDialog" |

Folder and category are **two distinct axes** — one optional organization, one
required taxonomy. Never collapse them in copy or schema reasoning.

## Canonical Quick Add Contract

Resolves docs 02 vs 09 vs 10. All fields below already exist as columns — Quick
Add needs **no schema change** and therefore does **not** violate the
`00-PLAN.md` "no schema changes" non-goal.

| Field | Column | Requirement |
|-------|--------|-------------|
| name | `name` | required |
| category | `category` (text) | required |
| unit | `unit` | required |
| unit_cost | `unit_cost` | required |
| supplier / brand | `supplier`/`supplier_id`, `brand`/`brand_id` | optional |
| pricing date | `pricing_date` | optional |
| pricing source | `pricing_source` | optional |
| confidence | `confidence` (free text) | optional |
| folder | `library_folder_id` | optional; defaults to the currently selected folder |

Advanced fields appear progressively after the required four. The Add/Edit
source fields must be normalized so both forms write the same columns.

## New Docs in This Pack

Reference these by name, not by description:

| Doc | Owns |
|-----|------|
| `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` | this keystone |
| `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` | event names / instrumentation |
| `21-FEATURE-FLAGS-AND-ROLLOUT.md` | per-phase flags / rollback |
| `22-COPY-DECK-AND-MICROCOPY.md` | user-facing strings |
| `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` | overlay primitives + z-index tiers |
| `24-EXECUTION-EVIDENCE-LEDGER.md` | pre-registered execution evidence (exact command, pass criterion, owner, phase) for every render/test/migration claim in the pack |

Overlay primitives (real exports, for doc 23) and z-index tiers:

| Primitive | Location |
|-----------|----------|
| `ConfirmDialog`, `ConfirmDialogMessage` | `ui/overlays/confirm-dialog.tsx` |
| `Modal` / `AppModal` / `BlurModal` | `ui/overlays/modal.tsx` (re-exported from `ui/modal.tsx`) |
| `Sheet`, `Drawer`, `SidePanel`, `InspectorDrawer` (+ `SheetProps`/`SheetSide`/`SheetSize`) | `ui/overlays/sheet-drawer.tsx` (no `SheetDrawer` export; narrow-screen Component Inspector uses `InspectorDrawer`, the Edit drawer uses the `Sheet`/`Drawer` family) |
| dialog / popover / command-dialog / hover-card / resizable-modal / tooltip | `ui/overlays/*.tsx` |
| `creatable-combobox` | `ui/creatable-combobox.tsx` — USE THIS for the Phase 4 template-move combobox |
| dropdown-popup / dropdown-menu / context-menu / action-menu / tabs | `ui/*.tsx` |

There is **no** shared text-prompt / `PromptDialog` / `InputDialog` primitive.
Folder create/rename must reuse the inline `ConfirmDialog`+`<input>` pattern from
`src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:531-883`, or explicitly scope extracting a new
primitive as its own task. Z-index tiers are exact Tailwind classes:
`z-[1000]` (modal) / `z-[1050]` (menu/popover) / `z-[1100]` (tooltip).

## Appendix — Re-verification Commands

Run these from the repo root before coding any phase. If a command's output
diverges from this doc, stop and reconcile this keystone first.

```sh
# Routes on disk (expect 4)
fd -t f "page.tsx" src/app/workshop/library/

# Surface file paths exist
ls src/components/workshop/library/ComponentInspectorDock.tsx \
   src/components/workshop/library/component-facet-filter.tsx \
   src/components/workshop/BulkDestructivePreviewModal.tsx \
   src/components/workshop/LibraryPageClient.tsx \
   src/lib/repositories/component-library-repository.ts

# Three 90-day sources of truth (expect 3 hits)
rg -n "COMPONENT_FACET_STALE_DAYS = 90" src/components/workshop/library/component-facet-filter.tsx
rg -n "LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90" src/lib/repositories/component-library-repository.ts
rg -n "older than 90 days" src/components/workshop/library/overview/LibraryOverview.tsx

# Freshness helpers
rg -n "getComponentPricingFreshness" src/components/workshop/library/component-facet-filter.tsx
rg -n "getStalenessTone|getStalenessLabel" src/components/workshop/component-library/helpers.ts

# Lifecycle enum (expect the five-value union)
rg -n '"draft" \| "in_production" \| "available" \| "discontinued" \| "archived"' src/lib/component-library/actions.ts

# workspace_role + link_state values (note: migration dumps are anonymized to 'n')
rg -n '"owner", "admin", "member", "viewer"' src/lib/supabase/types.ts

# No last_reviewed column anywhere (expect zero hits)
rg -n "last_reviewed|reviewed_at" supabase/migrations

# Native overlay debt to migrate (expect the cited line numbers)
rg -n "window\.(prompt|confirm)" src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
rg -n "Discard this component draft" src/components/workshop/component-library-manager/AddComponentModal.tsx
rg -n "window\.(prompt|confirm)" src/components/workshop/component-library/index.tsx

# The un-scoped cache-bleed key (expect the un-scoped literal)
rg -n "WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = " src/lib/component-library/query-keys.ts

# The insert-target resolver + bulk-archive confirmationHint
rg -n "resolveEstimateTemplateInsertTarget" src/lib/component-library/actions.ts
rg -n "confirmationHint = canExecute" src/components/workshop/BulkDestructivePreviewModal.tsx

# Client-side synchronous search (no async race)
rg -n "sheetItems.filter\(\(item\) => componentMatchesFacets" src/components/workshop/component-library-manager/ComponentLibraryManager.tsx

# Perf seed does NOT cover cost_library_items (expect zero hits)
rg -n "cost_library_items" scripts/seed-performance-test-data.ts

# Test commands
rg -n '"test"|"test:dom"|"validate"|"test:e2e"' package.json

# Inline text-prompt pattern to copy
rg -n "textPrompt" src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx
```
