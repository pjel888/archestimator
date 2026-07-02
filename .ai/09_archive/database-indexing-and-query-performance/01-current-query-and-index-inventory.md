# Current Query & Index Inventory

**Date:** 2026-05-30
**Status:** External review snapshot captured. Must be reconfirmed by DBIDX-001/002 before implementation.

## Purpose

This document defines the inventory that future agents must collect before any index can be proposed. If live Supabase introspection is not available to the agent, the exact read-only SQL queries are provided below. **Do not fake results.**

---

## External Review Snapshot — 2026-05-30 (Must Be Reconfirmed)

These findings are **review inputs from prior external review**, not final evidence. They must be reconfirmed by DBIDX-001/002 before any index implementation. Do not claim these are permanent truth. Do not create indexes from this snapshot alone.

- **Current table volumes are still small** — this is not an emergency migration.
- **Cache health** looked good in the prior review: index hit rate ~99.98%, table hit rate ~100%.
- **`pg_stat_statements`** was installed. **`pg_trgm`** was not installed.
- **Unindexed FK relationships** surfaced by Supabase advisor / catalog inspection, especially in:
  - `ai_data_access_events`, `ai_tool_calls`, `cost_library_items`, `cost_library_item_variant_attachments`, `cost_library_item_variant_cost_entries`, `ai_package_apply_commands`, `collaboration_invitations`, `estimate_sheet_events`, `estimate_template_row_items`, `collaboration_audit_events`, `estimate_row_items`
- **`pg_stat_statements` hotspot patterns** included: `library_folders`, `cost_library_items`, `cost_library_item_versions`, `cost_library_item_price_history`, `component_category_nodes`, `estimate_nodes`, `estimate_row_items`, `project_publications`
- **Possible shared-link schema drift:** app code references `shared_link_recipients`; local/commit history references shared-link tables; live schema may only show `project_publications` and `project_publication_events`; migration `20260528220000_project_shared_link_overhaul` may not be applied to the linked remote.

Run these against the linked Supabase project (`ebxxqidacheyapmmzavr`) or a staging target.

