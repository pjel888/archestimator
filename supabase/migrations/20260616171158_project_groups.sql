-- Project Groups: per-user, workspace-scoped organization buckets for /workshop/projects.
-- Cloned end-to-end from project_favorites: per-user rows, composite FK to projects(id, workspace_id)
-- ON DELETE CASCADE, per-user RLS via is_workspace_member, authenticated-only narrowed grants.
-- Both tables additionally carry workspace_id -> workspaces(id) ON DELETE CASCADE.

create table if not exists public.project_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  accent_id text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.project_groups(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  constraint project_group_memberships_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint project_group_memberships_unique_user_project unique (user_id, project_id)
);

create unique index if not exists project_groups_user_workspace_lower_name_idx
  on public.project_groups (user_id, workspace_id, lower(name));

create index if not exists project_groups_workspace_user_position_idx
  on public.project_groups (workspace_id, user_id, position, created_at);

create index if not exists project_group_memberships_workspace_user_idx
  on public.project_group_memberships (workspace_id, user_id);

create index if not exists project_group_memberships_group_id_idx
  on public.project_group_memberships (group_id);

create index if not exists project_group_memberships_project_id_idx
  on public.project_group_memberships (project_id);

alter table public.project_groups enable row level security;
alter table public.project_group_memberships enable row level security;

drop policy if exists "project groups can be managed by owners and platform admins"
  on public.project_groups;
drop policy if exists "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships;

create policy "project groups can be managed by owners and platform admins"
  on public.project_groups
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or ((user_id = (select auth.uid())) and public.is_workspace_member(workspace_id))
  )
  with check (
    public.is_platform_admin()
    or ((user_id = (select auth.uid())) and public.is_workspace_member(workspace_id))
  );

create policy "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or ((user_id = (select auth.uid())) and public.is_workspace_member(workspace_id))
  )
  with check (
    public.is_platform_admin()
    or (
      (user_id = (select auth.uid()))
      and public.is_workspace_member(workspace_id)
      and exists (
        select 1 from public.project_groups g
        where g.id = group_id and g.user_id = (select auth.uid())
      )
    )
  );

revoke all on public.project_groups from public;
revoke all on public.project_groups from anon;
revoke all on public.project_groups from authenticated;
revoke all on public.project_group_memberships from public;
revoke all on public.project_group_memberships from anon;
revoke all on public.project_group_memberships from authenticated;

grant select, insert, update, delete on public.project_groups to authenticated;
grant select, insert, delete on public.project_group_memberships to authenticated;;
