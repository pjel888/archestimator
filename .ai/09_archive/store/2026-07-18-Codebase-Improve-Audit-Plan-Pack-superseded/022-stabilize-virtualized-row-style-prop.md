# Plan 022: Stabilize the inline `style` prop on virtualized estimate rows

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/components/workshop/estimate-sheet/rows/row-table.tsx`
> If it changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

The virtualized estimate-row table memoizes each row with `memo()` and DEFAULT
shallow equality (no custom comparator on the row component). The call site at
`row-table.tsx:1309-1315` passes
`style={virtualEnabled ? { left: 0, position: "absolute", top: 0, transform: ..., width: "100%" } : undefined}`
— a **new object literal on every parent render**. With React Compiler OFF (per
the perf protocol), nothing stabilizes it, so any table-level re-render (focus
change via `focusedCell`/`activeCellIndex`, selection change) re-renders every
visible overscan row instead of only the affected ones. The repo even has a
render probe (`reportEstimateRowItemRender`, `estimate-sheet-render-probe.ts`)
that would surface this under `NEXT_PUBLIC_PERF_TRACE`. This plan stabilizes
the `style` identity so the per-row memo actually holds.

## Current state

`src/components/workshop/estimate-sheet/rows/row-table.tsx` (verified):
- Line 307 — `const EstimateRowItemTableRow = memo(function EstimateRowItemTableRow(...) { ... })`.
- Line 120 — `areEstimateRowItemsTablePropsEqual` (custom comparator on the TABLE,
  not the row; line 1323 is the table's call site).
- Lines 1309-1315 — the row call site passes a fresh inline `style` object per
  render.
- Line 344 — `reportEstimateRowItemRender` → `estimate-sheet-render-probe.ts:31`.

The `focusedCell` is NOT in the table-level comparator (`areEstimateRowItemsTablePropsEqual`),
so focus changes flow through to the rows.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run test:dom`     | all pass            |

## Scope

**In scope** (the only file you should modify):
- `src/components/workshop/estimate-sheet/rows/row-table.tsx` — stabilize the
  `style` prop identity, OR add a custom comparator to `EstimateRowItemTableRow`
  that compares `style` by value.

**Out of scope**:
- `areEstimateRowItemsTablePropsEqual` (the table comparator) — leave, unless
  the fix is better expressed there. (Adding `focusedCell` to the table
  comparator is a related but larger change; out of scope.)
- Other estimate-sheet components.

## Git workflow

- Branch: `advisor/022-stabilize-row-style-prop`.
- Commit message: `perf(estimate-sheet): stabilize virtualized row style prop identity`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Pick the stabilization approach

Two options; pick whichever is cleaner in the surrounding code:

- **(A) Memoize the style factory.** Wrap the style construction in a
  `useMemo` keyed on `virtualRow.start` + `scrollMargin` (the inputs that
  actually vary per row), so the same `style` object is reused across parent
  re-renders as long as the row's position hasn't changed. If the style is built
  inside a `.map(virtualRow => ...)` loop, lift the factory out or use a stable
  helper that caches by `virtualRow.start`.
- **(B) Custom row comparator.** Add a second argument to `memo()` on
  `EstimateRowItemTableRow` (line 307) — a comparator that compares all props
  by shallow equality EXCEPT `style`, which it compares by value (the style has
  a fixed shape with numeric `transform`/`top`, so value comparison is cheap).

Prefer (A) — it fixes the root cause (identity churn) and helps any downstream
memoization, not just the row's. Use (B) only if (A) is awkward in the call
site's structure.

**Verify**: nothing to run; decision.

### Step 2: Implement

For (A): read the exact style-construction code at lines 1309-1315. The style
depends on `virtualRow.start` (and possibly `scrollMargin`). Restructure so the
style is produced by a `useMemo` (per row, if the row is its own component) or a
stable memoized factory keyed on the varying inputs. If the `.map` produces rows
inside the table component, extract a small `<VirtualizedRow>` wrapper that
takes `virtualRow` + `scrollMargin` and memoizes its own `style` — this also
makes the per-row memo meaningful.

For (B): define

```ts
function areEstimateRowItemTableRowPropsEqual(prev, next) {
  // shallow-equal all props except `style`; for `style` compare by value
  // (fixed shape: { left, position, top, transform, width }).
}
```

and pass it to `memo(Component, areEstimateRowItemTableRowPropsEqual)`.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Run the gate + (optional) render probe

**Verify**: `bun run test:dom` → all pass.

If the user authorized browser/perf tracing (TEST_TASK + browser gate), run the
sheet with `NEXT_PUBLIC_PERF_TRACE=1` and confirm via
`reportEstimateRowItemRender` that a focus change no longer re-renders all
overscan rows — only the two affected. If tracing is not authorized, skip this;
the identity fix is correct by construction.

## Test plan

No new tests required (perf optimization; behavior unchanged). Existing
estimate-sheet render tests must still pass.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run test:dom` exits 0
- [ ] The `style` prop passed to `EstimateRowItemTableRow` has a stable identity
      across parent re-renders for an unchanged row position (read the code to
      confirm: either `useMemo` keyed on position, or a custom comparator
      comparing `style` by value)
- [ ] No files outside the in-scope list are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- The style construction depends on inputs beyond `virtualRow.start` /
  `scrollMargin` that change every render (e.g. a layout measurement) — report;
  the memo key would need those inputs too.
- Extracting a `<VirtualizedRow>` wrapper to make (A) clean turns into a larger
  refactor — fall back to (B) (custom comparator) and report.

## Maintenance notes

- If React Compiler is later enabled (the perf protocol currently has it OFF),
  this manual memoization becomes redundant but harmless — the compiler would
  coalesce it.
- A related, larger improvement: add `focusedCell` to the TABLE-level
  comparator (`areEstimateRowItemsTablePropsEqual`) so focus changes don't
  re-render the table at all — but that requires verifying no row depends on
  table-level focus, which is a separate plan.
- Reviewer: confirm the `style` identity is stable (read the `useMemo` keys or
  the comparator), and that no behavior changed (row positioning, virtualization).
