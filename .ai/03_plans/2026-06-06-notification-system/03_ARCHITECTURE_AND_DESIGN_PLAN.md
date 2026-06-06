# Architecture And Design Plan

## RALPLAN-DR Summary

### Principles

1. Durable state before realtime delivery.
2. User-specific authorization is the hard boundary.
3. Reuse existing app primitives before adding UI surface area.
4. Notification fetches must not block core estimating workflows.
5. Release announcements are content, not custom client deploys.

### Decision Drivers

1. Closed-beta security and RLS correctness.
2. Low-risk integration with workshop shell and existing shared-link/collaboration flows.
3. Performance bounded by small queries, async loading, and optional Realtime.

### Viable Options

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| A. Durable database deliveries + modal/center + optional private Broadcast | Secure, replayable, testable, supports release modals and future notifications | More schema/actions/tests | Chosen |
| B. Static release JSON/version gate only | Fastest for release modal | Cannot support user-specific notifications or cross-device acknowledgement | Rejected |
| C. Pure Realtime ephemeral notifications | Live updates feel instant | Missed offline events, weaker auditability, higher auth/channel fragility | Rejected |
| D. Extend shared-link activity feed | Reuses existing activity model | Wrong domain boundary; risks publication/private data coupling | Rejected |

## ADR

### Decision

Implement Option A: a durable user notification subsystem with notification definitions, per-user delivery rows, release modal eligibility, notification center UI, server-authoritative actions, and optional private Supabase Broadcast refresh.

### Drivers

- Release modals must appear once per user and survive refresh/session changes.
- Future notification types need targeted delivery, not app-wide static flags.
- Closed-beta tenant/user isolation must remain provable by RLS.

### Alternatives Considered

- Static local/version-only flags: rejected because they cannot support user targeting or cross-device acknowledgement.
- Toast-only implementation: rejected because toasts are transient and already capped at four visible items.
- Pure Realtime: rejected because offline users would miss notifications and Realtime RLS adds avoidable fragility if used as the primary source.
- Shared-link event reuse: rejected because publication activity has a different audience model and data privacy boundary.

### Why Chosen

The durable model mirrors existing shared-link event discipline: additive database objects, indexes, RLS, strict grants, no-store or query invalidation for fresh user state, and optional Realtime after persisted state exists.

### Consequences

- A migration and generated Supabase types are required.
- The app provider tree gains a small notification provider/query boundary.
- Workshop shell gains a notification center trigger.
- Release content can be seeded/reissued without deploying custom client logic for each announcement.

### Follow-Ups

- Later admin UI can manage announcements after the system is proven.
- Later email/digest integration can consume the same delivery rows.
- Later project/workspace filters can be added if notification volume grows.

## Audience Taxonomy

| Audience | V1 Support | Delivery Mechanism |
| --- | --- | --- |
| `user` | Yes | `notification_deliveries.user_id = auth.uid()` |
| `workspace_members` | Planned via fanout | Server/admin path inserts per-user delivery rows after membership check |
| `project_members` | Planned via fanout | Server/admin path inserts per-user delivery rows after `can_access_project`/membership check |
| `estimate_members` | Planned via fanout | Server/admin path inserts per-user delivery rows after estimate access check |
| `public_share_recipient` | No | Keep shared-link activity/email paths separate |
| `all_beta_users` | Seed/admin fanout | Delivery rows for current allowed beta users only |

## Domain Model

### `public.notification_definitions`

Stores canonical notification content.

