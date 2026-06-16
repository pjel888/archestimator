-- Project Groups: per-user, workspace-scoped organization buckets for /workshop/projects.
-- Cloned end-to-end from project_favorites (20260526013617 + grant-fix 20260526013708 +
-- RLS-consolidation 20260614144000): per-user rows, composite FK to projects(id, workspace_id)
-- ON DELETE CASCADE, per-user RLS via is_workspace_member, authenticated-only narrowed grants.
-- Both tables additionally carry workspace_id -> workspaces(id) ON DELETE CASCADE so the
-- per-user organization layer is reclaimed when a workspace is deleted (no orphan rows).
--
-- Two tables (one-to-many: a project is in at most one group per user):
--   project_groups               -- group definitions (name, accent_id token, manual position)
--   project_group_memberships    -- per-user join row; ON DELETE CASCADE off the group implements
--                                    "delete group => projects fall to virtual Ungrouped" (D10).
--
-- Caps (50 groups / 40-char names) are enforced in the server-action layer ONLY (Q2 soft-cap);
-- there is deliberately NO DB check or length constraint here.
--
-- Reuses the existing projects_id_workspace_id_unique (id, workspace_id) constraint added by the
-- favorites migration as the composite-FK target. This migration MUST NOT re-add it.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

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
  -- One-to-many (D1): a project is in at most one group per user.
  constraint project_group_memberships_unique_user_project unique (user_id, project_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Case-insensitive unique group name per user per workspace (prevents ambiguous duplicate flags).
-- A column-list unique(...) cannot contain lower(name); this MUST be a functional unique index.
create unique index if not exists project_groups_user_workspace_lower_name_idx
  on public.project_groups (user_id, workspace_id, lower(name));

-- Listing/ordering: the repository read orders a user's groups by position then created_at.
create index if not exists project_groups_workspace_user_position_idx
  on public.project_groups (workspace_id, user_id, position, created_at);

-- Membership lookups (per-user fetch, cascade-by-group, cascade-by-project, advisor FK coverage).
create index if not exists project_group_memberships_workspace_user_idx
  on public.project_group_memberships (workspace_id, user_id);

create index if not exists project_group_memberships_group_id_idx
  on public.project_group_memberships (group_id);

create index if not exists project_group_memberships_project_id_idx
  on public.project_group_memberships (project_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (per-user; cloned from the live consolidated project_favorites policy)
-- ---------------------------------------------------------------------------

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
      -- IDOR backstop: the referenced group must belong to THIS user. The group_id
      -- FK only proves the group EXISTS; without this exists() a direct Supabase API
      -- caller could insert a membership row pointing at ANOTHER user's group_id.
      and exists (
        select 1 from public.project_groups g
        where g.id = group_id and g.user_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (authenticated-only; RLS owns row visibility)
-- project_groups gets UPDATE (rename / recolor / reorder) -- the favorites divergence.
-- project_group_memberships does NOT (move = upsert, remove = delete; never an in-place update).
-- ---------------------------------------------------------------------------

revoke all on public.project_groups from public;
revoke all on public.project_groups from anon;
revoke all on public.project_groups from authenticated;
revoke all on public.project_group_memberships from public;
revoke all on public.project_group_memberships from anon;
revoke all on public.project_group_memberships from authenticated;

grant select, insert, update, delete on public.project_groups to authenticated;
grant select, insert, delete on public.project_group_memberships to authenticated;
