# React TanStack Virtual Implementation Log

Date: 2026-06-14

## Implemented

- Added `@tanstack/react-virtual` and default-on public flags, with explicit `false`/`0`/`no`/`off` escape hatches:
  - `NEXT_PUBLIC_TREE_VIRTUALIZATION`
  - `NEXT_PUBLIC_EMC_VIRTUALIZATION`
  - `NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION`
- Added shared workshop virtualization helpers in `src/lib/workshop/virtualization-flags.ts`.
- Added virtual rendering to the shared `Tree` component with stable row keys, test markers, root drop zones outside the virtual row container, and logical-row focus scrolling.
- Threaded shared Tree virtualization through the estimate tree, library trees, folder tree, templates browse tree, and template structure tree.
- Added virtual estimate row-table rendering with stable row keys, row-id keyboard focus fallback, shared-scroller scroll-margin compensation, and test markers.
- Added default-on estimate master-column branch virtualization in `EstimateSheetContent` that flattens visible sections from the existing collapse/search context and renders section-only branches with dynamic measurement.
- Applied the estimate sheet hierarchy UI Phase 1A changes:
  - depth-aware name ramp
  - 9px outline code
  - inset sibling divider token
  - heading-level semantics on visible node names

## Evidence

- `bun tsc --noEmit`
- `env -u NEXT_PUBLIC_TREE_VIRTUALIZATION -u NEXT_PUBLIC_EMC_VIRTUALIZATION -u NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION bun -e 'const flags = await import("./src/lib/workshop/virtualization-flags.ts"); console.log(JSON.stringify(flags.WORKSHOP_VIRTUALIZATION_FLAGS));'`
- `NEXT_PUBLIC_TREE_VIRTUALIZATION=false NEXT_PUBLIC_EMC_VIRTUALIZATION=0 NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=off bun -e 'const flags = await import("./src/lib/workshop/virtualization-flags.ts"); console.log(JSON.stringify(flags.WORKSHOP_VIRTUALIZATION_FLAGS));'`
- `bun vitest run tests/vitest/estimate-row-table-virtualization.test.tsx`
- `bun vitest run tests/vitest/ui-tree.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx`
- `bun vitest run tests/vitest/estimate-sheet-branch-header-ui.test.tsx tests/vitest/estimate-mixed-content.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
- `bun vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/estimate-sheet-branch-header-ui.test.tsx tests/vitest/estimate-mixed-content.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
- `bun vitest run tests/vitest/ui-tree.test.tsx tests/vitest/tree-external-drop.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx`
- `bunx eslint <changed source/test files>`
- `git diff --check`
- `bun run build`
- `bun playwright test e2e/auth.spec.ts`

## Notes

- All virtualization flags now default on. Operators can still force-disable a specific lane with `false`, `0`, `no`, or `off`.
- The plan-requested pre-change browser metric artifact could not honestly be captured after implementation had started, so `.omx/artifacts/perf/tanstack-virtual/before-sheet.json` records the behavioral baseline and test evidence without fabricating timing numbers.
- Full `bun run test:dom` was rerun after the row-table scroll-margin fix. It failed on 12 tests in unrelated project/versioning/reusable-source/template/proposal tests. The earlier patch regression (`estimate-sheet-cost-inputs` row-cell ArrowRight focus) is fixed, and the focused test plus impacted suites pass afterward.
- Full `bun run lint` currently fails because ESLint traverses `.omx/runtime` plugin cache files plus existing unrelated source errors. `bun run lint:design-system` currently fails on pre-existing files outside this patch (`financial-total-card.tsx`, `ProjectEstimatesListSkeleton.tsx`, and `ProposalExportPreviewDialog.tsx`). Changed-file ESLint is clean, and the touched estimate-sheet design-system issues were corrected.
