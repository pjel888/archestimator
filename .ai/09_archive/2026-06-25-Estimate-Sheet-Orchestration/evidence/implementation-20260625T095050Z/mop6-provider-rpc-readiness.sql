-- MOP-6 provider RPC readiness query for estimate-sheet orchestration.
-- SELECT-only metadata query scoped to linked Supabase project inspection.

with target_functions(function_name, identity_arguments) as (
  values
    ('assert_can_edit_estimate_for_history', 'target_project_id uuid, target_estimate_id uuid, acting_user_id uuid'),
    ('estimate_sheet_event_result', 'target_estimate_id uuid, target_correlation_id uuid'),
    ('estimate_row_item_snapshot', 'row_item estimate_row_items'),
    ('estimate_row_line_total', 'row_item estimate_row_items'),
    ('estimate_row_context', 'row_item estimate_row_items'),
    ('rename_estimate_node_with_history', 'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, next_name text, acting_user_id uuid, correlation_id uuid'),
    ('move_estimate_row_component_with_history', 'target_project_id uuid, target_estimate_id uuid, source_row_id uuid, target_row_id uuid, expected_source_row_revision integer, expected_target_row_revision integer, source_replacement_payload jsonb, target_replacement_payload jsonb, acting_user_id uuid, correlation_id uuid'),
    ('delete_estimate_row_items_bulk_with_history', 'target_project_id uuid, target_estimate_id uuid, target_row_ids uuid[], expected_row_revisions jsonb, acting_user_id uuid, correlation_id uuid'),
    ('delete_estimate_node_with_history', 'target_project_id uuid, target_estimate_id uuid, target_node_id uuid, acting_user_id uuid, correlation_id uuid'),
    ('delete_estimate_nodes_bulk_with_history', 'target_project_id uuid, target_estimate_id uuid, target_node_ids uuid[], acting_user_id uuid, correlation_id uuid')
),
function_catalog as (
  select
    target.function_name,
    target.identity_arguments as expected_identity_arguments,
    p.oid,
    pg_get_function_identity_arguments(p.oid) as actual_identity_arguments,
    pg_get_function_result(p.oid) as result_type,
    p.prosecdef as security_definer,
    p.proconfig as function_config,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
    case
      when p.oid is null then null
      else pg_get_functiondef(p.oid) like '%assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)%'
    end as uses_edit_assertion,
    case
      when p.oid is null then null
      else pg_get_functiondef(p.oid) like '%fallbackNodeId%'
    end as returns_fallback_node_id,
    case
      when p.oid is null then null
      else pg_get_functiondef(p.oid) like '%deletedNodeIds%'
    end as returns_deleted_node_ids,
    case
      when p.oid is null then null
      else pg_get_functiondef(p.oid) like '%estimate_sheet_event_result(target_estimate_id, correlation_id)%'
    end as uses_idempotency_lookup
  from target_functions target
  left join pg_proc p
    on p.proname = target.function_name
   and pg_get_function_identity_arguments(p.oid) = target.identity_arguments
   and p.pronamespace = 'public'::regnamespace
),
required_migrations(version) as (
  values
    ('20260625183000'),
    ('20260625193000')
),
remote_migrations as (
  select
    required.version,
    exists (
      select 1
      from supabase_migrations.schema_migrations migration
      where migration.version = required.version
    ) as recorded_remote
  from required_migrations required
)
select jsonb_build_object(
  'checked_at', now(),
  'functions', coalesce((
    select jsonb_agg(to_jsonb(function_catalog) order by function_name)
    from function_catalog
  ), '[]'::jsonb),
  'required_migrations', coalesce((
    select jsonb_agg(to_jsonb(remote_migrations) order by version)
    from remote_migrations
  ), '[]'::jsonb)
) as mop6_provider_rpc_readiness;
