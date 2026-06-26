-- MOP-6 durable telemetry provider readiness query.
-- SELECT-only metadata query scoped to component-library telemetry table proof.

with target_tables(name) as (
  values ('component_library_telemetry_events')
),
target_table_catalog as (
  select
    target.name as table_name,
    c.oid,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as force_rls,
    has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
    has_table_privilege('anon', c.oid, 'INSERT') as anon_can_insert,
    has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
    has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_can_insert,
    has_table_privilege('service_role', c.oid, 'INSERT') as service_role_can_insert
  from target_tables target
  left join pg_class c
    on c.relname = target.name
   and c.relnamespace = 'public'::regnamespace
   and c.relkind in ('r', 'p')
),
target_policies as (
  select
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'component_library_telemetry_events'
),
target_columns as (
  select
    column_name,
    data_type,
    is_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'component_library_telemetry_events'
),
target_constraints as (
  select
    constraint_name,
    constraint_type
  from information_schema.table_constraints
  where table_schema = 'public'
    and table_name = 'component_library_telemetry_events'
),
target_indexes as (
  select indexname, indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'component_library_telemetry_events'
),
required_migrations(version) as (
  values ('20260625203000')
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
  'tables', coalesce((select jsonb_agg(to_jsonb(target_table_catalog) order by table_name) from target_table_catalog), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(target_columns) order by column_name) from target_columns), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(target_constraints) order by constraint_name) from target_constraints), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(target_indexes) order by indexname) from target_indexes), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(target_policies) order by policyname) from target_policies), '[]'::jsonb),
  'required_migrations', coalesce((select jsonb_agg(to_jsonb(remote_migrations) order by version) from remote_migrations), '[]'::jsonb)
) as mop6_telemetry_provider_readiness;
