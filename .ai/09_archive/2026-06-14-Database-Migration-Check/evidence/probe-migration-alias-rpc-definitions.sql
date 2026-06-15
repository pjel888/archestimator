select
  n.nspname,
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_estimate_node_with_history',
    'rename_estimate_node_with_history',
    'reorder_estimate_nodes',
    'project_estimate_list_summaries',
    'is_workspace_member'
  )
order by p.proname, pg_get_function_arguments(p.oid);
