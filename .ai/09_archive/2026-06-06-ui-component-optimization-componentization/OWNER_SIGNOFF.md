# Owner Sign-Off Gates

**Status:** No owner approval has been recorded for implementation in this folder.

| Gate | Required before | Decision | Status |
| --- | --- | --- | --- |
| G1 | Starting MVP Phases 0-3 | Approve tree-core/share-tree MVP as future implementation slice | Pending |
| G2 | Applying tree-core to editable estimate tree | Confirm share-tree MVP behavior and approve editable-tree risk | Pending |
| G3 | Decomposing `EstimateSheetContent.tsx` | Owner smoke acceptance criteria for row edit, insert, rollback, proposal, and activity | Pending |
| G4 | Adding virtualization dependency | Approve dependency after row-count and Profiler proof | Pending |
| G5 | Adding runtime feature flag | Approve operational complexity and removal plan | Pending |
| G6 | Merging full plan | Accept measurement evidence and residual risks | Pending |

## Owner Smoke Checklist For Editable Phases

Before Phase 5 or 6 can be considered ready to ship, owner smoke should cover:

- expand/collapse estimate tree
- rename group and area nodes
- delete a node and rollback on failed delete
- drag/drop reorder with valid and invalid targets
- bulk select and bulk delete
- edit quantity, contingency/discount, and misc cost
- insert a component from library into selected area
- open row details and activity
- open proposal preview/export path
