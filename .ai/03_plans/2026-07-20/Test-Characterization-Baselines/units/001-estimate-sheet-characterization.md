# UNIT-001 — EstimateSheetContent characterization harness

## Goal

Add a whole-component integration test that renders `EstimateSheetContent` with
a representative fixture tree, drives the documented user flows, and pins the
committed DOM/a11y tree shape plus the sequence of server-action calls. This is
the regression net that makes the God-component decomposition (Pack D direction
option) tractable.

## Status

`READY` · depends on: (none) · requirement: `UX-001` · risks: `RISK-001`, `RISK-002`

## Why this matters

`EstimateSheetContent.tsx` is 3803 lines, ~97 hooks, ~40 props. It is the
highest-churn, highest-render-cost client surface and the product's core. The
existing tests are slices (`estimate-sheet-cost-inputs`, `estimate-sheet-row-details-crud`,
etc.) — they cover inputs but not the interactions between the 20 effects, the
column-width persistence refs, the realtime-cursor rAF loop, and the reducer.
Any plan to split this file has no regression net for the integration. This unit
builds that net.

## Current state

The component: `src/components/workshop/EstimateSheetContent.tsx`.

Existing slice tests (read these for the harness pattern):
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx:7`
- `tests/vitest/estimate-sheet-row-details-crud.test.tsx`
- `tests/vitest/estimate-mixed-content.test.tsx`
- `tests/vitest/estimate-sheet-tree-query-error.test.tsx`
- `tests/vitest/estimate-template-drop-zones.test.tsx`
- `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`

Perf/timing tests (do NOT copy these — they measure timing, not behavior):
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx` (233 lines)
- `tests/vitest/perf/estimate-sheet-memoization.test.tsx`

The slice tests mock the server actions imported at the top of
`EstimateSheetContent.tsx` (lines 22-37: `loadCostLibraryComponentEditorDetail`,
`updateCostLibraryComponentWithPriceOptions`, `convergeCreatedComponentLibraryCaches`,
etc.). Read one slice test fully to learn the mock pattern.

The component is mounted from `EstimateWorkspaceClient.tsx:214` with heavy
prop-drilling (~40 props on `EstimateSheetContentProps`, type at
`EstimateSheetContent.tsx:346`).

## Owned paths / resources

- `tests/vitest/estimate-sheet-content-characterization.test.tsx` — CREATE.

## Implementation boundary

1. Read `tests/vitest/estimate-sheet-cost-inputs.test.tsx` end-to-end. Reuse its
   imports, its server-action mock setup, and its render helper (or build a
   minimal one on the same pattern).
2. Read `EstimateSheetContent.tsx:346` for `EstimateSheetContentProps`. Build a
   **minimal representative fixture**:
   - one project, one estimate, one tab
   - three rows: a parent group, a leaf line item, a library-linked row
   - one component-library sidebar entry
   - default column widths, no active realtime cursor
3. The test file should render `EstimateSheetContent` with this fixture and
   drive these flows, asserting **behavior** not styling:
   - **Flow A — select a node:** click a tree row; assert the active-node state
     changes (the detail panel renders the selected row's data).
   - **Flow B — edit a cell:** focus a quantity cell, type a value, blur; assert
     the optimistic update commits and the `updateEstimateRowItem` server action
     is called with the expected `{ rowId, projectId, rowPatch }`.
   - **Flow C — insert from library:** click a library sidebar entry; assert
     `loadCostLibraryComponentEditorDetail` is called and the insert action fires.
   - **Flow D — switch tab:** if the fixture has >1 tab, switch; assert the tree
     re-renders with the new tab's rows.
4. Pin the **action-call sequence** (which server actions fire, in what order,
   with what key arguments) using a call-recorder mock. This is the most
   valuable assertion: it catches refactors that change which actions fire.
5. Pin the **committed DOM structure** with a snapshot that omits volatile
   attributes (timestamps, transient class names from animation). Use a
   serializer that walks the rendered container and emits a structural tree
   (tag + role + key text only). Do NOT snapshot inline styles or full className
   strings — they churn.
6. Assert a11y invariants that must survive any refactor: the tree is
   keyboard-navigable (role="tree"), the active row has `aria-selected`, the
   detail panel has an accessible name.
7. Do **not** test realtime cursors or the rAF loop — they need a fake-timer +
   WebSocket harness that is out of scope. Add a `// TODO: characterize cursor
   loop` comment marking the gap.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run new test | `bunx vitest run tests/vitest/estimate-sheet-content-characterization.test.tsx --maxWorkers=1` | all pass |
| Full DOM suite | `bun run test:dom` | all pass (new test included) |
| Type-check | `bun run type-check` | exit 0 |

## Suggested executor toolkit

- If available, the `react-testing` or `characterization` skill may help with
  the snapshot serializer. Otherwise hand-roll a small structural walker.
- The existing `tests/vitest/setup.ts` (per `vitest.config.ts`) configures jsdom
  globals; reuse it.

## Scope

**In scope:** the new test file only.

**Out of scope:**
- Any file under `src/` — zero production edits. If a test reveals a bug, STOP.
- The perf suite (`tests/vitest/perf/`).
- Realtime cursor / WebSocket characterization (marked TODO).
- Modifying existing slice tests.

## Done criteria

- [ ] `bunx vitest run tests/vitest/estimate-sheet-content-characterization.test.tsx --maxWorkers=1` passes
- [ ] `bun run test:dom` passes with the new test included
- [ ] `bun run type-check` exits 0
- [ ] The test covers flows A, B, C, D
- [ ] The test pins the action-call sequence for at least flows B and C
- [ ] The test pins DOM structure via a volatility-stripped snapshot
- [ ] The test asserts the three a11y invariants (tree role, aria-selected, accessible name)
- [ ] No files under `src/` are modified (`git status --short` shows only the new test file)
- [ ] Each test case runs in <10s (the suite total can be longer)

## Acceptance evidence

- The new test file exists and passes in isolation.
- `bun run test:dom` exit 0.
- A manual check: temporarily rename a server action import in the test (break
  the mock) and confirm the test fails loudly — this proves the mock is wired,
  not a no-op. (Revert the rename before finishing.)

## STOP conditions

- Rendering `EstimateSheetContent` requires a provider/store not set up by the
  slice tests' helper. If the setup is materially larger than one slice test's,
  surface it — the harness may need to compose multiple providers, which is fine
  but should be noted.
- A flow reveals a production bug (e.g. the action is called twice). STOP and
  report; do not fix production in this unit.
- The 30s timeout is hit even with a minimal fixture. Split the fixture or mark
  the heavy flow `test.skip` with a TODO and report.

## Recovery

The test is additive; the only failure mode is a flaky or overspecified snapshot.
If a snapshot fails on a refactor-preserved change, loosen it (strip more
attributes) rather than tightening the production behavior.

## Maintenance notes

- **RISK-001:** reviewers should push back on any assertion that pins
  implementation detail (a specific hook name, a transient class). The test's
  value is surviving refactors; over-specification defeats that.
- When the God-component decomposition (Pack D direction) lands, this test
  should stay green. If it fails, the decomposition changed behavior —
  investigate before "fixing" the test.
- The TODO for the cursor loop is a known gap; a future unit should add a
  fake-timer + WebSocket harness.
