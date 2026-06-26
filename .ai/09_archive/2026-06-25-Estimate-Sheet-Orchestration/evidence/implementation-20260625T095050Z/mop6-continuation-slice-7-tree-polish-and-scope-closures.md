# MOP-6 Continuation Slice 7: Tree Polish And Scope Closures

Date: 2026-06-25

## Implemented

- F-24: inline rename now remains visible while the server rename is saving,
  with disabled controls and a `Saving...` status.
- F-25: newly created tree rows are scrolled into view after optimistic create.
- F-26: add-child placement is documented/proved as append-as-child behavior,
  matching current local and server ordering semantics.

Touched behavior:

- `src/components/workshop/EstimateSheetTree.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`
- `tests/vitest/estimate-tree-modal.test.tsx`

## Evidence

- `bun x vitest run tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-modal.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx --maxWorkers=1`
  passed, 3 files / 53 tests.
- `bun run type-check` passed.
- `bun x eslint src/components/workshop/EstimateSheetTree.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-modal.test.tsx`
  passed.
- Read-only lazy/realtime architecture lane ran:
  `bun x vitest run tests/vitest/estimate-tree-refetch-on-mount.test.tsx tests/vitest/project-collaboration-realtime.test.ts --maxWorkers=1`
  and reported 2 files / 13 tests passed.

## Scope Closures

- Broad center/tree undo is not implemented as a local patch. Current code
  already rolls back failed optimistic deletes, but undo after successful
  save/delete needs a restore model: tombstones or inverse operations, ordering
  metadata, conflict handling, UI timeout/stack semantics, and API/RPC changes.
- Lazy subtree loading is not implemented as a local patch. Current repository
  loaders still fetch/materialize whole node and row sets, and the client has no
  subtree fetch/merge protocol or per-node remote loading state.
- Realtime cursor/presence already exists. The remaining realtime-v2 wording is
  not a concrete implementation contract and should be split from lazy subtree
  loading before future work.

## Stop Condition

Tree F-24, F-25, and F-26 are closed. The remaining tree-side gaps are
architecture/proof gaps, not missing small code patches.
