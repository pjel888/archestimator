-- Project and estimate-sheet collaboration access foundation.
-- Project access is the base model; estimate sheets inherit project access unless a sheet setting disables inheritance.

do $$
begin
  create type public.collaboration_role as enum ('owner', 'admin', 'editor', 'viewer');
exception
  when duplicate_object then null;
end;
$$;

alter table public.profiles add column if not exists avatar_url text;

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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_id_project_id_unique'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_id_project_id_unique unique (id, project_id);
  end if;
end;
$$;

create table if not exists public.project_members (
  project_id uuid not null,
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.collaboration_role not null default 'editor',
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id),
  constraint project_members_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade
);

create table if not exists public.estimate_sheet_access_settings (
  estimate_id uuid primary key,
  project_id uuid not null,
  inherit_project_access boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_sheet_access_settings_estimate_project_fkey
    foreign key (estimate_id, project_id)
    references public.estimates(id, project_id)
    on delete cascade
);

create table if not exists public.estimate_sheet_members (
  estimate_id uuid not null,
  project_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.collaboration_role not null default 'viewer',
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (estimate_id, user_id),
  constraint estimate_sheet_members_estimate_project_fkey
    foreign key (estimate_id, project_id)
    references public.estimates(id, project_id)
    on delete cascade
);

create table if not exists public.collaboration_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  estimate_id uuid,
  scope text not null default 'project' check (scope in ('project', 'estimate')),
  email text not null check (email = lower(email)),
  role public.collaboration_role not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  invited_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_invitations_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint collaboration_invitations_estimate_project_fkey
    foreign key (estimate_id, project_id)
    references public.estimates(id, project_id)
    on delete cascade,
  constraint collaboration_invitations_scope_target_check
    check (
      (scope = 'project' and estimate_id is null)
      or (scope = 'estimate' and estimate_id is not null)
    )
);

create index if not exists project_members_workspace_user_idx
  on public.project_members(workspace_id, user_id);
create index if not exists project_members_user_idx
  on public.project_members(user_id);
create index if not exists estimate_sheet_members_project_user_idx
  on public.estimate_sheet_members(project_id, user_id);
create index if not exists estimate_sheet_members_user_idx
  on public.estimate_sheet_members(user_id);
create index if not exists collaboration_invitations_project_email_idx
  on public.collaboration_invitations(project_id, email);
create index if not exists collaboration_invitations_estimate_email_idx
  on public.collaboration_invitations(estimate_id, email)
  where estimate_id is not null;
create unique index if not exists collaboration_invitations_active_project_email_idx
  on public.collaboration_invitations(project_id, email)
  where scope = 'project' and accepted_at is null and revoked_at is null;
create unique index if not exists collaboration_invitations_active_estimate_email_idx
  on public.collaboration_invitations(estimate_id, email)
  where scope = 'estimate' and accepted_at is null and revoked_at is null;

drop trigger if exists project_members_set_updated_at on public.project_members;
create trigger project_members_set_updated_at
  before update on public.project_members
  for each row execute function public.set_updated_at();

drop trigger if exists estimate_sheet_access_settings_set_updated_at on public.estimate_sheet_access_settings;
create trigger estimate_sheet_access_settings_set_updated_at
  before update on public.estimate_sheet_access_settings
  for each row execute function public.set_updated_at();

drop trigger if exists estimate_sheet_members_set_updated_at on public.estimate_sheet_members;
create trigger estimate_sheet_members_set_updated_at
  before update on public.estimate_sheet_members
  for each row execute function public.set_updated_at();

drop trigger if exists collaboration_invitations_set_updated_at on public.collaboration_invitations;
create trigger collaboration_invitations_set_updated_at
  before update on public.collaboration_invitations
  for each row execute function public.set_updated_at();

alter table public.project_members enable row level security;
alter table public.estimate_sheet_access_settings enable row level security;
alter table public.estimate_sheet_members enable row level security;
alter table public.collaboration_invitations enable row level security;

create or replace function public.collaboration_role_rank(target_role public.collaboration_role)
returns integer
language sql
immutable
as $$
  select case target_role
    when 'owner' then 40
    when 'admin' then 30
    when 'editor' then 20
    when 'viewer' then 10
    else 0
  end;
$$;

