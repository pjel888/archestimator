# UNIT-002 — Route AI Apply fork through the MutationIntent primitives

## Goal

Replace the AI package-builder Apply path's hand-rolled revision guard,
history-event emission, and `row_revision + 1` logic with calls to the shared
`MutationIntent` primitives from UNIT-001. The Apply path gains the integrity
guarantees it currently re-implements (and the atomicity Pack A UNIT-006
established), without losing its idempotent-replay contract.

## Status

`READY` · depends on: `UNIT-001`, Pack A UNIT-006 · requirement: `DATA-002` · risks: `RISK-002`

## Why this matters

`src/lib/ai/package-builder/apply.ts:204-232,1348-1357` re-implements the
revision guard and the `estimate_sheet_row_revision_conflict` string inline.
A future change to conflict semantics in the canonical path will silently
diverge for AI-applied edits. Routing Apply through the primitives makes the
integrity rules truly shared.

The author already half-wants this: `apply.ts:1470` imports
`buildProjectComponentAttachmentDeleteRetentionStatements` from the estimates
layer rather than re-rolling it. This unit finishes that adoption.

## Current state

File: `src/lib/ai/package-builder/apply.ts` (2777 lines).

The fork's integrity logic:
- Own D1 helpers at `:204-232` (`requirePackageApplyD1Database`, `first`, `all`,
  `run`, `runBatch`). Pack C UNIT-003 collapsed `requirePackageApplyD1Database`
  to the canonical; the rest may still be local or migrated depending on Pack C
  timing — confirm before starting.
- The revision guard at `:1348`: `if (readNumber(row.row_revision) !== input.expectedRowRevision) throw new Error("estimate_sheet_row_revision_conflict");`
  — this is an **application-level check**, not a SQL-level optimistic-concurrency
  guard like the canonical path uses.
- The `row_revision = row_revision + 1` bump inline in the UPDATE at `:1357`.
- The history event emission (5 sites, per Pack A UNIT-006).
- The idempotent replay reader `readCommittedEstimateEvent` (lines 1236, 1329,
  1441, 1562) keys on the event row.

The canonical primitives (UNIT-001 output): `buildRowRevisionGuard`,
`buildEstimateRowHistoryEvent`, `buildMutationReceipt`,
`buildProjectComponentAttachmentDeleteRetentionStatements` from
`@/lib/estimates/d1-intents/mutation-intents`.

The atomicity baseline (Pack A UNIT-006): the (data, event) pairs are already
wrapped in `runBatch`.

## Owned paths / resources

- `src/lib/ai/package-builder/apply.ts` — the only file to edit.

## Implementation boundary

1. **Confirm prerequisites:** UNIT-001 is VERIFIED; the primitives module
   exists; Pack A UNIT-006 (atomicity) has landed (the 5 sites use `runBatch`).

2. **For each of the 5 mutation sites** (`createEstimateNodeInD1`,
   `renameEstimateNodeInD1`, `updateEstimateRowInD1`, `insertEstimateRowRecord`,
   `insertEstimateTemplateIntoEstimateInD1`):
   - Replace the application-level revision check with the SQL-level
     `buildRowRevisionGuard` primitive composed into the batch BEFORE the
     UPDATE. This is a behavior improvement: the guard becomes atomic with the
     mutation instead of being a TOCTOU check.
   - Replace the inline history-event INSERT with
     `buildEstimateRowHistoryEvent(...)`.
   - Keep the `runBatch` wrapper from Pack A UNIT-006; just change what goes
     into the batch.
   - The UPDATE statement itself stays inline (it is the mutation, not a rule).

   Target shape for `updateEstimateRowInD1`:

   ```ts
   const statements: D1Statement[] = [
     buildRowRevisionGuard({ rowId: input.targetRowId, estimateId: input.estimateId, expectedRowRevision: input.expectedRowRevision }),
     { sql: `UPDATE estimate_row_items SET ..., row_revision = row_revision + 1, updated_at = ? WHERE id = ? AND estimate_id = ?`, values: [...] },
     buildEstimateRowHistoryEvent({ rowId: input.targetRowId, estimateId: input.estimateId, eventType: "ai.apply.row_update", payload: {...}, correlationId: input.correlationId, occurredAt: nowIso() }),
   ];
   await runBatch(database, statements);
   ```

