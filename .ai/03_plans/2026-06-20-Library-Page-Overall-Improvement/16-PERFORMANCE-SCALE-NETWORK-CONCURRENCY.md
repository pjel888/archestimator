# 16 - Performance, Scale, Network, And Concurrency

> Bindings are canonical in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`
> ("Performance Reality" + "Canonical Phase Map"). This doc does not restate the
> full binding tables; it scopes the perf/network/concurrency work against them.
> Phase labels here use the canonical map (0A, 0B, 1-5).

## Current Reality (read before scoping any work)

Two facts re-scope most of this doc away from "fix a live race" toward "measure,
then reduce payload":

1. The Components-tab search/filter is **100% client-side synchronous filtering**
   over an already-in-memory dataset. The visible set is a pure `useMemo` over
   `sheetItems` (`ComponentLibraryManager.tsx:876-882` — `facetedItems` useMemo at
   :876, `sheetItems.filter(componentMatchesFacets)` at :877, and the
   `facetedItems.filter(itemMatchesSheetQuery)` search at :881-882). No fetch is
   issued per keystroke, so there is **no
   out-of-order / stale-response race today**. The "Out-Of-Order Responses" and
   "Query And Search Strategy" server-search sections below are
   FUTURE-if-budget-exceeded work, not a current defect.
2. The real perf risk is the **browse fetch payload**. The management browse path
   `loadCurrentWorkspaceComponentRowsLibrary` (`actions.ts:445`) calls
   `getCurrentWorkspaceComponentRowsLibrary` (`component-library-repository.ts:795`),
   which defaults to `includeDetailGraph: true` (repository default at
   `component-library-repository.ts:533`) and eagerly loads the full nested detail
   graph per item — `cost_library_item_versions`, `cost_library_item_price_history`,
   `cost_library_item_state_history`, and attachments
   (`component-library-repository.ts:630`). The estimate-panel projection already
   proves the lazy lever exists by passing `includeDetailGraph: false`
   (`getProjectComponentRowsLibrary(projectId, { includeDetailGraph: false })`,
   `actions.ts:429`; defined at `project-component-projection.ts:153`).

## Scale Assumptions

Closed-beta libraries may start small, but the UI should avoid patterns that
break at realistic catalog scale.

Planning budgets (PROVISIONAL — none is committed until the Phase 0A seed+measure
task below produces a baseline; see "Performance No-Go Conditions" for the
measured gates):

- 100 components: card and dense modes feel instant under normal conditions
- 500 visible rows: dense mode remains usable with no layout instability
- 5,000+ backing components: client-side filtering may exceed budget; revisit a
  server-side/indexed path (FUTURE)
- 10,000 components: `LIBRARY_COMPONENT_CAP = 10_000` (`actions.ts:212`, enforced
  via `assertWithinLibraryQuota` at `actions.ts:477`) is the existing hard cap and
  should remain unless product requirements change

## Phase 0A Seed + Measure (prerequisite for every budget number)

No 100 / 500 / 5,000 / 10,000 budget above is committed until this task lands. It
is part of Phase 0A Contract Lock.

- Extend `scripts/seed-performance-test-data.ts` to seed N `cost_library_items`
  (with optional folder + supplier/brand spread). The script does NOT currently
  cover `cost_library_items` — confirm with the keystone re-verification grep
  (doc 19, "Appendix — Re-verification Commands").
- Seed at the four budget tiers (100 / 500 / 5,000 / 10,000) and MEASURE before
  claiming any tier passes. Define each budget against a concrete metric:
  - card-grid / dense-table initial render time (ms) at each tier, measured via a
    marked `performance.measure("library-grid-render")` read in a Playwright spec,
    following the EXISTING in-repo pattern in
    `e2e/route-transition-performance.spec.ts` +
    `e2e/route-transition-performance-budgets.json` (that spec reads
    `performance.getEntriesByType("navigation"/"resource")` and compares against a
    committed budgets JSON; no React `<Profiler>` / `onRender` instrumentation
    exists anywhere in `src` today — `rg -n "<Profiler|onRender" src` returns
    zero). If a React `<Profiler>` `onRender` commit-duration harness is preferred
    instead, it is a NET-NEW Phase 0A prerequisite and must be listed as such
    before it can be used (same rule the keystone applies to `axe`, doc 19
    lines 351-353). Store the recorded threshold in a budgets JSON
    (reuse the `e2e/route-transition-performance-budgets.json` convention), not
    only in prose.
  - interaction latency (ms) for a keystroke in the client search box
    (`itemMatchesSheetQuery` re-filter + repaint) at 500 and 5,000 rows
  - browse fetch transfer size (KB) and parse time for
    `loadCurrentWorkspaceComponentRowsLibrary` with `includeDetailGraph` true vs
    false, to size the payload reduction win (fix #2 below)
- Record baselines in the Phase 0A measurement note at the exact path
  `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_PHASE-0A-PERF-BASELINE.md`
  (owner: Phase 0A implementer) so the no-go gates have a single referenceable
  artifact. Owning command: `bun run test:e2e` (Playwright) for render/interaction
  timing on the seeded workspace. Measure browse payload reproducibly (NOT a vague
  "one-off run"): capture the `loadCurrentWorkspaceComponentRowsLibrary` response
  in the seeded workspace and record BOTH `JSON.stringify(response).length` (bytes)
  AND the Playwright `Response.body()` byte length, for `includeDetailGraph` true
  vs false, at each tier — so two implementers measure the same number rather than
  diverging across DevTools Network vs server byte count vs `response.json()`
  length. Store the recorded numbers using the
  `e2e/route-transition-performance-budgets.json` convention. This baseline note is
  pre-registered as evidence in `24-EXECUTION-EVIDENCE-LEDGER.md` ("Perf seed
  extension for `cost_library_items`" + "Perf baseline measurement note", Phase 0A).

## Rendering Budget

Targets for implementation evidence. The first two are RENDERED-UI proofs
(execution evidence, not a planning property): they are pre-registered in
`24-EXECUTION-EVIDENCE-LEDGER.md` — Phase 5 "Mobile inspector-dock geometry"
(`ADV-MOBILE-BROWSE`, `bun run test:e2e` on `e2e/workshop-library-routes.spec.ts`
at narrow viewport: no toolbar/card/row overlap, scroll containment holds) plus the
cross-cutting "Rendered-UI screenshots" row (a screenshot exists for each shipped
phase's surface). Producing them is the build phase; their absence is not a
planning gap.

- stable initial frame while data loads (proof: Phase 5 browser-proof row, doc 24)
- no toolbar/card/row overlap at target responsive widths (proof: `ADV-MOBILE-BROWSE`,
  doc 24, `bun run test:e2e e2e/workshop-library-routes.spec.ts`)
- no unbounded row rendering if the Phase 0A measurement fails the 500-row gate
- reduced browse payload: prefer fetching browse rows with
  `includeDetailGraph: false` and loading the per-item detail graph
  (versions / price history / state history / attachments) only when the inspector
  dock opens for that item (see "Browse Payload Reduction" below; pull this lever
  via the action-wrapper signature change documented there)

Fallback choices (apply only if the Phase 0A baseline exceeds budget):

- reduced detail payload until the inspector dock opens (PRIMARY lever — lowest
  risk, lever already exists)
- virtualized card-grid/table that REUSES the existing virtualization infra
  (`WORKSHOP_VIRTUALIZATION_FLAGS` + `@tanstack/react-virtual`,
  `src/lib/workshop/virtualization-flags.ts`); do NOT add a parallel virtualizer
- pagination
- server-side filtering/search (FUTURE — see below)

## Browse Payload Reduction (PRIMARY perf lever, Phase 0B)

This is the real win and the lowest-risk one, so it ships EARLY — in Phase 0B,
alongside the `?component=<id>` route state it depends on (canonical phase map,
doc 19; Phase 0B owns route-state reliability). It is NOT deferred to the Phase 5
dense-maintenance/virtualization work; that later, riskier density work depends on
this payload reduction already being in place:

- The browse list does not need per-item versions / price history / state history
  / attachments. Fetch browse rows with `includeDetailGraph: false`
  (`getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false })`,
  `component-library-repository.ts:795`).
- Implementation note (action-wrapper signature must change FIRST): the action
  wrapper the browse path actually calls,
  `loadCurrentWorkspaceComponentRowsLibrary` (`actions.ts:445-448`), currently
  takes NO args and forwards none — it calls `getCurrentWorkspaceComponentRowsLibrary()`
  with no options, so it hard-defaults to `includeDetailGraph: true` (repository
  default at `component-library-repository.ts:533`). Pulling this lever therefore
  requires threading the flag, NOT just changing the caller. Do ONE of:
  (a) widen the action to accept `{ includeDetailGraph?: boolean }` and forward it
  to `getCurrentWorkspaceComponentRowsLibrary(options)` at `:447`, mirroring how
  `loadProjectComponentLibraryLite` already forwards `{ includeDetailGraph: false }`
  to `getProjectComponentRowsLibrary` at `actions.ts:429`; or (b) add a sibling
  lite action (e.g. `loadCurrentWorkspaceComponentRowsLibraryLite`) that always
  forwards `{ includeDetailGraph: false }`. The action body sits AFTER
  `requireCurrentUserContext()` (`:446`) and the flag does not change the cache
  key — `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` / `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`
  is already workspace-scoped (keystone doc 19 "Query Keys"), so no key change is
  needed for the browse cache. Before stripping the detail graph, confirm NO
  consumer reads versions/price history/state history/attachments off the browse
  `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` cache (only `ComponentInspectorDock.tsx`
  should need them, and it fetches them lazily). The browse caller
  (`LibraryPageClient.tsx`) must then pass `false`.
- Load the inspector-scoped detail graph lazily when `ComponentInspectorDock.tsx`
  opens for a given item, keyed off `?component=<id>` route state (Phase 0B).
- This mirrors the estimate-panel projection that already runs
  `includeDetailGraph: false` (`getProjectComponentRowsLibrary`, `actions.ts:429`;
  defined at `project-component-projection.ts:153`), so the pattern is proven
  in-repo.

## Query And Search Strategy (FUTURE — only if Phase 0A baseline exceeds budget)

Client filtering is acceptable today and is the current behavior
(`ComponentLibraryManager.tsx:876-882`). Do NOT build the server path
speculatively. If, and only if, the Phase 0A measurement shows client filtering
exceeds the keystroke-latency budget at the seeded tiers:

- push search/filter/sort to the server (no `searchLibraryOverview`-style server
  search exists for the Components tab today; this is net-new)
- index common search fields — NOTE: no Postgres FTS or trigram index exists yet
  in `supabase/migrations`; either would be a new migration and is DEFERRED
- consider Postgres full-text indexes for semantic text search (FUTURE migration)
- consider trigram indexes for fuzzy name/supplier search (FUTURE migration)
- keep detail graphs lazy or inspector-scoped (this is the "Browse Payload
  Reduction" lever above and should ship FIRST regardless)

## Network Failure States

Every major surface needs:

- loading skeleton/frame that preserves orientation
- retry action
- preserved safe context
- permission-safe error copy

NOTE: the overview does NOT load its sections independently — it resolves as a
single dataset (`searchLibraryOverview` / the overview repository read), so the
earlier "partial failure when overview sections load independently" treatment does
not apply. Overview failure is a single all-or-nothing fetch failure with one
skeleton + one retry. Per-surface failure is the right granularity (each surface
in the list below is its own fetch), not per-section-within-overview.

Surfaces (each is an independent fetch with its own loading/retry/error frame):

- overview (single dataset)
- component browse (`loadCurrentWorkspaceComponentRowsLibrary`)
- component inspector dock (`ComponentInspectorDock.tsx`, lazy detail graph)
- quick add
- folder actions
- template preview
- insert action (`resolveEstimateTemplateInsertTarget`)

## Out-Of-Order Responses (FUTURE — no live race today)

There is NO out-of-order search race in the current build: Components-tab
search/filter is synchronous client `useMemo` over an in-memory dataset
(`ComponentLibraryManager.tsx:876-882`), so a newer keystroke always wins and no
network response can arrive late. This section becomes relevant only if the
"Query And Search Strategy" server path is built (FUTURE). When/if it is:

- cancel/ignore stale requests where practical (e.g. TanStack Query keyed by the
  active query/filter state)
- keep result count tied to the visible query/filter state
- avoid flashing older workspace/query results (also guarded by fixing the
  un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` — see keystone doc 19 "Query
  Keys" and doc 13)

