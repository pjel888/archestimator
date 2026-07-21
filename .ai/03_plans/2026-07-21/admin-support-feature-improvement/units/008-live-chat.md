# UNIT-008 — Chat authorization, owner APIs, persistence, and fanout hardening

## Goal and status

`READY` · dependencies: UNIT-007 · requirements: DATA-004, SEC-002 · risks: RISK-005, RISK-006

Make D1 the only authoritative chat write path and convert `SUPPORT_INBOX` into
an authenticated invalidation relay shared by user, admin, and inbound email.

## Owned paths

- `src/lib/collaboration/realtime-identity-actions.ts`
- new focused server-only support realtime authorization module if extraction is needed
- new `src/app/api/support/conversations/route.ts`
- new `src/app/api/support/conversations/[id]/messages/route.ts`
- new `src/app/api/support/conversations/[id]/realtime-token/route.ts`
- `src/lib/repositories/support-conversations-d1.ts` (reread after UNIT-001)
- `src/lib/admin/support-actions.ts` (reread after UNIT-007)
- new `src/lib/cloudflare/support-inbox-fanout.ts`
- `src/lib/cloudflare/support-inbox.ts`
- `src/lib/cloudflare/support-inbox-router.ts`
- `src/lib/email/inbound-support-email.ts`
- `worker.ts` only if type/wiring changes are required; no new binding/cron

## Implementation boundary

1. Refactor the existing admin-or-owner token policy into one server-only
   implementation and expose a no-store token route; delete duplicate policy.
2. Add owner-scoped list/messages/send/read operations for `channel='in_app'`.
   Every read/mutation checks `user_id`; admins continue through admin paths.
3. Persist message idempotently and update unread flags before fanout.
4. Shared internal fanout signs a short-lived system token, sends a strict
   identifier-only invalidation envelope, checks response, and logs sanitized failures.
5. Use that helper from user/admin in-app sends and inbound email persistence.
6. Harden Worker router/DO: validate path/token/envelope/size, reject client
   authoritative message frames, and broadcast only same-room invalidations.
7. Keep D1 success non-fatal on DO failure; return explicit realtime-degraded metadata.

## Acceptance evidence

- Source traces every chat write through owner/admin auth and D1 before fanout.
- Wrong-room/non-owner/expired/malformed/missing tokens fail closed.
- No client frame can create or broadcast an authoritative message body.
- TEST_PROPOSAL only: chat transport, realtime token, and router tests in §10.

## Recovery and completion

No schema/binding change. Complete when AC-006/007 server boundaries are proven
and UNIT-010 receives stable history/send/token/invalidation contracts.

