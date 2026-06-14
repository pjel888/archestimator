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
    'estimate_tabs',
    'estimates',
    'profiles',
    'projects',
    'workspaces'
  )
group by schemaname, tablename, cmd, roles
order by schemaname, tablename, cmd, roles::text;
