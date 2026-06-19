# Frontend Rendering Performance — Audit Findings (2026-06-19)

## Scope & coverage

Read deeply (every relevant line): the chart cluster
(`CostDonutChart.tsx`, `project-charts/ProjectChartsClient.tsx`), the estimate
sheet hot path (`estimate-sheet/rows/branch.tsx`, `rows/row-table.tsx`, targeted
reads of the 2949-line `EstimateSheetContent.tsx` and 1587-line
`EstimateSheetTree.tsx`), `LiveProjectCard.tsx`, `projects-page-client.tsx`,
the share receiver tree (`share/ShareEstimateTreeView.tsx`) + share comments/feed,
`sidebar/useLiquidGlassRefraction.ts`, `system/LiquidGlassReady.tsx`,
`performance-monitor.tsx`, `lib/workshop/virtualization-flags.ts`,
`stores/estimate-ui-store.ts`.

First-hand verification:
- `bun run lint` → 6 errors, 16 warnings. **Real source-domain errors: 3**
  (`projects-page-client.tsx:586` set-state-in-effect; `useLiquidGlassRefraction.ts:118`
  refs-during-render; `:122` set-state-in-effect). The other 3 errors are
  `require()` imports in `.gitnexus/run.cjs` (tooling, not app source).
- `bun run test:dom tests/vitest/perf` → **24/24 green** in 12.75s. The
  memoization guards (`nodeTotalsComputes===1`, `rendersOutside===0`,
  cursor isolation, render-relief/baseline) hold on `main`.

**Key correction to the audit brief's "VERIFIED EARLY SIGNAL (d)":** the
"charts set-state-in-effect" red is a **misattribution**. There is **no
useEffect in any chart component** (`project-charts/*`, `charts/*`). The actual
set-state-in-effect lint error is in `projects-page-client.tsx:586` — a benign
one-way mount latch for the bulk-delete modal chunk. The chart components are
clean and well-memoized.

Deferred (other domains): bundle/dynamic-import sizing, RSC/data-fetch, DB.

## Reconciliation vs prior packs

| Topic | Prior pack | Status |
|---|---|---|
| Estimate-sheet god component / `editableRows` fan-out / incremental totals / virtualization thresholds | `2026-06-17-Performance-Refactor` (A-04/A-07/A-09/A-20, Phase 3) | **covered** — planned, not executed; perf guards already green |
| React Compiler bailout in hot components (incl. TanStack table) | `2026-06-17-Performance-Refactor` RISK-24 + doc 26 | **covered** — bailout is expected, gated pilot |
| Projects card list: no virtualization, group-mode memo gap, un-deferred search | `2026-06-19-Projects-Page-Performance` (§2/§3, §04 RENDER) | **covered** — deferred-with-rationale; `content-visibility:auto` + `useDeferredValue` + `memo` already shipped |
| Card image bytes (full→thumbnail), auth-carrying `<img>` | `2026-06-19-Projects-Page-Performance` §04 | **covered** — shipped (`LiveProjectCard.tsx:88,461-467`) |
| Liquid-glass blur arms after first paint+idle | `2026-06-19-deferred-liquid-glass` COORD.md | **covered** — implemented (`system/LiquidGlassReady.tsx`) |
| Sidebar refraction gate / reduced-motion | `liquid-glass-sidebar-direction` memory + Performance-Refactor | **partial** — gate works; dead `useGlassElasticity` is new (below) |
| Render-state / client-perf audit | `2026-06-14-Overall-Site-Performance` doc 04 | **covered** (older baseline) |

No prior pack is stale on these points; the prior plans are accurate. New
signal not in any prior pack: the dead per-frame-setState `useGlassElasticity`
hook and the precise lint-blocker attribution.

---

## Findings

### FE-PERF-01 — `useGlassElasticity` reads a ref during render AND drives a per-frame React setState (dead code, but a lint blocker)
- **Severity:** medium · **launch_blocker:** false
- **Files:** `src/components/sidebar/useLiquidGlassRefraction.ts:109-189`
- **Evidence:** `strengthRef.current = strength;` at line 118 runs in the render
  body (lint: "Cannot access refs during render"), and the rAF `tick` calls
  `setTransform({...})` **every animation frame** while the pointer moves
  (lines 140-153, lint at :122). A per-frame `setState` re-renders the consuming
  component ~60×/s during pointer movement — the classic anti-pattern for glass
  elasticity (should be a direct `element.style.transform` write in the rAF, no
  React state). Confirmed **zero callers**: `grep -rn "useGlassElasticity" src
  --include='*.tsx' --include='*.ts'` returns only the definition. It is
  exported-but-unused.
- **Impact:** Today: none at runtime (dead). But it is **2 of the 3
  source-domain `bun run lint` errors**, so it keeps `bun run validate` red and
  blocks any "green gate" launch criterion. If ever wired up as-is it would jank
  the sidebar.
