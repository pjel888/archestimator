# UNIT-002 — Admin mailbox state refactor and folder rail

## Goal and status

`READY` · dependencies: UNIT-001 · requirements: DATA-001, UX-001 · risks: RISK-001, RISK-009

Make URL state and TanStack Query the single list/count authority, then render a
responsive mailbox rail without growing `AdminSupportInbox` into a larger monolith.

## Owned paths

- `src/app/admin/support/page.tsx`
- `src/components/admin/AdminSupportInbox.tsx`
- new cohesive modules under `src/components/admin/support/`

## Implementation boundary

1. Seed the mailbox query from RSC data; derive its key from normalized URL state.
2. Remove the unsynchronized copied conversation-list state. Mutation success
   updates/invalidates the query cache; URL navigation refetches the right result.
3. Extract URL/query, folder rail/list, and thread-pane boundaries; keep the rich
   composer dynamically loaded and server-only values out of the client graph.
4. Add Inbox, Sent, Archive, and All rail entries and counts. Drafts/Starred/
   Snoozed render only when their backing units land, not as fake placeholders.
5. Preserve channel/status/unread/search as composable URL filters.
6. Define wide two-pane and narrow one-pane/Back behavior plus loading, empty,
   degraded, and selected-thread-not-in-page states. Preserve focus on navigation.

## Acceptance evidence

- A URL reload deterministically reproduces folder/filter/selection.
- No local list copy can outlive refreshed server/query data.
- Source defines responsive and keyboard-focus behavior; browser proof is gated.
- Type/static/lint checks are clean when implementation executes.

## Recovery and completion

Refactor before adding later features. Complete when Sent is usable, AC-001/004
are source-proven for this phase, and later shared-file owners have a stable host.

