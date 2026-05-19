-- Archestimator core persistence schema.
-- Canonical hierarchy: workspace -> project -> estimate -> estimate_nodes -> estimate_row_items.
-- RLS is enabled from the first migration. Anonymous public access receives no rows.

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.estimate_status as enum ('draft', 'active', 'issued', 'archived');
create type public.estimate_node_kind as enum ('lot', 'structure', 'level', 'area', 'group', 'assembly');
create type public.estimate_row_link_state as enum ('unlinked', 'linked-clean', 'linked-overridden', 'detached', 'source-changed');
create type public.cost_library_item_kind as enum ('material', 'labor', 'equipment', 'subcontract', 'assembly', 'allowance');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  client_name text,
  project_code text,
  location text,
  currency_code text not null default 'PHP' check (char_length(currency_code) = 3),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  revision_label text not null default 'Rev 0',
  status public.estimate_status not null default 'draft',
  currency_code text not null default 'PHP' check (char_length(currency_code) = 3),
  assumptions text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cost_library_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind public.cost_library_item_kind not null default 'material',
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  category text not null default 'General',
  supplier text,
  brand text,
  sku text,
  unit text not null default 'unit',
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  supplementary_cost numeric(14, 2) not null default 0 check (supplementary_cost >= 0),
  pricing_source text,
  pricing_date date,
  confidence text,
  thumbnail_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estimate_nodes (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  parent_id uuid references public.estimate_nodes(id) on delete cascade,
  kind public.estimate_node_kind not null,
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_nodes_parent_not_self check (parent_id is null or parent_id <> id),
  constraint estimate_nodes_unique_sort unique (estimate_id, parent_id, sort_order) deferrable initially deferred
);

create table public.estimate_row_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  node_id uuid not null references public.estimate_nodes(id) on delete cascade,
  sort_order integer not null default 0,
  source_library_item_id uuid references public.cost_library_items(id) on delete set null,
  source_snapshot jsonb,
  material text not null default '',
  description text not null default '',
  supplier text not null default '',
  unit text not null default 'unit',
  quantity numeric(14, 4) not null default 0 check (quantity >= 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  supplementary_cost numeric(14, 2) not null default 0 check (supplementary_cost >= 0),
  labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  discipline text not null default '',
  designation text not null default '',
  link_state public.estimate_row_link_state not null default 'unlinked',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_row_items_unique_sort unique (node_id, sort_order) deferrable initially deferred
);

create index workspaces_created_by_idx on public.workspaces(created_by);
create index workspace_members_user_id_idx on public.workspace_members(user_id);
create index projects_workspace_id_idx on public.projects(workspace_id);
create index estimates_project_id_idx on public.estimates(project_id);
create index cost_library_items_workspace_id_idx on public.cost_library_items(workspace_id);
create index estimate_nodes_estimate_parent_sort_idx on public.estimate_nodes(estimate_id, parent_id, sort_order);
create index estimate_row_items_estimate_node_sort_idx on public.estimate_row_items(estimate_id, node_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger estimates_set_updated_at before update on public.estimates for each row execute function public.set_updated_at();
create trigger cost_library_items_set_updated_at before update on public.cost_library_items for each row execute function public.set_updated_at();
create trigger estimate_nodes_set_updated_at before update on public.estimate_nodes for each row execute function public.set_updated_at();
create trigger estimate_row_items_set_updated_at before update on public.estimate_row_items for each row execute function public.set_updated_at();

create or replace function public.add_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (workspace_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger workspaces_add_owner_membership
  after insert on public.workspaces
  for each row execute function public.add_workspace_owner_membership();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.estimates enable row level security;
alter table public.cost_library_items enable row level security;
alter table public.estimate_nodes enable row level security;
alter table public.estimate_row_items enable row level security;

create policy "members can view workspaces" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "authenticated users can create owned workspaces" on public.workspaces
  for insert to authenticated with check (created_by = auth.uid());
create policy "workspace admins can update workspaces" on public.workspaces
  for update using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

create policy "members can view workspace memberships" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "workspace admins can manage memberships" on public.workspace_members
  for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members can manage projects" on public.projects
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "members can manage estimates" on public.estimates
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = estimates.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = estimates.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members can manage cost library items" on public.cost_library_items
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "members can manage estimate nodes" on public.estimate_nodes
  for all using (
    exists (
      select 1
      from public.estimates e
      join public.projects p on p.id = e.project_id
      where e.id = estimate_nodes.estimate_id
        and public.is_workspace_member(p.workspace_id)
    )
  ) with check (
    exists (
      select 1
      from public.estimates e
      join public.projects p on p.id = e.project_id
      where e.id = estimate_nodes.estimate_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members can manage estimate row items" on public.estimate_row_items
  for all using (
    exists (
      select 1
      from public.estimates e
      join public.projects p on p.id = e.project_id
      where e.id = estimate_row_items.estimate_id
        and public.is_workspace_member(p.workspace_id)
    )
  ) with check (
    exists (
      select 1
      from public.estimates e
      join public.projects p on p.id = e.project_id
      where e.id = estimate_row_items.estimate_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