## Concurrency Contracts

Each case binds to a surface + the action it re-runs + the invalidation/refetch key
it touches (the exact invalidate keys are owned by doc 13; cross-reference there
rather than restating). No case stays abstract:

- component changed after inspector opened -> `ComponentInspectorDock.tsx` lazy
  detail fetch (the inspector-scoped detail graph, keyed off `?component=<id>`):
  on refetch compare `updated_at`; if it advanced, surface a conflict banner and do
  NOT clobber local edits. Detail-graph refetch is inspector-scoped, not the browse
  `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` list.
- component archived/deleted after insert picker opened -> before the insert,
  re-run `resolveEstimateTemplateInsertTarget` and check `estimate_row_link_state`
  health (mirrors doc 17 "Template insert"); a `discontinued`/`archived`/
  missing-source dependency warns/blocks/allows-override, it does not silently
  insert stale data.
- folder renamed/deleted while folder dialog is open -> `delete_library_folder`
  RPC returns affected counts; on conflict re-read the folder tree
  (`LibraryFolderTree.tsx`) and re-render the dialog over fresh state rather than
  acting on a stale folder id. Invalidate the exact folder/tree key named in
  doc 13.
- template changed after preview opened -> re-read the template before insert via
  the template-browse/editor path; recompute the COMPUTED-JOIN trust summary (over
  `source_library_item_id`/`link_state`, not a stored column) so the preview
  reflects current dependency health.
