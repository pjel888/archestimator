# 02 — Current Code and Hot-Path Map

## 1. Route and client boundary

### Route

`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

Current path:

```text
route params
→ load inert performance-mode snapshot
→ resolve estimate tab route context
→ optionally resolve edit capability
→ render EstimateWorkspaceClient
```

Useful existing behavior:

- route-level Suspense and skeleton;
- server-side route-context resolution;
- lazy component-library data;
- Server-Timing spans;
- edit capability prefetched when possible.

Unnecessary current behavior:

- every request resolves performance-mode configuration;
- mode data is passed through the client tree;
- DOM data attributes expose five modes that remain off.

### Workspace client

`EstimateWorkspaceClient.tsx`

Already does several things correctly:

- dynamically imports the tree pane;
- dynamically imports estimate content;
- uses TanStack Query for tabs and edit capability;
- directly updates tab cache after mutation;
- keeps the server tree as initial data.

Do not rebuild these mechanisms.

## 2. Estimate sheet root

`EstimateSheetContent.tsx` is a giant client coordinator containing:

- transient row drafts;
- dirty state;
- row mutations;
- tree query/cache updates;
- selected-node derivation;
- search/facets/grouping;
- totals;
- row selection;
- move dialogs;
- detail/history modals;
- component library;
- proposal preview;
- tab CRUD;
- sheet adjustment;
- collaboration state.

Size alone is not the performance issue. The performance issue is that high-frequency row state sits above almost all of these concerns.

## 3. Hot path: row keystroke

Current simplified path:

```text
row input onChange
→ setEditableRows(current => {...current, [rowId]: nextRow})
→ EstimateSheetContent reducer/state changes
→ EstimateSheetContent function runs
→ selected/displayed tree memos evaluate dependencies
→ computeNodeTotals walks every visible node and row
→ project total recomputes
→ branch/table parents receive new editableRows object
→ custom table comparator loops each item to compare row drafts
→ changed row renders
```

### Direct costs

- O(total draft rows) object spread for every keystroke;
- O(total visible tree) total calculation;
- O(rows per rendered table) comparator checks;
- possible search/facet/group transform work;
- parent component render and prop preparation.

### Correct target

A keystroke should synchronously update:

- the active input;
- the active row's displayed total;
- that row's node and ancestor totals;
- save/dirty state.

It should not cause unrelated rows, dialogs, library projections, proposal previews, or full-tree totals to run.

## 4. Hot path: project-component update

Current source:

- `patchProjectComponentInstanceRowsInTree`;
- `collectProjectComponentRollbackPatches`;
- `restoreEstimateRowPatchesInTree`;
- project component projection cache patching.

### Current complexity

`patchProjectComponentInstanceRowsInTree`:

1. recursively finds the initiating row;
2. recursively traverses every row to locate siblings with the same component identity;
3. calculates identity for nonmatching rows too;
4. clones matching branches.

`collectProjectComponentRollbackPatches` repeats a full traversal.

`restoreEstimateRowPatchesInTree` reduces over rollback patches and calls a full recursive tree patch per row.

For a component with many instances, rollback can approach O(matches × tree size).

### Existing measurement

At 5,000 rows with 1,000 matches:

- 4,000 unrelated rows are inspected;
- the hard metric fails.

### Correct target

- one index lookup for the component identity;
- exact matching row IDs;
- group exact row patches by node;
- clone affected paths once;
- rollback applies the grouped previous patches in one structural pass.

## 5. Hot path: selected node and derived views

Current independent recursive work includes:

- `findNodePath`;
- `computeNodeCode`;
- `findNodeById`;
- `filterNodeForSearch`;
- facet filtering;
- grouping;
- collecting visible row IDs;
- collecting row move node options;
- flattening rows;
- component catalogue input collection.

Several functions traverse the same tree with different output.

### Specific avoidable work

- row move options are collected from the full tree even when the dialog is closed;
- tree catalogue inputs are collected before the library is opened;
- selected path and code use separate recursive searches;
- numeric draft state invalidates displayed-tree derivation even when no numeric facet/group needs it;
- all visible row IDs are recomputed from the displayed tree;
- large flattened row arrays are correctly gated for some modals, but other derivations are not.

### Correct target

Use a narrow tree index and activation gates:

- path/code/node lookup from index;
- move options only while move UI is open;
- catalogue inputs only after library intent;
- numeric draft subscription only when a value-dependent view is active;
- deferred search rendering after structural costs are fixed.

## 6. Hot path: row table render

`EstimateRowItemsTable` already has:

- `memo`;
- a custom comparator;
- row virtualization;
- row-level memo;
- focus recovery;
- column resize;
- local interaction state.

The custom comparator inspects every table item on each parent render:

- editable row reference;
- selected state;
- mutation status.

This is a defensive response to overly broad parent state.

### Correct target

After draft/selection/status state is selected per row:

- table receives stable `items` and callbacks;
- row subscribes to its own draft/status/selection;
- remove O(rows) comparator or reduce it to cheap prop identity;
- keep virtualization.

## 7. Virtualization status

### Branch virtualization

Current branch virtualizer:

- flattens all visible branches;
- mounts only viewport branches after threshold;
- uses TanStack Virtual.

This limits DOM mount but does not eliminate full visible-tree flattening.

### Row virtualization

Current row virtualizer:

- activates at about 75 rows;
- mounts viewport rows;
- disables itself while an express component editor is active.

This is reasonable existing behavior.

### Decision

Do not start with virtualization.

Activate virtualization work only if a trace shows:

- mount/commit dominates after state isolation;
- one area regularly exceeds the threshold;
- disabling virtualization for an active editor causes a measurable regression;
- branch flattening dominates expand/search.

## 8. Route/database status

Current repository improvements already exist:

- node IDs used for row fetches are batched;
- nodes and sheet adjustment are loaded in parallel;
- rows load after node IDs;
- all-tabs export uses batched nodes and rows;
- load limits and completeness are represented.

The `readEstimateNodeRouteContextD1FastPath` function is still a null stub.

### Decision

A null stub is not evidence that a fast path should be built.

Use current Server-Timing:

- `estimate-sheet.route-context`;
- node read;
- row read;
- tree build;
- edit capability.

Only activate route work if it materially dominates the named user-visible route-open symptom.

## 9. State ownership map

| Data | Current owner | Target owner |
|---|---|---|
| Confirmed server tree | TanStack Query | Keep |
| Estimate tabs | TanStack Query | Keep |
| Edit capability | TanStack Query/server prop | Keep |
| Row input drafts | EstimateSheetContent parent record | Per-estimate transient store with row selectors |
| Dirty row IDs | EstimateSheetContent reducer | Same transient store / mutation state |
| Row save status | mutation hook parent map | Row-level selector or stable keyed store |
| Selection | root set | Row/table selector if profiling proves broad churn |
| Node totals | full-tree render memo | Indexed initial totals + row delta updates |
| Selected node path/code | recursive functions | Tree index |
| Modal visibility | local/root reducer | Keep local to controlling surface |
| Component library server data | TanStack Query | Keep |
| High-cost catalogue derivation | always on tree change | On library intent/open |
| Proposal preview materialization | modal-gated | Keep gated; read store snapshot on demand |

## 10. Already-good practices to preserve

- dynamic imports for heavy panels;
- query-cache tree authority;
- optimistic mutations;
- row revision conflict detection;
- structural sharing in tree patch functions;
- stable row IDs;
- row and branch virtualization;
- bounded load limits;
- server timing;
- render probes with negligible production cost;
- direct query-cache update after tab actions.

## 11. Likely target file set

Primary:

- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- new narrow index/store files under `src/components/workshop/estimate-sheet/`

Conditional:

- `src/lib/repositories/workspace-repository.ts`
- route page;
- virtual branch list;
- query hooks.

Cleanup:

- performance mode files;
- route/workspace mode plumbing;
- `perf:estimate:*` scripts and dedicated configs/tests;
- generated runtime evidence.
