# 06 - Architecture And Technical Design

## Core Diagnosis

The current architecture is nested-tree first. Virtualization reduces mounted DOM, but many computations still scale with loaded tree size:

- Initial editable row materialization.
- Totals.
- Flattened rows.
- Search/facet/group transforms.
- Move target lists.
- Optimistic patching and rollback.
- Prop comparison across branches.

Normalized graph state plus selector-driven views is a prepared conditional branch: `UNIT-004` activates `UNIT-006` only when measured predicates require it and otherwise records a supersession receipt.

## Conditional Graph Architecture (`UNIT-006` If Activated)

### Layers

1. Server data layer
   - D1 repository functions.
   - Server Actions.
   - Route bootstrap.
   - Subtree fetches.

2. Transport cache
   - TanStack Query.
   - Query keys encode exact server-state dimensions.
   - Holds payload snapshots and background refresh state.

3. Conditional interactive graph store
   - Zustand or sibling store module.
   - Owns active estimate graph, dirty edits, UI-scoped graph metadata, mutation logs.
   - Does not own server authorization truth.

4. Selector facade
   - Returns current nested `EstimateTreeNode[]` facade during migration.
   - Returns visible branch windows.
   - Returns row ids per node.
   - Returns row display models.
   - Returns totals.
   - Returns facet indexes.

5. Render layer
   - Tree panel.
   - Sheet branch virtualization.
   - Row table virtualization.
   - Dialogs and sidebars.

## Graph Shape

```ts
type EstimateGraphState = {
  estimateId: string;
  activeTabId: string | null;
  nodesById: Record<string, GraphNode>;
  rowsById: Record<string, GraphRow>;
  childrenByParentId: Record<string, string[]>;
  rowIdsByNodeId: Record<string, string[]>;
  parentIdByNodeId: Record<string, string | null>;
  rootNodeIdsByTabId: Record<string, string[]>;
  totalsByNodeId: Record<string, number>;
  rowTotalsById: Record<string, number>;
  loadStateByNodeId: Record<string, NodeLoadState>;
  dirtyRowsById: Record<string, EditableRowValue>;
  mutationLogByOperationId: Record<string, EntityInversePatch[]>;
  // Component-interop index (see doc 22 GAP-06): maps project-component identity
  // to the list of row ids sharing that identity. Enables O(1) client-side
  // fan-out instead of O(N) tree-walk via patchProjectComponentInstanceRowsInTree.
  componentInstanceRowIdsByIdentity: Record<string, string[]>;
  // Reverse lookup: row id → project-component identity (for index maintenance on row insert/delete/move).
  componentIdentityByRowId: Record<string, string | null>;
  revision: number;
};
```

### Component Fan-Out (two layers)

Project-component fan-out (doc 22) operates at two layers; only the client layer needs the graph index:

- **Server layer**: `propagateProjectComponentRowPatch` (`d1-action-client.ts:1632`) uses JSON identity filtering plus per-match batched updates. `UNIT-003` measures lookup and statement counts; no O(1) claim is made before that evidence.
- **Client layer**: `patchProjectComponentInstanceRowsInTree` (`estimate-row-tree-patch.ts:275`) currently walks the cached tree (O(N)). The `componentInstanceRowIdsByIdentity` index makes this O(matching rows) by direct lookup. The index must be maintained on every row insert/delete/move/promote via `componentIdentityByRowId`.

## Selector Contracts

Required selectors:
- `selectVisibleBranches(rootNodeId, collapsedIds, searchState)`
- `selectRowsForNode(nodeId, sortState, filterState)`
- `selectEditableRow(rowId)`
- `selectRowTotal(rowId)`
- `selectNodeTotal(nodeId)`
- `selectProjectTotal(tabId?)`
- `selectFacetOptions(scopeNodeId)`
- `selectMoveNodeOptions(scope)`
- `selectMovePositionOptions(targetNodeId, window)`
- `selectNestedTreeFacade(scope)`
- `selectSubtreeCompleteness(nodeId)`

## Incremental Totals

Current:
- Recompute totals recursively for all loaded nodes when `editableRows` changes.

Target:
- On row edit:
  1. Calculate previous row total.
  2. Calculate next row total.
  3. Compute delta.
  4. Update `rowTotalsById[rowId]`.
  5. Walk ancestors from row node to root and add delta.
  6. Increment revision for affected selectors.

Fallback:
- Keep recursive `computeNodeTotals` as bootstrap and recovery verifier until parity is stable.

## Subtree Loading

Current:
- Subtree payloads exist and nested merge helpers exist.

Target:
- Merge subtree payload into graph entities.
- Preserve `childrenLoaded` and `rowItemsLoaded`.
- Deduplicate in-flight loads by `(projectId, estimateId, tabId, nodeId)`.
- Coalesce sibling expansions within a short event loop window when possible.
- Invalidate only affected subtree/window queries.

## Mutation Rollback

Current:
- Many optimistic paths patch nested trees and may refetch/recover whole trees.

Target:
- Mutations produce entity inverse patches:
  - row field before/after
  - row order before/after
  - node parent/order before/after
  - inserted entity ids
  - deleted entity snapshots
  - affected ancestor total deltas
- Rollback applies inverse patches by operation id.
- Server row revision remains the conflict guard.

## Compatibility Strategy

This strategy applies only if `UNIT-006` is activated. If it is superseded, nested state remains authoritative and no graph migration occurs.

When `UNIT-006` is activated, its first stage keeps a nested facade so current components continue rendering.

`UNIT-007`, when activated, migrates totals and selectors behind the facade.

`UNIT-008`, when activated, points virtualized branch and row renderers at stable selectors.

Recursive hot-path fallbacks are removed only after the activated branches pass parity and browser proof.

## Alternatives

### Alternative A - Nested Tree Plus More Memoization

Pros:
- Smallest short-term diff.
- Lowest migration complexity.

Cons:
- Does not remove O(N) totals, flattening, filtering, and patching.
- Risk of memoization complexity hiding structural cost.

Verdict: retain this architecture when `UNIT-006` is superseded and allow only the narrow fixes activated by measurement.

### Alternative B - Normalize Rows Only

Pros:
- Good edit hot-path gains.
- Lower complexity than full graph.

Cons:
- Tree expansion, branch rendering, search, and subtree merge still pay nested costs.

Verdict: not an independently selected target in this pack; rows-only changes require an owning evidence-activated unit.

### Alternative C - Full Graph Rewrite

Pros:
- Clean long-term state shape.

Cons:
- Too risky for MVP if done as one big rewrite.

Verdict: reject big-bang rewrite; retain the staged graph-backed facade as the prepared `UNIT-006` branch when measurement activates it, otherwise retain the nested implementation.

## Architecture Decision

Prepare staged normalized graph adoption behind the existing component and route contracts, but execute it only when `UNIT-004` activates `UNIT-006`; a supersession receipt is the correct outcome otherwise.

Rationale:
- When activated, removes the measured scale bottleneck.
- Preserves current UX.
- Enables parity testing.
- Allows rollback by feature flag.
- Aligns with React/TanStack guidance to optimize measured expensive selectors rather than blanket memoization.
