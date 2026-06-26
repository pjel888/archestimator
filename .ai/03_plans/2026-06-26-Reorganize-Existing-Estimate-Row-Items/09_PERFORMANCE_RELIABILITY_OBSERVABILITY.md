# Performance, Reliability, And Observability

## Performance Constraints

Middle-sheet drag feedback must remain responsive with large branches. Tree dragover is already performance-sensitive and should stay MIME-based. Do not inspect the full row tree on every tree dragover.

## Expected Hot Paths

- Row drag handle render in every visible row.
- Row dragover calculation for before or after insertion indicators.
- Branch append drop target calculation.
- Left-tree external drop validation.
- Pure helper recalculation of affected sibling orders.

## Performance Plan

- Keep handle dimensions stable and avoid row height changes.
- Compute target insertion from row IDs and branch IDs, not DOM index alone.
- Avoid state writes on every dragover if the target marker has not changed.
- Memoize or localize drag state to avoid rerendering unrelated branches.
- Keep tree external `canDrop` checks limited to MIME type, target node status, tree guard state, and inside position.
- Use pure helper tests with large sibling lists to catch order calculation regressions.

## Virtualization Risks

The row table virtualizes rows with a default height near 96px. Drop targets must not assume all rows are mounted. For same-branch reorder, the visible row target can provide before/after positions for mounted rows. Keyboard dialog should cover non-visible positions by listing target branch rows or offering top/bottom placement.

Disable pointer reorder while express editing or other states already disable virtualization assumptions.

## Reliability Plan

- Optimistically patch canonical tree state, not only rendered filtered state.
- Keep a pre-move snapshot for rollback.
- Treat same-node no-op moves as local no-ops without server calls.
- Reconcile server returned revisions after success.
- On conflict, restore and notify the user that the row order changed elsewhere.
- Treat partial or unexpected server results as failure because the RPC should be transactional.
- Ensure source and target branch row counts/totals converge in both middle sheet and left tree.

## Observability

Use existing logging or analytics patterns if present. The implementation should expose enough evidence for debugging:

- mutation ID
- moved row ID
- source node ID
- target node ID
- affected row count
- conflict versus validation versus authorization failure category

Avoid logging row descriptions, notes, or component content unless existing mutation logging already does so safely.

## Validation Evidence During Implementation

Recommended scale checks:

- Pure helper test for same-node reorder in a 1000-row branch.
- Pure helper test for cross-node move where both source and target have many siblings.
- Existing `estimate-tree-drag-over-perf.test.ts` remains passing after adding the row MIME type.
- Row virtualization test remains passing with handle enabled.
