select
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_library_folder'
      and pg_get_function_arguments(p.oid) = 'target_workspace_id uuid, target_folder_id uuid'
  ) as has_delete_library_folder;
