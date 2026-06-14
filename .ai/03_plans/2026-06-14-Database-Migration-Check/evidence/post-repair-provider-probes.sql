select
  current_setting('server_version') as server_version,
  current_setting('server_version_num') as server_version_num;

select
  count(*) as remote_migration_count,
  min(version) as first_remote_migration,
  max(version) as latest_remote_migration
from supabase_migrations.schema_migrations;

select
  to_regclass('public.notification_definitions') is not null as has_notification_definitions,
  to_regclass('public.notification_deliveries') is not null as has_notification_deliveries,
  to_regclass('public.ai_package_builder_memory_preferences') is not null as has_ai_memory_preferences;

select
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_library_folder'
  ) as has_delete_library_folder,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_project_chart_buckets'
  ) as has_get_project_chart_buckets,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_estimate_node_with_history'
      and pg_get_function_arguments(p.oid) like '%target_tab_id uuid%'
  ) as has_tab_aware_create_estimate_node_with_history;

select
  count(*) filter (where c.relrowsecurity) as public_tables_with_rls,
  count(*) filter (where not c.relrowsecurity) as public_tables_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r';

select
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1
    from pg_policy p
    where p.polrelid = c.oid
  )
order by c.relname;

select
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname, pg_get_function_arguments(p.oid);
