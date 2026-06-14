with target(function_signature) as (
  values
    ('public.can_access_realtime_topic(text)'::regprocedure),
    ('public.can_access_workspace_account_scope(uuid)'::regprocedure),
    ('public.can_manage_project_access(uuid)'::regprocedure),
    ('public.can_send_realtime_topic(text)'::regprocedure),
    ('public.current_estimate_access_rank(uuid)'::regprocedure),
    ('public.current_project_access_rank(uuid)'::regprocedure),
    ('public.current_user_profile()'::regprocedure),
    ('public.estimate_inherits_project_access(uuid)'::regprocedure),
    ('public.has_other_estimate_access_manager(uuid, uuid)'::regprocedure),
    ('public.has_other_project_access_manager(uuid, uuid)'::regprocedure)
),
policy_usage as (
  select
    p.oid::regprocedure as function_signature,
    p.proname,
    count(pol.*) filter (where pol.roles::text = '{public}') as public_policy_refs,
    count(pol.*) as total_policy_refs
  from target t
  join pg_proc p on p.oid = t.function_signature
  left join pg_policies pol
    on coalesce(pol.qual, '') || ' ' || coalesce(pol.with_check, '') ilike '%' || p.proname || '%'
  group by p.oid, p.proname
)
select
  t.function_signature::text as function_signature,
  u.public_policy_refs,
  u.total_policy_refs,
  has_function_privilege('anon', t.function_signature, 'execute') as anon_execute,
  has_function_privilege('authenticated', t.function_signature, 'execute') as authenticated_execute,
  has_function_privilege('public', t.function_signature, 'execute') as public_execute
from target t
join policy_usage u on u.function_signature = t.function_signature
order by t.function_signature::text;
