# Implementation Sequence

## Phase 0: Preflight

1. Verify branch/status and note unrelated dirty files.
2. Run graph impact analysis before editing existing symbols:
   - `ProjectMiniSidebar`
   - any changed repository function
3. Apply the chart dependency decision:
   - default recommendation: add `@nivo/pie` only when dependency changes are explicitly approved;
   - fallback: hand-rolled SVG only if dependency changes are explicitly disallowed or install/build validation fails;
   - Recharts only if the scope expands to broader chart families before implementation starts.

Default recommendation after package research: `@nivo/pie`, because it gives focused responsive SVG donut charts, React 19 peer support, theming, and tooltips with less package surface than broad chart suites. This remains subject to the explicit dependency approval gate.

## Phase 1: Pure Aggregation Model

Add pure chart aggregation types and helpers.

Scope:

```txt
src/lib/project-charts/types.ts
src/lib/project-charts/aggregate-project-charts.ts
tests/vitest/project-charts-aggregation.test.ts
```

Tests first:

- total formula uses `quantity * unit_cost + misc_cost`;
- space mode rolls rows to top-level ancestor;
- category mode maps subcategory to reporting category;
- category mode uses `node_type`, not `kind`;
- category mode does not infer organizer descendants unless there is exactly one reporting child;
- supplier mode uses supplier id label first;
- supplier labels are constrained to the current workspace;
- missing dimensions fall back to `Uncategorized` / `No supplier`;
- shared union colors/orders match across left and right charts;
- donut `Other` bucket combines overflow buckets while comparison text can expose all buckets;
- zero baseline delta percent is `null` when right is non-zero.

Pass gate:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/project-charts-aggregation.test.ts
```

## Phase 2: Server Loader

Add project-scoped loader.

Preferred file:

```txt
src/lib/repositories/project-charts-repository.ts
```

Responsibilities:

- call `getCurrentWorkspaceProject(projectId)` or equivalent workspace-scoped validation;
- load project estimates;
- load nodes and rows for those estimate ids;
- load category nodes and workspace suppliers;
- return serializable chart model input.

Do not mutate data.

Pass gate:

- add at least one repository or integration-style loader test proving inaccessible/missing projects return no chart model and supplier/category labels stay workspace-scoped;
- if existing mocks cannot support that test, document the gap and require a manual protected-route smoke with dev auth plus pure normalization tests.

## Phase 3: Route And Navigation

Add:

```txt
src/app/workshop/projects/[projectId]/charts/page.tsx
```

Modify:

```txt
src/components/workshop/ProjectMiniSidebar.tsx
```

Rules:

- new route inherits project layout;
- `Charts` appears after `Estimates`;
- active state works for `/charts`;
- mini-sidebar remains hidden only for estimate sheet detail routes.

Recommended ordering:

```txt
Dashboard
Estimates
Charts
```

Reason: Charts depends on estimate sheets, so it follows Estimates.

Pass gate:

- update `project-dashboard-ui.test.ts` or add a new route/nav governance test.

## Phase 4: Client UI

Add:

```txt
src/components/workshop/project-charts/ProjectChartsClient.tsx
src/components/workshop/project-charts/ProjectCostDonutChart.tsx
src/components/workshop/project-charts/ProjectChartsComparisonTable.tsx
```

UI behavior:

- default to first two estimates;
- handle one/no estimate states;
- prevent same estimate on both sides;
- switch grouping mode locally;
- render two donut panels;
- render comparison table below.
- show two columns at desktop widths and stacked chart panels below the chosen narrow breakpoint;
- keep selector/tool rows within the existing compact row rhythm and allow wrapping before overflow.

Use shared primitives:

- `ControlSelect`
- `Button` if needed
- `EmptyState`
- `cn`

Pass gate:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/project-charts-ui.test.tsx
```

If `@nivo/pie` is used, either mock `ResponsivePie` in the component test or add a focused `ResizeObserver` shim in the Vitest setup for this test. Do not rely on jsdom real layout for responsive chart sizing.

## Phase 5: Visual QA

If the implementation is done under visual workflow:

1. Start or reuse local dev server.
2. Open:

```txt
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/charts
```

3. Capture desktop screenshot.
4. Run visual verdict against the accepted target if a reference is created.
5. Iterate until score >= 90 if a reference workflow is active.

For a plan-only implementation without generated visual reference, run manual browser smoke:

- Charts link visible and active.
- Selectors work.
- Donut charts render when the smoke fixture has two populated estimates; otherwise, the correct one-estimate or no-row empty state renders.
- Mode switch changes bucket labels.
- No text overlap at desktop width.
- No text/control overlap at narrow width.
- Compact app font-size contract is preserved.

## Phase 6: Full Verification

Run:

```bash
bun run validate
bun run build
git diff --check
```

If dirty unrelated export work causes failures, record the failing files and rerun focused chart gates plus `git diff --check`.

## Rollback Plan

If the feature fails late, revert only:

- chart route;
- chart components;
- chart library helpers;
- chart tests;
- sidebar link;
- chart dependency if added, including `package.json`, `bun.lock`, dynamic import wrappers, chart CSS, and chart-specific fixtures.

If `@nivo/pie` was added, remove it with:

```bash
bun remove @nivo/pie
```

Do not revert unrelated export or estimate workspace files.
