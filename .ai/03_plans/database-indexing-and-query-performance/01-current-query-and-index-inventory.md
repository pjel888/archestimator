# Current Query & Index Inventory

**Date:** 2026-05-30
**Status:** Placeholder — live data must be collected by a future audit agent.

## Purpose

This document defines the inventory that future agents must collect before any index can be proposed. If live Supabase introspection is not available to the agent, the exact read-only SQL queries are provided below. **Do not fake results.**

---

## Read-Only SQL for Live Introspection

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

-- Unindexed foreign keys (via catalog)
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text NOT IN (
    SELECT DISTINCT relname
    FROM pg_stat_user_indexes si
    JOIN pg_index i ON si.indexrelid = i.indexrelid
    WHERE schemaname = 'public'
  )
ORDER BY table_name;

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
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_stat_statements', 'pg_trgm');
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
