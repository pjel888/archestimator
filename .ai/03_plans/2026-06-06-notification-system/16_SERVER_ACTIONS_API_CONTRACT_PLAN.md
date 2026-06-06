# Server Actions And API Contract Specialist Plan

## Goal

Define the server-only notification domain so the browser never supplies authority and private notification data is never statically cached.

## Files

- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/repository.ts`
- Create: `src/lib/notifications/actions.ts`
- Create: `src/lib/notifications/release-announcements.ts`
- Optional create: `src/app/api/notifications/realtime/route.ts`
- Test: `tests/vitest/notifications-actions.test.ts`

## Type Contracts

`src/lib/notifications/types.ts` must export:

- `NOTIFICATION_KINDS`
- `NOTIFICATION_SEVERITIES`
- `NOTIFICATION_SURFACES`
- `NotificationKind`
- `NotificationSeverity`
- `NotificationSurface`
- `NotificationDeliveryView`
- `NotificationFeedResult`
- `ReleaseAnnouncementView`
- `NotificationActionResult`

Required view fields:

```ts
type NotificationDeliveryView = {
  id: string;
  notificationId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  severity: NotificationSeverity;
  surface: NotificationSurface;
  releaseVersion: string | null;
  actionLabel: string | null;
  actionHref: string | null;
  deliveredAt: string;
  seenAt: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  modalAcknowledgedAt: string | null;
};
```

No raw `payload_json` is returned to client components in V1 unless a typed, redacted field is added and tested.

## Repository Functions

`src/lib/notifications/repository.ts` must be server-only and expose:

- `listCurrentUserNotifications(supabase, userId, input)`
- `countCurrentUserUnreadNotifications(supabase, userId)`
- `getCurrentUserReleaseAnnouncement(supabase, userId)`
- `markCurrentUserNotificationRead(supabase, userId, deliveryId)`
- `dismissCurrentUserNotification(supabase, userId, deliveryId)`
- `acknowledgeCurrentUserReleaseModal(supabase, userId, deliveryId)`

Read functions use the authenticated server Supabase client from `src/lib/supabase/server.ts` so table RLS remains part of the normal read path. State mutation functions use the existing `src/lib/supabase/service-role.ts` helper from server-only code after `requireCurrentUserContext()` succeeds. Mutation queries must include both `eq("id", deliveryId)` and `eq("user_id", currentUser.id)` and must update only state columns.

Required query behavior:

- Feed filters by `deliveries.user_id = userId`, excludes `dismissed_at` and `archived_at`, orders `delivered_at desc`, defaults limit 20, hard caps limit 50.
- Unread count filters `read_at is null`, `dismissed_at is null`, and `archived_at is null`.
- Release modal filters `surface = 'modal'`, active time window, `modal_acknowledged_at is null`, `dismissed_at is null`, `archived_at is null`, orders by `priority desc, delivered_at desc`, limits 1.
- State mutations filter by both `deliveryId` and `userId`.
- State mutations do not depend on browser table grants; authenticated clients have no direct notification table write permission in V1.

## Server Actions

`src/lib/notifications/actions.ts` must call `requireCurrentUserContext()` at the start of every exported action and must not accept a browser-provided user id.

Required actions:

- `loadCurrentUserNotifications(input?: { limit?: number; cursor?: string | null })`
- `loadCurrentUserUnreadNotificationCount()`
- `loadCurrentUserReleaseAnnouncement()`
- `markNotificationReadAction(deliveryId: string)`
- `dismissNotificationAction(deliveryId: string)`
- `acknowledgeReleaseAnnouncementAction(deliveryId: string)`

Safe error result shape:

```ts
type NotificationActionResult =
  | { ok: true }
  | { ok: false; code: "unauthenticated" | "not_found" | "invalid_input" | "unavailable" };
```

Server actions may throw redirect through `requireCurrentUserContext()` for unauthenticated page contexts, but tests must assert client-facing mutation wrappers handle unauthenticated/unavailable failures without breaking the workshop shell.

## Mutation Authority Contract

V1 uses a single authority path:

1. Browser calls a server action with only a delivery id.
2. Server action calls `requireCurrentUserContext()`.
3. Server action builds a server-only service-role client through `src/lib/supabase/service-role.ts`.
4. Repository mutation updates the delivery row with both `id = deliveryId` and `user_id = currentUser.id`.
5. If no row is affected, return `{ ok: false, code: "not_found" }` without revealing whether the delivery exists for another user.

Do not add direct browser/client Supabase writes to notification tables in V1.

## Link Validation

Action links must be either null or an internal relative path beginning with `/workshop`, `/workshop/projects`, `/workshop/settings`, or another explicitly approved app path. Reject:

- `http://`
- `https://`
- protocol-relative URLs
- `javascript:`
- raw `/share/<token>` links
- invite token paths
- URLs containing unredacted recipient or provider tokens

Database seed/admin paths must also satisfy the V1 `action_href` check from `15_DATABASE_SCHEMA_RLS_PLAN.md`; server validation is not the only safety layer.

## Optional Route Handler

Only add `src/app/api/notifications/realtime/route.ts` if a Broadcast send endpoint is needed. If added:

- Export `dynamic = "force-dynamic"` or return `Cache-Control: no-store`.
- Use `requireCurrentUserContext()`.
- Return only `{ ok: true }` or safe error codes.
- Never return notification body/payload through the realtime endpoint.

## Tests

`tests/vitest/notifications-actions.test.ts` must assert:

- Each action invokes `requireCurrentUserContext`.
- Browser-supplied user id is not part of any public action input.
- Feed limit clamps at 50.
- Repository mutations include both delivery id and current user id.
- Mutation tests prove `createSupabaseServiceRoleClient` is called only after `requireCurrentUserContext`.
- Acknowledge writes `seen_at`, `read_at`, and `modal_acknowledged_at` for release announcements.
- Invalid action links are rejected.
- Static schema tests prove seed/admin inserts cannot bypass the internal-only `action_href` constraint.
- Safe error codes do not leak whether another user's delivery id exists.

## Stop Gates

- Stop before UI if server actions do not prove current-user scoping.
- Stop before Realtime if actions return full notification payloads to a refresh endpoint.
- Stop and create a bug plan if action tests cannot distinguish unavailable from cross-user denied without leakage.
