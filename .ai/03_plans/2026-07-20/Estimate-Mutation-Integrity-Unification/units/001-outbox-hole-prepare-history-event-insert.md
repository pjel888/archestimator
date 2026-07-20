# UNIT-001 — Close the activity_event_outbox hole

## Goal

Route the 5 forked write paths that hand-roll the `estimate_sheet_events`
INSERT through the existing `prepareHistoryEventInsert` primitive, so each
mutation also writes the `activity_event_outbox` row that the cron drain
(`reconcileActivityOutbox` in `worker.ts`) reads to fan activity into the
workspace feed. Today these 5 forks produce history events that never reach the
activity feed.

## Status

`READY` · depends on: Pack B UNIT-002 (characterization net) · requirement: `DATA-001` · risks: `RISK-001`

## Why this matters

The canonical `prepareHistoryEventInsert` (`src/lib/estimates/d1-intents/history-events.ts:328`)
returns a `PreparedHistoryEvent` containing BOTH the `estimate_sheet_events`
INSERT AND an `activity_event_outbox` INSERT (`history-events.ts:401-410`,
`ON CONFLICT(event_id) DO NOTHING`). The outbox row is mandatory — it is what
`reconcileActivityOutbox` drains to produce the workspace activity feed.

Five forks hand-roll the `estimate_sheet_events` INSERT and silently drop the
outbox row:

| Fork | Hand-rolled INSERT site | Outbox row written? |
|------|-------------------------|---------------------|
| `src/lib/ai/package-builder/apply.ts` | `:983`, `:1487` | NO |
| `src/lib/estimates/express-promotion-actions.ts` | `:1425` | NO |
| `src/lib/component-library/component-mutation-d1.ts` | `:1825` | NO |
| `src/lib/component-library/template-lifecycle-actions.ts` | `:218` | NO |
| `src/lib/component-library/component-permanent-delete.ts` | `:954` | NO |

Result: estimate edits made via these paths (AI apply, express promotion,
component library edits, template lifecycle, permanent component delete) appear
in the sheet's history view but NOT in the workspace/project activity feed.
Users miss edits they should see.

This is the smallest-change-highest-payoff unit in Pack D: no new primitive, no
extraction, just consume the existing one at 5 sites.

## Current state

The primitive to consume: `prepareHistoryEventInsert(database, input: HistoryEventInput) => Promise<PreparedHistoryEvent>`
at `src/lib/estimates/d1-intents/history-events.ts:328`.

`HistoryEventInput` fields (read `history-events.ts:19-36` for the exact shape):
`estimateId`, `workspaceId` (resolved via `readEstimateIntentProjectContext` if
not supplied), `projectId`, `nodeId`, `tabId`, `targetRowId`, `eventType`,
`actorUserId`, `changedFields`, `rowContext`, `oldSnapshot`, `newSnapshot`,
`payload`, `metadata`, `totalDelta`, `correlationId`, `occurredAt`.

`PreparedHistoryEvent` (history-events.ts:38-40): either `{ statement: null }`
for idempotent replay (dedup by `estimate_id + correlation_id`), or
`{ statement, outboxStatement }` — a 2-element batch ready for `runD1Batch`.

The existing consumer pattern (from `d1-intents/nodes.ts:463`, `tabs.ts:415`,
`rows.ts:2035`):

```ts
const prepared = await prepareHistoryEventInsert(database, { estimateId, projectId, ... });
const statements: D1IntentStatement[] = [mutationStatement, ...(prepared.statement ? [prepared.statement, prepared.outboxStatement!] : [])];
await runD1Batch(database, statements);
```

Or the fully-composed helper `runMutationWithHistory(database, mutationStatements, historyInput)`
at `history-events.ts:425` — but it has zero fork callers today (only siblings
use it), so adopting it here is greenfield.

## Owned paths / resources

The 5 fork files above. One sub-step per file.

## Implementation boundary

For **each** of the 5 forks:

