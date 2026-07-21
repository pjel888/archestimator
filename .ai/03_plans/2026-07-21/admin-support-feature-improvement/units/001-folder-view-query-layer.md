# UNIT-001 — Mailbox view, count, cursor, and API contract

## Goal and status

`READY` · dependencies: none · requirements: DATA-001 · risks: RISK-001, RISK-009

Create one validated mailbox-read contract so list rows and counts cannot drift.

## Owned paths

- `src/lib/repositories/support-conversations-d1.ts`
- `src/app/api/admin/support/conversations/route.ts`
- `src/lib/repositories/support-conversations-repository.ts` only for exports

## Implementation boundary

1. Define folder/filter/cursor types and one normalizer/predicate builder.
2. Implement Inbox, Sent, Archive, and All semantics from DEC-AUTO-001. Drafts,
   Starred, and Snoozed join after their schema units; do not probe for optional tables.
3. Return page rows, stable next cursor, and scoped counts from bounded D1 queries.
   Use one captured time/filter snapshot and no per-row/per-folder round trips.
4. Sent uses latest outbound timestamp for ordering and retains send-status data.
5. Parse all route query parameters; invalid folder/status/channel/cursor returns
   400, while omitted page parameters use documented defaults. Keep no-store.
6. Inspect the query plan before adding an index; defer any index to the next
   additive migration rather than editing `0095`.

## Acceptance evidence

- Source proves list/count share normalized predicates and stable cursor tie-breaks.
- API response contract is explicit for success, degraded D1 read, and invalid input.
- Type/static/lint checks are clean when authorized implementation executes.
- TEST_PROPOSAL only: `bun x vitest run tests/vitest/support-folders.test.ts`.

## Recovery and completion

Additive query/API changes only. Complete when AC-001's data contract is present,
existing omitted-filter behavior remains explicit, and `UNIT-002` can consume it.

