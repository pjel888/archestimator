# 13 - Data Contracts, Route State, And Cache

All names below are bound to verified codebase symbols. The single source of
truth for tables, columns, enums, query keys, server actions, RPCs, and file
paths is `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`; this doc cites the
exact names but does not restate the full binding tables. Phase labels follow
the Canonical Phase Map in doc 19.

## Canonical Routes

- `/workshop/library` (`src/app/workshop/library/page.tsx`)
- `/workshop/library/components` (`components/page.tsx` ->
  `LibraryComponentsRoute.tsx` -> `LibraryPageClient.tsx` -> dynamic
  `ComponentLibraryManager`)
- `/workshop/library/templates` (`templates/page.tsx`)
- `/workshop/library/templates/[templateId]` — the per-template detail segment
  route **already ships** (`templates/[templateId]/page.tsx`). It is NOT
  historical and NOT a route to invent; template detail navigation MUST target
  this segment route, not a parallel query-param surface (see Template Route
  State below).

## Component Route State

Recommended query params:

- `component=<componentId>` opens the component inspector dock
  (`ComponentInspectorDock.tsx`). This `?component=<id>` route state lands in
  Phase 0B (Overlay & Route-State Reliability) per doc 19.
- Existing search/filter/folder/sort params remain intact. NOTE: the density
  toggle does NOT exist yet (net-new in Phase 5), and Components-tab browse is
  client-side filtered over an in-memory dataset, so a `pagination` param is
  only relevant once a server/virtualized path is introduced.
- Closing the inspector removes only `component`.
- Opening Quick Add should not reuse `component`; use a separate action state if
  a route param is needed.

Invalid `component` behavior:

- show an inspector-level not-found state
- preserve other search/filter context
- offer clear-selection action
- do not leak whether a cross-workspace object exists. RLS policies (which use
  the `is_workspace_member` predicate, migration `20260613201302`) already filter
  cross-workspace rows; the component-library loader returns no row, so it
  surfaces not-found rather than existence. (`is_workspace_member` is the RLS
  POLICY predicate, NOT an action-layer call — the loader/repository under
  `src/lib/component-library` never invokes it directly.)

Workspace switch behavior:

- selected object data from the previous workspace must not remain visible —
  see the Mutation Cache Contract "Workspace-switch cache-bleed surface" below;
  the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is the surface that must
  be invalidated/removed on switch
- route state can remain, but the current workspace must refetch and resolve it
  safely
- if invalid in the new workspace, show not-found/permission-safe state

### Route-state UX matrix (component + template)

Every route-state outcome binds to a concrete UI surface, a copy key (doc 22),
a telemetry event (doc 20), and an owning phase. Use "chip" (not "badge") for
any trust/freshness/status label rendered in these states (resolves C-002).

| State | UI surface | Copy key (doc 22) | Telemetry event (doc 20) | Owner / Phase |
| --- | --- | --- | --- | --- |
| Valid `?component=<id>` — component resolves in current workspace | Inspector dock (`ComponentInspectorDock.tsx`) opens on the item; card highlighted | `library.component_selected` | `library_component_selected` `{component_id, workspace_id}` | Frontend / 0B-1 |
| Not-found `?component=<id>` — id does not exist / not in workspace | Inspector stays closed; param cleared; not-found chip in the result strip | `library.route_not_found` | `component_route_not_found` `{outcome:"not_found"}` | Frontend / 0B |
| Permission-denied (viewer / foreign-workspace) | Inspector stays closed; permission-safe not-found (RLS via `is_workspace_member` migration `20260613201302` returns no row); NO existence leak | `library.permission_denied` | `route_state_authz_denied` `{component_id, workspace_id, outcome:"denied"}` | Security / 0A |
| Stale-after-workspace-switch — prior-workspace object no longer resolvable | Cache entry cleared/refetch; permission-safe not-found if invalid in new workspace | `library.stale_after_switch` | `workspace_switch_cache_recovery` `{from_workspace_id,to_workspace_id}` | Backend / 0A |
| Valid template segment route `/workshop/library/templates/[templateId]` | Template detail surface (segment route, shipped) | `library.template_opened` | `library_template_opened` `{template_id}` | Frontend / 4 |
| Not-found / permission-denied templateId | Not-found/permission-safe state; browse context preserved; no cross-workspace existence leak | `library.template_not_found` | `template_route_not_found` `{outcome}` | Frontend / 4 |

