# UNIT-001 — Extract `MutationIntent` primitives; canonical path uses them

## Goal

Extract the integrity rules — revision-guard statement builder, history-event
builder, mutation-receipt builder, attachment-retention builder — from the
monolithic `updateEstimateRowItemWithHistory` and siblings in
`src/lib/estimates/d1-intents/rows.ts` into composable primitives in a new
module. Refactor the canonical path to compose them. Zero observable behavior
change: the generated `{sql, values}` arrays are identical to today.

## Status

`READY` · depends on: Pack B UNIT-002, Pack C UNIT-001/002 · requirement: `DATA-001` · risks: `RISK-001`

## Why this matters

This is the foundation that lets the three forks (UNIT-002/003/004) share one
integrity rule set instead of re-implementing it. Today the rules are
inlined in `rows.ts:2496-2920`; extracting them as pure functions that return
`{sql, values}` makes them reusable without changing the canonical path's
output. The characterization suite (Pack B UNIT-002) is the gate that proves
"identical output."

## Current state

The canonical path: `src/lib/estimates/d1-intents/rows.ts`, specifically:
- `updateEstimateRowItemWithHistory` (`:2496`) — the canonical row update
- `insertEstimateRowItemWithHistory`, `duplicateEstimateRowItemWithHistory`,
  `restoreEstimateRowItemWithHistory`, `deleteEstimateRowItemWithHistory`
- The revision guard at `:2728` and `:2815` (DELETE/UPDATE keyed on
  `row_revision`)
- The history-event emission (the `INSERT INTO estimate_sheet_events` statements)
- The mutation-receipt write (`mutation-receipts.ts`)
- The attachment-retention builder
  (`buildProjectComponentAttachmentDeleteRetentionStatements`, already extracted
  and shared across **5 modules** per the Improve-Plan reconcile: `d1-intents/rows.ts:27,2605,2720`,
  `d1-intents/tabs.ts:10,767`, `d1-intents/bulk-sheets.ts:6,150`,
  `d1-intents/nodes.ts:9`, and `ai/package-builder/apply.ts:8,1470`. This is
  concrete evidence the team has already started the extraction this unit
  generalizes — the other three rules are the remaining inline surface.)

Read `rows.ts:2496-2920` end-to-end before starting. Identify the four rule
boundaries (revision guard, history event, receipt, retention).

The integrity invariants to preserve (from the
`archestimator-estimate-mutation-integrity` skill):
- revision-conflict fingerprinting via `row_revision` optimistic concurrency
- history-event emission for every mutation
- mutation-receipt writing for replay/idempotency
- attachment retention (delete-on-mutation for library-sourced rows)
- canonical server state authoritative; optimistic reversible

## Owned paths / resources

- `src/lib/estimates/d1-intents/mutation-intents.ts` — CREATE (the primitives module).
- `src/lib/estimates/d1-intents/rows.ts` — REFACTOR to compose the primitives.
- `src/lib/estimates/d1-intents/mutation-receipts.ts` — READ ONLY (already a
  module; the primitives compose it).

## Implementation boundary

1. **Read the entire canonical mutation path** in `rows.ts` (lines ~2496-2920
   plus the insert/duplicate/restore/delete siblings). List every statement
   that contributes to: revision guard, history event, receipt, retention.

2. **Create `mutation-intents.ts`** with pure builder functions, each returning
   `{ sql: string; values: unknown[] }` (or an array of them for multi-statement
   rules). Suggested shape (confirm names against the integrity skill's
   vocabulary):

   ```ts
   import "server-only";
   import type { D1Statement } from "@/lib/cloudflare/d1-runtime";

   // Revision guard: a statement that matches the row ONLY if row_revision
   // still equals expectedRowRevision. Compose into the batch before the UPDATE.
   export function buildRowRevisionGuard(args: {
     rowId: string;
     estimateId: string;
     expectedRowRevision: number;
   }): D1Statement { /* ... */ }

   // History event: the INSERT INTO estimate_sheet_events statement.
   export function buildEstimateRowHistoryEvent(args: {
     rowId: string;
     estimateId: string;
     eventType: string;
     payload: unknown;
     correlationId: string;
     occurredAt: string;
   }): D1Statement { /* ... */ }

   // Mutation receipt: delegates to mutation-receipts.ts (already a module).
   export function buildMutationReceipt(args: { /* ... */ }): D1Statement { /* ... */ }

   // Attachment retention: the existing builder, re-exported or wrapped.
   export { buildProjectComponentAttachmentDeleteRetentionStatements } from "./project-component-attachment-retention";
   ```

   Extract the SQL text **verbatim** from `rows.ts`. Do not improve, reformat,
   or "clean up" the SQL — the characterization suite asserts on the generated
   string.

