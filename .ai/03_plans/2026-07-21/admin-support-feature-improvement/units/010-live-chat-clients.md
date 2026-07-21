# UNIT-010 — User and admin live-chat clients

## Goal and status

`READY` · dependencies: UNIT-002, UNIT-006, UNIT-008 · requirements: DATA-004, SEC-002, UX-002 · risks: RISK-005, RISK-006, RISK-009

Deliver small user/admin client islands that reconcile D1 history with
`SUPPORT_INBOX` invalidations and recover cleanly from token/network failures.

## Owned paths

- new `src/lib/cloudflare/support-inbox-client.ts`
- new focused chat hook/component modules
- `src/components/support/SupportChatWidget.tsx`
- `src/components/admin/AdminSupportInbox.tsx` and extracted thread modules (reread)
- `src/app/workshop/feedback/page.tsx` only for serializable initial data/props

## Implementation boundary

1. Keep `SupportChatWidget` as a server wrapper and render a small client island;
   do not pull auth/D1/server-only modules into the browser graph.
2. Query current user's in-app conversations/history and support create/select/send/read.
3. Connect with the short-lived token, handle validated invalidation only, then
   invalidate/refetch the D1 query. Never render message content from the socket.
4. Reconnect with capped exponential backoff+jitter, refresh tokens, backfill on
   reconnect/visibility/online, dedupe optimistic/server rows, and clean timers/
   sockets on unmount or conversation change.
5. Admin thread subscribes only for selected in-app conversation. Email threads
   remain on existing fetch/mutation behavior.
6. Expose loading/empty/sending/offline/reconnecting/degraded/error states and
   mark user/admin unread flags after history is successfully visible.

## Acceptance evidence

- Source proves AC-006/007 client trust boundaries and AC-008 lifecycle cleanup.
- No fetch-in-effect for server data; TanStack Query owns history/backfill.
- Browser/real-DO proof remains a TEST_PROPOSAL, not an implicit requirement.

## Recovery and completion

New client modules plus serialized host edits. Complete when both authenticated
surfaces can use the same server contract and later triage UI has a stable host.

