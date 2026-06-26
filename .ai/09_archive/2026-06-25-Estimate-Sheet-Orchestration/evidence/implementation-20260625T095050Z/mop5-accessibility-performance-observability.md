# MOP-5 Accessibility, Performance, And Observability Evidence

Date: 2026-06-25

Scope:

- Tree primitive keyboard affordances: typeahead, ArrowLeft/ArrowRight
  expand/collapse/parent-child navigation, F2 rename shortcut, and
  Shift+F10/context-menu shortcut callback.
- Estimate tree keyboard affordances: F2 inline rename, Shift+F10 context menu,
  and a keyboard-accessible `Move...` dialog for moving tree areas inside a
  valid destination.
- Center sheet component affordances: explicit in-card replace and move buttons
  opening keyboard-searchable dialogs that reuse the existing replace,
  source-trust review, and atomic move mutation paths.
- Row table semantics: explicit `scope="col"` on spreadsheet headers.
- Render/performance/observability guardrails for estimate-sheet scale,
  memoization, virtualization, source-trust telemetry, and analytics events.

Implementation notes:

- `src/components/ui/tree.tsx` now supports row-scoped keyboard shortcuts and
  complete treeview-style left/right behavior without stealing focus from
  inline rename inputs or other editable controls rendered inside rows.
- `src/components/workshop/EstimateSheetTree.tsx` wires the new shortcuts to
  inline rename/context menu behavior and exposes a modal move picker whose
  destination list is validated through `validateEstimateTreeDrop`.
- `src/components/workshop/EstimateSheetContent.tsx`,
  `src/components/workshop/estimate-sheet/rows/branch.tsx`,
  `src/components/workshop/estimate-sheet/rows/row-table.tsx`, and
  `src/components/workshop/estimate-sheet/rows/cells.tsx` expose replace/move
  picker buttons and route confirmed actions through existing center-sheet
  mutation paths. Center row moves now also respect the `canEditEstimate`
  read-only guard and emit sanitized `authz_denied` telemetry on denial.
- `tests/vitest/ui-tree.test.tsx`,
  `tests/vitest/estimate-tree-context-menu.test.tsx`,
  `tests/vitest/estimate-row-table-virtualization.test.tsx`, and
  `tests/vitest/estimate-sheet-cost-inputs.test.tsx` cover the new keyboard,
  dialog, and table-header contracts.

Verification:

- Center-sheet picker regression:
  `bun x vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1`
  passed, 1 file / 42 tests.
- TypeScript:
  `bun x tsc --noEmit --incremental false` passed; then stale
  `tsconfig.tsbuildinfo` was removed and `bun run type-check` passed with the
  normal repo script. `bun run type-check` also passed after the post-review
  fixes.
- MOP-5 interaction matrix:
  `bun x vitest run tests/vitest/ui-tree.test.tsx
  tests/vitest/estimate-tree-context-menu.test.tsx
  tests/vitest/estimate-row-table-virtualization.test.tsx
  tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1` passed
  after the post-review editable-target guard, 4 files / 99 tests.
- Render/performance guardrails:
  `bun x vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts
  tests/vitest/estimate-sheet-large-data-budgets.test.ts
  tests/vitest/templates-tree-performance.test.ts
  tests/vitest/perf/estimate-sheet-render-relief.test.tsx
  tests/vitest/perf/estimate-sheet-memoization.test.tsx
  tests/vitest/estimate-branch-virtualization.test.tsx --maxWorkers=1` passed,
  6 files / 22 tests.
- Render baseline:
  `SHEET_PERF_BASELINE_OUTPUT=.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/evidence/implementation-20260625T095050Z/mop5-estimate-sheet-render-baseline.json bun x vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1`
  passed, 1 file / 3 tests, and regenerated the local jsdom baseline JSON.
- Observability guardrails:
  `bun x vitest run tests/vitest/component-library-ui.test.tsx
  tests/vitest/library-source-trust.test.ts
  tests/vitest/library-telemetry-emit.test.ts
  tests/vitest/vercel-web-analytics-integration.test.ts --maxWorkers=1`
  passed, 4 files / 111 tests.
- Diff hygiene:
  `git diff --check` passed after final evidence and post-review fixes.

Review notes:

- Local final review found a lazy-data edge where opening the replacement
  picker without server-provided library props could show an empty list before
  the lite library query loaded. Fixed by enabling the lazy query for the
  replacement picker and showing a loading state.
- Local final review found a keyboard edge where root tree typeahead could
  react to key events bubbling from editable controls inside rows. Fixed with an
  editable-target guard and a regression test.

Baseline JSON summary:

- Generated at `2026-06-25T11:48:33.731Z`.
- `sheet-50`: initial render 200.53ms; average keystroke 5.65ms; worst
  keystroke 9.49ms; edited table renders 9; other table renders 0.
- `sheet-200`: initial render 361.55ms; average keystroke 1.98ms; worst
  keystroke 5.27ms; edited table renders 9; other table renders 0.
- `sheet-500`: initial render 577.86ms; average keystroke 5.78ms; worst
  keystroke 7.05ms; edited table renders 9; other table renders 0.

Validation gaps:

- Baseline metrics are local jsdom profiles, not production Chrome traces.
- Browser automation was intentionally skipped under the Codex App speed
  guardrail because the claims are keyboard event routing, jsdom DOM behavior,
  type safety, local render budgets, and telemetry emission. No layout-only
  browser claim is made.
- No provider writes, hosted database mutations, production deploys, or paid
  Supabase add-ons were used for this slice.
