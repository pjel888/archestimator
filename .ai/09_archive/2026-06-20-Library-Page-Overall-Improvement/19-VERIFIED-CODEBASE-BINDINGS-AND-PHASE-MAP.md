# 19 — Verified Codebase Bindings and Phase Map (Keystone)

Status: authoritative. Last verified against `main` on 2026-06-21.

> **Cross-references (2026-06-21):** Conflict resolutions for cross-doc
> inconsistencies involving these bindings are logged in
> `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`. The 12-dimension row-level
> completeness standard (including `Binding:` field requirements) is in
> `34-ROW-LEVEL-COMPLETENESS-MATRIX.md`. Owner/accountability for these
> bindings is in `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` (Planning lead owns
> this keystone). The DB/RLS/migration contract that deepens these bindings is
> in `33-DB-RLS-AND-MIGRATION-CONTRACT.md`.

## Purpose

> **Doc type note (2026-06-21):** This keystone is a **binding / reference
> registry**, not an implementation task list. Its rows are **informational**
> under the relaxed scope of `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3 — they
> delegate the other 11 row-level dimensions (Owner / Rollback / Telemetry /
> Evidence / etc.) to the companion docs that consume each binding
> (`27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md`, `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`,
> `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`, `24-EXECUTION-EVIDENCE-LEDGER.md`,
> `21-FEATURE-FLAGS-AND-ROLLOUT.md`). This is why this doc scores high on
> Readiness while carrying low 12-dimension row-completeness: it is a registry,
> not a task ledger. Do not pad its rows with per-binding Owner/Rollback/Telemetry
> columns — that is ceremony that belongs in the consuming docs.

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

In-scope adjacent live file the prose plan omits but `00-PLAN.md` scope covers
(`component-library/index.tsx` is **Phase-later residual — tracked, not in
phases 0A-5 critical path**; see `05-IMPLEMENTATION-ROADMAP.md` §Phase-later):

| File | Native-overlay debt | Disposition |
|------|---------------------|-------------|
| `src/components/workshop/component-library/index.tsx` | `window.confirm("Discard component changes?")` :941, `window.prompt("Folder name")` :1467 | estimate-page panel; Phase-later, but list it — do not silently drop |

### Reference glass-surface system (binding for doc 35)

Any Library liquid-glass migration must mirror the shipped estimate-surface
per-region variant model — do not invent a parallel glass system. This is the
canonical reference a sibling doc (35) binds to:

| Surface | Real path | Notes |
|---------|-----------|-------|
| Estimate surface variant | `src/components/workshop/estimate-surface-variant.tsx:21` | `EstimateSurfaceVariant = "paper" \| "glass"` context (:21), `EstimateSurfaceVariantProvider` (:25), `useEstimateSurfaceVariant()` (:39), and a SLOT map whose slots include `root`/`treeRail`/`libraryRail`/`centerColumn` (with `centerColumnFallback`)/`chromeToolbar` (slot union :51-68, switch :85-126). This is the canonical per-region variant model for any Library glass migration (see [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md)). |
| Estimate glass classes | `src/app/globals.css:1545-1637` | `.estimate-glass-well` (:1545), `.estimate-glass-rail` (:1568), `.estimate-glass-paper` (:1589), with `[aria-current]`/`[data-estimate-row-active]`/`[data-replace-target-active]` surface-state hooks through :1637. The Library glass skeleton (doc 35 §12.3) reuses this one-blur-per-region discipline. |

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
truth. Per C-021 (see `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`), the
4-tier beta scope is `fresh` / `stale` / `very stale` / `missing`: the
implementation extends `getComponentPricingFreshness`
(`component-facet-filter.tsx:61`) + `getStalenessTone`/`getStalenessLabel`
(`component-library/helpers.ts:667`/`:675`) + the THREE 90-day constants above
to a 180-day `very stale` tier in **Phase 2** (no schema change — a helper-layer
extension only). Any sibling doc that presents a 3-tier `fresh/stale/missing`
formulation is describing the *current* helper return and must note the Phase-2
4-tier extension; the binding canonical freshness is 4-tier.

## Query Keys

Real keys from `src/lib/component-library/query-keys.ts`:

| Key / factory | Scoped? | Notes |
|---------------|---------|-------|
| `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` | **NO** | the ONLY real workspace-switch cache-bleed surface. PRIMARY READER (inline literal, so a symbol-name grep misses it): `TemplateEditorClient.tsx:160` (`useQuery`, the template-editor library dock). WRITERS (`invalidateQueries`) — **verified 2026-06-21**: `TemplateEditorClient.tsx:166` (template-editor self-invalidate, inline literal), `LibraryPageClient.tsx:126` (symbol), `use-estimate-row-mutations.ts:413` (symbol), `EstimateSheetContent.tsx:1300` AND `:1303` (symbol, two writers in the in-estimate dock). `query-keys.ts:5-6` documents it as "used by the Library management surfaces (template editor, component manager)." Scoping the key MUST migrate ALL SIX call sites — the reader at `:160`, the self-invalidate at `:166`, and the four writers — or the bleed stays open. A scoping test that mocks only the four commonly-cited sites misses the `:166` self-invalidate and the `:1303` second writer. **Line numbers drift on every edit to the host file** — re-run the keystone's "Provenance Footer" verify-command #2 before relying on any specific line; the stable identifier is the symbol `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` + the inline literal `["workspace-component-library"]`, found via `rg -n 'queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY|queryKey: \["workspace-component-library"\]' src/`. |
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
**`insertEstimateRowItemFromLibrary`** (`:2464`), with siblings
**`replaceEstimateRowItemWithLibrary`** (`:2559`) and
**`detachEstimateRowItemFromLibrary`** (`:2595`). This is the action a component
insert flow (and doc 20's component-path `insert_target_confirmed`) must call.

Insert mutations (resolve ≠ insert): for **template -> ESTIMATE**, the
`InsertIntoEstimatePicker.tsx` submit handler (`:99-118`) calls
`resolveEstimateTemplateInsertTarget` to get the parent node, then performs the
insert via **`insertEstimateTemplateIntoEstimate`** (`@/lib/estimates/actions`).
For **template -> template** (editor dock), the insert is
**`insertTemplateIntoTemplate`** (`template-editor-actions.ts:484`). For a single
library **COMPONENT -> ESTIMATE**, the insert action is
**`insertEstimateRowItemFromLibrary`** (`src/lib/estimates/actions.ts:2464`); the
related ops are **`replaceEstimateRowItemWithLibrary`** (`:2559`) and
**`detachEstimateRowItemFromLibrary`** (`:2595`). Do not conflate these with the
template inserts above, and do not conflate the resolver with any insert action.

Writes guard via `supabase.rpc("is_workspace_editor",{target_workspace_id})` and
`rpc("can_edit_estimate",{target_estimate_id})` as defense-in-depth over RLS
(already implemented). Errors live in `action-errors.ts`; the template editor in
`template-editor-actions.ts`.

RPCs (real): `is_workspace_editor`, `is_workspace_member`,
**`is_workspace_admin(target_workspace_id uuid)`** — owner+admin only authz
primitive (definition hoisted/declared at
`supabase/migrations/20260620103306_rls_initplan_hoist.sql:56`, comment block
`:53-56`; returns true when the caller is a `workspace_members` row with role
in `('owner','admin')`). Consumed by owner-scoped policies across
`auth_account_data`, `ai_audit_foundation`, `mass_deletion_governance`, and the
core public-policy split. `can_edit_estimate`,
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
| 1 | Findability & Applied Filters | overview search continuity to `?component=<id>`; visible applied-filter chips + reset; result count/scope strip. **Library workspace glass skeleton** (doc 35 §12.1-12.5): glass well + floating rails/paper + chrome + liquid buttons + warm CTA + the `LibrarySurfaceVariantProvider` + workspace track grid + catalogue content grid + overview bento (the per-region variant model binding is in the "Reference glass-surface system" subsection above). This is the C-022 glass-shell scope decision (resolves doc 35 vs this phase map — the shell is Phase 1). Content-grade card glass stays Phase 2 (component cards) / Phase 5 (template cards). | old "phase 1", 05 "P1" |
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
| `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` | liquid-glass Library UX/UI spec — surface-variant slot system (mirrors the estimate-surface model bound above), workspace/content grids, glass overlays, warm-glass CTAs, content-grade card glass. The material/grid layer referenced by any doc that discusses the Library visual language. |

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

## Per-Phase Owner/Role and Rollback (bindings that change most often)

> Closes the doc-25 §3 gap "no per-phase owner/role matrix inside keystone" and
> "no rollback mapping in keystone itself." Owner roles come from
> `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` §2; flags from `21-FEATURE-FLAGS-AND-ROLLOUT.md`;
> rollback mechanics from `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`. These are the
> bindings that drift most when the underlying code changes — scoping the key or
> moving a native prompt shifts the line numbers cited above; re-run the
> "Appendix — Re-verification Commands" before each phase to catch the drift.

| Phase | Lead role (doc 27) | Flag (doc 21) | Rollback (one-line) | Bindings most likely to drift |
|-------|--------------------|---------------|---------------------|-------------------------------|
| 0A Contract Lock | Security lead (authz/cache/redaction suites) + Perf lead (seed+baseline) | n/a (test/contract only) | Revert the scaffold commit; no shipped behavior | Query Keys section (6 cache-bleed call sites), snapshot-redaction line refs in publication/actions.ts |
| 0B Overlay & Route-State Reliability | Frontend lead | `library_folder_dialogs`, `library_component_deep_link` | `git revert` the 0B commit + redeploy; flags flip off (~5 min, C-010) | Native-overlay-debt table (`ComponentLibraryManager.tsx:1493/1515/1534`, `AddComponentModal.tsx:963`), `confirmationHint` at `BulkDestructivePreviewModal.tsx:107-108` |
| 1 Findability & Applied Filters | Frontend lead | `library_component_deep_link`, glass-shell flag per doc 21 §4 (C-022) | Revert + redeploy; glass variant defaults to paper | Route-state ruling (`?component=<id>` vs segment route), estimate-surface-variant.tsx reference |
| 2 Source Trust at Decision Points | Frontend lead (chips) + Security lead (redaction re-test) | `library_trust_chips` | Revert + redeploy | The THREE 90-day constants + `getComponentPricingFreshness`/`getStalenessTone`/`getStalenessLabel` (Phase-2 "very stale" extension must touch all in lockstep — C-021) |
| 3 Add/Edit Component Flow Split (Quick Add) | Frontend lead + Security lead (`ADV-VIEWER-MUTATION`) | `library_quick_add` | Revert + redeploy | Canonical Quick Add Contract (column existence), `is_workspace_editor` RPC |
| 4 Templates Browse/Insert/Editor Clarity | Backend lead (insert) + Frontend lead (combobox) | reuses `library_trust_chips` | Revert + redeploy | `resolveEstimateTemplateInsertTarget` at `actions.ts:1451`; the three estimate-row insert actions at `estimates/actions.ts:2464/2559/2595` |
| 5 Dense Maintenance Mode & Browser-Proven Polish | Perf lead (budgets) + QA lead (browser proof) | `library_dense_mode`, `library_virtualization_enabled` | Redeploy flag=false (fix-forward, ~5 min, C-010) | `WORKSHOP_VIRTUALIZATION_FLAGS` reuse; perf budgets PROVISIONAL until Phase 0A baseline (C-015) |

A binding in this keystone is **stale** when an "Appendix — Re-verification
Commands" run diverges from the cited line. Stop and reconcile this doc first
(keystone wins — see "Purpose"); then propagate the corrected line to every
sibling doc that cites it (the sibling-doc list in "Purpose" maps which doc
binds to which section).

## End-User Acceptance Criteria per Route/State

> Closes the doc-25 §3 gap "no direct end-user acceptance criteria per
> route/state." These are the **end-user-visible** pass conditions an
> acceptance tester checks per route and state — not the per-ADV adversarial
> cases (those live in `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`). The
> binding column points at the route owner file. Owner roles from doc 27.

| Route / state | End-user acceptance criterion (observable, no test runner) | Owner role | Binding (file) |
|---------------|------------------------------------------------------------|------------|----------------|
| `/workshop/library` (overview) | A user lands on the Library overview; recent components and search are visible; clicking a recent component opens it in the Components tab with `?component=<id>`; the active tab + panel ARIA semantics are correct; selection + result count announced once | Frontend lead | `src/app/workshop/library/page.tsx`; `overview/LibraryOverview.tsx`; `overview/LibraryOverviewSearch.tsx:258` |
| `/workshop/library/components` | A user browses, filters (supplier/brand/lifecycle/confidence/freshness), and selects a component; applied-filter chips are visible, individually removable, and clear-all resets them; the inspector dock shows the selected component's detail; a foreign-workspace `?component=<id>` shows permission-safe not-found (no object detail leaked) | Frontend lead | `src/app/workshop/library/components/page.tsx`; `ComponentLibraryManager.tsx`; `ComponentInspectorDock.tsx` |
| `/workshop/library/components?component=<foreign-id>` (denied) | A user cannot see another workspace's component detail; RLS returns not-found/denied with no name/cost/source leaked; the `route_state_authz_denied` telemetry event fires once | Security lead | `LibraryPageClient.tsx` (route state, Phase 0B net-new) |
| `/workshop/library/templates` | A user browses template thumbnails; opening one navigates to `/workshop/library/templates/[templateId]` (the shipped segment route — NOT `?template=<id>`); trust counts render as a computed JOIN over `source_library_item_id`/`link_state`, not a stored column | Frontend lead | `src/app/workshop/library/templates/page.tsx`; `templates-browse/TemplatesBrowsePageClient.tsx` |
| `/workshop/library/templates/[templateId]` | A user previews a template; insert target is named via `resolveEstimateTemplateInsertTarget`; a `discontinued`/`archived`/missing-source dependency warns/blocks/overrides before insert; a stale/foreign target is rejected server-side via `can_edit_estimate` | Backend lead | `src/app/workshop/library/templates/[templateId]/page.tsx`; `templates-browse/InsertIntoEstimatePicker.tsx:99-118` |
| Workspace switch with inspector dock open | A user switches workspaces; the inspector dock does NOT show the prior workspace's component detail; the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is scoped by `workspaceId` and refetches | Backend lead | `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (6 call sites: reader `TemplateEditorClient.tsx:160`, self-invalidate `:166`, writers `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:413`, `EstimateSheetContent.tsx:1300`+`:1303` — verify with the keystone provenance command before relying on line numbers) |
| Folder create/rename/delete | A user manages folders via the inline `ConfirmDialog`+`<input>` text-prompt pattern (NOT `window.prompt`/`window.confirm`); delete confirmation names affected count and never conflates folder with category; server failure keeps the error visible | Frontend lead | `ComponentLibraryManager.tsx:1493/1515/1534` |
| Add Component (Quick Add) | A user fills required fields (`name`/`category`/`unit`/`unit_cost`); advanced fields appear progressively; a dirty close opens the text-prompt `ConfirmDialog` (NOT `window.confirm`); a `viewer`-role actor's trigger is hidden/disabled and the server denies via `is_workspace_editor` | Frontend lead | `component-library-manager/AddComponentModal.tsx:963` |
| Bulk archive | A user selects components and archives; the preview's `confirmationHint` does NOT claim "cannot be undone" for archive (lifecycle `archived` is recoverable); partial-invalid IDs are reported as skipped | Frontend lead | `BulkDestructivePreviewModal.tsx:107-108` |
| Public `/share/[token]` snapshot | A recipient opens a shared link; the frozen snapshot from `project_publications.snapshot_json` renders; `pricing_source`, free-text `confidence`, and price history are NEVER in the snapshot (redaction is what the builder serializes, not a live endpoint) | Security lead | `src/lib/publication/actions.ts` (snapshot writes at `:577`/`:653`/`:716`); `src/app/share/[token]` |

