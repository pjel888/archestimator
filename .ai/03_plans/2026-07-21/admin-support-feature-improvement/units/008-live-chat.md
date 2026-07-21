# UNIT-008 — In-app live chat (bidirectional user ↔ admin)

## Goal
Turn the existing in-app support path into a realtime, bidirectional chat: both
the admin console and the user widget subscribe to `SUPPORT_INBOX`, messages
persist in D1 and fan out over the DO. No schema change.

## Status
`READY` · depends on: UNIT-004, UNIT-006, UNIT-007 · requirements: DATA-004,
SEC-002, UX-002 · risks: RISK-005, RISK-006

## Why
DO `SUPPORT_INBOX`, D1 `support_messages(transport='in_app')`, and
`unread_for_admin`/`unread_for_user` already exist, but neither UI subscribes,
admin sends don't fan out, and users can't post into an existing conversation.

## Owned paths
- `src/app/api/support/realtime-token/route.ts` (new, write) — room-token mint
- `src/lib/cloudflare/support-inbox-client.ts` (new, write) — thin WS client
- `src/lib/admin/support-actions.ts` (write — **reread**, after UNIT-004/007):
  add `sendSupportUserMessage`, DO fanout on in_app sends, user read marker
- `src/components/admin/AdminSupportInbox.tsx` (write — **reread**, after UNIT-002/004/006/007): subscribe + live receive
- `src/components/support/SupportChatWidget.tsx` (write) — rewrite to a live thread

## Implementation boundary
1. Token route: authorize (admin via `requireAdminContext`; owner user via
   `support_conversations.user_id === session.userId`), then
   `issueRealtimeRoomToken({ secret: readRealtimeRoomTokenSecret(), sub, topic:
   conversationId, ttlSeconds<=300 })`. Reject others (fail-closed).
2. `sendSupportUserMessage`: ownership-checked; persist inbound in_app
   (idempotent on client_message_id); `unread_for_admin=1`; best-effort fanout.
3. Fanout helper: POST `{type:"fanout", message}` to the DO stub
   (`env.SUPPORT_INBOX.get(idFromName(conversationId))`) after the D1 write;
   failure is logged, non-fatal (D1 is source of truth).
4. Client: connect → `authorize(token)` → `on("message")`; backfill from D1 on
   mount/reconnect; dedupe by `client_message_id`.
5. Both UIs: message list + composer + unread + thread continuity; presence/
   typing only if cheap over the existing DO (optional, non-blocking).
   Authenticated route → DESIGN.md alpha guidance (12px max, xs radius, neutral,
   reuse `src/components/ui/*`).

## Verification
- `bun run type-check`, `bun run lint`.
- GATE-SEC-01: token scoped to conversationId, fail-closed, TTL bounded.
- GATE-DATA-01: D1 persists before fanout; idempotent; fanout best-effort.
- GATE-UX-01: empty/loading/reconnect states; keyboard-focusable composer.

## Scope
In: realtime chat both sides. Out: triage (UNIT-009); chat on email threads.

## Done criteria
- [ ] Owner user + admin can exchange messages live; both persist to D1.
- [ ] Admin console and user widget subscribe and receive without reload.
- [ ] Non-participants cannot mint a token or subscribe (server-enforced).
- [ ] type-check + lint clean; existing email send lifecycle preserved.

## Recovery
New files revert cleanly; shared-file edits serialized last — revert to roll back.