create or replace function public.is_workspace_editor(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.current_project_access_rank(target_project_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(
    case when public.is_platform_admin() then 100 else 0 end,
    coalesce((
      select max(case wm.role
        when 'owner' then 40
        when 'admin' then 30
        when 'member' then 20
        when 'viewer' then 10
        else 0
      end)
      from public.projects p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = target_project_id
        and wm.user_id = auth.uid()
    ), 0),
    coalesce((
      select max(public.collaboration_role_rank(pm.role))
      from public.project_members pm
      where pm.project_id = target_project_id
        and pm.user_id = auth.uid()
    ), 0)
  );
$$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = target_project_id
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.estimate_sheet_members esm
    where esm.project_id = target_project_id
      and esm.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = target_project_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'member')
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.can_manage_project_access(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_project_access_rank(target_project_id) >= 30;
$$;

create or replace function public.can_assign_project_role(
  target_project_id uuid,
  target_user_id uuid,
  target_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_project_access(target_project_id)
    and public.collaboration_role_rank(target_role) <= public.current_project_access_rank(target_project_id)
    and (
      target_user_id <> auth.uid()
      or public.collaboration_role_rank(target_role) <= coalesce((
        select public.collaboration_role_rank(pm.role)
        from public.project_members pm
        where pm.project_id = target_project_id
          and pm.user_id = auth.uid()
      ), public.current_project_access_rank(target_project_id))
    );
$$;

create or replace function public.has_other_project_access_manager(target_project_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = target_project_id
      and wm.user_id <> target_user_id
      and wm.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id <> target_user_id
      and pm.role in ('owner', 'admin')
  );
$$;

create or replace function public.can_manage_project_member(
  target_project_id uuid,
  target_user_id uuid,
  existing_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_project_access(target_project_id)
    and (
      public.collaboration_role_rank(existing_role) < 30
      or public.has_other_project_access_manager(target_project_id, target_user_id)
    );
$$;

create or replace function public.estimate_inherits_project_access(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select settings.inherit_project_access
      from public.estimate_sheet_access_settings settings
      where settings.estimate_id = target_estimate_id
    ),
    true
  );
$$;

create or replace function public.can_access_estimate(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.estimate_sheet_members esm
    where esm.estimate_id = target_estimate_id
      and esm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.estimates e
    where e.id = target_estimate_id
      and public.estimate_inherits_project_access(e.id)
      and public.current_project_access_rank(e.project_id) > 0
  );
$$;

create or replace function public.can_edit_estimate(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.estimate_sheet_members esm
    where esm.estimate_id = target_estimate_id
      and esm.user_id = auth.uid()
      and esm.role in ('owner', 'admin', 'editor')
  )
  or exists (
    select 1
    from public.estimates e
    where e.id = target_estimate_id
      and public.estimate_inherits_project_access(e.id)
      and public.can_edit_project(e.project_id)
  );
$$;

create or replace function public.current_estimate_access_rank(target_estimate_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(
    case when public.is_platform_admin() then 100 else 0 end,
    coalesce((
      select max(public.collaboration_role_rank(esm.role))
      from public.estimate_sheet_members esm
      where esm.estimate_id = target_estimate_id
        and esm.user_id = auth.uid()
    ), 0),
    coalesce((
      select case
        when public.estimate_inherits_project_access(e.id) then public.current_project_access_rank(e.project_id)
        else 0
      end
      from public.estimates e
      where e.id = target_estimate_id
    ), 0)
  );
$$;

create or replace function public.can_manage_estimate_access(target_estimate_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_estimate_access_rank(target_estimate_id) >= 30;
$$;

create or replace function public.has_other_estimate_access_manager(target_estimate_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.estimate_sheet_members esm
    where esm.estimate_id = target_estimate_id
      and esm.user_id <> target_user_id
      and esm.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.estimates e
    where e.id = target_estimate_id
      and public.estimate_inherits_project_access(e.id)
      and public.has_other_project_access_manager(e.project_id, target_user_id)
  );
$$;

create or replace function public.can_assign_estimate_role(
  target_estimate_id uuid,
  target_user_id uuid,
  target_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_estimate_access(target_estimate_id)
    and public.collaboration_role_rank(target_role) <= public.current_estimate_access_rank(target_estimate_id)
    and (
      target_user_id <> auth.uid()
      or public.collaboration_role_rank(target_role) <= coalesce((
        select public.collaboration_role_rank(esm.role)
        from public.estimate_sheet_members esm
        where esm.estimate_id = target_estimate_id
          and esm.user_id = auth.uid()
      ), public.current_estimate_access_rank(target_estimate_id))
    );
$$;

create or replace function public.can_manage_estimate_member(
  target_estimate_id uuid,
  target_user_id uuid,
  existing_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_estimate_access(target_estimate_id)
    and (
      public.collaboration_role_rank(existing_role) < 30
      or public.has_other_estimate_access_manager(target_estimate_id, target_user_id)
    );
$$;

create or replace function public.can_change_estimate_access_settings(target_estimate_id uuid, next_inherit_project_access boolean)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when next_inherit_project_access then public.can_manage_estimate_access(target_estimate_id)
    else public.is_platform_admin()
      or (
        exists (
          select 1
          from public.estimate_sheet_members esm
          where esm.estimate_id = target_estimate_id
            and esm.user_id = auth.uid()
            and esm.role in ('owner', 'admin')
        )
        and exists (
          select 1
          from public.estimate_sheet_members esm
          where esm.estimate_id = target_estimate_id
            and esm.role in ('owner', 'admin')
        )
      )
  end;
$$;

create or replace function public.can_manage_collaboration_invitation(
  target_project_id uuid,
  target_estimate_id uuid,
  target_role public.collaboration_role
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when target_estimate_id is null then
      public.can_manage_project_access(target_project_id)
      and public.collaboration_role_rank(target_role) <= public.current_project_access_rank(target_project_id)
    else
      public.can_manage_estimate_access(target_estimate_id)
      and public.collaboration_role_rank(target_role) <= public.current_estimate_access_rank(target_estimate_id)
  end;
$$;

create or replace function public.apply_pending_collaboration_invitations(target_user_id uuid, target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(coalesce(target_email, ''));
begin
  if normalized_email = '' then
    return;
  end if;

  insert into public.project_members (project_id, workspace_id, user_id, role, added_by)
  select invitation.project_id, invitation.workspace_id, target_user_id, invitation.role, invitation.invited_by
  from public.collaboration_invitations invitation
  where invitation.scope = 'project'
    and invitation.email = normalized_email
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
  on conflict (project_id, user_id) do update
    set role = case
          when public.collaboration_role_rank(excluded.role) > public.collaboration_role_rank(public.project_members.role)
            then excluded.role
          else public.project_members.role
        end,
        added_by = coalesce(public.project_members.added_by, excluded.added_by);

  insert into public.estimate_sheet_members (estimate_id, project_id, user_id, role, added_by)
  select invitation.estimate_id, invitation.project_id, target_user_id, invitation.role, invitation.invited_by
  from public.collaboration_invitations invitation
  where invitation.scope = 'estimate'
    and invitation.estimate_id is not null
    and invitation.email = normalized_email
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
  on conflict (estimate_id, user_id) do update
    set role = case
          when public.collaboration_role_rank(excluded.role) > public.collaboration_role_rank(public.estimate_sheet_members.role)
            then excluded.role
          else public.estimate_sheet_members.role
        end,
        added_by = coalesce(public.estimate_sheet_members.added_by, excluded.added_by);

  update public.collaboration_invitations invitation
  set accepted_at = coalesce(invitation.accepted_at, now()),
      invited_user_id = target_user_id
  where invitation.email = normalized_email
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now();
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    public.resolve_app_role_for_email(new.email)
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        role = case
          when public.profiles.role = 'ceo' or excluded.role = 'ceo' then 'ceo'::public.app_role
          when public.profiles.role = 'admin' or excluded.role = 'admin' then 'admin'::public.app_role
          else 'member'::public.app_role
        end,
        updated_at = now();

  perform public.apply_pending_collaboration_invitations(new.id, new.email);

  return new;
end;
$$;

create or replace function public.can_access_realtime_topic(target_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  topic_id text;
  uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if target_topic like 'project:%' then
    topic_id := split_part(target_topic, ':', 2);
    if topic_id !~ uuid_pattern then
      return false;
    end if;
    return public.can_access_project(topic_id::uuid);
  end if;

  if target_topic like 'estimate:%' then
    topic_id := split_part(target_topic, ':', 2);
    if topic_id !~ uuid_pattern then
      return false;
    end if;
    return public.can_access_estimate(topic_id::uuid);
  end if;

  return false;
end;
$$;

create or replace function public.can_send_realtime_topic(target_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  topic_id text;
  uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if target_topic like 'project:%' then
    topic_id := split_part(target_topic, ':', 2);
    if topic_id !~ uuid_pattern then
      return false;
    end if;
    return public.can_edit_project(topic_id::uuid);
  end if;

  if target_topic like 'estimate:%' then
    topic_id := split_part(target_topic, ':', 2);
    if topic_id !~ uuid_pattern then
      return false;
    end if;
    return public.can_edit_estimate(topic_id::uuid);
  end if;

  return false;
end;
$$;

drop policy if exists "members can manage projects" on public.projects;
drop policy if exists "project viewers can read projects" on public.projects;
drop policy if exists "project editors can insert projects" on public.projects;
drop policy if exists "project editors can update projects" on public.projects;
drop policy if exists "project editors can delete projects" on public.projects;
create policy "project viewers can read projects" on public.projects
  for select using (public.can_access_project(id));
create policy "project editors can insert projects" on public.projects
  for insert to authenticated with check (public.is_workspace_editor(workspace_id));
create policy "project editors can update projects" on public.projects
  for update using (public.can_edit_project(id)) with check (public.can_edit_project(id));
create policy "project editors can delete projects" on public.projects
  for delete using (public.can_edit_project(id));

drop policy if exists "members can manage estimates" on public.estimates;
drop policy if exists "estimate viewers can read estimates" on public.estimates;
drop policy if exists "project editors can insert estimates" on public.estimates;
drop policy if exists "estimate editors can update estimates" on public.estimates;
drop policy if exists "estimate editors can delete estimates" on public.estimates;
create policy "estimate viewers can read estimates" on public.estimates
  for select using (public.can_access_estimate(id));
create policy "project editors can insert estimates" on public.estimates
  for insert to authenticated with check (public.can_edit_project(project_id));
create policy "estimate editors can update estimates" on public.estimates
  for update using (public.can_edit_estimate(id)) with check (public.can_edit_estimate(id));
create policy "estimate editors can delete estimates" on public.estimates
  for delete using (public.can_edit_estimate(id));

drop policy if exists "members can manage estimate nodes" on public.estimate_nodes;
drop policy if exists "estimate viewers can read estimate nodes" on public.estimate_nodes;
drop policy if exists "estimate editors can manage estimate nodes" on public.estimate_nodes;
create policy "estimate viewers can read estimate nodes" on public.estimate_nodes
  for select using (public.can_access_estimate(estimate_id));
create policy "estimate editors can manage estimate nodes" on public.estimate_nodes
  for all using (public.can_edit_estimate(estimate_id)) with check (public.can_edit_estimate(estimate_id));

drop policy if exists "members can manage estimate row items" on public.estimate_row_items;
drop policy if exists "estimate viewers can read estimate rows" on public.estimate_row_items;
drop policy if exists "estimate editors can manage estimate rows" on public.estimate_row_items;
create policy "estimate viewers can read estimate rows" on public.estimate_row_items
  for select using (public.can_access_estimate(estimate_id));
create policy "estimate editors can manage estimate rows" on public.estimate_row_items
  for all using (public.can_edit_estimate(estimate_id)) with check (public.can_edit_estimate(estimate_id));

drop policy if exists "members can manage cost library items" on public.cost_library_items;
drop policy if exists "workspace members can read cost library items" on public.cost_library_items;
drop policy if exists "workspace editors can manage cost library items" on public.cost_library_items;
create policy "workspace members can read cost library items" on public.cost_library_items
  for select using (public.is_workspace_member(workspace_id));
create policy "workspace editors can manage cost library items" on public.cost_library_items
  for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));

drop policy if exists "project members can read project memberships" on public.project_members;
drop policy if exists "project editors can manage project memberships" on public.project_members;
drop policy if exists "project access managers can add project memberships" on public.project_members;
drop policy if exists "project access managers can update project memberships" on public.project_members;
drop policy if exists "project access managers can delete project memberships" on public.project_members;
create policy "project members can read project memberships" on public.project_members
  for select using (public.can_access_project(project_id));
create policy "project access managers can add project memberships" on public.project_members
  for insert to authenticated with check (public.can_assign_project_role(project_id, user_id, role));
create policy "project access managers can update project memberships" on public.project_members
  for update using (public.can_manage_project_member(project_id, user_id, role))
  with check (public.can_assign_project_role(project_id, user_id, role));
create policy "project access managers can delete project memberships" on public.project_members
  for delete using (public.can_manage_project_member(project_id, user_id, role));

drop policy if exists "estimate viewers can read sheet access settings" on public.estimate_sheet_access_settings;
drop policy if exists "estimate editors can manage sheet access settings" on public.estimate_sheet_access_settings;
drop policy if exists "estimate access managers can add sheet access settings" on public.estimate_sheet_access_settings;
drop policy if exists "estimate access managers can update sheet access settings" on public.estimate_sheet_access_settings;
drop policy if exists "estimate access managers can delete sheet access settings" on public.estimate_sheet_access_settings;
create policy "estimate viewers can read sheet access settings" on public.estimate_sheet_access_settings
  for select using (public.can_access_estimate(estimate_id));
create policy "estimate access managers can add sheet access settings" on public.estimate_sheet_access_settings
  for insert to authenticated with check (public.can_change_estimate_access_settings(estimate_id, inherit_project_access));
create policy "estimate access managers can update sheet access settings" on public.estimate_sheet_access_settings
  for update using (public.can_manage_estimate_access(estimate_id))
  with check (public.can_change_estimate_access_settings(estimate_id, inherit_project_access));
create policy "estimate access managers can delete sheet access settings" on public.estimate_sheet_access_settings
  for delete using (public.can_manage_estimate_access(estimate_id));

drop policy if exists "estimate viewers can read sheet memberships" on public.estimate_sheet_members;
drop policy if exists "estimate editors can manage sheet memberships" on public.estimate_sheet_members;
drop policy if exists "estimate access managers can add sheet memberships" on public.estimate_sheet_members;
drop policy if exists "estimate access managers can update sheet memberships" on public.estimate_sheet_members;
drop policy if exists "estimate access managers can delete sheet memberships" on public.estimate_sheet_members;
create policy "estimate viewers can read sheet memberships" on public.estimate_sheet_members
  for select using (public.can_access_estimate(estimate_id));
create policy "estimate access managers can add sheet memberships" on public.estimate_sheet_members
  for insert to authenticated with check (public.can_assign_estimate_role(estimate_id, user_id, role));
create policy "estimate access managers can update sheet memberships" on public.estimate_sheet_members
  for update using (public.can_manage_estimate_member(estimate_id, user_id, role))
  with check (public.can_assign_estimate_role(estimate_id, user_id, role));
create policy "estimate access managers can delete sheet memberships" on public.estimate_sheet_members
  for delete using (public.can_manage_estimate_member(estimate_id, user_id, role));

drop policy if exists "project access managers can read project invitations" on public.collaboration_invitations;
drop policy if exists "project access managers can create project invitations" on public.collaboration_invitations;
drop policy if exists "project access managers can update project invitations" on public.collaboration_invitations;
drop policy if exists "project access managers can delete project invitations" on public.collaboration_invitations;
create policy "project access managers can read project invitations" on public.collaboration_invitations
  for select using (
    lower(coalesce(auth.jwt()->>'email', '')) = email
    or public.can_manage_collaboration_invitation(project_id, estimate_id, role)
  );
create policy "project access managers can create project invitations" on public.collaboration_invitations
  for insert to authenticated with check (public.can_manage_collaboration_invitation(project_id, estimate_id, role));
create policy "project access managers can update project invitations" on public.collaboration_invitations
  for update using (public.can_manage_collaboration_invitation(project_id, estimate_id, role))
  with check (public.can_manage_collaboration_invitation(project_id, estimate_id, role));
create policy "project access managers can delete project invitations" on public.collaboration_invitations
  for delete using (public.can_manage_collaboration_invitation(project_id, estimate_id, role));

drop policy if exists "collaborators can view collaborator profiles" on public.profiles;
create policy "collaborators can view collaborator profiles" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_platform_admin()
    or exists (
      select 1
      from public.workspace_members viewer_membership
      join public.workspace_members target_membership
        on target_membership.workspace_id = viewer_membership.workspace_id
      where viewer_membership.user_id = auth.uid()
        and target_membership.user_id = profiles.id
    )
    or exists (
      select 1
      from public.project_members viewer_project_membership
      join public.project_members target_project_membership
        on target_project_membership.project_id = viewer_project_membership.project_id
      where viewer_project_membership.user_id = auth.uid()
        and target_project_membership.user_id = profiles.id
    )
    or exists (
      select 1
      from public.estimate_sheet_members viewer_sheet_membership
      join public.estimate_sheet_members target_sheet_membership
        on target_sheet_membership.estimate_id = viewer_sheet_membership.estimate_id
      where viewer_sheet_membership.user_id = auth.uid()
        and target_sheet_membership.user_id = profiles.id
    )
  );

grant select, insert on table "realtime"."messages" to authenticated;

alter table "realtime"."messages" enable row level security;

drop policy if exists "collaborators can read private collaboration realtime messages" on "realtime"."messages";
create policy "collaborators can read private collaboration realtime messages"
on "realtime"."messages"
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.can_access_realtime_topic((select realtime.topic()))
);

drop policy if exists "collaborators can send private collaboration realtime messages" on "realtime"."messages";
create policy "collaborators can send private collaboration realtime messages"
on "realtime"."messages"
for insert
to authenticated
with check (
  (
    realtime.messages.extension = 'presence'
    and public.can_access_realtime_topic((select realtime.topic()))
  )
  or (
    realtime.messages.extension = 'broadcast'
    and public.can_send_realtime_topic((select realtime.topic()))
  )
);
