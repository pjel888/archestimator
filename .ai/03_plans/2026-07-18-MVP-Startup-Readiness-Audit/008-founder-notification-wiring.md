# UNIT-008 · Founder notification wiring

- **Requirement:** REQ-007
- **Priority:** P0 · **Effort:** S · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** —
- **Evidence:** EVID-008

## Goal

Submitting beta feedback, leaving a client comment, or submitting a decision
writes a targeted in-app notification to the founder within the existing
notification system.

## Source evidence (commit `a41a07d01`)

- `src/lib/admin/notification-actions.ts:18-30` — notification kinds
  include `collaboration`, `publication_activity`, `beta_feedback`.
- `src/lib/admin/notification-actions.ts:40` — only `broadcastNotification`
  writes deliveries (admin-push fan-out). **No producer writes targeted
  notifications** for comment / decision / invite / feedback events.
- `src/lib/workshop/beta-feedback-actions.ts:37,48` — `submitBetaFeedback`
  / `submitBetaFeedbackInline` insert into `beta_feedback_submissions` and
  status events; no notification.
- `src/app/api/share/[token]/comment/route.ts:389,401` — `insertSharedLinkComment`
  + `scheduleOwnerDigest(publicationId, token, "comment")`. The digest is
  rate-limited to one email per 15 minutes (`triggerOwnerDigestIfAllowed`,
  `actions.ts:1869`).
- `src/app/api/share/[token]/decision/route.ts:331,344` — same shape for
  decisions.

## Implementation

- Add `notifyFounder(kind, payload)` to `src/lib/notifications/actions.ts`
  that inserts a `notification_deliveries` row targeting the platform admin
  (single-row audience).
- Call it from:
  - `submitBetaFeedback` (`beta-feedback-actions.ts:37`),
  - comment POST (`comment/route.ts:389`),
  - decision POST (`decision/route.ts:331`).
- Reuse the existing notification kinds (`beta_feedback`,
  `publication_activity`).

## Acceptance evidence

- Founder sees a notification badge on `/admin` within seconds of each
  event.
- Notification includes enough context (user, project, snippet) to act
  without visiting the source page.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped event fire proves
correctness.

## Recovery

If the founder is flooded, raise the per-event rate limit or add a digest
batcher. Notification writes are idempotent on `(kind, source_id)`.

## Completion signal

A user submits beta feedback; founder's notification badge increments
within seconds; clicking the notification opens the feedback queue filtered
to that item.
