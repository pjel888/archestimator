# UNIT-005 — Draft persistence: migration 0096 + repository

## Goal
Persist compose drafts so they survive reload and populate a Drafts folder.

## Status
`READY` · depends on: (none) · requirements: DATA-003 · risks: RISK-003

## Owned paths
- `migrations/0096_support_drafts.sql` (new, write)
- `src/lib/repositories/support-drafts-d1.ts` (new, write)

## Implementation boundary
1. Migration `0096` (additive, next after `0095`): create `support_drafts` per
   00-PLAN §8.3 with `UNIQUE(admin_user_id, conversation_id, kind)` and an index
   on `admin_user_id`. Optional: add `idx_support_msg_direction
   (conversation_id, direction)` to back UNIT-001's Sent predicate. Never edit
   `0095` or earlier.
2. `support-drafts-d1.ts` (Worker-safe, injected resolver like
   `support-conversations-d1.ts`): `upsertSupportDraft` (idempotent on the unique
   key), `listSupportDrafts(adminUserId)`, `getSupportDraft`, `deleteSupportDraft`.
   Parameterized SQL; admin-scoped by `admin_user_id`.

## Verification
- `bun run type-check`, `bun run lint`.
- Migration inspection; local `wrangler d1 migrations apply ARCH_DB --local`
  (dry/local only) if Philip authorizes running it.
- DATA-003 TEST_PROPOSAL recorded (not run): upsert idempotency.

## Scope
In: schema + repository. Out: actions/UI (UNIT-006).

## Done criteria
- [ ] `0096` creates `support_drafts` (+ optional direction index) additively.
- [ ] Repository CRUD is admin-scoped, parameterized, idempotent.
- [ ] type-check + lint clean.

## Recovery
Local rollback = drop `support_drafts`; new files revert cleanly.