- estimate/project target changed after target picker opened -> re-resolve via
  `resolveEstimateTemplateInsertTarget` (returns `targetParentNodeId`) and re-guard
  with `rpc("can_edit_estimate",{target_estimate_id})`; do not mutate a different
  target than the one the user confirmed.
- user has local unsaved changes and source updates arrive -> preserve the local
  buffer, report a conflict, and require an explicit choice; never silently
  overwrite local overrides.

Default behavior (applies to every case above):

- refetch or report conflict (never silently accept the newer source)
- preserve local unsaved data
- do not silently overwrite local overrides
- do not silently mutate a different target

## Performance No-Go Conditions

Each gate names a measured threshold and the owning check. Do not ship broad
browse changes (Phase 5 density/virtualization) if any gate that is marked
BLOCKING fails.

Threshold provenance + status (resolves the commit-vs-provisional contradiction
with "Scale Assumptions" lines 39-41 and "Phase 0A Seed + Measure"): the ms
numbers in the first and fourth rows below are PROVISIONAL placeholders, chosen as
a perceptible-jank ceiling derived from the RAIL model (100 ms interaction-response
budget; one rendered frame ~16 ms, here loosened to a 200 ms first-paint ceiling
for a cold grid). They are NOT committed gates until the Phase 0A baseline (the
`_PHASE-0A-PERF-BASELINE.md` note, pre-registered in doc 24) REPLACES them with a
measured number. The Status column states, per row, whether a FAILURE blocks today
or only after 0A:

