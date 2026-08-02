# UNIT-006 — Make AI package-builder Apply row+event writes atomic

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation here. Its landed current-source behavior is revalidated
> by successor `UNIT-028` in `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Wrap the five (data-mutation, history-event) statement pairs in the AI
package-builder Apply path in `runBatch` so D1 applies both or neither. Today a
transient failure between the two statements leaves a history-less mutation
and a permanently lost audit trail.

## Status

`SUPERSEDED` · historical dependency: (none) · requirement: `DATA-002` · risks: `RISK-003`

## Why this matters

The AI Apply path issues raw `INSERT`/`UPDATE` against `estimate_row_items`,
`estimate_nodes`, and `estimate_sheet_events`. At five sites it writes the data
row and the history event as two independent `run()` calls. If D1 accepts the
data write but the event insert fails (transient error, batch quota), the data
is committed with no history event. The retry keys on the event row, so it does
not detect the prior write and attempts to re-insert — failing on the primary
key for inserts, or losing the `oldSnapshot` audit trail for updates. Wrapping
each pair in the existing `runBatch` makes the pair atomic.

## Current state

File: `src/lib/ai/package-builder/apply.ts`. The `runBatch` helper is defined
locally at line ~228 and already used elsewhere in the file. The five
non-atomic pairs:

| Site | Data statement | Event statement | Approx lines |
|------|----------------|-----------------|--------------|
| `createEstimateNodeInD1` | `INSERT INTO estimate_nodes` | `insertEstimateEvent` | 1133 / 1156 |
| `renameEstimateNodeInD1` | `UPDATE estimate_nodes` | `insertEstimateEvent` | 1198 / 1210 |
| `updateEstimateRowInD1` | `UPDATE estimate_row_items` (+ row_revision bump) | `insertEstimateEvent` | 1352 / 1371 |
| `insertEstimateRowRecord` | `INSERT INTO estimate_row_items` | `insertEstimateEvent` | 1281 / 1283 |
| `insertEstimateTemplateIntoEstimateInD1` | `INSERT INTO estimate_templates` | `insertEstimateEvent` | 1681 / 1689 |

The replay reader `readCommittedEstimateEvent` (lines 1236, 1329, 1441, 1562)
keys on the event row to decide whether a mutation already happened.

The idempotency guard at apply.ts:39 (per the audit) is a D1 `UNIQUE(workspace_id, idempotency_key)`
constraint, so concurrent identical applies are protected at the DB level. The
risk this unit addresses is **sequential** partial failure within one apply.

## Owned paths / resources

- `src/lib/ai/package-builder/apply.ts` — the only file to edit.

## Implementation boundary

For **each** of the five sites:

1. Reread the site to confirm the two-statement pattern (data `run()` then
   event `run()`/`insertEstimateEvent`).
2. Combine the two statements into a single `runBatch` call. Build both
   `{ sql, values }` objects and pass them as a two-element array.
3. Preserve the existing bind values exactly — the only change is one round-trip
   instead of two, with D1's atomic batch semantics.

   Example shape for `insertEstimateRowRecord` + its event:

   ```ts
   await runBatch(database, [
     { sql: insertEstimateRowSql, values: insertEstimateRowValues },
     { sql: insertEstimateEventSql, values: insertEstimateEventValues },
   ]);
   ```

   Where `insertEstimateEventSql`/`values` are exactly what
   `insertEstimateEvent(...)` currently issues internally. If
   `insertEstimateEvent` builds the statement dynamically, extract its
   `{ sql, values }` into a helper that returns the pair without running it, so
   `runBatch` can include it.

4. **Replay reader update (RISK-003):** after the change, a transient failure
   between the two statements is impossible (atomic), so the retry path now
   sees either both or neither. The replay reader's existing logic (key on the
   event row) still works: if the event is absent, neither happened, so retry
   the whole pair. Confirm by reading `readCommittedEstimateEvent` — no change
   needed if it already treats "event absent" as "retry." If it instead treats
   "event absent but data present" as a special case, simplify that branch (the
   case can no longer occur).

5. Do **not** change the SQL text, bind values, the row-revision guard logic,
   or the idempotency-key constraint.

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |
| Site audit | `rg -n "insertEstimateEvent\|runBatch" src/lib/ai/package-builder/apply.ts` | five pairs now go through runBatch |

## Scope

**In scope:** `src/lib/ai/package-builder/apply.ts` only.

**Out of scope:**
- `src/lib/ai/package-builder/read-tools.ts` — read path, no events.
- `src/lib/estimates/d1-intents/rows.ts` — the canonical integrity layer (Pack D
  will eventually route Apply through it; this unit is the local fix that lands
  first).
- The idempotency-key constraint or any migration.
- Tests (gate is `NOT_REQUIRED`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] All five sites use `runBatch` for the (data, event) pair
- [ ] No `run()` call in the file issues a data mutation immediately followed by
      a separate `run()` for its event (read the file end-to-end)
- [ ] `readCommittedEstimateEvent` is consistent with the new atomicity (either
      unchanged because it already handles "event absent → retry," or simplified)
- [ ] No files outside `apply.ts` are modified

## Acceptance evidence

- `rg -n "runBatch" src/lib/ai/package-builder/apply.ts` shows at least five
  call sites covering the pairs.
- `git diff src/lib/ai/package-builder/apply.ts` shows the pairing; SQL text and
  bind values unchanged.

## STOP conditions

- `insertEstimateEvent` cannot be refactored to return `{ sql, values }` without
  touching its other callers (search `rg "insertEstimateEvent" src`). If so,
  build the event statement inline at each site instead, duplicating the SQL —
  the duplication is acceptable because Pack D will unify these paths.
- A site's "event" is not a single statement but a multi-statement block (e.g.
  it also writes a mutation receipt). If so, include all dependent statements in
  the same `runBatch`.
- The replay reader's branching cannot be reconciled with atomicity without
  changing observable behavior — surface it.

## Recovery

The edit is mechanical: combine two `run()` calls into one `runBatch([...])` at
five sites. The main risk is extracting the event SQL; if `insertEstimateEvent`
is opaque, inline its SQL at each site (verify against the function body).

## Maintenance notes

- **RISK-003:** the failure-semantics change (from "row committed, event lost"
  to "neither committed") is the intended direction. The retry path benefits:
  it no longer needs to handle the partial-commit case. A reviewer should walk
  the retry path once to confirm.
- Pack D will eventually replace these five sites with calls into the shared
  `MutationIntent` primitive; when that lands, the local `runBatch` usage is
  deleted along with the rest of the fork.
- If a sixth (data, event) pair is added to Apply in the future, it MUST use
  `runBatch` — add a comment near the helper documenting the invariant.