> These events MUST be wired in the phase that ships the surface; for closed
> beta the sufficient telemetry sink is `console.warn` (resolves C-009 — a prod
> telemetry sink is Phase-later). Doc 20 §12 couples events to feature flags:
> disabling a flag mutes its host feature's events.

## Template Route State

The per-template detail surface is the shipped segment route
`/workshop/library/templates/[templateId]`, NOT a `template=<id>` query param.
Reconcile any earlier `template=<templateId>` proposal to this:

- Navigation to a full template preview/detail MUST push the segment route
  `/workshop/library/templates/[templateId]` (already on disk), so the URL is
  shareable, deep-linkable, and back/forward correct.
- A lightweight in-list preview (peek without leaving the browse grid, Phase 4)
  MAY use an ephemeral selection state, but it MUST NOT introduce a competing
  `template=<id>` query param that diverges from the segment route. Pick one
  surface per intent: segment route for detail, transient state for peek.
- Because template detail is its own segment route (not a query param), it and
  `component` cannot drive two visible inspectors on the same screen — they live
  on different routes. The "inspector dock" (canonical term) is component-only;
  template detail is a full route, never a parallel `template=<id>` param.

Invalid `templateId` behavior mirrors invalid `component` behavior: render a
not-found/permission-safe state, preserve browse context, do not leak whether a
cross-workspace template exists. RLS already enforces this via
`is_workspace_member` / `is_workspace_editor`; the route loader surfaces the
not-found rather than leaking existence.

## Overview Component Payload Additions

Source table is `public.cost_library_items` (NOT a "components" table). Each
field below binds to a real column; do not introduce a field that lacks a column
without routing it through the Data Migration Gate.

Recent/overview component cards need enough data to show safe trust cues:

| Card field | Source column / derivation |
| --- | --- |
| id | `cost_library_items.id` |
| name | `cost_library_items.name` |
| category | `cost_library_items.category` (text — required taxonomy axis, distinct from `libraryFolderId` folder axis) |
| supplier / brand display | `cost_library_items.supplier` + `supplier_id` (FK `component_suppliers`), `brand` + `brand_id` (FK `component_brands`) |
| unit | `cost_library_items.unit` |
| unit cost | `cost_library_items.unit_cost` (and `misc_cost` if surfaced) |
| lifecycle state | `cost_library_items.lifecycle_state` (enum `component_lifecycle_state`: `draft` / `in_production` / `available` / `discontinued` / `archived`) |
| derived freshness | from `cost_library_items.pricing_date` (date \| null) via `getComponentPricingFreshness(item, now)` (`src/components/workshop/library/component-facet-filter.tsx:61`) -> the function's CURRENT return type is `Exclude<ComponentPricingFreshness,"any">` = `fresh/stale/missing` (`:64`; `any` is the FILTER-only sentinel, never a returned value — matches keystone 19 line 228); tone/label via `getStalenessTone` / `getStalenessLabel` (`src/components/workshop/component-library/helpers.ts:667/675` -> `success/warning/danger`). **Beta-scope 4-tier (resolves C-001/C-021):** `fresh` / `stale` / `very stale` / `missing`. Phase 2 EXTENDS `getComponentPricingFreshness` + `getStalenessTone`/`getStalenessLabel` + the THREE 90-day constants (`COMPONENT_FACET_STALE_DAYS`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS`, the `LibraryOverview.tsx:114` string) to a 180-day `very stale` tier (no schema change — helper-layer only). Until Phase 2 lands, the function returns the current 3 values; the 4-tier partition is the canonical target, not a 3-tier end state. |
| confidence label | derived over `cost_library_items.confidence` (text \| null, FREE TEXT — NOT an enum) |
| safe source label | derived display over `cost_library_items.pricing_source` (text \| null — this column IS the "source URL"; URL validity is validated app-side over free text) |
| image / fallback | `cost_library_items.thumbnail_path` + fallback metadata |
| updated timestamp | `cost_library_items.updated_at` (there is NO `last_reviewed` / `reviewed_at` column — see Component Detail Payload) |

