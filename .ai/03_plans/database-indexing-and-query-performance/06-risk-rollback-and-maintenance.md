# Risk, Rollback & Maintenance

**Date:** 2026-05-30

## Risks

### Index Bloat
Indexes grow with table data. Unused indexes still consume disk and slow writes. Regular review required.

### Write Slowdown
Every index adds overhead to INSERT, UPDATE, and DELETE. Write-heavy tables (estimate_row_items, estimate_sheet_events, ai_data_access_events) need careful index selection.

### Duplicate/Redundant Indexes
A new index may be a subset of an existing composite index. Always check `pg_indexes` before proposing.

### Stale Index Usage Stats
`idx_scan` counters reset on server restart. An index showing 0 scans may be unused, or may simply reflect a recent restart.

### Small-Table False Positives
On tables with <100 rows, Postgres often chooses a sequential scan even with an index. The index becomes useful only when the table grows.

### Production Locking
`CREATE INDEX` without `CONCURRENTLY` locks the table for writes. For production tables, always use `CREATE INDEX CONCURRENTLY`. However, `CONCURRENTLY` cannot run inside a transaction block.

### Supabase Migration Constraints
Supabase migrations run in transactions. `CREATE INDEX CONCURRENTLY` cannot be used inside a migration. For production indexes, run directly via SQL editor or schedule a maintenance window.

### RLS Policy Performance
Unindexed RLS policy predicates add hidden cost to every query. Always check that `workspace_id`, `project_id`, and `user_id` columns used in RLS policies are indexed.

## Rollback / Drop-Index Plan

Every index migration must include a corresponding drop statement:

```sql
-- Rollback
DROP INDEX IF EXISTS public.index_name;
```

## Review Cadence

| Milestone | Action |
|-----------|--------|
| Before beta | Complete DBIDX-001, DBIDX-002, DBIDX-003 |
| After first 5 beta partners | Review `pg_stat_user_indexes` for newly unused indexes |
| After first 50 real projects | Full index usage review; check for write slowdown |
| After component library exceeds 5,000 items | Review library/variant indexes |
| After estimate row items exceed 50,000 rows | Review estimate/tree indexes |
| After publication events exceed 100,000 rows | Review publication/event indexes |
| Quarterly | Unused-index cleanup; `pg_stat_statements` hotspot review |

---

## Deeper Risk Analysis

### Supabase Migration Transaction Risk

Normal Supabase migrations run inside a single transaction. `CREATE INDEX CONCURRENTLY` **cannot** run inside a transaction block. Therefore:

- Production index creation may need direct SQL via Supabase SQL Editor or a maintenance window.
- Do NOT put `CREATE INDEX CONCURRENTLY` inside a normal Supabase migration file.
- Any production index process must be owner-approved and documented.

### Constraint Indexes vs Removable Indexes

- Never drop a primary key, unique constraint, or required FK index without understanding the constraint it enforces.
- `idx_scan = 0` does NOT mean safe-to-drop if the index enforces uniqueness or supports a constraint.
- Always verify with `\d table_name` or `pg_indexes` that the index is not constraint-backed.

### Parent Delete/Update FK Scan Risk

Missing child-side FK indexes can cause problems beyond user-facing reads:

- Parent row deletes or updates may need to scan the child table to enforce `ON DELETE/UPDATE` rules.
- Without child-side FK indexes, these operations can create lock pressure or cascading latency.
- Even if user-facing reads are fine, FK indexes may be needed for relational maintenance.

### Write Overhead Classification

| Table Family | Write Frequency | Index Caution |
|-------------|----------------|---------------|
| `estimate_row_items` | High during editing | Add only evidence-backed indexes |
| `estimate_sheet_events` | High if activity logging grows | Prefer composite event indexes |
| `ai_data_access_events` | High if AI usage grows | Index only audit/read patterns |
| `ai_tool_calls` | Moderate-high | Index only join/read patterns |
| `project_publication_events` | Grows with shared-link opens/comments | Index activity feed patterns |
| Cost library history tables | Moderate | History indexes need order-aware design |
