do $$
begin
  create type public.project_publication_status as enum ('published', 'expired', 'revoked');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_publication_event_type as enum ('open', 'password_success', 'password_failure', 'download_attempt_blocked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.project_publications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  token_hash text not null unique,
  encrypted_token text not null,
  password_hash text,
  status public.project_publication_status not null default 'published',
  snapshot_version integer not null default 1 check (snapshot_version >= 1),
  selected_estimate_ids uuid[] not null default '{}'::uuid[],
  snapshot_json jsonb not null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  open_count integer not null default 0 check (open_count >= 0),
  latest_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_publications_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade
);

create index if not exists project_publications_project_status_idx
  on public.project_publications(project_id, status, published_at desc);

create index if not exists project_publications_token_hash_idx
  on public.project_publications(token_hash);

create table if not exists public.project_publication_events (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  event_type public.project_publication_event_type not null,
  metadata_json jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists project_publication_events_publication_created_idx
  on public.project_publication_events(publication_id, created_at desc);

create or replace function public.increment_project_publication_open(target_publication_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_publications
  set
    open_count = open_count + 1,
    latest_opened_at = now(),
    updated_at = now()
  where id = target_publication_id
    and status = 'published'
    and revoked_at is null
    and (expires_at is null or expires_at > now());
end;
$$;

create or replace function public.can_manage_project_publication(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_project_access(target_project_id);
$$;

alter table public.project_publications enable row level security;
alter table public.project_publication_events enable row level security;

drop policy if exists "project publication managers can read publication rows" on public.project_publications;
create policy "project publication managers can read publication rows"
on public.project_publications
for select
to authenticated
using (public.can_manage_project_publication(project_id));

drop policy if exists "project publication managers can insert publication rows" on public.project_publications;
create policy "project publication managers can insert publication rows"
on public.project_publications
for insert
to authenticated
with check (public.can_manage_project_publication(project_id));

drop policy if exists "project publication managers can update publication rows" on public.project_publications;
create policy "project publication managers can update publication rows"
on public.project_publications
for update
to authenticated
using (public.can_manage_project_publication(project_id))
with check (public.can_manage_project_publication(project_id));

drop policy if exists "project publication service role can insert events" on public.project_publication_events;
create policy "project publication service role can insert events"
on public.project_publication_events
for insert
to service_role
with check (true);

revoke all on table public.project_publications from public, anon, authenticated;
revoke all on table public.project_publication_events from public, anon, authenticated;
revoke all on function public.can_manage_project_publication(uuid) from public, anon, authenticated;
revoke all on function public.increment_project_publication_open(uuid) from public, anon, authenticated;
grant select, insert, update on table public.project_publications to authenticated;
grant insert on table public.project_publication_events to service_role;
grant execute on function public.can_manage_project_publication(uuid) to authenticated;
grant execute on function public.increment_project_publication_open(uuid) to service_role;