"stale" in the table above means PRICING freshness only (canonical glossary).
The 90-day window is `COMPONENT_FACET_STALE_DAYS = 90`
(`src/components/workshop/library/component-facet-filter.tsx:12`) and must stay
in lockstep with `LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90`
(`src/lib/repositories/component-library-repository.ts:827`) and the hardcoded
"90 days" string
(`src/components/workshop/library/overview/LibraryOverview.tsx:114`); any new
"very stale" (e.g. 180-day) tier extends these three together, it does not
diverge.

Avoid exposing the raw `pricing_source` string in overview cards. Render only a
derived safe label there; keep the raw `pricing_source` value in protected
detail/edit surfaces only.

## Component Detail Payload

The protected inspector dock (`ComponentInspectorDock.tsx`, 315 lines) can
include the following, each bound to a real column or join:

- raw source string — `cost_library_items.pricing_source` (text \| null)
- price history — `cost_library_item_price_history` (workspace-scoped, RLS)
- usage / link counts — COMPUTED via `getCostLibraryComponentUsage` over
  `estimate_row_items` / `estimate_template_row_items` `source_library_item_id`,
  NOT a stored field
- snapshot / link status when opened from estimate context — `link_state` enum
  `estimate_row_link_state` (`unlinked` / `linked-clean` / `linked-overridden` /
  `detached` / `source-changed`) plus `source_snapshot` (Json). "Missing source"
  is a DERIVED UI state when the source item is deleted, not an enum value; use
  the canonical term "source-changed" for the link/snapshot axis (never "stale",
  which is reserved for pricing freshness).
- last-updated timestamp — `cost_library_items.updated_at`

There is **NO `last_reviewed` / `reviewed_at` column** on `cost_library_items`
(verified). Any "last reviewed" trust cue MUST either (a) re-scope to
`updated_at` for MVP, or (b) be gated behind the Data Migration Gate below as a
new column. Do not spec a "last reviewed" field as if it exists.

All protected fields require current workspace authorization. Writes guard via
`supabase.rpc("is_workspace_editor", { target_workspace_id })` as
defense-in-depth over RLS (already implemented); reads rely on RLS membership.

## Template Trust Payload

Source table is `estimate_templates`, which has ONLY `category` / `name` /
`description` / `metadata` / `sort_order` / `created_by` / `updated_at` /
`workspace_id`. There is NO review column on `estimate_templates`. Trust counts
are a COMPUTED JOIN over the template's rows, not stored fields.

Template cards/previews need:

| Card field | Source column / derivation |
| --- | --- |
| template id / name / description | `estimate_templates.id` / `name` / `description` |
| line / group count | COMPUTED over `estimate_template_row_items` |
| dependency count | COMPUTED: distinct `estimate_template_row_items.source_library_item_id` |
| missing-link count | COMPUTED: rows whose `source_library_item_id` no longer resolves (derived "source-changed", not an enum) |
| source-changed count | COMPUTED via `estimate_template_row_items.link_state = 'source-changed'` |
| archived / discontinued dependency count | COMPUTED join to `cost_library_items.lifecycle_state in ('archived','discontinued')` |
| last updated | `estimate_templates.updated_at` (there is NO `last_reviewed`/review column on `estimate_templates`) |
| target insert capability | per Insert Target Contract below |

Template trust is derived ENTIRELY from dependency health (the computed joins
above). There is no "template review metadata" to read; re-scope any "last
reviewed" cue to `estimate_templates.updated_at`, or gate a new review column
behind the Data Migration Gate. Use "source-changed" for the link axis and
"stale" for pricing freshness only (canonical glossary).

## Insert Target Contract

Insert-target selection and resolution use existing server actions
(`src/lib/component-library/actions.ts`, `"use server"`):

