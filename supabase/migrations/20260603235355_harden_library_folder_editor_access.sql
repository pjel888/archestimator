begin;

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

  if public.is_workspace_editor(target_workspace_id) is not true then
    raise exception 'Only workspace editors/admins can reorder library folders.';
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
drop policy if exists "members can view library folders" on public.library_folders;
drop policy if exists "workspace editors can insert library folders" on public.library_folders;
drop policy if exists "workspace editors can update library folders" on public.library_folders;
drop policy if exists "workspace editors can delete library folders" on public.library_folders;

create policy "members can view library folders" on public.library_folders
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace editors can insert library folders" on public.library_folders
  for insert to authenticated
  with check (public.is_workspace_editor(workspace_id));

create policy "workspace editors can update library folders" on public.library_folders
  for update to authenticated
  using (public.is_workspace_editor(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

create policy "workspace editors can delete library folders" on public.library_folders
  for delete to authenticated
  using (public.is_workspace_editor(workspace_id));

revoke all on public.library_folders from public;
revoke all on public.library_folders from anon;
revoke all on public.library_folders from authenticated;
grant select, insert, update, delete on public.library_folders to authenticated;

revoke execute on function public.reorder_library_folders(uuid, jsonb) from public;
revoke execute on function public.reorder_library_folders(uuid, jsonb) from anon;
grant execute on function public.reorder_library_folders(uuid, jsonb) to authenticated;

commit;
