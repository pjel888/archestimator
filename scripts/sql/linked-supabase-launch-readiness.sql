-- Read-only linked Supabase launch readiness probe.
--
-- Intended command:
--   supabase db query --linked --file scripts/sql/linked-supabase-launch-readiness.sql --output json
--
-- This file must stay read-only. It reports launch-critical migration/object,
-- RLS/grant, function, and storage posture for the closed-beta proof packet.

with required_migrations(version, label) as (
  values
    ('20260601182522', 'closed_beta_allowed_emails'),
    ('20260601184343', 'unlink_estimate_row_items'),
    ('20260602005649', 'beta_allowlist_admin_queue'),
    ('20260602083000', 'beta_feedback_submissions'),
    ('20260602084500', 'beta_feedback_review_queue')
),
required_tables(schema_name, table_name) as (
  values
    ('public', 'closed_beta_allowed_emails'),
    ('public', 'beta_feedback_submissions')
),
required_functions(schema_name, function_name) as (
  values
    ('public', 'check_closed_beta_access'),
    ('public', 'unlink_estimate_row_item_from_library_with_history')
),
required_buckets(bucket_name, should_be_public) as (
  values
    -- Component thumbnails are intentionally public WebP assets; project/client
    -- covers are isolated in the private project-images bucket.
    ('component-images', true),
    ('project-images', false)
),
migration_checks as (
  select
    'migration'::text as category,
    required_migrations.version || '_' || required_migrations.label as check_name,
    'present in supabase_migrations.schema_migrations'::text as expected,
    coalesce(schema_migrations.version, 'missing')::text as actual,
    (schema_migrations.version is not null) as passed,
    jsonb_build_object('version', required_migrations.version, 'label', required_migrations.label) as details
  from required_migrations
  left join supabase_migrations.schema_migrations
    on schema_migrations.version = required_migrations.version
),
table_checks as (
  select
    'table'::text as category,
    required_tables.schema_name || '.' || required_tables.table_name as check_name,
    'table exists with row level security enabled'::text as expected,
    case
      when pg_class.oid is null then 'missing'
      when pg_class.relrowsecurity then 'exists_rls_enabled'
      else 'exists_rls_disabled'
    end as actual,
    (pg_class.oid is not null and pg_class.relrowsecurity) as passed,
    jsonb_build_object(
      'schema', required_tables.schema_name,
      'table', required_tables.table_name,
      'rls_enabled', coalesce(pg_class.relrowsecurity, false)
    ) as details
  from required_tables
  left join pg_namespace
    on pg_namespace.nspname = required_tables.schema_name
  left join pg_class
    on pg_class.relnamespace = pg_namespace.oid
    and pg_class.relname = required_tables.table_name
    and pg_class.relkind in ('r', 'p')
),
table_grant_checks as (
  select
    'grant'::text as category,
    required_tables.schema_name || '.' || required_tables.table_name || ':anon_select' as check_name,
    'anon must not have select on private beta tables'::text as expected,
    case
      when pg_class.oid is null then 'table_missing'
      when has_table_privilege('anon', pg_class.oid, 'select') then 'anon_can_select'
      else 'anon_cannot_select'
    end as actual,
    (pg_class.oid is not null and not has_table_privilege('anon', pg_class.oid, 'select')) as passed,
    jsonb_build_object('schema', required_tables.schema_name, 'table', required_tables.table_name, 'role', 'anon') as details
  from required_tables
  left join pg_namespace
    on pg_namespace.nspname = required_tables.schema_name
  left join pg_class
    on pg_class.relnamespace = pg_namespace.oid
    and pg_class.relname = required_tables.table_name
    and pg_class.relkind in ('r', 'p')
),
function_checks as (
  select
    'function'::text as category,
    required_functions.schema_name || '.' || required_functions.function_name as check_name,
    'function exists and is not executable by anon'::text as expected,
    case
      when pg_proc.oid is null then 'missing'
      when has_function_privilege('anon', pg_proc.oid, 'execute') then 'anon_can_execute'
      else 'exists_anon_cannot_execute'
    end as actual,
    (pg_proc.oid is not null and not has_function_privilege('anon', pg_proc.oid, 'execute')) as passed,
    jsonb_build_object(
      'schema', required_functions.schema_name,
      'function', required_functions.function_name,
      'signature', pg_get_function_identity_arguments(pg_proc.oid)
    ) as details
  from required_functions
  left join pg_namespace
    on pg_namespace.nspname = required_functions.schema_name
  left join pg_proc
    on pg_proc.pronamespace = pg_namespace.oid
    and pg_proc.proname = required_functions.function_name
),
bucket_checks as (
  select
    'storage'::text as category,
    'storage.buckets.' || required_buckets.bucket_name || ':public' as check_name,
    case
      when required_buckets.should_be_public then 'bucket should be public for approved component thumbnails'
      else 'bucket should be private unless explicitly approved'
    end as expected,
    case
      when buckets.id is null then 'bucket_missing'
      when buckets.public then 'public'
      else 'private'
    end as actual,
    (buckets.id is not null and buckets.public = required_buckets.should_be_public) as passed,
    jsonb_build_object('bucket', required_buckets.bucket_name, 'public', coalesce(buckets.public, false)) as details
  from required_buckets
  left join storage.buckets
    on buckets.id = required_buckets.bucket_name
),
summary_checks as (
  select
    'summary'::text as category,
    'launch_readiness_passed'::text as check_name,
    'all read-only checks passed'::text as expected,
    case when bool_and(passed) then 'passed' else 'failed' end as actual,
    bool_and(passed) as passed,
    jsonb_build_object(
      'checked_at', now(),
      'total_checks', count(*),
      'failed_checks', count(*) filter (where not passed)
    ) as details
  from (
    select passed from migration_checks
    union all select passed from table_checks
    union all select passed from table_grant_checks
    union all select passed from function_checks
    union all select passed from bucket_checks
  ) all_checks
)
select *
from (
  select * from migration_checks
  union all select * from table_checks
  union all select * from table_grant_checks
  union all select * from function_checks
  union all select * from bucket_checks
  union all select * from summary_checks
) checks
order by
  case category
    when 'summary' then 0
    when 'migration' then 1
    when 'table' then 2
    when 'grant' then 3
    when 'function' then 4
    when 'storage' then 5
    else 9
  end,
  check_name;