- `listEstimateInsertTargets` — enumerates valid project/estimate targets for
  the picker UI.
- `resolveEstimateTemplateInsertTarget` — THE server-side insert-target resolver
  invoked before mutation (also referenced by doc 02 Flow 7); it re-resolves the
  chosen target and returns a recovery state on stale/missing.

Every insert action must display:

- target project
- target estimate
- whether the target is active/current

Before mutation (enforced by `resolveEstimateTemplateInsertTarget`):

- re-resolve target on the server
- verify current workspace ownership via
  `supabase.rpc("is_workspace_editor", { target_workspace_id })`
- verify the user can mutate the target estimate via
  `supabase.rpc("can_edit_estimate", { target_estimate_id })` (defense-in-depth
  over RLS, already implemented)
- verify source component/template is readable and insertable
- detect stale target or missing estimate and return a recovery state via the
  typed errors in `src/lib/component-library/action-errors.ts`

Never silently choose a different target.

## Mutation Cache Contract

Query keys are defined in `src/lib/component-library/query-keys.ts`. Each
mutation row below names the EXACT key(s) to invalidate. Shorthand:

- `LIBRARY` = `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` = `["workspace-component-library"]` (Phase 0A: migrated to `workspaceComponentLibraryQueryKey(workspaceId)` per the BLOCKER section below)
- `LITE` = `WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY` / `workspaceComponentLibraryLiteQueryKey(projectId)`
- `ROWS` = `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` / `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`
- `TEMPLATES` = `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY` / `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })`

Per-row owner/phase/flag/rollback tags (resolves the per-mutation
accountability gap — under the relaxed scope of doc 34 §3 these are
implementation-task rows, so they carry the four actionable dimensions; flag
rollback = redeploy `flag=false`, fix-forward ~5 min per C-010):

| Mutation (server action) | Query key(s) to invalidate | Owner (doc 27) | Phase | Flag (doc 21) | Rollback |
| --- | --- | --- | --- | --- | --- |
| Create/update component (`createCostLibraryComponent` / `updateCostLibraryComponent`) | `LIBRARY`, `ROWS`, `LITE`; `TEMPLATES` only if dependency health surfaced | Frontend lead | 3 | `library_quick_add` | redeploy `flag=false` -> revert mutation + re-invalidate `LIBRARY`/`ROWS`/`LITE` |
| Update price option (`upsertCostLibraryComponentPriceOption`) | `LIBRARY`, `ROWS`, `LITE` (freshness/price recompute) | Frontend lead | 3 | `library_quick_add` | redeploy `flag=false` |
| Change lifecycle / archive (`changeCostLibraryComponentLifecycleState`) | `LIBRARY`, `ROWS`, `LITE`, `TEMPLATES` (archived/discontinued dependency counts) | Frontend lead | 3 | `library_quick_add` | redeploy `flag=false` |
| Bulk archive (`previewBulkArchiveLibraryComponents` is read-only; `executeBulkArchiveLibraryComponents`) | `LIBRARY`, `ROWS`, `LITE`, `TEMPLATES`; clear selected inspector state | Frontend lead | 0B | none (`git revert`) | `git revert` (copy fix) + re-invalidate `LIBRARY`/`ROWS`/`LITE`/`TEMPLATES` |
| Create/rename/delete/reorder folder (`createLibraryFolder` / `renameLibraryFolder` / `deleteLibraryFolder` / `reorderLibraryFolders`) | `LIBRARY`, `ROWS` (folder sidebar + per-folder counts) | Frontend lead | 0B | `library_folder_dialogs` | redeploy `flag=false` -> legacy `window.*` branch (emergency only) |
| Move component to folder (`moveCostLibraryComponentToFolder`) | `LIBRARY`, `ROWS` | Frontend lead | 0B | `library_folder_dialogs` | redeploy `flag=false` |
| Create/update template (template-editor actions) | `TEMPLATES` | Frontend lead | 4 | `library_trust_chips` (summary layer) | redeploy `flag=false` |
| Insert component/template into estimate (insert via `insertEstimateTemplateIntoEstimate` (`src/lib/estimates/actions.ts:2309`, template -> estimate) / `insertTemplateIntoTemplate` (`template-editor-actions.ts:484`, template -> template); `resolveEstimateTemplateInsertTarget` only RESOLVES the target, it is not the mutation — keystone 19 lines 269-275) | the target estimate's tree key invalidated in `use-estimate-row-mutations.ts` (`estimateQueryKeys.tabTree(estimateId, tabId)` / `estimateQueryKeys.areaTree(estimateId)`, see `:333`), plus `ROWS` (`workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`) and `LIBRARY` for recent/reuse (the same two keys `use-estimate-row-mutations.ts:335` invalidates); usage recompute reads `getCostLibraryComponentUsage` (`actions.ts:1495`) | Backend lead | 4 | none (`git revert`) | `git revert`; the resolver re-resolves so a stale target cannot mutate the wrong estimate |
| Update source/trust metadata (`updateCostLibraryComponent`) | `LIBRARY`, `ROWS`, `LITE`; `TEMPLATES` if dependency health surfaced | Frontend lead | 2 | `library_trust_chips` | redeploy `flag=false` |

