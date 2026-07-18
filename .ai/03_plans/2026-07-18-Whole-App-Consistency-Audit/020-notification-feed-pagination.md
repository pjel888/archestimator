# Unit 020 — Notification Feed Optimistic Update Skips Paginated Cursors (MEDIUM)

**Finding:** F-20 · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** M · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

`markNotificationRead` / `dismiss` / `acknowledge` patch only
`notificationQueryKeys.feed(null)` (the first page, cursor `null`). The feed query
key is `["notifications","feed", cursor ?? null]`, so only the first page is
updated optimistically. If the user paginates and a notification from a later page
is acted on elsewhere, later pages never get the decrement and the unread count
drifts. There is no feed-family `invalidateQueries` with an active refetch (the
toplevel `invalidateNotificationQueries` uses `refetchType: "none"`).

## Evidence

`src/features/notifications/hooks/useNotificationsQuery.ts`:
```ts
// 59: toplevel invalidate is passive
void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all, refetchType: "none" });
// 97: per-cursor key
queryKey: notificationQueryKeys.feed(input.cursor),
// 135, 161, 188: only the null-cursor page patched
queryClient.setQueryData<NotificationFeedResult>(notificationQueryKeys.feed(null), (current) => ...)
```

## Fix Direction

Either:

1. Iterate over all known feed cursors via `queryClient.getQueriesData` and patch
   each page that contains the notification, or
2. Invalidate the whole feed family with an active refetch for the read/dismiss
   mutations (drop `refetchType: "none"` for the feed portion), accepting a refetch
   in exchange for correctness.

Option 1 preserves the optimistic UX; option 2 is simpler. Prefer option 1 for the
common single-notification read (keeps it instant), with option 2 as a fallback
after bulk operations.

### Owned paths
- `src/features/notifications/hooks/useNotificationsQuery.ts`

### Prohibited
- Do not change the `notificationQueryKeys` factory shape (other consumers depend
  on it).

## Acceptance Evidence

- `AC-001`: reading/dismissing a notification that appears on a paginated
  (non-null cursor) page updates that page's cache (and the unread count) without a
  full reload.

## Recovery

If option 1 proves brittle, fall back to option 2 (active refetch).