```sql
-- Table size and usage
SELECT
  relname AS table_name,
  n_live_tup AS live_rows,
  seq_scan,
  idx_scan,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- Index usage (least-used first — candidates for review)
SELECT
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- pg_stat_statements hotspots
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  rows,
  left(regexp_replace(query, '\s+', ' ', 'g'), 240) AS query_sample
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 25;

-- Unindexed FK coverage (left-prefix catalog check — corrected)
-- Checks whether FK columns are covered by a valid left-prefix index.
-- Partial indexes are intentionally excluded because they may not cover all FK values.
-- Composite indexes count only when FK columns are the left-prefix in the same order.
WITH fk_cols AS (
  SELECT
    con.oid AS constraint_oid,
    n.nspname AS schema_name,
    rel.relname AS table_name,
    con.conname AS fk_name,
    array_agg(att.attname ORDER BY u.ord) AS fk_columns,
    con.conkey AS conkey,
    rel.oid AS table_oid
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON TRUE
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = u.attnum
  WHERE con.contype = 'f'
    AND n.nspname = 'public'
  GROUP BY con.oid, n.nspname, rel.relname, con.conname, con.conkey, rel.oid
),
fk_index_match AS (
  SELECT
    fk.*,
    EXISTS (
      SELECT 1
      FROM pg_index idx
      WHERE idx.indrelid = fk.table_oid
        AND idx.indisvalid
        AND idx.indpred IS NULL
        AND (idx.indkey::smallint[])[1:array_length(fk.conkey, 1)] = fk.conkey::smallint[]
    ) AS has_covering_index
  FROM fk_cols fk
)
SELECT
  table_name,
  fk_name,
  fk_columns,
  has_covering_index
FROM fk_index_match
WHERE NOT has_covering_index
ORDER BY table_name, fk_name;

-- Unindexed FK summary by table
WITH fk_cols AS (
  SELECT
    con.oid AS constraint_oid,
    n.nspname AS schema_name,
    rel.relname AS table_name,
    con.conname AS fk_name,
    con.conkey AS conkey,
    rel.oid AS table_oid
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  WHERE con.contype = 'f'
    AND n.nspname = 'public'
),
fk_index_match AS (
  SELECT
    fk.*,
    EXISTS (
      SELECT 1
      FROM pg_index idx
      WHERE idx.indrelid = fk.table_oid
        AND idx.indisvalid
        AND idx.indpred IS NULL
        AND (idx.indkey::smallint[])[1:array_length(fk.conkey, 1)] = fk.conkey::smallint[]
    ) AS has_covering_index
  FROM fk_cols fk
)
SELECT
  table_name,
  COUNT(*) FILTER (WHERE NOT has_covering_index) AS unindexed_fk_count,
  COUNT(*) AS total_fk_count
FROM fk_index_match
GROUP BY table_name
HAVING COUNT(*) FILTER (WHERE NOT has_covering_index) > 0
ORDER BY unindexed_fk_count DESC, table_name;

-- Cache hit rate
SELECT
  'index hit rate' AS metric,
  round(sum(idx_blks_hit) * 100.0 / nullif(sum(idx_blks_hit + idx_blks_read), 0), 2) AS hit_rate_pct
FROM pg_statio_user_indexes
UNION ALL
SELECT
  'table hit rate',
  round(sum(heap_blks_hit) * 100.0 / nullif(sum(heap_blks_hit + heap_blks_read), 0), 2)
FROM pg_statio_user_tables;

-- Extension availability
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'hypopg', 'index_advisor');

-- Existing index inventory
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Table size and mutation pressure
SELECT
  relname AS table_name, n_live_tup AS live_rows,
  seq_scan, idx_scan, n_tup_ins, n_tup_upd, n_tup_del,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- Index use / potential bloat
SELECT
  schemaname, relname AS table_name,
  indexrelname AS index_name, idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- Schema parity: live tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Schema parity: applied migrations
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

---

## Sections to Complete During Audit

### Existing Indexes by Table

Each table with its current indexes. Source: `supabase/migrations/*.sql` and/or `pg_indexes`.

### Supabase Advisor Output Categories

Categorize advisor findings into:

- Missing FK indexes
- Missing composite indexes for common query patterns
- Redundant/overlapping indexes
- Unused indexes (idx_scan = 0 for extended period)

### Unindexed Foreign-Key Inventory

Tables with the most unindexed FKs (based on advisor + catalog query). Known hotspots:

| Table | Approximate Unindexed FKs (from advisor) |
|-------|----------------------------------------|
| `ai_data_access_events` | 8 |
| `ai_tool_calls` | 7 |
| `cost_library_items` | 7 |
| `collaboration_invitations` | 4–6 |
| `estimate_sheet_events` | 4–6 |
| `estimate_row_items` | 4–6 |
| `cost_library_item_price_options` | 4–6 |

### `pg_stat_statements` Query Hotspots

Top 25 queries by total execution time. Flag queries that:

- Show high mean execution time (>10ms)
- Show sequential scans on tables with >100 rows
- Match known critical user flow patterns

### Table Size and Row-Count Snapshot

Per-table row counts and insert/update/delete rates.

### Cache Hit-Rate Snapshot

Index and table cache hit rates from `pg_statio_user_indexes` and `pg_statio_user_tables`.

### RLS Policy Predicate Columns

For each table with RLS, document the predicate columns used (typically `workspace_id`, `project_id`, `user_id`). These are critical index targets.

### Migration Parity Status

Local migration list vs live schema. Especially check:

- `shared_link_recipients`
- `shared_link_comments`
- `shared_link_responses`
- `shared_link_events`

The migration `20260528220000_project_shared_link_overhaul` may not be applied to the linked remote.

---

## ⚠️ Warning: `pg_stat_statements` Interpretation

`pg_stat_statements` accumulates all queries, including agent/test/CLI usage. Local/dev/demo queries can overrepresent patterns that real users will never hit. Treat results as directional, not definitive. Cross-reference with codebase query patterns and critical user flows.

## Interpretation Rules

- Small tables can seq scan and still be fine. High seq_scan count on tiny tables is not automatically a problem.
- High mean latency on critical user flow queries matters more than raw scan count.
- RLS-heavy predicates should be checked even when query latency is currently low.
- Live dev data can be distorted by agent/test usage.
- A table with high writes and low reads should not get speculative indexes.
- FK coverage query excludes partial indexes (may not cover all FK values). Composite indexes count only when FK columns are the left-prefix in the same order.