### Workspace-switch cache-bleed surface (BLOCKER)

`WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` is
**UN-SCOPED** — it carries no `workspaceId`. Its primary READER is
`TemplateEditorClient.tsx:160` (`useQuery` for the template-editor library dock), which
uses the inline literal `["workspace-component-library"]` — the same cache entry, so a
symbol-name grep misses it. The template editor ALSO self-invalidates that same
literal at `TemplateEditorClient.tsx:166` (`void queryClient.invalidateQueries({
queryKey: ["workspace-component-library"] })`), so there are FIVE call sites to
migrate, not four. Other invalidators: `LibraryPageClient.tsx:126`,
`use-estimate-row-mutations.ts:335`, and `EstimateSheetContent.tsx:1238/1241`
(the in-estimate dock). This is the ONE real workspace-switch cache-bleed
surface: on workspace switch its cached entry can show the previous workspace's
data.

**Decision (Phase 0A, resolves C-007):** migrate `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`
to a workspace-scoped factory mirroring `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`
— e.g. `workspaceComponentLibraryQueryKey(workspaceId)` — and migrate ALL FIVE
call sites in one atomic change:

1. the reader `useQuery` at `TemplateEditorClient.tsx:160` (inline literal -> factory call),
2. the self-invalidate at `TemplateEditorClient.tsx:166` (inline literal -> factory call),
3. `LibraryPageClient.tsx:126`,
4. `use-estimate-row-mutations.ts:335`,
5. `EstimateSheetContent.tsx:1238/1241`.

Because the editor reads via the inline literal (not the symbol), a symbol-name
grep is NOT sufficient — grep BOTH the symbol AND the literal `["workspace-component-library"]`
or the reader at `:160` and the self-invalidate at `:166` are missed (a known
cache-bleed surface). Do NOT invent an abstract `library:<workspace_id>:<surface>`
key shape — the real fix is the factory mirroring the rows-library key.
Invalidate-on-switch is the FALLBACK only if the factory migration slips; it is
NOT the chosen path.

- The scoped keys (`ROWS` via `workspaceComponentRowsLibraryQueryKey(workspaceId)`
  and `TEMPLATES` via `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })`)
  already encode workspace identity and are cross-workspace tested; do NOT
  re-flag those as the bleed surface.

Phase 0A must scaffold a cache test that asserts the workspace-scoped factory
entry does not leak across a simulated workspace switch. This is pre-registered
as evidence `ADV-WS-SWITCH-CACHE` in `24-EXECUTION-EVIDENCE-LEDGER.md`:
command `vitest run tests/vitest/library-workspace-switch-cache.test.tsx`
(net-new); pass criterion — after a simulated workspace A -> B switch with the
inspector/editor dock open, the scoped cache entry clears/refetches and the
assertion covers ALL FIVE migrated call sites (reader `:160`, self-invalidate
`:166`, `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:335`,
`EstimateSheetContent.tsx:1238/1241`), so no prior-workspace detail is
observable; owner Phase 0A Contract Lock (Backend lead, doc 27); gate
`bun run test:dom`. This gates the doc 13 key-scoping change (see doc 19 phase
map and doc 24).

