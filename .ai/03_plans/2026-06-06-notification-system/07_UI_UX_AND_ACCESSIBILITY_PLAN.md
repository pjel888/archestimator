# UI, UX, And Accessibility Plan

## Product Tone

Notifications should feel like quiet workshop instrumentation, not a marketing layer. Use dense, crisp, neutral product UI aligned with `DESIGN.md`: SF Pro, 8-12px type, zero letter spacing, `rounded-xs`, hairline borders, white/surface-muted backgrounds, and restrained status color.

## Channel Split

| Channel | Job | Persistence | Component |
| --- | --- | --- | --- |
| Release announcement modal | Tell the user about a version/release update that deserves attention | Persistent acknowledgement state | `ReleaseAnnouncementModal` using existing `Modal` |
| Notification center | Durable user inbox, unread count, read/dismiss actions | Persistent delivery state | `NotificationCenter` and `NotificationBellButton` |
| Toast | Transient operation feedback | No durable state | Existing `ToastProvider` only |

## Primary User Journeys

### Release Announcement Modal

1. User signs in and enters `/workshop`.
2. Shell appears normally.
3. Notification provider fetches modal eligibility.
4. If eligible, one release modal opens.
5. User reads announcement, optionally follows an internal action, or closes.
6. Acknowledge action persists state.
7. Modal does not reappear for that user and release.

### Notification Center

1. User sees compact bell in workshop header/action area.
2. Unread badge shows a count such as `3`; counts above 9 can render `9+`.
3. User opens center.
4. Center shows newest notifications first, with unread emphasis.
5. User marks read, dismisses, retries after error, or loads older items.
6. Badge updates without shifting header layout.

## Component Guidance

### `ReleaseAnnouncementModal`

- Use existing `Modal`.
- Max width should remain compact, likely `max-w-md` unless content proves too dense.
- Header title should be 11-12px medium.
- Release/version chip should be 8-9px and secondary.
- Body should be 10px, readable, wrapping.
- Primary action is a button only when `action_href` is an allowed internal path.
- Secondary action is icon/close or small text button depending on existing modal pattern.

### `NotificationBellButton`

- Use icon button with accessible label: `Notifications, 3 unread`.
- Badge should be a small stable-size dot/count, not layout-shifting text.
- Button belongs in existing shell toolbar, not a new floating widget.

### `NotificationCenter`

- Use a popover/drawer-style surface if a local primitive exists; otherwise a small fixed/absolute panel with predictable max height.
- Do not place cards inside cards.
- Items are repeated rows, not large cards.
- Empty state text: `No notifications`.
- Error state text: `Notifications could not load.` with a compact retry button.
- Loading state uses skeleton rows or simple `Loading notifications...` status text.

## Content Rules

- Release title length: 1-120 characters.
- Body length: 1-2000 characters.
- Action label length: 1-40 characters.
- No raw HTML from database.
- No markdown rendering in V1 unless a sanitized renderer already exists.
- Use plain language: `New release`, `Version 0.1.0`, `View updates`, `Dismiss`.

## Accessibility Requirements

- Release modal:
  - `role="dialog"`
  - `aria-modal="true"`
  - accessible title and optional description
  - Escape close
  - close button with label
  - focus return after close
  - no background interaction while open

- Notification center:
  - trigger is a button
  - panel has accessible label
  - unread count is announced through trigger label
  - list items are keyboard reachable if they contain actions
  - retry/read/dismiss controls have labels
  - live region is polite and only announces meaningful state changes

## Responsive Requirements

- 320px mobile width: modal and center fit within viewport with 12-16px margins.
- Desktop: center does not span large content width; keep scanning tight.
- Long words/URLs must break; action hrefs should not display raw.
- Fixed dimensions for badge/button prevent layout shift as count changes.

## Interaction Priority

1. Critical/security notification if future `severity = critical`.
2. Release modal if eligible.
3. Notification center unread badge.
4. Toasts for transient success/error operations.

Only one modal should be visible at a time. If another app modal is already open, release modal waits until the next safe provider tick or route entry.

## Design-System Checks

- Run `bun run lint:design-system`.
- Inspect generated class names for oversized type, negative letter spacing, large rounded cards, gradient/orb decoration, and one-hue palette drift.
- Verify notification UI does not occlude route loading overlay or existing modal z-index layers.
