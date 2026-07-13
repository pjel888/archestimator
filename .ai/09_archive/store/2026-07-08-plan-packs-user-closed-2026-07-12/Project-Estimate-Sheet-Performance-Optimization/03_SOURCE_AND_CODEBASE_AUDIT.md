# 03 - Source And Codebase Audit

## Audit Method

Direct source reads, `rg`, GitNexus context, and read-only subagents were used. Direct source reads are authoritative because the graph index reported a small HEAD lag. Paths and symbol names are the durable anchors in this supporting audit; numeric line anchors in related supporting documents describe a planning snapshot and must be re-resolved before implementation.

## Route Bootstrap

Files:
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/lib/estimates/load-limits.ts`

Findings:
- The route wraps estimate loading in `Suspense` with `EstimateSheetRouteSkeleton`.
- The route calls `resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)`.
- Production caps are currently:
  - `maxNodeCount: 1500`
  - `maxRowItemCount: 5000`
- The component library dataset is intentionally lazy-loaded and does not block first paint.
- `EstimateWorkspaceClient` passes the same `nodes` payload to both `EstimateSheetTree` and `EstimateSheetContent`.
- `EstimateWorkspaceClient` dynamically imports both heavy panes, but once loaded they receive the whole nested tree payload.
- Both panes subscribe to the active TanStack tree query and build their own projections: the left pane builds filtered/UI/selection tree models, while the center pane builds selected-sheet, totals, facet, and row models.

Performance implication:
- Suspense and lazy loading help first-load UX, but the serialized RSC/client payload can still be large at the current caps.
- The same nested data shape fans out into two large client panes, so one tree identity change can wake both projection pipelines even when structural sharing prevents unrelated row DOM from rerendering.

## Repository Query Shape

Files:
- `src/lib/repositories/workspace-repository.ts`

Key functions:
- `readEstimateNodes`
- `readEstimateRows`
- `buildEstimateTree`
- `getEstimateNodeSubtree`
- `readEstimateTabTreePayloadForResolvedTabId`
- `getEstimateTreesForTabs`
- `resolveEstimateTabRouteContext`
- `readEstimateNodeRouteContextD1FastPath`

Findings:
- `readEstimateNodes` filters by `estimate_id`, optional `estimate_tab_id`, optional `id IN`, and optional `parent_id IN`, then orders by `sort_order ASC, id ASC`.
- `readEstimateRows` filters by `estimate_id`, `node_id IS NOT NULL`, optional `node_id IN`, then orders by `sort_order ASC, id ASC`.
- `readEstimateTabTreePayloadForResolvedTabId` loads nodes first, limits to cap, then loads rows for the limited node ids.
- The dominant tab-tree path passes every limited node id to one `node_id IN (...)` row query. At the 1,500-node ceiling that is one statement with up to 1,500 node-id binds, plus the estimate/limit binds.
- `getEstimateTreesForTabs` batches all-tab export tree loading rather than fanning out per tab.
- `readEstimateNodeRouteContextD1FastPath` currently returns `null`.

Performance implication:
- Route fast path is not active.
- Current row reads can benefit from a composite index matching `estimate_id + node_id + sort_order + id`.
- Index selection cannot repair a provider bind ceiling. `UNIT-001` must characterize the exact statement/bind shape, `UNIT-003` must prove the D1 ceiling without product edits, and `UNIT-005` must chunk or replace the query if the limit profile exceeds it.
- The repository already has subtree primitives; the client state model is the larger missing piece.

## Current D1 Index Coverage

Files:
- `migrations/0015_publication_admin_sidecars.sql`
- `migrations/0021_estimate_row_projection_fields.sql`

Existing relevant indexes:
- `idx_estimate_row_items_estimate_sort ON estimate_row_items(estimate_id, sort_order, id)`
- `idx_estimate_nodes_estimate_sort ON estimate_nodes(estimate_id, sort_order, id)`
- `idx_estimate_tabs_estimate_sort ON estimate_tabs(estimate_id, sort_order, id)`
- `idx_estimate_row_items_node ON estimate_row_items(node_id, id)`

Potential gap:
- There is no observed active migration with `estimate_row_items(estimate_id, node_id, sort_order, id)`.
- There is no observed active migration with `estimate_nodes(estimate_id, estimate_tab_id, sort_order, id)` or `estimate_nodes(estimate_id, estimate_tab_id, parent_id, sort_order, id)`.

Plan requirement:
- Do not add indexes by intuition. First create D1 proof with `EXPLAIN QUERY PLAN`, `rows_read`, `rows_written`, p95 duration, and write-cost assessment.

## Query Cache And Invalidation

Files:
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateWorkspaceClient.tsx`

Findings:
- Query keys currently include:
  - `["estimate", estimateId]`
  - `["estimate", estimateId, "area-tree"]`
  - `["estimate", estimateId, "tab", tabId, "area-tree"]`
  - `["estimate", estimateId, "tabs"]`
  - `["estimate", estimateId, "edit-capability"]`
- Tree queries use `initialData`, `refetchOnMount: false`, and `staleTime: 5 * 60_000`.
- Mutations use a mixture of `setQueryData` and `invalidateQueries`, often targeting whole tree keys.
- The tree hooks increment their sibling revision key only through the hook-owned `setTree`/`restore` helpers. Direct `queryClient.setQueryData` writes in row mutations change the tree without incrementing that revision.

