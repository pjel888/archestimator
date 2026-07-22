# UNIT-004: Replace feedback with one Support composer

## Goal and status

`READY` after UNIT-003 | dependencies: UNIT-003 | requirements: UX-001, UX-002,
PERF-001 | risks: RISK-002, RISK-003, RISK-006, RISK-009

Replace the global feedback modal and duplicate full-page feedback form with the
message-first Support Center composer backed only by canonical support intake.

## Owned paths

- `src/components/workshop/WorkshopFeedbackModal.tsx` (rename only if every
  import is updated in this unit)
- `src/components/workshop/WorkshopShell.tsx`
- `src/components/workshop/BetaFeedbackForm.tsx` for deletion after replacement
- new focused components under `src/components/support/`
- `src/app/workshop/feedback/page.tsx` host composition only
- `src/components/workshop/WorkshopSettingsModalContentView.tsx`
- existing Dialog/Modal/Sheet, Button, ControlTextarea, FileUpload, toast, badge,
  and EmptyState modules only for focused reuse/fixes

Coordinate with UNIT-005: one writer owns the shared Support Center coordinator.

## Implementation boundary

1. Build one `New request` client island with message, optional screenshot, and
   `Included details` disclosure. No subject/type/severity/manual UUID inputs.
2. Support file picker, paste, and drop through one normalized selection path.
3. Create/revoke object URLs correctly; preview and Remove before send.
4. Keep the one stable `clientMessageId` across retry until success/cancel.
5. Use the UNIT-003 multipart route and user-safe error codes.
6. On success, clear only the accepted local draft and open the returned
   canonical conversation/reference.
7. Replace the footer trigger label/accessible name with Support and host the
   responsive Support Center surface using existing overlay primitives.
8. Retitle `/workshop/feedback` and settings entry to Support while preserving
   the route. Render only the new Support composition.
9. Remove user-facing beta feedback action imports and form rendering in this
   slice. Legacy repository/review code remains until UNIT-007.
10. Keep user support plain-text and lazy-open. Do not import Tiptap or add a
    runtime dependency.

## Acceptance evidence

- UI/source contains no user Type, Severity, Subject, or Project UUID control.
- One message is the only required input; one screenshot is optional.
- Details disclosure distinguishes required from removable diagnostics.
- Pick/paste/drop all share validation; preview URL cleanup is explicit.
- Global and full-page entry call only the canonical support mutation.
- Old feedback copy and write action are absent from authenticated user paths.
- Execute and retain the UNIT-004 static-QA receipt from `00-PLAN.md` section 20.
- TEST_PROPOSAL only: rendered wide/narrow, keyboard, paste/drop/remove, send and
  failure-state browser scenarios.

## Recovery and stop condition

Because user write paths cut over here, do not leave both old and new forms
active. If recovery is required before release, restore the old UI and route
contract together. Stop when AC-003 and the composer portion of AC-006/009 are
source-complete with no duplicate user intake.
