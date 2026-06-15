<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Linked Existing Performance Plans

This pack must not duplicate or contradict existing Archestimator performance planning surfaces. Future implementers should treat the following as linked inputs.

## Canonical linked inputs

| Existing artifact | Use for | How this pack uses it |
| --- | --- | --- |
| `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md` | Route-transition status and canonical route-performance plan | Source of truth for route-transition readiness; do not archive/complete without its gates. |
| `.ai/03_plans/route-transition-performance-optimization/IMPLEMENTATION_MATRIX.md` | Route-transition implementation/test mapping | Input to workshop/protected route validation. |
| `.ai/03_plans/database-indexing-and-query-performance/*` | Supabase EXPLAIN, pg_stat, index/query planning | Required before query/index work from scorecard H6/H7. |
| `.ai/03_plans/database-indexing-and-query-performance/05-validation-protocol-explain-and-pg-stat-statements.md` | DB measurement protocol | Use production `EXPLAIN`; use `EXPLAIN (ANALYZE, BUFFERS)` only in staging/representative safe environments. |
| `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` | Roadmap-level performance budget gates | Status sync and completion language should map back to this gate. |

## Integration rule

If a future performance PR touches route transitions or database/query/index behavior, it must update both this pack and the relevant linked plan/status artifact. If the linked plan says evidence is incomplete, this pack cannot mark the work complete.