- **Recommendation:** Delete `useGlassElasticity` (and `GlassElasticityOptions`,
  the elasticity constants) — it is unused dead code. If the effect is wanted
  later, reimplement with a ref-based direct DOM transform write inside the rAF
  (no `setTransform` state). This clears 2 lint errors with zero behavior change.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### FE-PERF-02 — `projects-page-client` set-state-in-effect (the actual lint red mis-labeled "charts")
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/components/workshop/projects-page-client.tsx:584-587`
- **Evidence:** `useEffect(() => { if (deleteProjectTargetIds.length > 0)
  setBulkDeleteModalMounted(true); }, [deleteProjectTargetIds.length])`. The
  `react-hooks/set-state-in-effect` rule flags it; functionally it is a benign
  **one-way latch** (mount the bulk-delete chunk on first open, keep mounted).
  It cannot cascade-loop (guarded, monotonic) so the real perf cost is ~one
  extra render the first time a delete is initiated.
- **Impact:** 1 of the 3 source lint errors → keeps `validate` red. Negligible
  runtime cost. This is the line the audit brief mis-described as "charts".
- **Recommendation:** Derive during render instead:
  `const bulkDeleteModalMounted = hasMountedBulkDelete || deleteProjectTargetIds.length > 0`
  using a `useRef` latch read in render (a ref read in render for a monotonic
  flag is allowed by the compiler when not the lint target — or use a small
  `useState` initializer pattern). Removes the effect and the lint error.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### FE-PERF-03 — `/share/[token]` receiver tree renders the full estimate DOM with no virtualization or content-visibility
- **Severity:** medium · **launch_blocker:** false
- **Files:** `src/components/share/ShareEstimateTreeView.tsx:234-307` (and
  `TreeNodeRenderer` 61-232), `lib/share/reconstruct-share-tree`
- **Evidence:** `WorkshopTree<ShareTreeNode>` recurses every node, and
  `TreeNodeRenderer` maps **every** `node.rows` to a DOM row (lines 87-169) with
  no `[content-visibility:auto]` and no windowing. By contrast the workshop
  estimate sheet virtualizes rows (`row-table.tsx`, flag default on) and tags
  off-screen rows `[content-visibility:auto]`. The `renderNode` closure is
  recreated each render (`:278-280`) and `defaultExpandedNodeIds` expands the
  **first two levels** by default (`:249-260`), so a large published proposal
  paints a deep, fully-expanded tree on first load. This is the **only
  interactive surface external beta recipients reach**, and it is the one route
  with **enforced** (not Report-Only) CSP.
- **Impact:** For typical small proposals: fine. For a large published estimate
  (hundreds of rows across many areas) the receiver gets a heavy first paint /
  long task on load, on whatever device a client opens the link on (often
  mobile). No correctness issue; pure scale risk.
- **Recommendation:** Cheapest win first — add `[content-visibility:auto]` +
  `[contain-intrinsic-size]` to the per-row container and the group node block
  (mirror `LiveProjectCard.tsx:686-691`). If real large proposals appear,
  window `node.rows` with `@tanstack/react-virtual` (already a dependency) and
  memoize the `renderNode`/`TreeNodeRenderer`. Gate any work on observing an
  actually-large published estimate first.
- **Effort:** M · **Confidence:** medium (scale-dependent) · **existing_plan_overlap:** partial:2026-06-17-Performance-Refactor (Phase 1 names `/share/[token]` in the manual-QA capture list but plans no receiver-tree virtualization)

### FE-PERF-04 — Estimate-sheet content branches render the full node tree (rows virtualized inside each table, but branch recursion is not)
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/components/workshop/estimate-sheet/rows/branch.tsx:419-456`
  (recursive `childAreas.map` → `<EstimateSheetBranch>`), host
  `EstimateSheetContent.tsx:2834`
- **Evidence:** Each `EstimateRowItemsTable` virtualizes its own rows
  (`row-table.tsx:530-541`, default-on flag `minRows:75`) and tags rows
  `[contain-intrinsic-size:96px] [content-visibility:auto]`
  (`row-table.tsx:267`). But the **branch/node recursion itself** mounts every
  area node's header + table shell regardless of viewport. The left
  navigation tree is virtualized (`EstimateSheetTree.tsx:1476`
  `WORKSHOP_TREE_VIRTUALIZATION`), so this is the **content column** only. The
  branch is heavily memoized (`branch.tsx:111-156` custom comparator,
  `areEstimateSheetBranchPropsEqual`) and totals are memoized
  (`EstimateSheetContent.tsx:1401-1402`), so re-render fan-out is controlled —
  the cost is the initial mount of many node shells for a deep estimate.
- **Impact:** Re-renders are well-guarded (perf tests prove
  `nodeTotalsComputes===1`, `rendersOutside===0`). Residual risk is **first
  mount** time for an estimate with very many areas. Row-level content-visibility
  already mitigates paint.
