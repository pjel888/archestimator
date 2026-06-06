# Database Schema And RLS Specialist Plan

## Goal

Create the durable notification persistence layer without broadening any existing Supabase or provider setting. The implementation must be additive, RLS-first, and reversible through forward migrations.

## Files

- Create: `supabase/migrations/<timestamp>_notification_system.sql`
- Modify after verified migration: `src/lib/supabase/types.ts`
- Test: `tests/vitest/notification-schema.test.ts`
- Test when harness exists: `tests/integration/rls-notifications.test.ts`

## Tables

### `public.notification_definitions`

Required columns:

- `id uuid primary key default gen_random_uuid()`
- `kind text not null check (kind in ('release_announcement','system_notice','collaboration','publication_activity','beta_feedback','security_notice'))`
- `title text not null check (char_length(title) between 1 and 120)`
- `body text not null check (char_length(body) between 1 and 2000)`
- `severity text not null default 'info' check (severity in ('info','success','warning','critical'))`
- `surface text not null default 'center' check (surface in ('center','modal','toast_and_center'))`
- `release_version text`
- `priority integer not null default 0`
- `dedupe_key text`
- `action_label text check (action_label is null or char_length(action_label) between 1 and 40)`
- `action_href text check (action_href is null or (action_href ~ '^/workshop(/|$|\\?)' and action_href !~* '(^//|[[:space:]]|javascript:|https?:|%2f|%5c)'))`
- `payload_json jsonb not null default '{}'::jsonb check (jsonb_typeof(payload_json) = 'object')`
- `starts_at timestamptz not null default now()`
- `expires_at timestamptz`
- `created_by uuid references public.profiles(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `public.notification_deliveries`

Required columns:

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
- `payload_json jsonb not null default '{}'::jsonb check (jsonb_typeof(payload_json) = 'object')`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `constraint notification_deliveries_notification_user_unique unique(notification_id, user_id)`

## Required Indexes

- `notification_definitions_release_version_idx on public.notification_definitions(release_version) where release_version is not null`
- `notification_definitions_active_idx on public.notification_definitions(starts_at desc, expires_at, priority desc)`
- `notification_definitions_dedupe_key_idx on public.notification_definitions(dedupe_key) where dedupe_key is not null`
- `notification_deliveries_user_feed_idx on public.notification_deliveries(user_id, delivered_at desc)`
- `notification_deliveries_user_unread_idx on public.notification_deliveries(user_id, delivered_at desc) where read_at is null and dismissed_at is null and archived_at is null`
- `notification_deliveries_user_modal_idx on public.notification_deliveries(user_id, delivered_at desc) where modal_acknowledged_at is null and dismissed_at is null and archived_at is null`

Do not add workspace/project/estimate scoped indexes in V1 unless query evidence shows the generic user indexes are insufficient.

## Grants And RLS

Required migration sequence:

1. `alter table public.notification_definitions enable row level security;`
2. `alter table public.notification_deliveries enable row level security;`
3. Revoke broad table access from `public`, `anon`, and `authenticated`.
4. Grant authenticated `select` on `notification_definitions` and `notification_deliveries` only.
5. Explicitly revoke authenticated `insert`, `update`, and `delete` on both tables.
6. Grant service-role maintenance/write access for server-only state mutations, fixture seeding, release creation, and fanout.

V1 mutation authority is fixed: no direct authenticated table updates. Server actions authenticate the current user, then use `src/lib/supabase/service-role.ts` in server-only repository code with explicit `deliveryId` plus `userId` filters. Do not add direct authenticated state-column update grants or update policies unless a later owner-approved plan replaces this authority model.

Required policies:

```sql
create policy "users can read definitions delivered to them"
on public.notification_definitions
for select
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.notification_deliveries deliveries
    where deliveries.notification_id = notification_definitions.id
      and deliveries.user_id = auth.uid()
  )
);

create policy "users can read own notification deliveries"
on public.notification_deliveries
for select
to authenticated
using (auth.uid() is not null and user_id = auth.uid());
```

No authenticated update policy is allowed in V1. Browser code must never update `notification_id`, `user_id`, scope ids, payloads, or read/dismiss/acknowledge state directly.

## Fixture Rows For RLS Proof

Use deterministic test values in local/integration fixtures:

- User A: `11111111-1111-4111-8111-111111111111`
- User B: `22222222-2222-4222-8222-222222222222`
- Release definition: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
- User A delivery: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
- User B delivery: `cccccccc-cccc-4ccc-8ccc-cccccccccccc`

The RLS test must prove:

- User A can select the release definition only after User A has a delivery.
- User A cannot select a definition delivered only to User B.
- User A cannot directly update User A or User B delivery state through the authenticated role.
- Anonymous cannot read either table.

Actual database-backed RLS proof is mandatory before UI work or PR. Static SQL tests are not enough to claim implementation readiness. If local Supabase is unavailable, use a branch-safe/preview database. If neither exists, stop and record a blocker or explicit owner-accepted proof gap before proceeding.

## Static Schema Test Assertions

`tests/vitest/notification-schema.test.ts` must read the migration and assert:

- Both table names exist.
- RLS is enabled for both tables.
- Broad revokes exist.
- Authenticated insert/delete is not granted for either table.
- Definition select policy uses `exists` against `notification_deliveries`.
- Delivery select policy checks `auth.uid() is not null` and `user_id = auth.uid()`.
- Authenticated role is not granted `insert`, `update`, or `delete` on either notification table.
- No notification delivery update policy exists in the V1 migration.
- `action_href` check constrains values to safe internal `/workshop` paths.
- Unique delivery constraint exists.
- All required indexes exist.
- Forbidden strings such as `grant all on table public.notification_definitions to authenticated` are absent.

## Stop Gates

- Stop before UI work if schema tests cannot prove RLS and grant shape.
- Stop before UI work if actual RLS behavior proof cannot run locally or against a branch-safe database and the owner has not accepted a named proof gap.
- Stop before linked apply if local or branch-safe migration/typegen cannot run and the owner has not accepted a narrower database proof.
- Stop and create `.ai/15_Bugs/<date>-notification-system-rls-blocker.md` if cross-user denial cannot be proven.
