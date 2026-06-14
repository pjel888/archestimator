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
    'ai_action_runs',
    'ai_data_access_events',
    'ai_tool_calls',
    'estimate_favorites',
    'project_favorites'
  )
group by schemaname, tablename, cmd, roles
order by schemaname, tablename, cmd, roles::text;
