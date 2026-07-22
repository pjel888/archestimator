# UNIT-005: Establish the user Support inbox and conversation

## Goal and status

`READY` after UNIT-003 | dependencies: UNIT-003 | requirements: UX-002, DATA-002,
PERF-001 | risks: RISK-005, RISK-006, RISK-007

Turn the existing rudimentary chat client into a coherent private Requests list,
conversation history, unread badge, reply composer, status model, and resilient
realtime/backfill lifecycle.

## Owned paths

- `src/components/support/SupportChatWidgetClient.tsx` for replacement or split
- `src/components/support/SupportChatWidget.tsx`
- new focused `SupportCenter`, `SupportRequestList`, `SupportConversation`, and
  query/realtime hooks under `src/components/support/`
- `src/app/api/support/conversations/route.ts` read DTO only after UNIT-003
- `src/app/api/support/conversations/[id]/messages/route.ts` read/unread DTO only
- global Support host shared with UNIT-004, under serialized ownership
- existing `support-inbox-client`/realtime helpers if present

## Implementation boundary

1. Use TanStack Query for owner-only summaries, selected history, unread total,
   and mutation reconciliation. Do not fetch server data in an ad hoc effect.
2. Render `Requests`, `New request`, and `Conversation` states from one
   composition shared by modal and full page.
3. Map internal status to the user language in `00-PLAN.md` without changing the
   durable enum solely for copy.
4. Mark user read after history is successfully visible; update badge/list cache
   from authoritative response.
5. Reply through UNIT-003 with stable client ID and optional screenshot. A reply
   to resolved/archived reopens the thread by server contract.
6. Subscribe only to the selected conversation DO. Validate identifier-only
   events, invalidate D1 queries, and never render socket payload content.
7. Reconnect with bounded exponential backoff+jitter; refresh token; backfill on
   reconnect, visibility, online, and conversation change; clean every timer and
   socket on unmount/change.
8. Refresh unread summaries on focus and at a conservative visible-page interval
   instead of opening one socket per conversation or adding a global DO.
9. Provide empty/loading/sending/offline/reconnecting/degraded/uncertain/retry
   states and prevent duplicate optimistic/server rows.
10. Keep bounded lists/history. Use installed TanStack Virtual only after a
    measured threshold, not by default.

## Acceptance evidence

- Owner list/history DTOs cannot expose another user's thread or admin metadata.
- Badge and row unread state match D1 after open/reply/realtime/backfill.
- Lost response retry recovers one message, not a duplicate.
- D1 success remains visible under DO degradation.
- Socket/timer lifecycle has explicit cleanup and selected-room isolation.
- Source satisfies the UX audit's wide/narrow, state, and accessibility contract.
- Execute and retain the UNIT-005 static-QA receipt from `00-PLAN.md` section 20.
- TEST_PROPOSAL only: conversation owner/unread/reopen/realtime/browser scenarios.

## Recovery and stop condition

The composer from UNIT-004 can remain functional if realtime is degraded, but
the final pack cannot complete without history. Stop when AC-006/007/009 are
source-proven for the user surface and UNIT-006 can rely on the same thread.
