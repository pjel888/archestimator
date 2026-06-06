# Frontend Component And Shell Integration Specialist Plan

## Goal

Add notification UI to authenticated product surfaces while preserving public share pages, existing toasts, route loading, and dense workshop layout.

## Files

- Create: `src/features/notifications/components/NotificationProvider.tsx`
- Create: `src/features/notifications/components/ReleaseAnnouncementModal.tsx`
- Create: `src/features/notifications/components/NotificationBellButton.tsx`
- Create: `src/features/notifications/components/NotificationCenter.tsx`
- Create: `src/features/notifications/components/NotificationListItem.tsx`
- Modify: `src/app/providers.tsx`
- Modify: `src/components/workshop/WorkshopPageShell.tsx` only if its `actions` slot cannot host the bell cleanly
- Prefer using existing `actions` prop into `src/components/workshop/WorkshopTitleHeader.tsx`
- Test: `tests/vitest/notification-provider.test.tsx`
- Test: `tests/vitest/workshop-notification-entry.test.tsx`
- Test: `tests/vitest/release-announcement-modal.test.tsx`
- Test: `tests/vitest/notification-center.test.tsx`

## Current Integration Evidence

- `src/app/providers.tsx` creates the `QueryClient` and wraps `ToastProvider` around app children.
- `src/components/workshop/WorkshopPageShell.tsx` fetches current user context and passes `actions` to `WorkshopTitleHeader`.
- `src/components/workshop/WorkshopTitleHeader.tsx` renders `actions` in a stable right-side flex container.
- `src/components/ui/modal.tsx` provides portal, `role="dialog"`, `aria-modal`, Escape close, and backdrop close.
- `src/components/ui/toast.tsx` owns transient bottom notifications and caps visible toasts at four.

## Provider Placement

Mount `NotificationProvider` under `QueryClientProvider`. Preferred shape:

```tsx
<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <NotificationProvider>
      <BfcacheHandler />
      <PerformanceMonitor />
      <NavigationListener />
      {children}
      <RouteLoadingOverlay />
    </NotificationProvider>
  </ToastProvider>
</QueryClientProvider>
```

If this placement causes public-route UI leakage, keep provider mounted globally but make it render no UI unless `usePathname()` starts with `/workshop`. The provider must never show a bell or modal on `/share/[token]`, `/login`, `/auth/callback`, `/invite/[token]`, landing routes, or API routes.

## Workshop Bell Placement

Preferred approach:

1. Create a client component `WorkshopNotificationEntry`.
2. Render it through the existing `actions` slot on workshop pages when possible.
3. If many pages already supply actions, compose notification bell after existing actions without changing action ownership.
4. Do not create a floating widget.
5. Do not place cards inside cards.

Acceptance:

- Header height remains `h-14`.
- Bell button has stable dimensions.
- Badge count does not shift title/header layout.
- Existing `Send beta feedback` footer and `AskFlip` footer assistant remain unchanged.

## Release Modal

`ReleaseAnnouncementModal` must:

- Use `Modal`.
- Render plain text title/body.
- Show release version as an 8-9px neutral chip.
- Render action button only for allowed internal `actionHref`.
- Close through Escape, backdrop, close button, and optional primary acknowledgement.
- Call `acknowledgeReleaseAnnouncementAction` once per delivery id.
- Stay closed locally after the user closes it, even if the action fails, then show retry/status in the center.

## Notification Center

`NotificationCenter` must:

- Open from `NotificationBellButton`.
- Support loading, empty, error/retry, feed, read/unread, mark-read, dismiss, and load-older states.
- Render rows, not large cards.
- Keep max height bounded and scroll internally.
- Hide dismissed and archived rows from default list.
- Use a polite live region only for meaningful state changes.

## Tests

Required assertions:

- Provider renders children even when notification queries fail.
- Provider skips public share route.
- Release modal appears when `releaseModal` query returns a delivery.
- Release modal does not appear when query returns null.
- Bell accessible label includes unread count.
- Center opens/closes by keyboard and pointer.
- Existing `tests/vitest/toast.test.tsx` still passes.
- Existing `tests/vitest/ui-modal-tooltip.test.tsx` still passes.

## Stop Gates

- Stop if mounting provider blocks shell render or route loading.
- Stop if notification UI appears on public share or signed-out routes.
- Stop if shared modal primitive must change and modal regression tests are not updated.