- `id uuid primary key default gen_random_uuid()`
- `kind text not null check (...)`
- `title text not null check (char_length(title) between 1 and 120)`
- `body text not null check (char_length(body) between 1 and 2000)`
- `severity text not null default 'info' check ('info','success','warning','critical')`
- `surface text not null default 'center' check ('center','modal','toast_and_center')`
- `release_version text`
- `priority integer not null default 0`
- `dedupe_key text`
- `action_label text`
- `action_href text`
- `payload_json jsonb not null default '{}'::jsonb`
- `starts_at timestamptz not null default now()`
- `expires_at timestamptz`
- `created_by uuid references public.profiles(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `public.notification_deliveries`

Stores per-user delivery/read/dismiss state.

- `id uuid primary key default gen_random_uuid()`
- `notification_id uuid not null references public.notification_definitions(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `workspace_id uuid references public.workspaces(id) on delete cascade`
- `project_id uuid references public.projects(id) on delete cascade`
- `estimate_id uuid references public.estimates(id) on delete cascade`
- `delivery_reason text not null default 'manual'`
- `delivered_at timestamptz not null default now()`
- `seen_at timestamptz`
- `read_at timestamptz`
- `dismissed_at timestamptz`
- `archived_at timestamptz`
- `modal_acknowledged_at timestamptz`
- `payload_json jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `unique(notification_id, user_id)`

### Indexes

- `notification_definitions_release_version_idx on public.notification_definitions(release_version) where release_version is not null`
- `notification_definitions_active_idx on public.notification_definitions(starts_at desc, expires_at, priority desc)`
- `notification_definitions_dedupe_key_idx on public.notification_definitions(dedupe_key) where dedupe_key is not null`
- `notification_deliveries_user_feed_idx on public.notification_deliveries(user_id, delivered_at desc)`
- `notification_deliveries_user_unread_idx on public.notification_deliveries(user_id, delivered_at desc) where read_at is null and dismissed_at is null and archived_at is null`
- `notification_deliveries_user_modal_idx on public.notification_deliveries(user_id, delivered_at desc) where modal_acknowledged_at is null and dismissed_at is null and archived_at is null`
- Optional scoped indexes on `(workspace_id, delivered_at desc)` and `(project_id, delivered_at desc)` only after query proof shows need.

## Server Boundaries

Create `src/lib/notifications/`:

- `types.ts`: TypeScript view models and constants.
- `repository.ts`: Supabase queries; server-only.
- `actions.ts`: server actions for current-user feed, mark read, dismiss, acknowledge modal.
- `release-announcements.ts`: helper for selecting eligible modal announcement.
- `authorization.ts`: small guards if scoped delivery creation is added.

Create `src/app/api/notifications/realtime/route.ts` only if Broadcast needs an authenticated refresh endpoint. Do not add routes for ordinary mark-read/dismiss if server actions are enough.

## Definition Read Path

Use authenticated RLS, not broad public reads and not browser-side service role.

- `notification_definitions` rows are selectable by authenticated users only when an own `notification_deliveries` row exists for that definition.
- The select policy shape is:

```sql
create policy "users can read definitions delivered to them"
on public.notification_definitions
for select
to authenticated
using (
  exists (
    select 1
    from public.notification_deliveries deliveries
    where deliveries.notification_id = notification_definitions.id
      and deliveries.user_id = auth.uid()
  )
);
```

- Definition writes remain service-role/admin-only.
- Server actions may query delivery + definition through the normal authenticated server Supabase client because RLS enforces the delivery relationship.
- Tests must prove User A can read a definition delivered to User A and cannot read a definition delivered only to User B.

## Client Boundaries

Create `src/features/notifications/`:

- `hooks/useNotificationsQuery.ts`: TanStack Query feed/unread/modal query wrappers.
- `components/NotificationProvider.tsx`: app-level orchestration under `AppProviders`.
- `components/ReleaseAnnouncementModal.tsx`: uses existing `Modal`.
- `components/NotificationCenter.tsx`: popover/drawer/list triggered from workshop shell.
- `components/NotificationBellButton.tsx`: compact icon button with unread badge.
- `components/NotificationListItem.tsx`: item rendering and actions.

Modify:

- `src/app/providers.tsx`: mount `NotificationProvider` inside `ToastProvider` or as a sibling under the query provider.
- `src/components/workshop/WorkshopPageShell.tsx`: add notification bell/action area if this is the canonical app shell.
- `src/lib/supabase/types.ts`: regenerate after migration.

## Data Flow

1. Notification definition exists from seed/admin/server path.
2. Delivery rows are inserted for target users by service-role or a security-definer RPC that enforces target scope.
3. Authenticated client loads feed/unread/modal eligibility after app shell mounts.
4. Provider shows the newest eligible `surface = 'modal'` release announcement.
5. User closes/acknowledges modal; server action writes `seen_at`, `modal_acknowledged_at`, and optionally `read_at`.
6. User opens center; list query loads newest deliveries and writes `seen_at` for visible rows if that state is implemented.
7. User marks read or dismisses; TanStack Query updates/invalidation keep count/list/modal state consistent.
8. Optional Realtime Broadcast sends a lightweight refresh event to `user:{userId}:notifications`; client invalidates queries and fetches canonical rows.

## Freshness Rules

- Global query defaults are too stale for unread badges. Notification hooks must set explicit stale times.
- Unread/modal queries: about 30 seconds stale time.
- Feed query: about 60 seconds stale time.
- Mutation success must update or invalidate feed, count, and modal query keys.
- Realtime events never carry full content; they invalidate and refetch canonical database rows.

## Backward Compatibility

- Existing toasts continue handling transient mutation feedback.
- Existing shared-link activity feed remains publication-specific.
- Existing collaboration Realtime topics are unchanged.
- Public `/share/[token]` surfaces do not receive notification provider UI.

## Anti-Overengineering Rules

- Start with two tables and server actions.
- No admin CRUD UI in V1 unless owner explicitly expands scope.
- No Zustand store unless TanStack Query cannot cover the feed/modal/count state.
- No Realtime until durable delivery, RLS tests, and non-Realtime fetch behavior pass.
- No new dependency for dialog, popover, or notification state.
