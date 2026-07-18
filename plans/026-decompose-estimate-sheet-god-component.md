# Plan 026: Decompose the `EstimateSheetContent` god component

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/components/workshop/EstimateSheetContent.tsx`
> If it changed since this plan was written (this is the highest-churn file in
> the repo — expect drift), re-read the "Current state" structure and adjust
> the extraction targets; treat a structural mismatch as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED-HIGH
- **Depends on**: 001 (verify baseline), and ideally a characterization test (TEST_TASK) — see STOP conditions
- **Category**: tech-debt
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`src/components/workshop/EstimateSheetContent.tsx` exports a single
`function EstimateSheetContent` spanning **~2660 lines** (1091→3751) with **81+
hook calls** (`useState`/`useMemo`/`useCallback`/`useEffect`). It is the
highest-churn file in the repo (196 changes in 6 months) and the workshop's
primary surface. A single React function component with this many hooks cannot
be memoized, code-split, or reasoned about as a unit — every state change
re-runs the full hook chain, bug-introduction risk per edit is disproportionately
high, and review is effectively "trust the diff." `projects-page-client.tsx`
(2093 lines, 44 hooks) and `component-library/index.tsx` (3622 lines) have the
same shape. This plan decomposes `EstimateSheetContent` first (the worst
offender); the other two are follow-up plans using the same pattern.

Risk is MED-HIGH because these are the workshop's primary surfaces: extracting
sub-components changes prop contracts and can break memoization assumptions and
effect-cleanup ordering. **This plan should NOT be executed without (a) the
verify baseline (plan 001) and (b) a characterization test for the core render
behavior — otherwise regressions are invisible.**

## Current state

`src/components/workshop/EstimateSheetContent.tsx` (verified structure):
- ~3751 lines total. The main `export function EstimateSheetContent` spans
  lines ~1091–3751 (~2660-line function body).
- 81+ hook calls inside it.
- 5 sibling helper components in the file (lines 413, 910, 978, 1059, 3726).
- Dynamic imports at top: `CommandPalette`, `EstimateRightSidebar`,
  `AddComponentModal`, `ProposalExportPreviewDialog`, `ActivityHistoryModal`,
  `RowDetailsModal` (lines 65-135) — already code-split, good.
- Several module-level helper functions (lines 193-410): `resolveRetainedProjectSourceInsertIntent`,
  `readComponentLibraryImageStoragePath`, `buildInlineLibraryPriceOptions`,
  `useNativeModalDialog`, `createDefaultSheetAdjustment`, `resolveSheetAdjustment`.

Churn signal: 196 commits in 6 months (highest in repo). Direct test count: 0
(`find tests -name "*EstimateSheetContent*"` → none). Indirect coverage exists
via `estimate-sheet-cost-inputs.test.tsx`, `estimate-tree-bulk-selection.test.tsx`,
and `estimate-sheet-sidebar-render-isolation.test.tsx` — these are the
characterization tests to lean on / extend.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `bun run type-check`             | exit 0              |
| Verify    | `bun run verify`                 | all pass            |
| React Doctor | `bunx react-doctor --staged --blocking warning` | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `src/components/workshop/EstimateSheetContent.tsx` — extract cohesive hook
  clusters into custom hooks, lift JSX subtrees into named child components.
- New files under `src/components/workshop/estimate-sheet/hooks/` for extracted
  custom hooks (e.g. `use-estimate-sheet-selection.ts`, `use-estimate-sheet-keyboard.ts`,
  `use-estimate-sheet-cursor.ts`).
- New component files under `src/components/workshop/estimate-sheet/` for
  extracted JSX subtrees.

**Out of scope**:
- `projects-page-client.tsx` and `component-library/index.tsx` — same pattern,
  separate follow-up plans. Do not touch in this plan.
- Behavior changes — this is a pure structural refactor. No feature flags, no
  new props on the public surface, no styling changes.
- The dynamic-import list at the top — already code-split, leave it.

## Git workflow

- Branch: `advisor/026-decompose-estimate-sheet`.
- One commit per extraction (each independently revertible, each passes
  `bun run verify`).
- Commit message: `refactor(estimate-sheet): extract <hook/component>`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 0: Establish a characterization test (STOP if unavailable)

Before ANY extraction, confirm there is a characterization test pinning the
core render behavior (row count, total recalc, selection). If
`estimate-sheet-sidebar-render-isolation.test.tsx` or a sibling covers the main
sheet's render output, extend it to assert: renders N rows for N items, total
updates on a row cost change, selection toggles. If no such test exists, this
plan requires TEST_TASK authorization to write one first — otherwise STOP and
report that the refactor is unsafe without a characterization baseline.

**Verify**: the characterization test exists and passes before extraction.

### Step 1: Extract cohesive hook clusters into custom hooks

Read the 2660-line function body and identify hook clusters by concern. Likely
candidates (confirm by reading):
- Selection state + handlers → `useEstimateSheetSelection({ ... }) → { selectedRowIds, selectRow, clearSelection }`.
- Keyboard shortcuts → `useEstimateSheetKeyboard({ ... }) → { ... }`.
- Cursor / collaboration broadcast → `useEstimateSheetCursor({ ... }) → { ... }`
  (note: `use-estimate-cursor-broadcast.ts` already exists as a model).
- Sheet adjustment → `useEstimateSheetAdjustment({ ... }) → { adjustment, setAdjustment }`.

For each cluster:
1. Create `src/components/workshop/estimate-sheet/hooks/use-estimate-sheet-<concern>.ts`.
2. Move the relevant `useState`/`useMemo`/`useCallback`/`useEffect` calls into
   it, returning a `{ state, actions }` tuple (or named object — match the
   existing hook style, e.g. `use-estimate-cursor-broadcast.ts`).
3. Replace the inline hooks in `EstimateSheetContent` with a call to the new
   hook, destructuring its return.
4. Run `bun run type-check` + `bun run verify` + `bunx react-doctor --staged`.

Order the extractions so each is independently verifiable. Extract ONE hook
per commit.

**Verify**: `bun run type-check` + `bun run verify` → exit 0 after each. The
characterization test passes unchanged.

### Step 2: Lift JSX subtrees into named child components

After the hook extractions reduce the inline state, identify large JSX subtrees
(the right sidebar, the toolbar, the command-palette trigger area, etc.) and
lift each into a named child component in its own file under
`src/components/workshop/estimate-sheet/`. Pass props explicitly; avoid
prop-drilling more than 2 levels — if a subtree needs many values, pass the
extracted hook's return object.

Keep the dynamic-import pattern for heavy subtrees.

**Verify**: `bun run type-check` + `bun run verify` → exit 0 after each lift.
The characterization test passes unchanged.

### Step 3: Final shape + full gate

After all extractions, `EstimateSheetContent` should be a composition root:
it calls the extracted hooks, renders the extracted child components, and
contains only the orchestration glue. Target: under ~600-800 lines, with the
hook count down from 81 to ~15-20 (orchestration only).

**Verify**: `bun run verify` → exit 0. `bunx react-doctor --staged --blocking warning` → exit 0.
`wc -l src/components/workshop/EstimateSheetContent.tsx` → notably smaller.

## Test plan

- The characterization test (step 0) must pass unchanged after every extraction
  — that's the regression gate.
- If the user authorized broader tests (TEST_TASK), extend coverage: add render-
  isolation tests for each extracted child component (model on
  `estimate-sheet-sidebar-render-isolation.test.tsx`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `wc -l src/components/workshop/EstimateSheetContent.tsx` → under ~800 lines
- [ ] Hook-call count in `EstimateSheetContent` notably reduced (target ~15-20)
- [ ] At least 3 custom hooks extracted under `estimate-sheet/hooks/`
- [ ] At least 2 JSX subtrees lifted into named child components
- [ ] The characterization test passes unchanged
- [ ] No behavior change (no new public props, no feature flags, no styling changes)
- [ ] No files outside `src/components/workshop/estimate-sheet/` and
      `EstimateSheetContent.tsx` are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- No characterization test exists AND the user has not authorized TEST_TASK to
  write one — STOP. This refactor is unsafe without a render-behavior baseline.
- An extraction causes the characterization test to fail — revert; the
  extraction changed behavior, which is out of scope.
- `EstimateSheetContent` has drifted so much since this plan that the hook
  clusters named above no longer map cleanly — re-read and re-derive, or report.
- An extraction requires changing the public prop contract of
  `EstimateSheetContent` — out of scope; report.

## Maintenance notes

- After this lands, `EstimateSheetContent` is a composition root; future feature
  work touches the focused hooks/components, not a 2660-line function.
- The same pattern applies to `projects-page-client.tsx` and
  `component-library/index.tsx` — separate follow-up plans (the README index
  should note them as "next, same pattern").
- React Compiler, if later enabled, will optimize the extracted hooks/components
  far better than the monolith.
- Reviewer: confirm (a) zero behavior change (characterization test unchanged,
  no new public props), (b) each extraction is independently revertible, (c)
  effect-cleanup ordering preserved (an extraction that moves a `useEffect` can
  change cleanup order — verify each lifted effect still cleans up correctly).
- Because this is L effort / MED-HIGH risk on the workshop's primary surface,
  STRONGLY prefer the `execute` variant (dispatched executor + advisor review),
  one extraction at a time.
