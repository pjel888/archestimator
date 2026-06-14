-- Notification System
-- Additive durable notification definitions plus per-user delivery state.

create table if not exists public.notification_definitions (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    constraint notification_definitions_kind_check
    check (kind in ('release_announcement', 'system_notice', 'collaboration', 'publication_activity', 'beta_feedback', 'security_notice')),
  title text not null
    constraint notification_definitions_title_check
    check (char_length(title) between 1 and 120),
  body text not null
    constraint notification_definitions_body_check
    check (char_length(body) between 1 and 2000),
  severity text not null default 'info'
    constraint notification_definitions_severity_check
    check (severity in ('info', 'success', 'warning', 'critical')),
  surface text not null default 'center'
    constraint notification_definitions_surface_check
    check (surface in ('center', 'modal', 'toast_and_center')),
  release_version text,
  priority integer not null default 0,
  dedupe_key text,
  action_label text
    constraint notification_definitions_action_label_check
    check (action_label is null or char_length(action_label) between 1 and 40),
  action_href text
    constraint notification_definitions_action_href_check
    check (
      action_href is null
      or (
        action_href ~ '^/workshop(/|$|\\?)'
        and action_href !~* '(^//|[[:space:]]|javascript:|https?:|%2f|%5c)'
      )
    ),
  payload_json jsonb not null default '{}'::jsonb
    constraint notification_definitions_payload_json_check
    check (jsonb_typeof(payload_json) = 'object'),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notification_definitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete cascade,
  delivery_reason text not null default 'manual',
  delivered_at timestamptz not null default now(),
  seen_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  archived_at timestamptz,
  modal_acknowledged_at timestamptz,
  payload_json jsonb not null default '{}'::jsonb
    constraint notification_deliveries_payload_json_check
    check (jsonb_typeof(payload_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_notification_user_unique unique(notification_id, user_id)
);

drop trigger if exists notification_definitions_set_updated_at on public.notification_definitions;
create trigger notification_definitions_set_updated_at
  before update on public.notification_definitions
  for each row execute function public.set_updated_at();

drop trigger if exists notification_deliveries_set_updated_at on public.notification_deliveries;
create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

create index if not exists notification_definitions_release_version_idx
  on public.notification_definitions(release_version)
  where release_version is not null;

create index if not exists notification_definitions_active_idx
  on public.notification_definitions(starts_at desc, expires_at, priority desc);

create index if not exists notification_definitions_dedupe_key_idx
  on public.notification_definitions(dedupe_key)
  where dedupe_key is not null;

create index if not exists notification_deliveries_user_feed_idx
  on public.notification_deliveries(user_id, delivered_at desc);

create index if not exists notification_deliveries_user_unread_idx
  on public.notification_deliveries(user_id, delivered_at desc)
  where read_at is null and dismissed_at is null and archived_at is null;

create index if not exists notification_deliveries_user_modal_idx
  on public.notification_deliveries(user_id, delivered_at desc)
  where modal_acknowledged_at is null and dismissed_at is null and archived_at is null;

alter table public.notification_definitions enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "users can read definitions delivered to them" on public.notification_definitions;
create policy "users can read definitions delivered to them"
on public.notification_definitions
for select
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.notification_deliveries deliveries
    where deliveries.notification_id = notification_definitions.id
      and deliveries.user_id = (select auth.uid())
  )
);

drop policy if exists "users can read own notification deliveries" on public.notification_deliveries;
create policy "users can read own notification deliveries"
on public.notification_deliveries
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

revoke all on table public.notification_definitions from public, anon, authenticated;
revoke all on table public.notification_deliveries from public, anon, authenticated;

grant select on table public.notification_definitions to authenticated;
grant select on table public.notification_deliveries to authenticated;

revoke insert, update, delete on table public.notification_definitions from authenticated;
revoke insert, update, delete on table public.notification_deliveries from authenticated;

grant select, insert, update, delete on table public.notification_definitions to service_role;
grant select, insert, update, delete on table public.notification_deliveries to service_role;
