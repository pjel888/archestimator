begin;

-- Phase 2: make estimate activity queryable as one bounded project-scoped page.
alter table public.estimate_sheet_events
  add column if not exists project_id uuid;

update public.estimate_sheet_events event
set project_id = estimate.project_id
from public.estimates estimate
where event.estimate_id = estimate.id
  and event.project_id is null;

do $$
begin
  if exists (
    select 1
    from public.estimate_sheet_events
    where project_id is null
  ) then
    raise exception 'project dashboard activity backfill failed: estimate_sheet_events.project_id is still null';
  end if;
end;
$$;

alter table public.estimate_sheet_events
  alter column project_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_sheet_events_estimate_project_fkey'
      and conrelid = 'public.estimate_sheet_events'::regclass
  ) then
    alter table public.estimate_sheet_events
      add constraint estimate_sheet_events_estimate_project_fkey
      foreign key (estimate_id, project_id)
      references public.estimates(id, project_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimate_sheet_events_project_workspace_fkey'
      and conrelid = 'public.estimate_sheet_events'::regclass
  ) then
    alter table public.estimate_sheet_events
      add constraint estimate_sheet_events_project_workspace_fkey
      foreign key (project_id, workspace_id)
      references public.projects(id, workspace_id)
      on delete cascade;
  end if;
end;
$$;

create or replace function public.prepare_estimate_sheet_event_project_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_project_id uuid;
  resolved_workspace_id uuid;
begin
  select estimate.project_id, project.workspace_id
    into resolved_project_id, resolved_workspace_id
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  where estimate.id = new.estimate_id;

  if resolved_project_id is null then
    raise exception 'Estimate activity project scope could not be resolved.';
  end if;

  if new.project_id is not null and new.project_id <> resolved_project_id then
    raise exception 'Estimate activity project scope does not match the estimate.';
  end if;

  if new.workspace_id is not null and new.workspace_id <> resolved_workspace_id then
    raise exception 'Estimate activity workspace scope does not match the project.';
  end if;

  new.project_id := resolved_project_id;
  new.workspace_id := resolved_workspace_id;
  return new;
end;
$$;

drop trigger if exists estimate_sheet_events_prepare_project_scope on public.estimate_sheet_events;
create trigger estimate_sheet_events_prepare_project_scope
  before insert or update of estimate_id, project_id, workspace_id
  on public.estimate_sheet_events
  for each row
  execute function public.prepare_estimate_sheet_event_project_scope();

create index if not exists estimate_sheet_events_project_created_idx
  on public.estimate_sheet_events(project_id, created_at desc, id desc);

drop policy if exists estimate_sheet_events_select_authenticated on public.estimate_sheet_events;
drop policy if exists "estimate activity sheet readers can read events" on public.estimate_sheet_events;

create policy "estimate activity sheet readers can read events" on public.estimate_sheet_events
  for select to authenticated
  using (public.can_access_estimate(estimate_id));

revoke execute on function public.prepare_estimate_sheet_event_project_scope() from public, anon, authenticated;
revoke all on public.estimate_sheet_events from public, anon, authenticated;
grant select on public.estimate_sheet_events to authenticated;

-- Phase 3: exact project coordinates live in a dedicated, private table.
create table if not exists public.project_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  workspace_id uuid not null,
  latitude numeric(9, 6) not null check (latitude >= -90 and latitude <= 90),
  longitude numeric(9, 6) not null check (longitude >= -180 and longitude <= 180),
  accuracy_meters numeric(10, 2) check (accuracy_meters is null or accuracy_meters >= 0),
  source text not null default 'manual' check (source in ('manual', 'geocoded', 'imported')),
  display_label text,
  address_text text,
  geocoder_name text,
  provider_place_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_locations_project_unique unique (project_id),
  constraint project_locations_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade
);

create index if not exists project_locations_workspace_project_idx
  on public.project_locations(workspace_id, project_id);

create or replace function public.prepare_project_location_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_workspace_id uuid;
  resolved_user_id uuid := (select auth.uid());
begin
  select project.workspace_id
    into resolved_workspace_id
  from public.projects project
  where project.id = new.project_id;

  if resolved_workspace_id is null then
    raise exception 'Project location project was not found.';
  end if;

  if new.workspace_id is not null and new.workspace_id <> resolved_workspace_id then
    raise exception 'Project location workspace scope does not match the project.';
  end if;

  new.workspace_id := resolved_workspace_id;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, resolved_user_id);
  end if;
  new.updated_by := coalesce(resolved_user_id, new.updated_by);
  return new;
end;
$$;

drop trigger if exists project_locations_prepare_row on public.project_locations;
create trigger project_locations_prepare_row
  before insert or update
  on public.project_locations
  for each row
  execute function public.prepare_project_location_row();

drop trigger if exists project_locations_set_updated_at on public.project_locations;
create trigger project_locations_set_updated_at
  before update on public.project_locations
  for each row
  execute function public.set_updated_at();

alter table public.project_locations enable row level security;

drop policy if exists "project location detail readers can read exact coordinates" on public.project_locations;
drop policy if exists "project location editors can insert exact coordinates" on public.project_locations;
drop policy if exists "project location editors can update exact coordinates" on public.project_locations;
drop policy if exists "project location editors can delete exact coordinates" on public.project_locations;

create policy "project location detail readers can read exact coordinates" on public.project_locations
  for select to authenticated
  using (public.can_edit_project(project_id));

create policy "project location editors can insert exact coordinates" on public.project_locations
  for insert to authenticated
  with check (public.can_edit_project(project_id));

create policy "project location editors can update exact coordinates" on public.project_locations
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "project location editors can delete exact coordinates" on public.project_locations
  for delete to authenticated
  using (public.can_edit_project(project_id));

revoke execute on function public.prepare_project_location_row() from public, anon, authenticated;
revoke all on public.project_locations from public, anon, authenticated;
grant select, insert, update, delete on public.project_locations to authenticated;

comment on table public.project_locations is 'Private exact project coordinates for owner/editor dashboard use. Do not expose to public share, exports, analytics, or AI context.';
comment on column public.project_locations.latitude is 'Exact manual/imported latitude. Keep out of broad project DTOs and public snapshots.';
comment on column public.project_locations.longitude is 'Exact manual/imported longitude. Keep out of broad project DTOs and public snapshots.';

commit;
