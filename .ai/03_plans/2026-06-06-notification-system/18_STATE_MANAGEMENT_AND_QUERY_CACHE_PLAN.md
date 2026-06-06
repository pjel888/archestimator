# State Management And Query Cache Specialist Plan

## Goal

Keep notification state durable in Supabase and lightweight in the browser. TanStack Query is the only V1 client state owner unless implementation evidence proves it cannot support the feed/count/modal split.

## Files

- Create: `src/features/notifications/hooks/useNotificationsQuery.ts`
- Optional create: `src/features/notifications/hooks/useNotificationRealtime.ts`
- Test: `tests/vitest/notifications-query.test.tsx`
- Test if Realtime ships: `tests/vitest/notification-realtime.test.ts`

## Query Keys

Use stable keys:

```ts
export const notificationQueryKeys = {
  all: ["notifications"] as const,
  feed: (cursor?: string | null) => ["notifications", "feed", cursor ?? null] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
  releaseModal: () => ["notifications", "release-modal"] as const,
};
```

## Stale Times

Override global query defaults from `src/app/providers.tsx`:

- Unread count: 30 seconds.
- Release modal: 30 seconds.
- Feed: 60 seconds.
- Mutation retry: 0.
- Query retry: at most 1.

Do not rely on the global five-minute `staleTime` for notification badge/modal state.

## Mutations

Required mutation hooks:

- `useMarkNotificationReadMutation`
- `useDismissNotificationMutation`
- `useAcknowledgeReleaseAnnouncementMutation`

Mutation success must update or invalidate all dependent keys:

- Feed.
- Unread count.
- Release modal.

Preferred behavior:

- For mark-read: optimistically set `readAt` on the item and decrement count only if the item was unread.
- For dismiss: optimistically hide the item and decrement count only if unread.
- For release acknowledge: remove modal query result and set item read if present in feed.
- On mutation error: keep user-facing state stable and expose an unobtrusive retry state in the center.

## Realtime Optional Path

Only implement after non-Realtime queries pass.

`useNotificationRealtime` must:

- Subscribe to `user:{userId}:notifications`.
- Use `{ config: { private: true } }`.
- Listen for a single event name: `notifications.refresh`.
- Invalidate notification query keys.
- Fetch canonical data through queries/actions.
- Remove the channel on cleanup.
- Treat subscription errors as non-blocking.

Broadcast payload shape:

```ts
type NotificationRefreshPayload = {
  type: "notifications.refresh";
  sentAt: string;
};
```

No notification title, body, raw payload, token, or provider data belongs in Broadcast payloads.

## Tests

`tests/vitest/notifications-query.test.tsx` must prove:

- Query keys are stable and match the plan.
- Stale times are lower than global defaults.
- Mutations call the server actions.
- Mutation success updates or invalidates feed/count/modal.
- Mutation failure keeps previous UI data.
- No Zustand store is imported by notification hooks.

If Realtime ships, `tests/vitest/notification-realtime.test.ts` must prove:

- Channel topic equals `user:${userId}:notifications`.
- Channel config is private.
- Cleanup calls `removeChannel`.
- Broadcast event invalidates query keys.
- Subscription error does not throw into the shell.

## Stop Gates

- Stop before PR if unread badge can remain stale for five minutes after mark-read/dismiss.
- Stop if Realtime is needed for correctness rather than acceleration.
- Stop if notification state is duplicated in both TanStack Query and Zustand without a documented reason.