Performance implication:
- Transport caching is already thoughtful.
- Query keys are not yet dimensioned for partial subtrees, page/cursor state, filters, or completeness windows.
- The current revision is not a complete cache-mutation clock, so a revision-guarded whole-tree reconciliation or rollback cannot assume it observed every optimistic/server cache write. `UNIT-001` owns the concurrency characterization; `UNIT-009` owns mutation/rollback repair, with graph-store integration in `UNIT-006` when activated.
- Future normalized graph state should treat TanStack Query as transport cache, not as the primary interactive store.

## Client State And Derived Data

Files:
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`

Hot functions:
- `collectEditableRows`
- `computeEditableRowTotal`
- `computeNodeTotal`
- `computeNodeTotals`
- `flattenEstimateRows`
- `materializeEditableEstimateTree`
- `filterEstimateSheetNode`
- `filterEstimateSheetNodeByFacets`
- `collectSheetFacetOptions`
- `reorderEstimateSheetNodeRows`
- `collectRowMoveNodeOptions`
- `findRowItemNodeContext`

Findings:
- Initial editable rows are materialized by recursively visiting all loaded rows.
- `computeNodeTotals(estimateTree, editableRows)` runs from the whole loaded tree when editable rows or the tree changes.
- `displayedNodeTotals` can recompute totals on filtered/grouped copies.
- Flattened rows are guarded behind `shouldBuildFlattenedRows`, which is good, but once enabled it traverses the whole tree.
- Search/filter/group create render-only tree copies when active.
- Facet options traverse the selected subtree.
- Row move node options traverse the full tree whenever the tree identity changes, including while the move dialog is closed.
- Row move position options can map every row in the target node into select options.
- `EstimateRightSidebar` is memoized, but the center pane passes the full `estimateTree` as `nodes`; a committed/optimistic tree identity change wakes the sidebar's large derivation block.

Performance implication:
- The main bottleneck is not only DOM rendering. It is repeated O(N) derivation and nested structural cloning.
- `UNIT-001` should count these derivations before optimization. On-demand move option construction belongs to `UNIT-007`; selector/graph isolation across both panes and the sidebar belongs to `UNIT-006`-`UNIT-008` when activated.

## D1 Project-Component Fan-Out

Files:
- `src/lib/estimates/d1-action-client.ts`
- `src/lib/estimates/estimate-row-tree-patch.ts`

Findings:
- Server fan-out resolves project-component identity from JSON fields in `source_snapshot_json` and `metadata_json`, selects matching project rows, and emits one revisioned update statement per matched sibling through a D1 batch.
- It is not a constant-time typed-column join and is not presumed O(1); JSON filtering, rows read, match count, statement count, batch size, and duration require `UNIT-003` proof.
- Client fan-out still walks the cached nested tree and rollback can apply repeated tree walks across all inverse patches.

Ownership:
- `UNIT-001` locks behavior and adds deterministic match-count/rollback characterization.
- `UNIT-003` measures the active D1 JSON-filter plus per-match batch path.
- `UNIT-006` and `UNIT-009` own the graph lookup and mutation/rollback changes only when their activation predicates pass.

## Rendering And Virtualization

Files:
- `src/lib/workshop/virtualization-flags.ts`
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`

Current defaults:
- Tree virtualization min rows: 150.
- Estimate row virtualization min rows: 75.
- Estimate master column virtualization min sections: 80.
- Row estimate height: 96.
- Branch estimate section height: 192.
- `useFlushSync: false`.

Findings:
- Branch virtualization flattens visible branches into an array and renders a window.
- Row virtualization renders a row window and has a fallback initial window before measurement.
- Row virtualization disables when an express editor is active in that table.
- Branch memoization checks row state for the branch and optionally descendants.
- `EstimateSheetBranchBase` falls back to `computeNodeTotal(node, editableRows)` when node totals are absent.

Performance implication:
- Virtualization limits mounted DOM but still requires visible-branch flattening and prop comparison work.
- Disabling row virtualization for express editor is safe for focus but risky for large single-area tables.
- Branch and row renderers must eventually consume graph selectors for visible windows only.

## Lazy Subtree Loading

Files:
- `src/lib/estimates/estimate-tree-lazy.ts`
- `src/lib/estimates/subtree-actions.ts`
- `src/lib/estimates/subtree-client.ts`
- `src/components/workshop/EstimateSheetTree.tsx`

Findings:
- Subtree payloads already include child/row completeness flags.
- Client tree hydration state exists in `EstimateSheetTree`.
- Current subtree merge still works against nested tree arrays.

Performance implication:
- Server primitives are ready enough for incremental loading.
- Client graph store should become the merge target so expansion does not clone large nested structures.

## Existing Performance Tests

Files:
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`
- `tests/vitest/perf/estimate-sheet-memoization.test.tsx`
- `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
- `tests/vitest/estimate-row-table-virtualization.test.tsx`
- `tests/vitest/estimate-branch-virtualization.test.tsx`
- `tests/vitest/estimate-sheet-large-data-budgets.test.ts`
- `e2e/route-transition-performance.spec.ts`
- `scripts/measure-route-transitions.ts`
- `scripts/check-route-transition-readiness.ts`
- `scripts/generate-cloudflare-d1-performance-proof.ts`

Findings:
- Good jsdom render-isolation coverage exists.
- Existing route profiler is generic and includes target estimate scenarios.
- Generic D1 performance proof exists, but not estimate-sheet-specific.
- No dedicated e2e estimate sheet performance spec exists.

Conclusion:
- The repo has enough scaffolding to build a serious evaluator quickly.
- Current evidence does not yet prove thousands-row production readiness.