3. **Update the replay reader** (RISK-002): the guard statement at index 0 will
   now match zero rows on a revision conflict (instead of the application-level
   throw). Inspect `runD1Batch` results: if the guard statement's
   `meta.changes === 0`, the revision was stale — throw the same
   `estimate_sheet_row_revision_conflict` error so the caller's behavior is
   unchanged. The replay reader's existing logic (key on the event row)
   continues to work because the event is in the same atomic batch.

4. **Delete the now-unused local helpers** (`first`, `all`, `run`, `runBatch`)
   IF Pack C has migrated them to the shared module; otherwise keep them for
   this unit and let Pack C finish the job. Confirm via grep.

5. Do **not** change the idempotency-key constraint, the AI tool schemas, or the
   apply-command surface. The change is internal to the D1 write path.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Apply SQL audit | `rg -n "estimate_sheet_row_revision_conflict\|row_revision = row_revision \+ 1" src/lib/ai/package-builder/apply.ts` | the conflict string appears only in the new guard-result handling; the `+ 1` bump is only in the UPDATE statement |

## Suggested executor toolkit

- Read `.agents/skills/archestimator-estimate-mutation-integrity/SKILL.md`.
- The `refactor-safely` skill for the per-site extract-then-verify loop.

## Scope

**In scope:** `src/lib/ai/package-builder/apply.ts`.

**Out of scope:**
- `src/lib/ai/package-builder/read-tools.ts` (read path).
- `src/lib/ai/package-builder/draft.ts`, `schemas.ts` (no D1 writes).
- The other two forks (`express-promotion-actions.ts`, `component-mutation-d1.ts`)
  — UNIT-003/004.
- The AI tool/agent schemas or the apply-command API surface.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] All 5 mutation sites compose `buildRowRevisionGuard` + the inline UPDATE + `buildEstimateRowHistoryEvent` in a single `runBatch`
- [ ] The application-level revision check (`readNumber(row.row_revision) !== input.expectedRowRevision`) is replaced by the SQL-level guard + result inspection
- [ ] The `estimate_sheet_row_revision_conflict` error is still thrown on stale revision (via guard-result inspection)
- [ ] The replay reader's contract is preserved (event-present → already applied; event-absent → retry)
- [ ] No files outside `apply.ts` are modified

## Acceptance evidence

- The grep audit shows the revision-bump only in UPDATE statements; the conflict
  string only in guard-result handling.
- `git diff src/lib/ai/package-builder/apply.ts` shows the 5 sites refactored to
  compose primitives; no schema or API change.
- A spot-check: read the `updateEstimateRowInD1` site end-to-end and confirm
  the guard-then-update-then-event ordering in the batch.

## STOP conditions

- The replay reader cannot be reconciled with the SQL-level guard (RISK-002).
  Surface it; the application-level check may need to stay as a pre-check with
  the SQL guard as backstop.
- A mutation site's UPDATE interleaves with the guard in a way that prevents
  composition. Surface it; the site may need a specialized primitive.
- Pack A UNIT-006 has NOT landed (the sites are not yet `runBatch`-wrapped).
  Complete Pack A UNIT-006 first — it is the atomicity baseline this unit
  builds on.

## Recovery

Each of the 5 sites is independent. If one site breaks the replay reader,
revert just that site and reconcile the guard-result inspection logic.

## Maintenance notes

- After this unit, the AI Apply path shares the canonical integrity rules. A
  future change to conflict semantics lands once in `mutation-intents.ts`.
- The behavior improvement (SQL-level guard instead of application-level check)
  closes a TOCTOU race: two concurrent AI applies that both read the same
  `expectedRowRevision` previously could both pass the check and both write;
  now the SQL guard makes the second one's batch match zero rows.
- A reviewer should confirm the replay reader handles the new "guard matched
  zero rows" case identically to the old "application-level check failed" case.
- UNIT-003 and UNIT-004 follow the same pattern for their forks.