## Browser-Proof Requirement per Route

> Closes the doc-25 §3 gap "no browser/screenshot proof requirements in this
> file." The jsdom-vs-Playwright boundary is canonical in
> `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md`; this section names which Library
> routes REQUIRE a real browser screenshot before the phase can be called done,
> and which jsdom can prove. Screenshot storage + browser matrix live in
> `24-EXECUTION-EVIDENCE-LEDGER.md` ("Artifact storage, naming, and measurement
> rules") and doc 29 §4.

| Route / surface | jsdom proves | Playwright/manual browser REQUIRED for | Evidence row in doc 24 |
|-----------------|--------------|----------------------------------------|------------------------|
| `/workshop/library` overview + search | route-state DOM into `?component=<id>`; ARIA semantics; result-count announcement | real route navigation/back-forward across tabs; mobile overview layout | EV-06-019 |
| `/workshop/library/components?component=<id>` deep link | recoverable not-found state (RLS-driven) | back/forward behavior; mobile inspector-dock drawer overlap at narrow viewport | EV-06-019, EV-06-020 |
| Folder drag/drop reorder | (n/a — pointer behavior) | drop-target highlighting; order persistence after drop | EV-06-022 |
| `AddComponentModal` + nested listbox | Escape closes `z-[1050]` listbox before `z-[1000]` modal; `aria-invalid` on required fields | cross-portal focus trap if a portal/trap changes | EV-06-023 |
| Overlay z-index stack | (n/a — visual stacking) | menu above modal; tooltip above menu (`z-[1000]`/`z-[1050]`/`z-[1100]`) | EV-06-021 |
| Dense-mode 500-row render + scroll | ARIA/focus assertions | no visible stall within perf budget; chip-wrap on mobile; touch targets ≥44×44px | EV-06-024, EV-06-025 |
| Glass-surface render (doc 35) | (n/a — real `backdrop-filter` + `data-glass` arming) | one-blur-per-region; AA contrast on glass; deferred arming via `<html data-glass="ready">` | ADV-VISUAL-GLASS (doc 18) |

A phase that touches a "Playwright REQUIRED" surface is NOT done until the
matching doc-24 evidence row has a captured screenshot + `.json` metadata per
doc 29 §4. jsdom-only phases (e.g. a pure copy change) cite this table to
justify skipping browser proof.

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

## Provenance Footer (machine-readable)

> Closes the doc-25 §3 gap "no compact machine-readable provenance block
> (command output hash/timestamp)." These three commands are the README
> "verify this pack is current" checks; each must produce the expected output
> or the keystone is stale and must be reconciled before any phase is built.

```yaml
last_verified: "2026-06-21"
against_ref: "main @ 1edcc54c"
verify_commands:
  # EXPECT: exactly 4 page.tsx files under src/app/workshop/library/
  - cmd: "fd -t f 'page.tsx' src/app/workshop/library/"
    expect_count: 4
    expect_paths:
      - "src/app/workshop/library/page.tsx"
      - "src/app/workshop/library/components/page.tsx"
      - "src/app/workshop/library/templates/page.tsx"
      - "src/app/workshop/library/templates/[templateId]/page.tsx"
  # EXPECT: exactly 6 cache-bleed call SITES (by line, not by file —
  #  EstimateSheetContent.tsx has TWO writers on one file). Verified
  #  2026-06-21 against the working tree:
  #  reader TemplateEditorClient.tsx:160 + self-invalidate :166;
  #  writers LibraryPageClient.tsx:126, use-estimate-row-mutations.ts:413,
  #  EstimateSheetContent.tsx:1300 + :1303.
  #  LINE NUMBERS DRIFT ON EVERY EDIT to the host file — a grep returning
  #  fewer than 6 LINES means the key was scoped OR a call site was
  #  added/dropped; reconcile this doc. The stable identifier is the
  #  symbol + inline literal, not the line number.
  - cmd: >
      rg -n 'queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY|queryKey: \["workspace-component-library"\]'
      src/ | grep -v query-keys.ts
    expect_line_count: 6
    expect_sites:
      - "src/components/workshop/library/template-editor/TemplateEditorClient.tsx:160 (reader, inline literal)"
      - "src/components/workshop/library/template-editor/TemplateEditorClient.tsx:166 (self-invalidate, inline literal)"
      - "src/components/workshop/LibraryPageClient.tsx:126 (writer, symbol)"
      - "src/hooks/use-estimate-row-mutations.ts:413 (writer, symbol)"
      - "src/components/workshop/EstimateSheetContent.tsx:1300 (writer, symbol)"
      - "src/components/workshop/EstimateSheetContent.tsx:1303 (writer, symbol)"
  # EXPECT: 4 native-prompt hits in component-library-manager (the 0B target)
  #  AddComponentModal.tsx:963 (1) + ComponentLibraryManager.tsx:1493/1515/1534 (3) = 4
  - cmd: >
      rg -c 'window\.(prompt|confirm)'
      src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
      src/components/workshop/component-library-manager/AddComponentModal.tsx
    expect_total_count: 4
    expect_per_file:
      ComponentLibraryManager.tsx: 3   # :1493 create, :1515 rename, :1534 delete
      AddComponentModal.tsx: 1         # :963 dirty-discard
reconcile_rule: "If any command diverges, STOP and reconcile this keystone first (it wins per 'Purpose'); then propagate corrected line numbers to every sibling doc that cites the drifted binding."
```
