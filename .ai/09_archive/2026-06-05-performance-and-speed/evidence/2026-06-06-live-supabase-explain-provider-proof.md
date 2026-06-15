# Live Supabase EXPLAIN/provider proof — 2026-06-06

Status: **LIVE PROVIDER PROOF CAPTURED / NO MIGRATION PROPOSAL JUSTIFIED**.

## Scope and safety

- Provider: Supabase project `ebxxqidacheyapmmzavr` (`Archestimator`), region `ap-southeast-2`.
- Database: Postgres `17.6`; MCP query executed as `postgres` at `2026-06-05 20:34:56+00`.
- Method: read-only aggregate table/index stats, `pg_stat_statements`, focused `EXPLAIN (ANALYZE, BUFFERS)`, and Supabase performance advisor output.
- Privacy: no application rows, emails, tokens, user names, project names, or estimate contents were copied into this artifact.
- Limitation: MCP/admin SQL does not represent browser-authenticated RLS execution cost exactly. Treat this as live provider proof for current beta data volume, not production-scale proof.

## Live row-count and table-stat snapshot

Current beta data is small. Largest sampled route/performance tables:

| Table | Live rows | Dead rows | seq_scan | idx_scan | Analyze seen |
| --- | ---: | ---: | ---: | ---: | --- |
| `project_publication_events` | 1167 | 127 | 3 | 17 | 2026-06-01 |
| `cost_library_item_price_options` | 155 | 4 | 795 | 3529 | 2026-05-28 |
| `cost_library_items` | 154 | 64 | 1979 | 15067 | 2026-05-28 |
| `estimate_nodes` | 117 | 15 | 17200 | 150188 | 2026-06-01 |
| `estimate_row_items` | 101 | 50 | 633 | 12615 | 2026-06-04 |
| `estimate_sheet_events` | 45 | 6 | 698 | 654 | 2026-05-29 |
| `project_publications` | 10 | 31 | 5296 | 481 | 2026-06-01 |
| `collaboration_invitations` | 6 | 37 | 2152 | 219 | 2026-05-31 |
| `security_rate_limit_events` | 5 | 14 | 1432 | 1636 | 2026-06-01 |

## `pg_stat_statements` snapshot

`pg_stat_statements` is installed and available. Highest sampled total execution time among target surfaces:

| Surface | Calls | Mean exec | Total exec | Notes |
| --- | ---: | ---: | ---: | --- |
| Cost library item list | 313 | 27.21ms | 8516.29ms | PostgREST normalized query against `cost_library_items` by `workspace_id`, ordered by category/name. |
| Cost library item list variant | 355 | 17.06ms | 6055.18ms | Same table/order family. |
| Estimate node compact read | 519 | 8.91ms | 4622.84ms | Explicit columns from `estimate_nodes`. |
| Cost library price options | 328 | 13.85ms | 4542.95ms | `cost_library_item_price_options` by workspace/item filters. |
| Estimate nodes wildcard read | 1369 | 3.29ms | 4507.54ms | `estimate_nodes` by `estimate_id`, order/limit. |
| Estimate row wildcard read | 308 | 13.95ms | 4295.37ms | `estimate_row_items` by `estimate_id`, order/limit. |
| Estimate move RPC | 61 | 36.68ms | 2237.53ms | RPC using `move_updates`; keep as future focused profile candidate. |
| Publication event insert | 1703 | 1.09ms | 1859.40ms | Insert path, not a read-query migration target. |

Interpretation: current observed means do not justify speculative index/RPC migrations for closed beta. The cost-library list and estimate move/read families are the best future profiling candidates if production/provider latency rises.

## Focused EXPLAIN results

Representative read paths used existing IDs via subqueries but returned no application rows.

| Query family | Plan summary | Execution time | Migration implication |
| --- | --- | ---: | --- |
| Cost-library list by workspace, ordered by category/name | Small-table seq scan over 154 rows plus quicksort 46kB; workspace lookup used `cost_library_items_workspace_id_idx`. | 2.563ms | No index proposal justified at 154 rows; revisit with higher row counts or hosted latency. |
| Estimate nodes by estimate, ordered by sort order | Small-table seq scan over 117 rows plus quicksort 31kB. | 0.182ms | No migration justified from current rows. Existing `estimate_nodes_estimate_parent_sort_idx`/sort indexes remain available for larger data. |
| Estimate row items by estimate, ordered by sort order | Bitmap index scan using `estimate_row_items_estimate_node_sort_idx`, then quicksort 32kB. | 0.922ms | Existing index is effective; no migration justified. |
| Project publication lookup by token hash | Index scan using `project_publications_token_hash_idx`. | 0.228ms | Existing token index is effective. |
| Project publication events by publication, newest first | Index scan using `project_publication_events_publication_created_idx`. | 3.060ms | Existing publication/created index is effective; current row count is low. |
| Security rate-limit lookup | Seq scan over 5 live rows; 0 result for last-hour sample. | 0.161ms | No migration justified at current volume; existing lookup index remains important as volume grows. |

## Supabase performance advisor snapshot

The Supabase performance advisor returned INFO/WARN findings, mainly:

- unindexed foreign keys on AI/audit/collaboration/beta-feedback tables;
- multiple permissive RLS policies on several membership/workspace tables;
- Auth DB connection strategy configured as an absolute connection count.

These are valid future governance/performance inputs, but this PR-0B performance branch does **not** add migrations because:

1. current beta route tables are small;
2. focused EXPLAINs do not show a proven bottleneck on the route surfaces being optimized;
3. unindexed-FK and RLS-policy consolidation require security/data-model review beyond this performance packet;
4. the plan requires owner-approved migration proposals after live proof, not automatic DDL.

## Workstream 5.2 decision

Workstream 5.2 is satisfied for this branch as live provider proof: live table stats, `pg_stat_statements`, Supabase advisors, and focused EXPLAIN plans were captured before any migration proposal. Decision: **do not add indexes, RPC rewrites, or query consolidation migrations from current evidence**.

Reopen conditions:

- representative closed-beta data grows materially beyond current row counts;
- hosted Supabase latency/function duration rises on cost-library, estimate tree/row, publication, or AI package-builder surfaces;
- a security-reviewed RLS policy consolidation plan is approved;
- owner explicitly approves a migration proposal for advisor findings.