1. Reread the hand-rolled `INSERT INTO estimate_sheet_events` site. Confirm it
   matches the table above.
2. Replace the hand-rolled INSERT with a call to `prepareHistoryEventInsert`,
   passing the same field values the hand-rolled SQL used. The fork already
   has `estimateId`, `projectId`, `actorUserId`, `eventType`, etc. in scope.
3. Compose the returned `{ statement, outboxStatement }` into the same batch
   as the mutation. The fork already builds a batch (per Pack A UNIT-006 for
   `apply.ts`; per existing structure for the others) — add the two history
   statements to it.
4. Preserve the idempotent-replay behavior: if `prepareHistoryEventInsert`
   returns `{ statement: null }`, the mutation is a replay; skip the INSERT
   entirely (this is the existing dedup-by-correlation-id behavior).
5. Do NOT change the mutation SQL, the event type strings, or the
   `correlationId` generation. The only change is WHERE the INSERT comes from.

**Special case — `template-lifecycle-actions.ts:218`:** this fork uses
`runTemplateAtomicBatch` from `./template-mutations` (a sibling wrapper), not
`runD1Batch`. Confirm `runTemplateAtomicBatch` accepts arbitrary statements;
if so, pass the history statements through. If not, switch this site to
`runD1Batch` (Pack C's output) for the history-bearing batch.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Characterization (the gate) | `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1` | passes (canonical SQL unchanged) |
| Outbox audit | `rg -n "INSERT INTO estimate_sheet_events" src/lib/ai src/lib/estimates/express-promotion-actions.ts src/lib/component-library` | the 5 sites now go through prepareHistoryEventInsert; raw INSERTs only in `history-events.ts` |

## Scope

**In scope:** the 5 fork files above.

**Out of scope:**
- The 4 canonical sibling intent files (`nodes.ts`, `tabs.ts`, `rows.ts`,
  `templates.ts`) — already correct.
- `reusable-sources/actions.ts` and `template-instance-actions.ts` — already
  consume `prepareHistoryEventInsert` (confirmed in the trace).
- UNIT-002/003/004 of this pack (intent/receipt, revision guard, access).
- Any change to `prepareHistoryEventInsert` itself.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1` passes
- [ ] All 5 fork sites import `prepareHistoryEventInsert` from `@/lib/estimates/d1-intents/history-events`
- [ ] The outbox audit shows raw `INSERT INTO estimate_sheet_events` only in `history-events.ts` (plus `estimate-records.ts` if it has its own canonical path)
- [ ] No `activity_event_outbox` INSERT is hand-rolled anywhere in the 5 forks

## Acceptance evidence

- The outbox audit returns matches only in the canonical module(s).
- `git diff --stat` shows the 5 fork files changed; `history-events.ts` unchanged.
- Spot-check one fork end-to-end: confirm the composed batch includes the
  outbox statement when `prepareHistoryEventInsert` returns a non-null statement.

## STOP conditions

- A fork's history-event fields do not map cleanly onto `HistoryEventInput`
  (e.g. it writes a field the primitive doesn't accept). Surface it; the
  primitive may need a new optional field, but do NOT change the canonical
  callers' behavior.
- `runTemplateAtomicBatch` cannot accept the history statements. Switch that
  one site to `runD1Batch` (Pack C) — but if Pack C hasn't landed, surface the
  dependency.
- The characterization suite fails. The fork changed canonical SQL — revert
  and reconcile.

## Recovery

Each fork site is independent. Revert a site that breaks and reconcile.

## Maintenance notes

- After this unit, every estimate-write mutation reaches the activity feed.
- A reviewer should confirm the outbox `ON CONFLICT(event_id) DO NOTHING` guard
  still dedupes correctly when multiple forks write events for the same
  correlation id (it should — the dedup is on the primitive, not the caller).
- This unit is the foundation for UNIT-002 (intent/receipt) — once the outbox
  hole is closed, the replay-reader work in UNIT-002 builds on a consistent
  history-event surface.
