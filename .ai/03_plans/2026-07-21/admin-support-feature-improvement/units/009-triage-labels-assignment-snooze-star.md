# UNIT-009 — Normalized triage schema, mutations, and mailbox predicates

## Goal and status

`READY` · dependencies: UNIT-001, UNIT-005 · requirements: DATA-005 · risks: RISK-007, RISK-008

Add exact, revision-safe labels/self-assignment/snooze/star data and compose it
with mailbox/count queries without JSON substring or clock-drift bugs.

## Owned paths

- next free migration after drafts (expected `migrations/0097_support_triage.sql`)
- `src/lib/repositories/support-conversations-d1.ts` (reread after UNIT-001)
- `src/lib/admin/support-actions.ts` (reread after UNIT-008)

## Implementation boundary

1. Recheck migration tail and use the next free number after the draft migration.
2. Add one-to-one triage and exact-label join tables with FK/check/revision/
   timestamp constraints and focused indexes from §5.7.
3. Extend shared mailbox predicates/counts for Starred, Snoozed, label, and
   assignee using one captured `now`; future snoozed rows leave Inbox and expired
   snoozes re-enter without a cron.
4. Add admin-gated revisioned mutations: normalized capped label replacement,
   assign-to-self/unassign only, bounded UTC snooze/unsnooze, star/unstar.
5. Write sanitized audit events and return the authoritative triage revision.
6. Keep total open aggregate semantics unchanged; Action Inbox update is UNIT-011.

## Acceptance evidence

- Static SQL/source proves exact labels, revision CAS, predicate/count parity,
  clock snapshot consistency, and additive migration ordering.
- TEST_PROPOSAL only: `bun x vitest run tests/vitest/support-triage-folders.test.ts`.

## Recovery and completion

Forward-only additive schema. Complete when AC-009's data contract is ready for
UNIT-011 and no earlier mailbox filter regresses by construction.

