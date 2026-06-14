with target_functions(function_signature) as (
  values
    ('public.can_access_estimate(uuid)'::regprocedure),
    ('public.can_access_project(uuid)'::regprocedure),
    ('public.can_assign_estimate_role(uuid, uuid, public.collaboration_role)'::regprocedure),
    ('public.can_assign_project_role(uuid, uuid, public.collaboration_role)'::regprocedure),
    ('public.can_change_estimate_access_settings(uuid, boolean)'::regprocedure),
    ('public.can_edit_estimate(uuid)'::regprocedure),
    ('public.can_edit_project(uuid)'::regprocedure),
    ('public.can_manage_collaboration_invitation(uuid, uuid, public.collaboration_role)'::regprocedure),
    ('public.can_manage_estimate_access(uuid)'::regprocedure),
    ('public.can_manage_estimate_member(uuid, uuid, public.collaboration_role)'::regprocedure),
    ('public.can_manage_project_member(uuid, uuid, public.collaboration_role)'::regprocedure),
    ('public.is_platform_admin()'::regprocedure),
    ('public.is_workspace_admin(uuid)'::regprocedure),
    ('public.is_workspace_editor(uuid)'::regprocedure),
    ('public.is_workspace_member(uuid)'::regprocedure)
),
function_acl as (
  select
    t.function_signature::text as function_signature,
    p.proname,
    has_function_privilege('anon', t.function_signature, 'execute') as anon_execute,
    has_function_privilege('authenticated', t.function_signature, 'execute') as authenticated_execute,
    has_function_privilege('public', t.function_signature, 'execute') as public_execute
  from target_functions t
  join pg_proc p on p.oid = t.function_signature
),
public_policy_refs as (
  select
    f.function_signature,
    count(pol.*) filter (where pol.roles::text = '{public}') as public_policy_refs,
    count(pol.*) as total_policy_refs
  from function_acl f
  left join pg_policies pol
    on coalesce(pol.qual, '') || ' ' || coalesce(pol.with_check, '') ilike '%' || f.proname || '%'
  group by f.function_signature
)
select
  f.function_signature,
  p.public_policy_refs,
  p.total_policy_refs,
  f.anon_execute,
  f.authenticated_execute,
  f.public_execute
from function_acl f
join public_policy_refs p using (function_signature)
order by f.function_signature;
