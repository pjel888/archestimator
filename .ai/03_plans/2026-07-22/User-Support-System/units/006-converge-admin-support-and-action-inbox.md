# UNIT-006: Converge admin Support and Action Inbox

## Goal and status

`READY` after UNIT-004 and UNIT-005 | dependencies: UNIT-001, UNIT-002, UNIT-003,
UNIT-004, UNIT-005 |
requirements: DATA-001, UX-003, DATA-002, PERF-001 | risks: RISK-001, RISK-002,
RISK-007, RISK-009

Make every new and imported user report visible once in the operational admin
mailbox, with safe context/screenshot, internal triage, source-coherent Today
behavior, and no legacy duplicate.

## Owned paths

- `src/app/admin/support/page.tsx` after preserving current dirty layout changes
- `src/components/admin/AdminSupportInbox.tsx`
- focused files under `src/components/admin/support/`
- `src/app/api/admin/support/**` relevant list/message/attachment/triage routes
- `src/lib/admin/support-actions.ts`
- `src/lib/admin/action-inbox-repository.ts` after UNIT-001
- `src/lib/admin/support-attention-repository.ts`
- `src/lib/admin/feedback-attention-repository.ts`
- legacy feedback review route/components for canonical link/read-only state
- UNIT-002 import/readiness script, executed locally only within this pack ceiling

## Implementation boundary

1. Extend selected-thread DTOs to include safe context and authorized attachment
   descriptors; never pass R2 keys, routing tokens, or prohibited context.
2. Render screenshot preview and a compact context panel with safe route,
   validated resource links, optional technical facts, and legacy marker.
3. Add revisioned internal priority `normal/high/urgent` and assignment using the
   complete server-side platform-admin predicate, including the configured email
   allowlist rule. Preserve labels/status/snooze/star inside canonical support.
4. Keep the message thread canonical. Admin reply/status updates alter the same
   conversation the user sees and update unread state transactionally.
5. Ensure Action Inbox support derivation uses canonical priority/unread/age and
   exact href. Support-derived rows expose only `Open conversation`; remove their
   generic Resolve, Dismiss, and Snooze controls. Reconciliation must reopen a
   stale resolved/dismissed action row when its canonical source is active again.
6. Run legacy import locally against a safe local copy/fixture; for remote
   execution leave an explicit release step.
7. Deploy-safe derivation always produces canonical support attention plus
   legacy attention only for rows absent from `support_legacy_feedback_imports`.
   As the idempotent import maps rows, legacy items disappear naturally without
   a feature flag, source switch, or second deployment. Invalid/unmapped rows
   remain visible and fail the completeness audit rather than losing attention.
8. Make legacy feedback review read-only and link its canonical conversation.
9. Preserve current admin visual improvements and keep `AdminSupportInbox` a
   coordinator over cohesive subcomponents instead of re-monolithizing it.

## Acceptance evidence

- One new user report appears once in mailbox and once at most in Today.
- Action Inbox `Open conversation` selects the exact canonical thread.
- Admin sees user identity, message, screenshot, and only allowed diagnostics.
- Priority/assignment/status/reply are admin-gated, revisioned, audited, and
  reconcile to the user view.
- Legacy dry-run/import counts reconcile; rerun creates no duplicate; unmapped
  rows retain legacy attention; old review record links to the canonical thread.
- Admin no-data, mailbox-error, attachment-error, and realtime-degraded states
  remain explicit and usable.
- Execute and retain the UNIT-006 static-QA receipt from `00-PLAN.md` section 20.
- TEST_PROPOSAL only: admin convergence/import/Action Inbox browser scenarios.

## Recovery and stop condition

Legacy attention is an unmapped-row fallback, not a release-time toggle. Recovery
is stopping the import: mapped rows keep canonical attention and unmapped rows
keep read-only legacy attention. Stop when AC-002/007/008/009 are proven without
a duplicate or hidden report.
