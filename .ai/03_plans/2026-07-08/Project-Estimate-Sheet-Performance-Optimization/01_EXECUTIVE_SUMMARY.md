# 01 - Executive Summary

## Verdict

The current project estimate sheet has meaningful performance work already in place, but it is not yet proven ready for thousands of nodes and rows under mission-critical MVP expectations.

The safest next step is not another blind optimization pass. It is Phase 0 measurement, followed by a staged migration from nested-tree-first state to a normalized, selector-backed client graph while preserving current UX and route contracts.

## Current Strengths

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` streams the route behind `Suspense` and uses `EstimateSheetRouteSkeleton`.
- `src/components/workshop/EstimateWorkspaceClient.tsx` lazy-loads the tree and content panes.
- `src/hooks/use-estimate-query.ts` seeds initial TanStack Query data, disables mount refetch, and uses five-minute `staleTime`.
- `src/lib/estimates/load-limits.ts` caps production first-load data at 1,500 nodes and 5,000 row items.
- `src/lib/repositories/workspace-repository.ts` has bounded node and row reads plus subtree loading primitives.
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx` virtualizes visible branch sections.
- `src/components/workshop/estimate-sheet/rows/row-table.tsx` virtualizes rows.
- Existing tests cover render relief, cursor isolation, row virtualization, branch virtualization, and load-limit constants.

## Critical Gaps

1. `readEstimateNodeRouteContextD1FastPath` is a stub that returns `null`, so the route always misses the intended D1 fast path.
2. The sheet still treats nested `EstimateTreeNode[]` as the primary interactive state shape.
3. `collectEditableRows`, `computeNodeTotals`, `flattenEstimateRows`, filtering, grouping, move options, and rollback helpers still traverse large portions of the full tree.
4. There is no dedicated Chrome/browser proof for 1,000-5,000 row estimate-sheet interaction flows.
5. There is no estimate-sheet-specific D1 query-plan and `rows_read`/`rows_written` proof.
6. Current virtualization limits DOM mounting but does not eliminate render-time and mutation-time O(N) work.

## Recommended Target

Create a normalized active-estimate graph behind adapters:

- `nodesById`
- `rowsById`
- `childrenByParentId`
- `rowIdsByNodeId`
- `parentIdByNodeId`
- `ancestorsByNodeId` or on-demand ancestor lookup
- `totalsByNodeId`
- `loadStateByNodeId`
- `dirtyRowsById`
- `mutationLogByOperationId`

Keep TanStack Query as the server-state transport cache. Use a Zustand or sibling store for interactive graph state and selectors. Preserve the nested tree facade at first, then retire recursive fallbacks only after parity tests prove selector equivalence.

## Top Priorities

P0:
- Build Phase 0 evaluator and baseline artifacts.
- Implement proof-only D1 query plan scaffolding before adding indexes.
- Restore/implement route fast path only after the query plan proves the exact SQL shape.
- Add large-fixture DOM/browser proof.

P1:
- Introduce normalized graph read model behind current components.
- Replace recursive totals with incremental delta propagation.
- Move filter/search/group selectors behind deferred transitions and measured budgets.
- Coalesce subtree expansion requests and merge subtree payloads into graph state.

P2:
- Convert optimistic mutation rollback from whole-tree replacement to entity inverse patches.
- Move expensive dropdown/move/facet option lists to searchable or virtualized controls.
- Add hosted D1 proof and production observability artifacts before scale claims.

## Readiness

Phase 0 baseline: ready to execute.

Optimization implementation: conditionally ready after Phase 0 creates evidence and confirms bottleneck ranking.

Production scale claim: not ready until browser, D1, and hosted proof artifacts exist.