## Server Action Contract

Server actions remain the preferred mutation surface for protected Library work.
Extend the EXISTING pattern, do not invent a new one:

- Component/library actions: `src/lib/component-library/actions.ts` (`"use server"`).
- Template editor actions: `src/lib/component-library/template-editor-actions.ts`.
- Typed errors: `src/lib/component-library/action-errors.ts`.

NOTE (verified gotcha): a `"use server"` file may export ONLY async functions.
`tsc` and Vitest miss a non-async export there; only `next build` catches it. Run
`bun run build` after editing any actions file.

Each server action should (mirroring the existing actions above):

- derive user/workspace context server-side
- validate actor capability via `supabase.rpc("is_workspace_editor", { target_workspace_id })`
  (and `can_edit_estimate` for estimate-target writes) as defense-in-depth over RLS
- validate object belongs to current workspace
- validate input shape and length
- perform mutation through the backing RPC (e.g. `create_cost_library_component`,
  `update_cost_library_component`, `set_cost_library_component_lifecycle_state`,
  `upsert_cost_library_component_price_option`,
  `execute_bulk_archive_library_components`, `delete_library_folder`,
  `reorder_library_folders`) inside the smallest safe transaction
- return permission, validation, conflict, stale-target, and network/database
  errors distinctly (via `action-errors.ts`) enough for UI recovery
- trigger scoped revalidation per the Mutation Cache Contract above

## Schema-Readiness Verdict

The existing `cost_library_items` schema is SUFFICIENT for this pack with NO
schema change:

- lifecycle (`lifecycle_state` enum), pricing (`pricing_date`, `unit_cost`,
  `misc_cost`, price history table), supplier/brand (`supplier`/`supplier_id`,
  `brand`/`brand_id`), source (`pricing_source`), and confidence
  (`confidence`, free text) are all present.
- The Quick Add contract (required: `name`, `category`, `unit`, `unit_cost`;
  optional: supplier/brand, `pricing_date`, `pricing_source`, `confidence`,
  `libraryFolderId`) needs NO new column — it does NOT violate the doc 00
  "no schema changes" non-goal.

Only TWO things would need a migration, both DEFERRED unless explicitly pulled
in: (1) a `last_reviewed` / `reviewed_at` column (does not exist on
`cost_library_items` or `estimate_templates`), and (2) a controlled vocabulary
(enum/CHECK) for `confidence` and/or `category` (both are free text today).

## Data Migration Gate

If implementation needs new columns (e.g. `last_reviewed`), indexes, RLS
policies, or RPCs:

- create a scoped migration under `supabase/migrations`
- add rollback/fix-forward notes
- update generated types ADDITIVELY (splice new tables/columns; a raw
  `gen:types` overwrite drops a hand-added export + RPC drift and breaks the
  build — do not regenerate `types.ts` wholesale)
- **Migration-ledger reconciliation:** if SQL is applied via
  `supabase db query --file ...`, it writes NO `schema_migrations` row and the
  ledger drifts. Reconcile with
  `supabase migration repair --status applied <version>` (NOT MCP
  `apply_migration`) so the ledger matches the applied schema.
- run `bun run build` (a `"use server"` actions edit only surfaces at build) and
  `bun run validate` before claiming the gate is closed
- add provider-scoped validation against the Archestimator REMOTE Supabase
  project ref `ebxxqidacheyapmmzavr` (this is the remote project ref; the local
  name `archestimator` from `config.toml` `project_id` is NOT the ref)
- **Confirm the remote ref before validating** (owner: the migration author, at
  the start of the gate): run `supabase projects list` (or read
  `NEXT_PUBLIC_SUPABASE_URL`) and expect the ref `ebxxqidacheyapmmzavr`; if it
  diverges, do NOT trust the hardcoded literal — re-point the gate at the
  confirmed ref. This pre-registers the check so a stale ref cannot silently
  validate against the wrong project.
- do not touch unrelated provider projects
