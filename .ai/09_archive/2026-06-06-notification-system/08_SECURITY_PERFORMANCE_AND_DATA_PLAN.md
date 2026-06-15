# Security, Performance, And Data Plan

Refinement status: `REFINED_READY_FOR_IMPLEMENTATION`. Detailed schema/RLS instructions live in `15_DATABASE_SCHEMA_RLS_PLAN.md`; provider and migration evidence gates live in `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`.

## Supabase Project

Project ref: `ebxxqidacheyapmmzavr`.

Planning and implementation must not mutate unrelated provider projects. Keep closed-beta cost posture: do not enable Supabase PITR or paid features without explicit owner approval. Use migrations and branch-safe/local verification before linked apply.

## Auth And Authorization

- Server actions must call `requireCurrentUserContext()` or the current equivalent before any notification read/write.
- Browser-provided user ids are ignored.
- Delivery rows are always scoped to `auth.uid()`.
- Definition creation is service-role/admin-only.
- V1 state mutations are server-action-authoritative: authenticated clients receive `select` only and no direct table `insert`, `update`, or `delete` grants on notification tables.
- Server-side state mutations use the existing service-role helper only after current-user authentication and must filter by both delivery id and current user id.
- Scoped notification delivery for workspace/project/estimate must check current membership before creating rows.
- Public share recipients do not receive authenticated in-app notifications unless they become signed-in users.

## RLS Policies

Minimum policies:

- `notification_definitions_select_delivered`: authenticated users can select only definitions that have an own delivery row.
- `notification_deliveries_select_own`: `auth.uid() = user_id`
- No authenticated update policy in V1. Direct authenticated writes are denied; server actions perform scoped service-role updates after current-user authentication.
- No authenticated insert/delete on delivery rows.
- No authenticated insert/update/delete on definitions.
- Service-role policies or grants for maintenance/seed creation.

Avoid views that bypass RLS. If a view becomes necessary, use `security_invoker = true` and test it explicitly.

## Definition Read Path

Definitions are not public. They are read through authenticated RLS scoped by delivery:

```sql
exists (
  select 1
  from public.notification_deliveries deliveries
  where deliveries.notification_id = notification_definitions.id
    and deliveries.user_id = auth.uid()
)
```

This lets normal authenticated server actions join deliveries to definitions without service-role reads while preventing User A from reading definitions only delivered to User B.

## Security Definer Rules

If RPCs are used:

- Set `security definer`.
- Set `search_path = public`.
- Keep functions out of exposed schemas when possible; if exposed, grants must be narrow.
- Validate all ids and scoped access inside the function.
- Return generic errors that do not reveal other users' notification ids.

## Payload Privacy

Allowed payload examples:

- `{ "schemaVersion": 1, "releaseVersion": "0.1.0", "section": "publication" }`
- `{ "schemaVersion": 1, "projectId": "<uuid>", "eventType": "shared_link_open" }`

Forbidden payload:

- raw share URLs
- recipient tokens or token hashes
- OAuth tokens
- cookies
- API keys
- webhook secrets
- raw provider payloads
- unredacted email bodies

## Input Validation

- Title/body/action label length checks in database and server code.
- `kind`, `severity`, `surface`, `audience`, and `delivery_reason` constrained by enums/checks.
- `action_href` must be internal relative path or null. V1 database check allows only `/workshop` paths and rejects protocol, protocol-relative, whitespace, encoded-slash/backslash, `javascript:`, `/share`, and external URLs.
- JSON payload must be object-shaped, not array/string.

## Caching

- Notification feed and modal eligibility should be user-private and should not be statically cached.
- Route handlers, if added, return `Cache-Control: no-store`.
- TanStack Query stale times:
  - unread count/modal: about 30 seconds
  - feed: about 60 seconds
- Mutations should update/invalidate local query state immediately.

## Query Performance

Initial queries:

- Feed: `where user_id = auth.uid() and dismissed_at is null and archived_at is null order by delivered_at desc limit 20`
- Unread count: `where user_id = auth.uid() and read_at is null and dismissed_at is null and archived_at is null`
- Modal: join delivery with definition where `surface = 'modal'`, active date window, `modal_acknowledged_at is null`, `dismissed_at is null`, `archived_at is null`, order by priority/delivered date, limit 1.

Indexes must support those filters. Run EXPLAIN on representative data before PR if database access is available.

## Realtime Performance

Realtime is optional. If enabled:

- One private channel per signed-in user tab: `user:{userId}:notifications`.
- Broadcast payload contains only `{ type: "notifications.refresh", sentAt }` or a delivery id safe for that user.
- Client fetches canonical database state after Broadcast.
- Channel cleanup is mandatory.
- RLS policy must not join large tables.

Official Supabase default limits documented during planning: Pro defaults include 500 concurrent connections, 500 messages/s, 500 joins/s, and 100 channels per connection. This feature should stay far below that in closed beta.

## Failure Modes

- Notification query fails: show center error state; no app-blocking toast unless user opened center.
- Modal acknowledge fails: keep modal closed locally for the current session, show unobtrusive retry affordance in center, and retry mutation on next open if practical.
- Realtime fails: polling/query refresh remains canonical.
- Migration apply fails: revert before linked apply or create forward repair migration after linked apply.

## Observability

V1 can avoid custom analytics. If instrumentation is added, record only event names/counts without notification body or sensitive payload.

Recommended future metrics:

- notification feed load success/failure
- modal shown/acknowledged
- mark-read/dismiss success/failure
- realtime refresh received

## Performance Budget

- Notification provider should not add more than one small initial query batch after shell mount.
- No notification list item should render heavy charts, images, or publication snapshots.
- Notification center list page size defaults to 20 and hard-caps at 50.

## Security And Performance Stop Gates

- Do not proceed past schema work if User A can read or update User B notification rows in any RLS test or manual probe.
- Do not proceed past schema work if the authenticated role can directly insert/update/delete notification rows.
- Do not proceed past server actions if any action trusts browser-provided `userId`, accepts external action URLs, omits the delivery-id plus current-user mutation filter, or returns other-user existence details.
- Do not proceed past provider integration if notification fetches block shell render, repeatedly refetch without user action, or appear on signed-out/public share surfaces.
- Do not proceed with Realtime if topic authorization cannot be expressed as a simple user-owned private topic.
- Do not record notification body, raw payload, tokens, cookies, provider payloads, or secrets in logs, `.ai`, screenshots, or test artifacts.
