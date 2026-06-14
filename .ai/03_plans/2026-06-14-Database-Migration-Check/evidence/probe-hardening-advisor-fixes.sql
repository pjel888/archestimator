with hardened_functions as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.proconfig as config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'resolve_app_role_for_email',
      'set_updated_at',
      'collaboration_role_rank',
      'add_workspace_owner_membership',
      'enforce_estimate_row_item_area_node',
      'enforce_library_folder_tree',
      'handle_new_auth_user',
      'list_pending_collaboration_invitations',
      'set_cost_library_component_lifecycle_state'
    )
),
target_policies as (
  select
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'workspaces' and policyname = 'authenticated users can create owned workspaces')
      or (tablename = 'profiles' and policyname in ('users can view own profile', 'users can update own display name'))
      or (tablename = 'collaboration_invitations' and policyname = 'project access managers can read project invitations')
      or (tablename = 'user_onboarding_profiles' and policyname = 'user_onboarding_profiles_select_own')
      or (tablename = 'ai_action_runs' and policyname in ('actors can view own ai action runs', 'actors can insert own ai action runs'))
      or (tablename = 'ai_tool_calls' and policyname in ('actors can view own ai tool calls', 'actors can insert own ai tool calls'))
      or (tablename = 'ai_data_access_events' and policyname in ('actors can view own ai data access events', 'actors can insert own ai data access events'))
      or (tablename = 'ai_package_apply_commands' and policyname = 'ai_package_apply_commands_select_authenticated')
      or (tablename = 'beta_feedback_submissions' and policyname = 'beta feedback inserts must match actor context')
    )
)
select jsonb_pretty(
  jsonb_build_object(
    'functions',
      (
        select jsonb_agg(
          jsonb_build_object(
            'schema_name', schema_name,
            'function_name', function_name,
            'arguments', arguments,
            'config', config,
            'anon_can_execute', has_function_privilege('anon', oid, 'EXECUTE'),
            'authenticated_can_execute', has_function_privilege('authenticated', oid, 'EXECUTE')
          )
          order by function_name, arguments
        )
        from hardened_functions
      ),
    'policies',
      (
        select jsonb_agg(
          jsonb_build_object(
            'schemaname', schemaname,
            'tablename', tablename,
            'policyname', policyname,
            'qual', qual,
            'with_check', with_check
          )
          order by tablename, policyname
        )
        from target_policies
      )
  )
) as hardening_provider_proof;
