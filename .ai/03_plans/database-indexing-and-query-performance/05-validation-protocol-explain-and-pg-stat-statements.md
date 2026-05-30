# Validation Protocol: EXPLAIN & pg_stat_statements

**Date:** 2026-05-30

## How to Run EXPLAIN Safely

```sql
-- Basic EXPLAIN (no execution — safe for production)
EXPLAIN SELECT ... FROM ... WHERE ... ORDER BY ...;

-- EXPLAIN ANALYZE (executes query — use in staging only)
EXPLAIN (ANALYZE, BUFFERS) SELECT ... FROM ... WHERE ... ORDER BY ...;
```

**Rules:**
- Use `EXPLAIN` (without ANALYZE) on production for plan inspection
- Use `EXPLAIN (ANALYZE, BUFFERS)` on staging with representative seed data
- Never run `EXPLAIN ANALYZE` on production write-heavy tables during peak usage

## How to Compare Before/After

1. Capture `EXPLAIN` output before any index is added
2. Add candidate index in staging
3. Run same `EXPLAIN (ANALYZE, BUFFERS)` with representative seed data
4. Compare: plan type (Seq Scan → Index Scan), execution time, buffer usage
5. Document: query, before plan, after plan, time delta, index used

## How to Capture pg_stat_statements

```sql
-- Reset counters (staging only, before benchmark session)
SELECT pg_stat_statements_reset();

-- After benchmark session, capture hotspots
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
```

## Classification Rules

| Classification | Criteria | Action |
|---------------|----------|--------|
| Acceptable | Index scan or bitmap scan, <5ms mean | No action |
| Monitor | Seq scan on table <1,000 rows, <20ms mean | Reevaluate when table grows |
| Needs index | Seq scan on table >1,000 rows, >20ms mean, matches known query shape | Propose candidate index |
| Needs query optimization | Seq scan with complex joins, filters not matching any indexable column | Review query before indexing |

## Index Validity Rules

- **Index is valid** only if tied to a real query shape from codebase
- **Index is valid** only if it improves plan or protects known scale
- **Index is invalid** if it duplicates an existing equivalent index
- **Index is risky** if it targets a write-heavy table without clear read benefit
- **Production index application** must consider lock behavior
- `CREATE INDEX CONCURRENTLY` may be required for large production tables, but **cannot run inside a normal transaction** and must be handled carefully

## Avoiding Overfitting

- Benchmark with representative seed data, not 5 rows
- Test with varied filters (different workspace_id, project_id values)
- Test warm-cache and cold-cache scenarios
- Do not conclude from a single `EXPLAIN ANALYZE` run — run 3-5 times and take median
