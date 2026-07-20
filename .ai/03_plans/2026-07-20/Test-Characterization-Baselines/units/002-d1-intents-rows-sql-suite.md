# UNIT-002 — d1-intents/rows.ts intent/SQL generation suite

## Goal

Add a direct unit suite that asserts the generated `{sql, values}` for each
exported intent builder in `src/lib/estimates/d1-intents/rows.ts`, plus golden
assertions on `totalDeltaMinorUnits` for insert/duplicate/restore. This pins the
SQL/intent generation layer so Pack D's extraction of `MutationIntent`
primitives has a regression net.

## Status

`READY` · depends on: (none) · requirement: `DATA-001` · risks: `RISK-003`

## Why this matters

`rows.ts` is 3361 lines and owns row insert/duplicate/delete/restore intent
building, the `row_revision` optimistic-concurrency guards, and total-delta
math. It is where bad SQL generation corrupts estimate totals in production.
Today the pure cost math (`estimate-row-total.ts`) is well-tested
(`estimate-row-total.test.ts`, `calculation-output-parity.test.ts`), but the
intent/SQL generation layer in `rows.ts` has only indirect coverage through
`estimate-record-d1-intents.test.ts` (437 lines) and a few action tests. Pack D
will extract reusable `MutationIntent` primitives from this file; that refactor
needs a direct characterization net for the SQL shapes and the total-delta
accounting.

## Current state

The module: `src/lib/estimates/d1-intents/rows.ts` (3361 lines).

Key exported builders to characterize (read the file for the exact signatures —
`rg "^export " src/lib/estimates/d1-intents/rows.ts`):
- `insertEstimateRowItemWithHistory` (canonical insert path)
- `updateEstimateRowItemWithHistory` (`:2496`, the canonical update)
- `duplicateEstimateRowItemWithHistory`
- `restoreEstimateRowItemWithHistory`
- `deleteEstimateRowItemWithHistory`
- `reorderEstimateNodesWithHistory`
- `normalizeEstimateRowSourceLinkState` (`:1666-1678`)
- `estimateRowTotalMinorUnits` (`:305`)

The `row_revision` optimistic-concurrency guards at `:2728` and `:2815` are
DELETE/UPDATE statements keyed on the expected revision — these MUST be
characterized because Pack D will move them.

The existing exemplar test: `tests/vitest/estimate-record-d1-intents.test.ts`
(437 lines). Read it for the D1-stub pattern (a fake `D1Database` that records
`.prepare(sql).bind(...values)` calls into an array the test asserts on).

The pure-math exemplar: `tests/vitest/estimate-row-total.test.ts`.

## Owned paths / resources

- `tests/vitest/estimate-d1-intents-rows-sql.test.ts` — CREATE.

## Implementation boundary

1. Read `tests/vitest/estimate-record-d1-intents.test.ts` end-to-end. Reuse its
   D1-stub pattern (the fake database that captures prepared statements).
2. For **each** exported intent builder, write at least one test case per edge:
   - **happy path:** typical inputs → assert the generated SQL touches the right
     tables (`estimate_row_items`, `estimate_nodes`, `estimate_sheet_events`)
     with the right SET/WHERE columns.
   - **revision-conflict:** `expectedRowRevision` mismatch → assert the guard
     statement is present and would match zero rows (the fingerprint/token
     string `estimate_sheet_row_revision_conflict` appears in the error path).
   - **empty batch / no-op:** inputs that produce no change → assert no
     write statements are generated.
   - **contingency/adjustment combos:** rows with `quantity_base`, with
     `contingency_percentage`, with both → assert the total-delta math matches
     `computeEstimateRowCostParts` (the canonical oracle).
3. For **total-delta math** (`estimateRowTotalMinorUnits`, the duplicate/restore
   accounting), write golden assertions:
   - insert one row → `totalDeltaMinorUnits === lineTotal`
   - duplicate a row with N descendants → delta === sum of subtree line totals
   - restore a previously-deleted row → delta === +lineTotal (un-negating the
     delete)
   - delete a row → delta === -lineTotal
4. Assert **structural properties** of the generated SQL (RISK-003 mitigation):
   - the table name (`INSERT INTO estimate_row_items`, `UPDATE estimate_row_items`)
   - the SET column list (which fields are written)
   - the WHERE column list (`id`, `estimate_id`, `row_revision`)
   - the bind-value count and types
   Do NOT assert the full SQL string for the big builders — inline snapshots
   past ~50 lines are unreadable. Use `toMatchInlineSnapshot()` only for small
   builders.
5. Do **not** test the action layer (`estimates/actions.ts`) — that is
   characterized by the slice tests. This unit is `d1-intents/rows.ts` only.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run new test | `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.ts --maxWorkers=1` | all pass |
| Full DOM suite | `bun run test:dom` | all pass |
| Type-check | `bun run type-check` | exit 0 |

## Suggested executor toolkit

- The `tdd` or `characterization` skill, if available, may help structure the
  edge-case matrix.
- Reuse `tests/vitest/fixtures/` estimate-row fixtures rather than building new
  ones where possible.

## Scope

**In scope:** the new test file only.

**Out of scope:**
- Any file under `src/` — zero production edits.
- The action layer (`estimates/actions.ts`).
- The other `d1-intents/*` files (`nodes.ts`, `bulk-sheets.ts`, `templates.ts`,
  `tabs.ts`, `history-events.ts`) — those are separate characterization targets
  if Pack D needs them; this unit covers the row builder (the largest and most
  money-critical).
- Running the tests in parallel — respect `fileParallelism: false`.

## Done criteria

- [ ] `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.ts --maxWorkers=1` passes
- [ ] `bun run test:dom` passes with the new test included
- [ ] `bun run type-check` exits 0
- [ ] At least one happy-path + one edge case per exported builder listed above
- [ ] Golden total-delta assertions for insert/duplicate/restore/delete
- [ ] The revision-conflict guard is characterized (asserts the guard statement
      shape and the conflict-fingerprint error path)
- [ ] SQL assertions use structural properties (table, SET, WHERE, bind count),
      not full-string snapshots, for the big builders
- [ ] No files under `src/` are modified
- [ ] Each test case runs in <5s

## Acceptance evidence

- The new test file exists and passes in isolation.
- `bun run test:dom` exit 0.
- A manual check: temporarily change a table name in `rows.ts` (e.g.
  `estimate_row_items` → `estimate_row_items_X`) and confirm the test fails
  loudly. Revert before finishing.

## STOP conditions

- The D1-stub pattern in `estimate-record-d1-intents.test.ts` does not capture
  enough to assert on generated SQL (e.g. it only captures run results, not
  prepared statements). If so, extend the stub — but keep it in the test file,
  not production.
- A builder's output depends on D1 schema introspection that cannot be stubbed
  cheaply. Surface it; narrow the test to the parts that can be characterized.
- A test reveals a real money-math bug in `rows.ts`. STOP and report; the fix
  is a separate unit (possibly in Pack A's pattern).

## Recovery

The test is additive. The main risk is an overspecified full-SQL snapshot that
fails on harmless reformatting — prefer structural assertions and reserve
snapshots for small builders.

## Maintenance notes

- **This unit is the gate for Pack D's UNIT-001.** When Pack D extracts
  `MutationIntent` primitives from `rows.ts`, this test must stay green. If it
  fails, the extraction changed observable SQL — investigate before updating the
  test.
- When a new column is added to `estimate_row_items` (a future migration), the
  SET-column assertions will need updating — that is the intended signal.
- The revision-conflict guard characterization is the highest-value part: it
  ensures Pack D preserves optimistic concurrency when it moves the guard.
