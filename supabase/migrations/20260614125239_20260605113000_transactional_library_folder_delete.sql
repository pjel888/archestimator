begin;

create or replace function public.delete_library_folder(target_workspace_id uuid, target_folder_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  target_parent_id uuid;
  max_sibling_sort_order integer;
begin
  if target_workspace_id is null then
    raise exception 'Workspace id is required.';
  end if;

  if target_folder_id is null then
    raise exception 'Library folder id is required.';
  end if;

  if public.is_workspace_editor(target_workspace_id) is not true then
    raise exception 'Only workspace editors/admins can delete library folders.';
  end if;

  perform 1
  from public.library_folders folder
  where folder.workspace_id = target_workspace_id
  for update;

  select folder.parent_id
    into target_parent_id
  from public.library_folders folder
  where folder.id = target_folder_id
    and folder.workspace_id = target_workspace_id;

  if not found then
    raise exception 'Library folder not found in the current workspace.';
  end if;

  set constraints library_folders_workspace_parent_sort_key deferred;

  select coalesce(max(folder.sort_order), 0)
    into max_sibling_sort_order
  from public.library_folders folder
  where folder.workspace_id = target_workspace_id
    and folder.id <> target_folder_id
    and folder.parent_id is not distinct from target_parent_id;

  with child_order as (
    select
      folder.id,
      row_number() over (order by folder.sort_order, folder.name, folder.id) as child_rank
    from public.library_folders folder
    where folder.workspace_id = target_workspace_id
      and folder.parent_id = target_folder_id
  )
  update public.library_folders folder
  set parent_id = target_parent_id,
      sort_order = (max_sibling_sort_order + (child_order.child_rank * 10))::integer
  from child_order
  where folder.id = child_order.id
    and folder.workspace_id = target_workspace_id;

  update public.cost_library_items item
  set library_folder_id = null
  where item.workspace_id = target_workspace_id
    and item.library_folder_id = target_folder_id;

  delete from public.library_folders folder
  where folder.workspace_id = target_workspace_id
    and folder.id = target_folder_id;
end;
$$;

revoke execute on function public.delete_library_folder(uuid, uuid) from public;
revoke execute on function public.delete_library_folder(uuid, uuid) from anon;
grant execute on function public.delete_library_folder(uuid, uuid) to authenticated;

commit;
