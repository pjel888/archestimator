-- MOP-0 read-only hosted Supabase introspection for estimate-sheet orchestration.
-- SELECT-only metadata query. Do not add DDL/DML to this file.

with function_names(name) as (
  values
    ('assert_can_edit_estimate_for_history'),
    ('estimate_sheet_event_result'),
    ('insert_estimate_row_item_with_history'),
    ('update_estimate_row_item_with_history'),
    ('replace_estimate_row_item_with_history'),
    ('delete_estimate_row_item_with_history'),
    ('move_estimate_row_component_with_history'),
    ('delete_estimate_row_items_bulk_with_history'),
    ('create_estimate_node_with_history'),
    ('reorder_estimate_nodes_with_history'),
    ('delete_estimate_node_with_history'),
    ('delete_estimate_nodes_bulk_with_history'),
    ('insert_estimate_subtree_into_estimate_with_history')
),
table_names(name) as (
  values
    ('estimates'),
    ('estimate_tabs'),
    ('estimate_nodes'),
    ('estimate_row_items'),
    ('estimate_sheet_events')
),
target_functions as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_function_result(p.oid) as result_type,
    p.prosecdef as security_definer,
    p.provolatile as volatility,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join function_names fn on fn.name = p.proname
  where n.nspname = 'public'
),
target_tables as (
  select
    c.oid,
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as force_rls,
    has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
    has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
    has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_can_insert,
    has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_can_update,
    has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_can_delete,
    has_table_privilege('service_role', c.oid, 'SELECT') as service_role_can_select
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join table_names tn on tn.name = c.relname
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
),
target_policies as (
  select
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in (select name from table_names)
),
target_indexes as (
  select
    schemaname,
    tablename,
    indexname,
    indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename in (select name from table_names)
),
target_constraints as (
  select
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.table_name in (select name from table_names)
),
recent_migrations as (
  select to_jsonb(sm) as migration
  from supabase_migrations.schema_migrations sm
  order by sm.version desc
  limit 20
)
select jsonb_build_object(
  'checked_at', now(),
  'functions', coalesce((select jsonb_agg(to_jsonb(target_functions) order by function_name, identity_arguments) from target_functions), '[]'::jsonb),
  'tables', coalesce((select jsonb_agg(to_jsonb(target_tables) order by table_name) from target_tables), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(target_policies) order by tablename, policyname) from target_policies), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(target_indexes) order by tablename, indexname) from target_indexes), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(target_constraints) order by table_name, constraint_name) from target_constraints), '[]'::jsonb),
  'recent_migrations', coalesce((select jsonb_agg(migration) from recent_migrations), '[]'::jsonb)
) as mop0_introspection;
