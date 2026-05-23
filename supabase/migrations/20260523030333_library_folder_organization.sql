-- Workspace-owned organization folders for the Library route.
-- The global component_category_nodes taxonomy remains source/reporting metadata.

create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.library_folders(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  source_category_node_id text references public.component_category_nodes(id) on delete set null,
  folder_kind text not null check (folder_kind in ('taxonomy', 'custom')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_folders_parent_not_self check (parent_id is null or parent_id <> id),
  constraint library_folders_workspace_parent_sort_key unique nulls not distinct (workspace_id, parent_id, sort_order) deferrable initially deferred
);

alter table public.cost_library_items
  add column if not exists library_folder_id uuid references public.library_folders(id) on delete set null;

create index if not exists library_folders_workspace_parent_sort_idx on public.library_folders(workspace_id, parent_id, sort_order);
create unique index if not exists library_folders_workspace_source_category_key
  on public.library_folders(workspace_id, source_category_node_id)
  where source_category_node_id is not null;
create index if not exists cost_library_items_library_folder_id_idx on public.cost_library_items(library_folder_id);

drop trigger if exists library_folders_set_updated_at on public.library_folders;
create trigger library_folders_set_updated_at before update on public.library_folders for each row execute function public.set_updated_at();

create or replace function public.enforce_library_folder_tree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A library folder cannot parent itself.';
  end if;

  if not exists (
    select 1
    from public.library_folders parent
    where parent.id = new.parent_id
      and parent.workspace_id = new.workspace_id
  ) then
    raise exception 'Library folder parent must belong to the same workspace.';
  end if;

  if exists (
    with recursive ancestors(id, parent_id, path, has_cycle) as (
      select parent.id, parent.parent_id, array[parent.id], false
      from public.library_folders parent
      where parent.id = new.parent_id
      union all
      select parent.id, parent.parent_id, ancestors.path || parent.id, parent.id = any(ancestors.path)
      from ancestors
      join public.library_folders parent on parent.id = ancestors.parent_id
      where not ancestors.has_cycle
    )
    select 1
    from ancestors
    where id = new.id or has_cycle
  ) then
    raise exception 'Library folder hierarchy cannot contain cycles.';
  end if;

  return new;
end;
$$;

drop trigger if exists library_folders_enforce_tree on public.library_folders;
create constraint trigger library_folders_enforce_tree
after insert or update of parent_id, workspace_id on public.library_folders
deferrable initially deferred
for each row execute function public.enforce_library_folder_tree();

create or replace function public.reorder_library_folders(target_workspace_id uuid, folder_updates jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  input_count integer;
  distinct_id_count integer;
  distinct_slot_count integer;
  updated_count integer;
begin
  if target_workspace_id is null then
    raise exception 'Workspace id is required.';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Workspace access denied.';
  end if;

  if folder_updates is null or jsonb_typeof(folder_updates) <> 'array' then
    raise exception 'Library folder reorder updates must be a JSON array.';
  end if;

  select count(*), count(distinct input.id), count(distinct coalesce(input.parent_id::text, '__library_folder_root__') || ':' || input.sort_order::text)
    into input_count, distinct_id_count, distinct_slot_count
  from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer);

  if input_count = 0 then
    raise exception 'At least one library folder reorder update is required.';
  end if;

  if input_count <> distinct_id_count then
    raise exception 'duplicate library folder reorder ids';
  end if;

  if input_count <> distinct_slot_count then
    raise exception 'duplicate library folder reorder slots';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.id is null
      or input.sort_order is null
      or input.sort_order < 0
  ) then
    raise exception 'Invalid library folder reorder payload.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
    left join public.library_folders folder
      on folder.id = input.id
      and folder.workspace_id = target_workspace_id
    where folder.id is null
  ) then
    raise exception 'all library folder reorder ids must belong to the target workspace';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.parent_id is not null
      and not exists (
        select 1
        from public.library_folders parent_folder
        where parent_folder.id = input.parent_id
          and parent_folder.workspace_id = target_workspace_id
      )
  ) then
    raise exception 'all library folder reorder parents must belong to the target workspace';
  end if;

  perform 1
  from public.library_folders folder
  where folder.workspace_id = target_workspace_id
  for update;

  if exists (
    with input as (
      select *
      from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_folders as (
      select
        folder.id,
        case when input.id is not null then input.parent_id else folder.parent_id end as parent_id
      from public.library_folders folder
      left join input on input.id = folder.id
      where folder.workspace_id = target_workspace_id
    )
    select 1
    from final_folders child
    left join final_folders parent on parent.id = child.parent_id
    where child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Library folder reorder creates a missing parent reference.';
  end if;

  if exists (
    with recursive input as (
      select *
      from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_folders as (
      select
        folder.id,
        case when input.id is not null then input.parent_id else folder.parent_id end as parent_id
      from public.library_folders folder
      left join input on input.id = folder.id
      where folder.workspace_id = target_workspace_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select final_folders.id, final_folders.parent_id, array[final_folders.id], false
      from final_folders
      union all
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join final_folders parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Library folder reorder creates a cycle.';
  end if;

  if exists (
    with input as (
      select *
      from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_folders as (
      select
        folder.id,
        case when input.id is not null then input.parent_id else folder.parent_id end as parent_id,
        case when input.id is not null then input.sort_order else folder.sort_order end as sort_order
      from public.library_folders folder
      left join input on input.id = folder.id
      where folder.workspace_id = target_workspace_id
    )
    select 1
    from final_folders
    group by coalesce(parent_id::text, '__library_folder_root__'), sort_order
    having count(*) > 1
  ) then
    raise exception 'Library folder reorder creates duplicate sibling sort orders.';
  end if;

  set constraints library_folders_workspace_parent_sort_key deferred;

  with input as (
    select *
    from jsonb_to_recordset(folder_updates) as input(id uuid, parent_id uuid, sort_order integer)
  )
  update public.library_folders folder
  set parent_id = input.parent_id,
      sort_order = input.sort_order
  from input
  where folder.id = input.id
    and folder.workspace_id = target_workspace_id;

  get diagnostics updated_count = row_count;

  if updated_count <> input_count then
    raise exception 'Library folder reorder did not update every requested folder.';
  end if;

  return updated_count;
end;
$$;

alter table public.library_folders enable row level security;

drop policy if exists "members can manage library folders" on public.library_folders;
create policy "members can manage library folders" on public.library_folders
  for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.library_folders to authenticated;
revoke execute on function public.reorder_library_folders(uuid, jsonb) from public;
grant execute on function public.reorder_library_folders(uuid, jsonb) to authenticated;
