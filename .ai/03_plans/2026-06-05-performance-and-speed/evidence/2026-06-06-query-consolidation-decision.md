# Query consolidation decision — 2026-06-06

Status: **CONSOLIDATION NOT JUSTIFIED / LIVE PROVIDER PROOF OPEN**.

## Inputs reviewed

- `evidence/2026-06-06-query-inventory-repo-only.md`
  - Repo-only scanner: 262 Supabase query references, 103 migration index statements.
- `evidence/2026-06-06-per-route-query-inventory.md` / `.json`
  - 262 table/RPC references grouped into 7 route buckets.
  - Public-share/publication bucket: 68 refs, 14 tables, 3 RPCs.
  - Workshop projects/estimates bucket: 57 refs, 15 tables, 1 RPC.
  - Component-library bucket: 18 refs, 14 tables.
  - Project-charts bucket: 5 refs, 5 tables.
- `evidence/2026-06-06-shared-link-activity-benchmark.md` / `.json`
  - Public anonymous share activity path: 3 query fan-out.
  - Public recipient-session path: 5 query fan-out.
  - Owner include-telemetry path: 6 activity-table queries before auth/RBAC overhead.
  - Synthetic local composition stayed under 12ms for 2500 rows in that run.

## Decision

Do **not** consolidate query fan-out, add RPCs, or add database indexes in this packet.

The current evidence identifies surfaces to measure, but it does not prove a live bottleneck:

- selected-column counts are only a source-level payload proxy, not payload bytes;
- local synthetic composition does not prove Supabase latency or RLS cost;
- no live EXPLAIN, row counts, `pg_stat_statements`, provider query timings, or hosted route timings are attached;
- adding RPC consolidation now would risk RLS/role regressions without proving performance benefit.

## Reopen conditions

Only reopen query consolidation after Workstream 5.2 captures at least one of:

1. live/staging Supabase EXPLAIN showing expensive fan-out or missing index behavior;
2. provider query metrics or `pg_stat_statements` identifying repeated slow calls;
3. hosted route timing/payload evidence attributing latency to query count or payload size;
4. a security-reviewed RPC proposal with RLS/role parity tests and rollback plan.

## Guardrail

No database migration, index proposal, or RPC rewrite should be made from repo-static inventory alone.
