-- ============================================================================
-- Durable component-library telemetry sink.
--
-- The app already sanitizes library telemetry records before emission. This
-- table gives the estimate-sheet/right-sidebar rollout a durable, queryable
-- sink while keeping direct client API access denied; writes go through a
-- server action using the service-role client after authenticated membership
-- checks.
-- ============================================================================

begin;

create table if not exists public.component_library_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  estimate_id uuid references public.estimates(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  schema_version text not null default 'v1' check (schema_version = 'v1'),
  event_name text not null check (event_name ~ '^[a-z0-9_]{3,96}$'),
  surface text check (surface is null or surface in ('overview', 'components', 'templates')),
  kind text check (kind is null or kind in ('component', 'template')),
  resource_kind text check (resource_kind is null or resource_kind in ('component', 'template', 'folder', 'estimate')),
  action text check (action is null or action ~ '^[a-zA-Z0-9_.:-]{1,120}$'),
  reason text check (reason is null or reason ~ '^[a-zA-Z0-9_.:-]{1,120}$'),
  payload jsonb not null default '{}'::jsonb,
  constraint component_library_telemetry_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint component_library_telemetry_payload_redacted check (
    payload::text !~* '(https?:|/{2}|[/?\\#]|token|signature|apikey|storage[_-]?path|signed[_-]?url|source[_-]?url|file[_-]?name|private note|review note|\\.pdf|\\.xlsx?|\\.csv|\\.jpe?g|\\.png|\\.webp)'
  )
);

create index if not exists component_library_telemetry_workspace_created_idx
  on public.component_library_telemetry_events(workspace_id, created_at desc);

create index if not exists component_library_telemetry_event_created_idx
  on public.component_library_telemetry_events(event_name, created_at desc);

create index if not exists component_library_telemetry_actor_created_idx
  on public.component_library_telemetry_events(actor_user_id, created_at desc);

alter table public.component_library_telemetry_events enable row level security;

revoke all on table public.component_library_telemetry_events from public, anon, authenticated;

drop policy if exists "deny direct api access" on public.component_library_telemetry_events;
create policy "deny direct api access"
on public.component_library_telemetry_events
as restrictive
for all
to public
using (false)
with check (false);

commit;
