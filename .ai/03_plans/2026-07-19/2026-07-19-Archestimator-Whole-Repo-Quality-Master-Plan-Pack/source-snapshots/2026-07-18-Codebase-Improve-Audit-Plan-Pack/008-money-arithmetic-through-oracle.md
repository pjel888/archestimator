# Plan 008: Route the legacy money-total wrapper through the integer-minor-unit oracle

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/estimates/estimate-row-total.ts`
> If it changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`computeEstimateRowLineTotal` (`src/lib/estimates/estimate-row-total.ts:322-332`)
uses naive IEEE-754 doubles: `subTotal = quantity * (unitCost + laborRate); return subTotal + miscCost + (subTotal * adjustmentPercentage) / 100;`
For `quantity=3, unitCost=0.10, laborRate=0.20, adjustmentPercentage=10` this
yields `0.9000000000000001` instead of `0.90`. The file's own header (lines 1-7)
directs new consumers to the typed integer-minor-unit helpers
(`computeEstimateRowCostParts`, `computeEstimateTotals`) precisely because
"invalid or unsafe inputs cannot become an output total" — yet four call sites
still use the legacy FP wrapper, including one that feeds a persisted
`totalProjectCost` on estimate duplication and three that compute per-estimate
aggregates shown in workshop charts/lists. Result: dashboard totals can drift
sub-cent from the canonical proposal total ("the sums don't match" support
tickets), and the duplicated `totalProjectCost` is a double.

This plan makes the legacy wrapper delegate to the oracle, so all four callers
get the rounded canonical total without each needing to change.

## Current state

`src/lib/estimates/estimate-row-total.ts` — relevant signatures (verified):

```ts
// line 205 — the canonical oracle (integer minor units):
export function computeEstimateRowCostParts(input: EstimateCalculationInput): EstimateCalculationResult<EstimateRowCostParts> { ... }
// line 279:
export function computeEstimateTotals(...) { ... }
// line 322 — the legacy FP wrapper (the problem):
export function computeEstimateRowLineTotal(row: EstimateRowCostInput): number {
  // ... raw double math, returns a number ...
}
// line 334:
export function sumEstimateRowLineTotals(rows: readonly EstimateRowCostInput[]): number { ... }
```

Four call sites (verified):
- `src/lib/estimates/d1-intents/estimate-records.ts:332` — `totalProjectCost: sumEstimateRowLineTotals(sourceRows)` (inside `duplicateEstimateWithHistory`).
- `src/lib/repositories/project-charts-repository.ts:132` — per-estimate chart total.
- `src/lib/repositories/project-estimate-sheets-repository.ts:221` — sheet-card total.
- `src/lib/repositories/workspace-repository.ts:3200` — workshop list total.

Read `computeEstimateRowCostParts` (lines 205-278) and its return type
`EstimateCalculationResult<EstimateRowCostParts>` before editing. The result is a
tagged union — on success it carries `value.total` (the integer-minor-unit or
rounded total); on failure it carries a reason. The legacy wrapper's current
contract is "garbage in, 0 out" (it returns a number for any input), so the
delegation should return `0` on oracle failure to preserve that.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only file you should modify):
- `src/lib/estimates/estimate-row-total.ts` — make `computeEstimateRowLineTotal`
  delegate to `computeEstimateRowCostParts`.

**Out of scope**:
- The four call sites — they keep calling `computeEstimateRowLineTotal` /
  `sumEstimateRowLineTotals`; the delegation fixes them transparently.
- `computeEstimateRowCostParts` / `computeEstimateTotals` internals — unchanged.
- Any snapshot test that pins the old FP value — those MUST be updated (step 3).

## Git workflow

- Branch: `advisor/008-money-oracle-delegation`.
- Commit message: `fix(estimates): route legacy line-total wrapper through integer-minor-unit oracle`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make `computeEstimateRowLineTotal` delegate to the oracle

In `src/lib/estimates/estimate-row-total.ts`, replace the body of
`computeEstimateRowLineTotal` (lines 322-332) so it calls
`computeEstimateRowCostParts` and returns the canonical total on success, `0`
on failure:

```ts
export function computeEstimateRowLineTotal(row: EstimateRowCostInput): number {
  const result = computeEstimateRowCostParts(row);
  if (!result.ok) return 0;
  return result.value.total;
}
```

Notes:
- Confirm the exact field name on the success value (`value.total` vs
  `value.lineTotal` vs `value.grandTotal`) by reading the
  `EstimateRowCostParts` type before finalizing. Use whichever field represents
  the final line total including adjustment and misc cost.
- Preserve the "garbage in, 0 out" contract via the `!result.ok` branch — this
  matches the current behavior for unparseable inputs.
- The function signature (`(row: EstimateRowCostInput) => number`) is unchanged,
  so all four call sites compile unchanged.

`sumEstimateRowLineTotals` (line 334) already sums
`computeEstimateRowLineTotal` per row — no change needed; it inherits the fix.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Confirm no behavior change for valid inputs (manual spot check)

Trace one call site by hand. For `estimate-records.ts:332` (estimate duplication):
the `totalProjectCost` previously was a sum of FP-doubles; now it's a sum of
oracle-rounded values. For typical inputs (2-decimal currency, integer-ish
quantities) the values will be identical or differ by sub-cent rounding now
resolved toward the canonical total — which is the desired behavior.

**Verify**: `bun run type-check` → exit 0 (still).

### Step 3: Run the full gate; update snapshot tests

**Verify**: `bun run verify` → exit 0.

If a snapshot test fails because a total changed by a sub-cent amount (e.g.
`0.9000000000000001` → `0.9`), update the snapshot — this is the corrected
value. Search `grep -rln "computeEstimateRowLineTotal\|sumEstimateRowLineTotals\|totalProjectCost" tests/`
and any snapshot files in `tests/vitest/__snapshots__/`. Only update snapshots
that reflect the FP→oracle rounding correction; do not blindly update all
snapshots.

If a test asserts the OLD FP-noise value as a literal (e.g.
`expect(total).toBe(0.9000000000000001)`) and that assertion was intentional
(pin-the-bug), update it to the rounded canonical value and add a comment.

## Test plan

- Update affected snapshots/assertions (above).
- If the user authorized new tests (TEST_TASK), add a vitest case with the
  FP-noise input (`quantity=3, unitCost=0.10, laborRate=0.20, adjustmentPercentage=10`)
  asserting `computeEstimateRowLineTotal` returns exactly `0.9` (or the
  oracle's canonical rounded value), as a regression guard. Model on an existing
  `estimate-row-total` test in `tests/vitest/`.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `computeEstimateRowLineTotal` body calls `computeEstimateRowCostParts`
      and returns `0` on `!result.ok` (read the function to confirm)
- [ ] The four call sites are unchanged (the fix is transparent)
- [ ] No files outside the in-scope list (plus updated tests/snapshots) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- The `EstimateRowCostParts` success value does not have a field representing
  the full line total (adjustment + misc + subtotal) — report the type shape.
- A call site depends on the FP-noise value (e.g. compares with `===` against a
  specific double) — report it; that caller may need a separate fix.
- An existing test intentionally pins the FP-noise value as a regression marker
  and updating it would hide a real regression — report and discuss.

## Maintenance notes

- After this lands, the legacy wrapper is a thin adapter over the oracle. A
  future cleanup can inline the four call sites directly to
  `computeEstimateRowCostParts` and delete the wrapper entirely — but that's a
  larger change (four callers, each needing the success/failure branch) and not
  worth the risk now.
- The proposal surface already uses the oracle directly, so dashboard and
  proposal totals will now agree by construction.
- Reviewer: confirm (a) the `!result.ok → 0` branch preserves the "garbage in,
  0 out" contract, (b) no call site's return-type assumptions broke, (c)
  snapshot updates reflect genuine FP→rounded corrections only.
