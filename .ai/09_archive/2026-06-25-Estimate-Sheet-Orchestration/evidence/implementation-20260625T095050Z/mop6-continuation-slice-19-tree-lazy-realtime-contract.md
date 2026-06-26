# MOP-6 Continuation Slice 19 — Tree Lazy Subtree + Realtime-v2 Contract

Scope: close the remaining tree-side lazy subtree loading and concrete
realtime-v2 collaboration contract gap from the June 24 tree source plan and
June 25 orchestration pack.

Implemented:

- `src/lib/estimates/estimate-tree-lazy.ts` for typed subtree payloads,
  branch merge semantics, request-id freshness guards, and per-node hydration
  state.
- Optional `childrenLoaded` / `rowItemsLoaded` metadata on estimate tree nodes.
- Bounded server-side branch fetch in
  `src/lib/repositories/workspace-repository.ts`, exposed through
  `src/lib/estimates/subtree-actions.ts` and
  `src/lib/estimates/subtree-client.ts`.
- Expand-time hydration in `EstimateSheetTree.tsx` for partial branches and
  terminal nodes from an initial tree that exceeded the existing load limit.
- `src/lib/collaboration/estimate-tree-realtime-contract.ts` for the v2 tree
  collaboration event contract: subtree request/load, last-write-wins branch
  changes, and full-refetch requests. Existing cursor/presence realtime remains
  unchanged.

Validation:

- `bunx vitest run tests/vitest/estimate-tree-lazy-subtree.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx --maxWorkers=1`
  passed 3 files / 8 tests.
- `bunx vitest run tests/vitest/estimate-tree-refetch-on-mount.test.tsx tests/vitest/project-collaboration-realtime.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-node-icon.test.tsx tests/vitest/estimate-tree-lazy-subtree.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx --maxWorkers=1`
  passed 8 files / 40 tests.
- `bunx vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1`
  passed 4 files / 12 tests.
- `bun run type-check` passed.

Boundary:

- This is a local implementation/test slice. It does not claim production
  deployment, a manual browser matrix, or hosted provider writes.
- With this slice, the three June 24 estimate-sheet source folders are
  implemented under the current orchestration scope.
