-- Persist user-specific starred/favorite workshop shortcuts.
-- Favorites are scoped by both workspace and user so the root /workshop
-- bento homebase can stay personal while preserving workspace RLS.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_id_workspace_id_unique'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_id_workspace_id_unique unique (id, workspace_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_id_project_id_unique'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_id_project_id_unique unique (id, project_id);
  end if;
end $$;

create table if not exists public.project_favorites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  constraint project_favorites_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint project_favorites_unique_user_project unique (user_id, project_id)
);

create table if not exists public.estimate_favorites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  estimate_id uuid not null,
  created_at timestamptz not null default now(),
  constraint estimate_favorites_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint estimate_favorites_estimate_project_fkey
    foreign key (estimate_id, project_id)
    references public.estimates(id, project_id)
    on delete cascade,
  constraint estimate_favorites_unique_user_estimate unique (user_id, estimate_id)
);

create index if not exists project_favorites_workspace_user_created_idx
  on public.project_favorites(workspace_id, user_id, created_at desc);

create index if not exists project_favorites_project_id_idx
  on public.project_favorites(project_id);

create index if not exists estimate_favorites_workspace_user_created_idx
  on public.estimate_favorites(workspace_id, user_id, created_at desc);

create index if not exists estimate_favorites_estimate_id_idx
  on public.estimate_favorites(estimate_id);

alter table public.project_favorites enable row level security;
alter table public.estimate_favorites enable row level security;

drop policy if exists "users can manage own project favorites" on public.project_favorites;
drop policy if exists "platform admins can manage all project favorites" on public.project_favorites;
drop policy if exists "users can manage own estimate favorites" on public.estimate_favorites;
drop policy if exists "platform admins can manage all estimate favorites" on public.estimate_favorites;

create policy "users can manage own project favorites" on public.project_favorites
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "platform admins can manage all project favorites" on public.project_favorites
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "users can manage own estimate favorites" on public.estimate_favorites
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "platform admins can manage all estimate favorites" on public.estimate_favorites
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke all on public.project_favorites from public;
revoke all on public.estimate_favorites from public;
revoke all on public.project_favorites from anon;
revoke all on public.estimate_favorites from anon;
revoke all on public.project_favorites from authenticated;
revoke all on public.estimate_favorites from authenticated;

grant select, insert, delete on public.project_favorites to authenticated;
grant select, insert, delete on public.estimate_favorites to authenticated;