- **Recommendation:** No action for launch — this is exactly the surface the
  `2026-06-17-Performance-Refactor` Phase 3 owns (incremental totals,
  per-row subscription, virtualization thresholds). Leave it to that pack; do
  not duplicate. Recorded here only to confirm it is covered and currently green.
- **Effort:** XL (if pursued) · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor (Phase 3)

### FE-PERF-05 — `CostDonutChart` runs D3 pie/arc/callout layout on every render (not memoized), but inputs are small
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/components/charts/CostDonutChart.tsx:301-322`
- **Evidence:** `data` is memoized (`:286-299`), but the `pie()` generator,
  `arc()` generators, `pieGenerator(data).map(...)`, and `buildCallouts(...)`
  (the label-stacking solver, `:158-254`) all run **every render** — including
  on every hover (`setActiveId` updates state, re-running the whole layout). The
  donut is bucket-collapsed to ≤8 slices before render
  (`ProjectChartsClient.tsx:116` `collapseProjectChartBuckets(..., 8)`), so the
  loops are tiny (≤8). The donut is also dynamic-imported and only mounts in the
  optional "Share view" (`ProjectChartsClient.tsx:26-39,291`), so d3-shape isn't
  on the default charts path at all.
- **Impact:** Negligible at ≤8 slices. A hover recomputes a trivial layout. Not
  a launch concern.
- **Recommendation:** Optional polish: memoize `arcs`/`callouts` on
  `[data, activeId, dims]` so a hover only re-runs the cheap opacity diff. Skip
  for launch.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### FE-PERF-06 — `ProjectEstimatesTable` TanStack `useReactTable` defeats React-Compiler memoization (expected bailout)
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/components/workshop/ProjectEstimatesTable.tsx:1089-1092,1105,1161`
- **Evidence:** Lint warns `react-hooks/incompatible-library` ("Compilation
  Skipped: Use of incompatible library") on `useReactTable()` — the React
  Compiler refuses to auto-memoize this component because TanStack Table returns
  non-memoizable functions. The table renders all `visibleRows`
  (`:1105,1161`) without `@tanstack/react-virtual`. Estimate counts **per
  project** are bounded (a project has a handful of estimates), so the unwindowed
  list is small.
- **Impact:** Low — small bounded list; the compiler bailout is a known/accepted
  TanStack interaction, not a regression. Already catalogued as RISK-24.
- **Recommendation:** No launch action. If estimate-per-project counts ever grow
  large, window the rows. Otherwise accept the warning (it is a warning, not an
  error).
- **Effort:** M (if ever needed) · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor (RISK-24, doc 26)

### FE-PERF-07 — Projects card list is not virtualized (mitigated by content-visibility + deferred search; group-mode memo gap)
- **Severity:** low · **launch_blocker:** false
- **Files:** `src/components/workshop/projects-page-client.tsx:674` (map of
  `displayLiveProjects`), `LiveProjectCard.tsx:686-691` (content-visibility),
  `projects-page-client.tsx:611` (`useDeferredValue`)
- **Evidence:** Every project card is mapped to the DOM (no windowing), but each
  tile carries `[content-visibility:auto]` + `[contain-intrinsic-size:auto_…]`
  (`LiveProjectCard.tsx:686-691`) so off-screen cards skip layout/paint, and
  search is run through `useDeferredValue` (`:611`). `LiveProjectCard` is
  `memo`'d and binds in the default/flat view (identity-stable handlers via
  `useStableCallback`, `:615-616`); the documented exception is **group-organize
  mode**, where a per-card `groupAssignMenu` ReactNode prop breaks shallow
  equality.
- **Impact:** Low for beta — content-visibility carries the paint cost; the
  re-render gap exists only in group mode. Prior pack proved the flat-view memo
  binds via `projects-page-render-baseline.test.tsx`.
- **Recommendation:** No launch action. The group-mode O(N) memo gap and full
  virtualization are explicitly deferred-with-rationale in the projects pack.
- **Effort:** M (if pursued) · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-19-Projects-Page-Performance (§2/§3, §04 RENDER)

---

## Launch verdict (this domain)

**No launch blockers.** The client-rendering hot paths (estimate sheet, project
cards, charts) are memoized, virtualized, content-visibility'd, and proven green
by `tests/vitest/perf` (24/24). The only items worth touching before/around
launch are housekeeping that also unblocks the green gate:
**FE-PERF-01** (delete dead per-frame-setState glass hook → clears 2 lint
errors) and **FE-PERF-02** (derive the bulk-delete latch → clears the last
source lint error). After those, `bun run lint` source-domain errors → 0.
**FE-PERF-03** (share-receiver content-visibility) is the only finding with
real user-facing upside and should be done if any large published estimate is
expected in beta.
