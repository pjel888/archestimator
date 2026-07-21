# UNIT-011 — Triage UI, URL views, and Action Inbox coherence

## Goal and status

`READY` · dependencies: UNIT-002, UNIT-009, UNIT-010 · requirements: DATA-005, UX-003 · risks: RISK-007, RISK-009

Expose labels, self-assignment, snooze, and star without re-monolithizing the
support console, and make snooze semantics consistent with the founder Action Inbox.

## Owned paths

- `src/components/admin/AdminSupportInbox.tsx` and extracted mailbox/thread modules (reread)
- `src/app/admin/support/page.tsx` (reread)
- `src/lib/admin/support-attention-repository.ts`

## Implementation boundary

1. Add Starred and Snoozed rail entries/counts plus label/assignee URL filters.
2. Add accessible label chips/editor, assign-to-me/unassign, bounded snooze menu,
   unsnooze, and star toggle in cohesive extracted components.
3. Optimistic mutations carry an expected revision; on conflict, roll back to
   authoritative server state and explain the refresh instead of overwriting.
4. Preserve folder/search/channel/status composition and narrow/wide pane behavior.
5. Exclude future-snoozed conversations from `listOpenSupportConversations` so
   the Action Inbox matches support triage. Do not alter total open aggregate.
6. Define empty/filter/no-results/error states and focus return for menus/dialogs.

## Acceptance evidence

- Source traces each UI action to admin-gated revisioned mutation and audit event.
- Mailbox rail/counts and Action Inbox use the documented snooze semantics.
- Browser/a11y proof remains gated; type/static/lint checks run only in implementation.

## Recovery and completion

Serialized final feature edit. Complete when AC-009 is source-proven across both
admin surfaces and the final requirement/risk/cleanup audit has no open local work.
