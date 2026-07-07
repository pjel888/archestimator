# Loop Ledger

## 2026-07-07 Iteration 1

Objective: Fix stale Project tab projections and Project tab component insertion from the active estimate sheet.

Evidence gathered:
- Project tab component rows are projected in `src/lib/component-library/project-component-projection.ts`.
- Estimate sheet lazy sidebar uses `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)`.
- Row mutations in `src/hooks/use-estimate-row-mutations.ts` update the estimate tree cache but do not patch the lite component-library projection cache.
- `EstimateSheetContent` has `refetchProjectComponentProjection`, but it marks the lite cache stale with `refetchType: "none"`, so an already-open sidebar can remain stale.
- Project tab component rows currently use the library item drag payload path when rendered as item rows; reusable project source subtree drags use `PROJECT_SOURCE_DRAG_MIME_TYPE`.

Planned patch:
- Add scoped helpers that patch projected project-row items in component-library cache keys.
- Call those helpers from insert/update/delete/detach/promote row mutation success paths and offline optimistic update where appropriate.
- Keep active refetch fallback for reconciliation.
- Ensure projected Project tab row items remain insertable via the normal library-item insert/drop path.

Validation targets:
- `tests/vitest/estimate-row-mutation-coordinator.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`

## 2026-07-07 Iteration 1 Closeout

Implemented:
- `src/hooks/use-estimate-row-mutations.ts` now patches projected project-component rows in active component-library caches during row updates, rolls back the projection cache on online mutation failure, keeps offline drafts visible, and removes projected rows immediately on delete/replace/promote paths.
- `src/components/workshop/EstimateSheetContent.tsx` now actively refetches the mounted lite Project tab projection after project-row changes and honors a target node passed through add-library-item events.
- `src/components/workshop/EstimateSheetTree.tsx` now accepts `LIBRARY_ITEM_DRAG_MIME_TYPE` external drops and dispatches `ADD_LIBRARY_ITEM_EVENT` with the hovered tree node id.
- `src/components/workshop/estimate-sheet/rows/constants.ts` now allows add-library-item events to carry an optional `targetNodeId`.
- Regression tests were added to `tests/vitest/estimate-row-mutation-coordinator.test.tsx` and `tests/vitest/estimate-sheet-tree-dnd.test.tsx`.

Verification:
- PASS: `bun run test:dom -- tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx` (2 files, 18 tests).
- PASS: `bun run type-check`.
- PASS: `git diff --check`.
- PASS: `bun run lint -- src/hooks/use-estimate-row-mutations.ts src/components/workshop/EstimateSheetTree.tsx src/components/workshop/estimate-sheet/rows/constants.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx`.
- PASS with advisory: `bun run doctor -- --scope lines --base main --no-score --no-dead-code -y --verbose` exited 0; it reported one warning in already-modified `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`, outside this fix.
- BLOCKED by unrelated existing diagnostics: `bun run lint -- src/hooks/use-estimate-row-mutations.ts src/components/workshop/EstimateSheetContent.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/estimate-sheet/rows/constants.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx` fails on `src/components/workshop/EstimateSheetContent.tsx:1182` and `:1213` column-width preference state/ref patterns that predate this cache/drop fix.
- NOT CLEAN due unrelated existing issue: `bun run doctor -- --scope changed --base main --no-score --no-dead-code -y` reported a pre-existing error at `src/components/workshop/EstimateSheetContent.tsx:1213`, outside the changed lines for this fix.

Residual risk:
- New row creation still relies on an active projection refetch to construct the fully classified/foldered Project tab row because the row mutation result does not include all projection folder/estimate-node labels. Rename/delete paths are immediate.

## 2026-07-07 Iteration 2 Second-Pass Review

Objective: Re-check the implementation with independent review lanes and tighten confidence before archiving.

Independent review:
- Code review: PASS after updating `tests/vitest/library-workspace-switch-cache.test.ts` to assert scoped Project-tab active refetch and forbid broad active full-library invalidation.
- Performance review: PASS after removing duplicate handler-level `refetchProjectComponentProjection()` calls and narrowing project-scoped cache patching to exact lite/rows keys.
- Test review: PASS after adding direct coverage for `ADD_LIBRARY_ITEM_EVENT.detail.targetNodeId` consumption and Project-tab optimistic rollback on row update failure.
- Architecture review: WATCH. The concrete rename/update acceptance criterion is cleared; fully structural folder/group reconstruction for newly created or moved projection rows still relies on active refetch because the client mutation result does not include the full server-derived projection folder metadata.

Second-pass changes:
- `src/hooks/use-estimate-row-mutations.ts` now guards projection cache helpers against non-dataset values, patches exact project lite/rows caches for project-scoped mutations, and remains the single owner of projection reconciliation.
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` no longer adds duplicate projection refetch callbacks to row mutation success handlers.
- `tests/vitest/estimate-row-mutation-coordinator.test.tsx` now proves Project-tab optimistic row rename rollback.
- `tests/vitest/estimate-sheet-library-insert.test.tsx` now proves add-library events can target a specific tree node different from the selected insertion node.
- `tests/vitest/library-workspace-switch-cache.test.ts` now encodes the scoped projection cache contract.

Verification:
- PASS: `bun run test:dom -- tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-library-item-insert-contract.test.ts tests/vitest/library-workspace-switch-cache.test.ts` (5 files, 65 tests).
- PASS: `bun run test:dom -- tests/vitest/component-library-ui.test.tsx` (1 file, 96 tests).
- PASS with larger hook budget: `bun run test:dom -- tests/vitest/estimate-sheet-library-lazy-load.test.tsx --hookTimeout=30000` (1 file, 7 tests). Default 10s hook budget timed out during dynamic import setup before assertions.
- PASS: `bun run type-check`.
- PASS: `bun run lint -- src/hooks/use-estimate-row-mutations.ts src/components/workshop/EstimateSheetTree.tsx src/components/workshop/estimate-sheet/rows/constants.ts src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-library-item-insert-contract.test.ts tests/vitest/library-workspace-switch-cache.test.ts`.
- PASS: `git diff --check`.
- PASS with advisory: `bun run doctor -- --scope lines --base main --no-score --no-dead-code -y --verbose` exited 0 with one warning in already-modified `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`.
- NOT CLEAN due unrelated existing diagnostics: `bun run doctor -- --verbose --scope changed --base main --no-score --no-dead-code -y` still reports pre-existing changed-file issues including `src/components/workshop/EstimateSheetContent.tsx:1213`.

Archive action:
- Plan pack archived to `.ai/09_archive/2026-07-07-project-component-estimate-sidebar-sync/` after second-pass verification.
