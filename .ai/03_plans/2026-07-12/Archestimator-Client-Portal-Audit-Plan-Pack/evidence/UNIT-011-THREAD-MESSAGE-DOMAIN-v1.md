# UNIT-011 — Thread and Message Domain

## Scope

Deliver recipient and owner discussion mechanics for general and contextual issued targets, with idempotent writes, active-recipient mentions, read state, edit/tombstone policy, and a hard public/internal message boundary.

## Delivered

- `src/lib/client-portal/thread-repository.ts` creates and replies to client-audience threads with contextual target metadata, per-recipient read/subscription rows, idempotency replay protection, active-recipient mentions, resolve/reopen, and a 15-minute recipient edit/tombstone window.
- Recipient routes expose thread summaries, client-visible message history, replies, state changes, read acknowledgement, and recipient-owned message edits/tombstones under recipient session and password gates.
- `migrations/0069_client_portal_message_visibility.sql` is a forward-only upgrade for existing `0068` databases: it backfills deterministic legacy idempotency keys, enforces the retry uniqueness index, and adds `client`/`internal` message visibility plus a client-history index.
- `src/lib/client-portal/publisher-discussion-service.ts` provides the owner-side conversation primitives used by the next unit: public reply, isolated internal note, assignment, resolve/reopen, and carry-forward metadata. Client history queries select `visibility = 'client'` only.

## Validation

- `bunx vitest run tests/vitest/client-portal-*.test.ts tests/vitest/client-portal-shell.test.tsx --maxWorkers=1` passed: 10 files, 30 tests.
- Local D1 forward migration readback confirmed `idempotency_key` and `visibility` on `client_portal_messages`, with `idx_client_portal_messages_idempotency` and `idx_client_portal_messages_client_visible` present.
- `git diff --check` passed for the Unit 11/12 discussion files and focused tests.
- `bun run type-check` remains blocked by the shared-worktree baseline syntax error in `src/components/workshop/EstimateWorkspaceClient.tsx:169`; it is outside this Client Portal change set.

## Boundary

- Owner inbox UI and pre-send preview remain `UNIT-012`; this unit provides the protected domain contract and recipient-visible transport it needs.
- No browser automation, hosted D1 mutation, or provider proof is claimed.
