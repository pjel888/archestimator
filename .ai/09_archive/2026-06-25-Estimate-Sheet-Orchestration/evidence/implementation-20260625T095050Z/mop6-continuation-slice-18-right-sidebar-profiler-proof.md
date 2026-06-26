---
title: MOP-6 Continuation Slice 18 Right Sidebar Profiler Proof
type: evidence
date: 2026-06-26
---

# MOP-6 Continuation Slice 18 Right Sidebar Profiler Proof

## Scope

This slice closes the right-sidebar `F-13` active-tab render proof gap. The
state/reducer extraction already existed in `use-estimate-right-sidebar-state.ts`
and React Doctor no longer reported `EstimateRightSidebarBase` as a giant
component; this slice adds repeatable profiler evidence that inactive tab trees
do not rerender during active-tab interactions.

## Implementation

- Added
  `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx`.
- The test renders the real `EstimateRightSidebar` shell inside React
  `<Profiler>`, mocks only the heavy `LibraryTree` and `TemplatesTree` bodies,
  and counts active/inactive tree renders across Library and Templates tab
  interactions.
- The regression claim is intentionally narrow: Library interactions commit
  React work and rerender `LibraryTree` while `TemplatesTree` stays at zero
  renders; Templates interactions commit React work and rerender
  `TemplatesTree` while `LibraryTree` stays at zero renders.
- Updated
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx` so its
  static trust-gate check follows the M-21 extraction boundary and reads
  `use-estimate-row-handlers.ts` for source-review gate logic.

## Validation

Fresh local evidence passed:

- `bunx vitest run tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx --maxWorkers=1`
  passed 1 file / 1 test.
- `bunx vitest run tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/resizable-side-panel-a11y.test.tsx --maxWorkers=1`
  passed 6 files / 118 tests.
- `bun run type-check` passed.
- `bun run doctor -- --scope files --base HEAD --no-score --blocking none --no-dead-code --no-color --verbose`
  exited 0. It still reported broader changed-branch warnings in
  `ResizableSidePanel`, `TreePanelHeader`, `EstimateSheetContent`, and
  adjacent component-library effects, but it did not report
  `EstimateRightSidebarBase` as a giant component.

## Boundary

This closes F-13 with an automated React Profiler regression harness rather
than a one-off manual React DevTools export. Full source-folder completion
remains false until lazy subtree loading and a concrete realtime-v2
collaboration contract are handled.