3. **Refactor `rows.ts`** so the canonical builders compose the primitives:

   ```ts
   export async function updateEstimateRowItemWithHistory(database, currentUser, input) {
     const statements: D1Statement[] = [
       buildRowRevisionGuard({ ... }),
       // the actual UPDATE statement (kept inline — it is the mutation, not a rule)
       { sql: "UPDATE estimate_row_items SET ...", values: [...] },
       buildEstimateRowHistoryEvent({ ... }),
       buildMutationReceipt({ ... }),
       ...buildProjectComponentAttachmentDeleteRetentionStatements({ ... }),
     ];
     const results = await runD1Batch(database, statements);
     // existing result-handling logic unchanged
   }
   ```

   The composed batch MUST produce the identical `{sql, values}` sequence as
   today's monolithic version. The characterization suite (Pack B UNIT-002)
   asserts this.

4. **Do not change any caller** in this unit. `updateEstimateRowItem` in
   `estimates/actions.ts` calls `updateEstimateRowItemWithHistory` with the same
   signature; that stays. UNIT-002/003/004 adopt the primitives for the forks.

5. Run the characterization suite after each sub-step. If it fails, the
   extraction changed output — reconcile before proceeding (RISK-001).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Characterization (the gate) | `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1` | all pass (identical SQL output) |

## Suggested executor toolkit

- Read `.agents/skills/archestimator-estimate-mutation-integrity/SKILL.md` first.
- The `refactor-safely` skill, if available, structures the
  extract-then-verify loop.

## Scope

**In scope:** `mutation-intents.ts` (new), `rows.ts` (refactor to compose).

**Out of scope:**
- The three forks (`apply.ts`, `express-promotion-actions.ts`,
  `component-mutation-d1.ts`) — UNIT-002/003/004.
- `estimates/actions.ts` — no caller change.
- The UI layer.
- Changing the optimistic-concurrency fingerprint string.
- New tests beyond confirming the characterization suite passes.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `mutation-intents.ts` exists with the four primitive builders
- [ ] `rows.ts` composes the primitives; the inline rule SQL is removed
- [ ] `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1` passes (identical SQL)
- [ ] No caller of `updateEstimateRowItemWithHistory` (or siblings) is modified
- [ ] The optimistic-concurrency fingerprint string is unchanged

## Acceptance evidence

- The characterization suite passes (this is the primary evidence).
- `git diff src/lib/estimates/d1-intents/rows.ts` shows rule SQL removed and
  primitive calls added; the UPDATE statement itself and the result handling
  unchanged.
- `mutation-intents.ts` exports the four builders with JSDoc + inline
  `{sql, values}` examples.

## STOP conditions

- The characterization suite fails after a sub-step. Revert the sub-step and
  reconcile — the extraction changed output. Do not "fix" the test.
- A rule's SQL cannot be cleanly extracted because it interleaves with the
  mutation UPDATE in a way that prevents composition (e.g. it shares a CTE).
  Surface it; the primitive may need to return a multi-statement array or the
  rule may need to stay inline with a documented reason.
- The mutation-receipt or attachment-retention builders have changed signature
  since Pack B characterized them. Re-characterize before proceeding.

## Recovery

The extraction is reversible per sub-step. If the characterization suite fails,
revert to the last green state and re-examine the boundary between the rule and
the mutation UPDATE.

## Maintenance notes

- **This unit is the gate for UNIT-002/003/004.** Once the primitives exist and
  the canonical path uses them, the forks adopt them one at a time.
- A reviewer should walk the characterization suite's assertions and confirm
  they cover the revision guard, history event, receipt, and retention for each
  mutation type. If a rule is untested, add coverage to Pack B UNIT-002 before
  relying on it here.
- When a new integrity rule is added in the future (e.g. a new audit event
  type), it lands as a new primitive in `mutation-intents.ts`, and all four
  paths pick it up automatically. That is the point of this pack.
