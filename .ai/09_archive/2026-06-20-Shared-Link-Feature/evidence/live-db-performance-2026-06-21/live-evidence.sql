-- Live DB performance evidence collection.
-- Read-only and compatible with both Supabase Management API db query and psql.
-- The result is one row with JSON arrays so db query does not discard earlier
-- result sets. pg_stat_statements is intentionally reported as availability only;
-- query text capture should happen in a controlled follow-up environment.

with
table_rows as (
  select schemaname, relname as table_name, n_live_tup as row_count
  from pg_stat_user_tables
  where schemaname = 'public'
),
table_sizes as (
  select
    schemaname,
    relname as table_name,
    pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) as total_size_bytes,
    pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)) as total_size
  from pg_stat_user_tables
  where schemaname = 'public'
),
index_usage as (
  select schemaname, relname as table_name, indexrelname as index_name, idx_scan, idx_tup_read, idx_tup_fetch
  from pg_stat_user_indexes
  where schemaname = 'public'
),
unindexed_foreign_keys as (
  select tc.table_name, kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and not exists (
      select 1
      from pg_indexes pi
      where pi.schemaname = 'public'
        and pi.tablename = tc.table_name
        and pi.indexdef ilike '%(' || kcu.column_name || '%'
    )
)
select
  now() as collected_at,
  current_database() as database_name,
  (to_regclass('public.pg_stat_statements') is not null) as has_pg_stat_statements,
  coalesce((select jsonb_agg(to_jsonb(table_rows) order by row_count desc, table_name) from table_rows), '[]'::jsonb) as table_rows,
  coalesce((select jsonb_agg(to_jsonb(table_sizes) order by total_size_bytes desc, table_name) from table_sizes), '[]'::jsonb) as table_sizes,
  coalesce((select jsonb_agg(to_jsonb(index_usage) order by idx_scan desc, index_name) from index_usage), '[]'::jsonb) as index_usage,
  coalesce((select jsonb_agg(to_jsonb(unindexed_foreign_keys) order by table_name, column_name) from unindexed_foreign_keys), '[]'::jsonb) as unindexed_foreign_keys;
