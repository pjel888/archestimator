select
  schemaname,
  tablename,
  cmd,
  roles::text as roles,
  count(*) as policy_count,
  array_agg(policyname order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename in (
    'cost_library_items',
    'estimate_nodes',
    'estimate_row_items',
    'workspace_members'
  )
group by schemaname, tablename, cmd, roles
order by schemaname, tablename, cmd, roles::text;
