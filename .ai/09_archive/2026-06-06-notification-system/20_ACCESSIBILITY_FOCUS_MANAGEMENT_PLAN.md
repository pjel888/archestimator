# Accessibility And Focus Management Specialist Plan

## Goal

Make release modals and the notification center keyboard-safe, screen-reader understandable, and stable at small viewport widths.

## Files

- Modify only if needed: `src/components/ui/modal.tsx`
- Create: `src/features/notifications/components/ReleaseAnnouncementModal.tsx`
- Create: `src/features/notifications/components/NotificationBellButton.tsx`
- Create: `src/features/notifications/components/NotificationCenter.tsx`
- Test: `tests/vitest/release-announcement-modal.test.tsx`
- Test: `tests/vitest/notification-center.test.tsx`
- Existing regression: `tests/vitest/ui-modal-tooltip.test.tsx`

## Release Modal Requirements

Required behavior:

- `role="dialog"`
- `aria-modal="true"`
- Accessible title tied to visible title.
- Optional description tied to visible summary/body when practical.
- Escape closes.
- Close button has a label.
- Focus moves to a meaningful element when the modal opens.
- Focus returns to the previous active element or notification bell after close.
- Background content is not keyboard-actionable while modal is open.
- Body content wraps at 320px width.

The current shared `Modal` does not visibly implement focus trap or focus return. Future implementation must test current behavior first. If it fails, add the smallest shared primitive enhancement and rerun existing modal tests.

## Notification Center Requirements

Required behavior:

- Bell is a `button`.
- Bell label includes count: `Notifications, 3 unread`.
- `9+` visual badge still exposes exact or capped accessible count.
- Center panel has an accessible label such as `Notifications`.
- Escape closes center.
- Focus returns to bell after close.
- Read/dismiss/retry controls are keyboard reachable and labelled.
- List items with no actions do not create unnecessary tab stops.
- Polite live region announces only meaningful updates: new count, load older, error resolved.

## Mobile And Layout Fit

At 320px width:

- Modal fits with viewport margins.
- Center does not overflow horizontally.
- Long words break with `break-words` or equivalent.
- Badge/button dimensions remain stable.
- No text overlaps header title, breadcrumbs, footer, route overlay, or existing modal.

## Tests

`tests/vitest/release-announcement-modal.test.tsx` must assert:

- Accessible dialog name.
- Close button label.
- Escape closes.
- Acknowledge called once.
- Focus return after close.
- Long body uses wrapping class or renders inside a constrained container.

`tests/vitest/notification-center.test.tsx` must assert:

- Bell label includes unread count.
- Keyboard opens and closes the center.
- Focus returns after close.
- Retry/read/dismiss buttons have names.
- Error state uses `role="alert"` or a visible status pattern that does not spam polling refreshes.

Manual QA:

- Keyboard-only flow on desktop.
- 320px viewport fit.
- Screen reader spot check when available.

## Stop Gates

- Stop if focus return cannot be proven.
- Stop if notification center cannot be operated by keyboard.
- Stop if modal/center text overlaps at 320px width.