- PROVISIONAL (informational until 0A) rows: a failure is a RE-PLAN signal (see
  "Stop Conditions", doc 17), NOT an automatic block — because the doc has not yet
  committed the number. Once the 0A baseline records a measured value, the
  provisional ms placeholder is overwritten and the row becomes BLOCKING.
- BLOCKING (today) rows: bind to an invariant that does not depend on an unmeasured
  threshold (cache bleed; payload-not-reduced vs the recorded true/false baseline;
  loss of skeleton/retry/context), so a failure blocks the relevant phase now.

| No-go condition | Measured threshold | Owning check | Status |
| --- | --- | --- | --- |
| Dense/table mode locks up at the 500-row tier | initial render > 200 ms or keystroke re-filter > 100 ms at 500 seeded rows | `bun run test:e2e` against the seeded workspace, reading a marked `performance.measure("library-grid-render")` per the `e2e/route-transition-performance.spec.ts` + `e2e/route-transition-performance-budgets.json` pattern (no React `<Profiler>` exists in `src`; adding one is a net-new 0A prerequisite) | PROVISIONAL until 0A; BLOCKING (Phase 5) once the 0A baseline replaces the ms number |
| Browse fetch ships the full nested detail graph for the grid | browse payload not reduced vs `includeDetailGraph: false` baseline (target: detail graph deferred to inspector open) | payload-byte capture on `loadCurrentWorkspaceComponentRowsLibrary` true vs false (`JSON.stringify(response).length` + Playwright `Response.body()` byte length, recorded in `_PHASE-0A-PERF-BASELINE.md`) | BLOCKING (Phase 0B) — invariant, no unmeasured threshold |
| Query keys can show old workspace data after a workspace switch | any cross-workspace bleed via un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` | cache-scope test scaffolded in Phase 0A (keystone doc 19 "Query Keys"); `bun run test:dom` | BLOCKING (today) — invariant, P0 no-go |
| 5,000-row tier exceeds keystroke budget and no server path planned | keystroke re-filter > 150 ms at 5,000 seeded rows with no committed server-search follow-up | `bun run test:e2e`; `_PHASE-0A-PERF-BASELINE.md` (5,000-row tier) | PROVISIONAL until 0A; BLOCKING (Phase 5) once the 0A baseline replaces the ms number |
| Loading/error states remove all navigation context | any surface drops its skeleton/retry frame or loses the active folder/filter context | `bun run test:dom` (Testing Library assertions); manual browser proof pre-registered in doc 24 (Phase 5 "Mobile inspector-dock geometry" / browser-proof rows) | BLOCKING (today) — invariant |

Do NOT block on the "search/filter is client-only over a large unbounded detail
graph" framing from earlier drafts: client-only filtering is acceptable below the
measured budget. The blocking condition is the browse PAYLOAD (detail graph), not
the client-side filtering per se.

Full validation gate for any change here: `bun run validate`
(`type-check && lint && lint:design-system && lint:design && test && test:dom`).
The jsdom suites run under `test:dom` (`vitest run --maxWorkers=1`) or
`vitest run tests/vitest/<file>` for a single file; `bun test` runs `tests/unit`
only and will NOT execute the vitest suites.
