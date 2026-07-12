# 11 — Source Registry

**Research/audit date:** 2026-07-12

## 1. Repository authority

### Governance

- `AGENTS.md`
- `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`
- `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`
- `.agents/skills/archestimator-plan-pack/SKILL.md`

### Old plan

- `.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/README.md`
- `IMPLEMENTATION_PLAN.md`
- `20_PERFORMANCE_EVALUATOR_SPEC.md`
- `plan-pack.json`
- `LOOP_LEDGER.md`
- `evidence/runtime/jsdom-baseline.json`
- `evidence/runtime/browser-baseline.json`
- `evidence/runtime/bottleneck-decision.json`
- generated runtime run directories and receipts

### Route and workspace

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/estimate-performance-mode-context.tsx`
- `src/lib/estimates/estimate-performance-modes.ts`
- `src/lib/estimates/estimate-performance-modes.server.ts`

### Estimate sheet

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet-render-probe.ts`
- `src/components/workshop/estimate-tree-data.ts`

### Query and mutations

- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/lib/estimates/estimate-row-tree-move.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/repositories/workspace-repository.ts`

### Tooling inventory

- `package.json`
- `playwright.estimate-performance.config.ts`
- `scripts/*estimate-sheet-performance*`
- `scripts/lib/estimate-sheet-*`
- `tests/fixtures/estimate-sheet-performance.ts`
- `tests/vitest/*estimate-performance*`
- `tests/vitest/estimate-sheet-*performance*`
- `e2e/estimate-sheet-performance.spec.ts`
- `e2e/helpers/estimate-sheet-performance*`
- `vitest.config.ts`

## 2. Important observed repository facts

- The old pack is currently marked cancelled/non-runnable for later units.
- Its cancellation says the chain was disproportionate and future work must start with one symptom and cheap baseline.
- The old evaluator added a large custom script/test/evidence surface.
- Five deployment modes default off.
- The route and workspace carry those modes, but current hot paths do not consume them.
- The only current hard baseline failure is project-component nonmatch fan-out.
- Browser and bottleneck-decision projections remain stale placeholders.
- `readEstimateNodeRouteContextD1FastPath` is a null stub.
- row fetches already batch node IDs.
- node and sheet-adjustment reads are parallel.
- tree and row virtualization already exist.
- high-frequency draft state remains parent-owned.
- node totals remain full-tree derived from the parent draft map.
- row table memo comparison loops through rows.
- current project component patch and rollback traverse the tree.

## 3. Official React sources

### Profiler

https://react.dev/reference/react/Profiler

Used for:

- actual/base render duration;
- selected subtree measurement;
- warning that profiling has overhead.

### React Performance tracks

https://react.dev/reference/dev-tools/react-performance-tracks

Used for:

- update/render/commit/effect phases;
- component flamegraph;
- changed props;
- cascading updates.

### `memo`

https://react.dev/reference/react/memo

Used for:

- memo as optimization, not correctness;
- granular editor interactions;
- minimize prop changes before custom comparison.

### `useMemo`

https://react.dev/reference/react/useMemo

Used for:

- measure expensive calculations;
- transformations over thousands of objects;
- cache only as performance optimization;
- first render is not improved by memo.

### Effects guidance

https://react.dev/learn/you-might-not-need-an-effect

Used for:

- avoid derived-state effects;
- event-driven logic in event handlers;
- fewer cascading render passes.

### `useSyncExternalStore`

https://react.dev/reference/react/useSyncExternalStore

Used for:

- external store subscription;
- immutable/cached snapshots;
- stable subscribe functions.

### `useDeferredValue`

https://react.dev/reference/react/useDeferredValue

Used for:

- keep input synchronous;
- defer slow secondary render;
- interruptible background render;
- does not make slow render itself faster.

### `useTransition`

https://react.dev/reference/react/useTransition

Used for:

- controlled input state cannot be a transition;
- separate/deferred non-urgent view state.

## 4. Official Next.js sources

### Server and Client Components

https://nextjs.org/docs/app/getting-started/server-and-client-components

Used for:

- smallest client boundary;
- reducing client bundle by keeping non-interactive UI server-side.

### Lazy Loading

https://nextjs.org/docs/app/guides/lazy-loading

Used for:

- dynamic client component/import loading;
- defer modal/panel code until needed.

## 5. Official TanStack sources

### Query render optimizations

https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations

Used for:

- structural sharing;
- tracked properties;
- stable data references;
- `select` for narrow subscriptions.

### Virtual introduction

https://tanstack.com/virtual/latest/docs/introduction

Used for:

- visible-item mounting;
- distinction between virtual rendering and upstream derivation.

## 6. Browser/user responsiveness sources

### Interaction to Next Paint

https://web.dev/articles/inp

Used for:

- interaction responsiveness;
- next-paint focus;
- 200 ms good field threshold.

### Chrome DevTools runtime performance

https://developer.chrome.com/docs/devtools/performance

Used for:

- focused runtime recording;
- main-thread task/render/paint diagnosis.

## 7. Research boundary

Not performed by this planning task:

- browser trace of current localhost;
- React Profiler recording;
- test execution;
- build;
- D1 query plan;
- hosted Worker timing;
- heap profile;
- implementation.

Those are explicitly activated in the implementation plan when needed and authorized.
