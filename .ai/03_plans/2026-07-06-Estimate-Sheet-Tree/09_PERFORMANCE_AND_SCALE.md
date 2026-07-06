# Performance And Scale

## Phase 0 Impact (added 2026-07-06)

Phase 0 adds one field (`target_project_id: string`) to the reorder RPC payload. Cost: 32 bytes per request, zero extra queries (the existing `readProjectContext` query at `d1-action-client.ts:406` was already being called and returning null; with the fix it returns the project row).

Phase 0 is performance-neutral.

## Current Performance Design

- Hover uses `validateEstimateTreeDrop`, not full clone-and-plan.
- Drop uses `evaluateEstimateTreeDrop`.
- Virtualization mounts a bounded number of rows for large trees.
- Existing perf tests budget flat-tree hover validation.

## Risks

- `handleDragOver` still resolves intent and validates on every dragover event.
- Drop band changes can increase re-render churn if they update target state too often.
- Visible status or help text can trigger layout shifts in compact sidebars.
- Splitting the component can accidentally recreate large tree transformations unless memoization boundaries are preserved where they are actually performance-relevant.
- The 2217-line component carries ~15 `useRef` instances and many `useCallback`/`useMemo` boundaries. Splitting must preserve correctness without relying on memoization as a correctness guarantee; preserve referential stability only where tests, memoized children, or Hook dependencies justify it.
- Move dialog destination generation traverses local tree options; full before/inside/after/root expansion increases option count and validation work.
- Search/filter can expand all displayed matches; empty-result and disabled-reorder help must not force expensive recalculation.
- Bulk-selection pruning and optimistic-id resolution share local tree transforms with reorder.

## Requirements

- Keep hover validation under the current large-tree budgets.
- Add a nested 5k-node hover sample if traversal/indexing changes.
- Avoid width/margin animation for persistent affordance rails if it causes layout shift.
- Preserve virtualization thresholds and initial height behavior.
- Avoid full reorder planning during hover.
- Keep Move dialog option generation outside drag hover.
- Watch Cloudflare D1 limits for large branch moves: bound parameters per query, Worker subrequests, query duration, and batch statement limits.

## Verification

Run:

```bash
bunx vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts tests/vitest/ui-tree.test.tsx --maxWorkers=1
```

Then run the full focused suite from `11_TEST_STRATEGY_AND_QA_MATRIX.md`.

## D1 Query Cost (added 2026-07-06)

A single-node reorder is approximately 8-10 D1 queries plus n UPDATE statements for n moved nodes. Acceptable for early use, but do not claim free-tier/provider safety from local tests alone. Full breakdown and Cloudflare D1 caveats are in `07_DATA_API_AND_PERSISTENCE.md`.
