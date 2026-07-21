# UNIT-005 — Revisioned draft schema, repository, privacy, and cleanup primitives

## Goal and status

`READY` · dependencies: none · requirements: DATA-003 · risks: RISK-003, RISK-008

Create an additive D1 draft aggregate that prevents duplicate null scopes,
stale-write loss, duplicate send promotion, client-owned R2 references, and
orphaned privacy data.

## Owned paths

- next free migration (expected `migrations/0096_support_drafts.sql`)
- new `src/lib/repositories/support-drafts-d1.ts`
- repository wrapper exports
- privacy/retention repository modules required by the new tables
- support draft cleanup helper consumed by the existing upload-cleanup route

## Implementation boundary

1. Recheck migration tail/leases; never edit `0095` or renumber another owner's work.
2. Add `support_drafts` with owner, non-null unique `scope_key`, kind/
   conversation checks, compose fields, stable `client_message_id`, lifecycle
   state, optional bound outbound conversation/message ids, `revision`, and timestamps.
3. Add `support_draft_attachments` with draft cascade FK, exact owned R2 key,
   normalized metadata/hash, timestamps, and unique `(draft_id, r2_key)`.
4. Add only indexes needed for owner/update, conversation, and stale cleanup.
5. Implement Worker-safe create/read/list/CAS-update/delete, attachment-bind,
   send-claim, promotion-bind, consume, and stale-claim recovery operations.
   Conflicts return authoritative state/revision instead of overwriting it; DB
   constraints make one draft map to at most one outbound message.
6. Provide bounded queries for privacy erase and stale cleanup. R2 deletion is
   performed by the server integration unit from exact database-owned keys.
7. Extend privacy export/erase so draft content for erased user conversations is
   not retained silently; retain only sanitized audit metadata required by policy.

## Acceptance evidence

- Static SQL review proves non-null scope/send uniqueness, lifecycle/FK/check/
  index coherence, forward-only ordering, and no data rewrite.
- Repository SQL is parameterized and owner-scoped; CAS semantics are explicit.
- TEST_PROPOSAL only: `bun x vitest run tests/vitest/support-drafts-d1.test.ts`.

## Recovery and completion

Forward fix, not destructive rollback. Complete when migration/types/repository/
privacy contracts agree and UNIT-006 can own runtime D1/R2 orchestration.
