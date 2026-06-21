# Shared-link activity benchmark — 2026-06-21

Status: **LOCAL BENCHMARK CAPTURED / HOSTED SUPABASE PROOF OPEN**.

Synthetic local CPU benchmark for shared-link activity merge/sort/compose and static query fan-out. It does not prove Supabase latency, RLS cost, hosted function duration, or production p95/p99 behavior.

## Static query fan-out

| Path | Query count | Tables | Notes |
| --- | ---: | --- | --- |
| public-anonymous | 3 | project_publications, shared_link_comments, shared_link_recipients | Current public GET loads publication, public comments, and recipient display names when comments include recipient ids; responses/events are skipped without a verified recipient session. |
| public-recipient-session | 5 | project_publications, shared_link_comments, shared_link_responses, shared_link_events, shared_link_recipients | Verified recipient session adds response and event queries; all activity table reads are paginated with limit + 1. |
| owner-include-access-telemetry | 6 | project_publications, shared_link_comments, shared_link_responses, shared_link_events, project_publication_events, shared_link_recipients | Owner server action also performs auth/RBAC outside this activity-table count; this plan covers the activity fan-out to benchmark before RPC or pagination rewrites. |

## Local composition benchmark

Page limit: 100. Activity counts are synthetic combined comments, decisions, shared-link events, and access telemetry rows.

| Synthetic activity rows | Owner ms | Public anonymous ms | Public recipient-session ms | Owner returned | Public anonymous returned | Public recipient returned | RSS MiB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 8.45 | 2.78 | 5.14 | 99 | 20 | 70 | 53.83 |
| 500 | 5.93 | 5.96 | 4.85 | 100 | 100 | 100 | 84.7 |
| 1000 | 16.47 | 6.24 | 7.85 | 100 | 100 | 100 | 96.97 |
| 2500 | 16.04 | 10.79 | 11.9 | 100 | 100 | 100 | 102.89 |
| 10000 | 56.33 | 40.42 | 40.07 | 100 | 100 | 100 | 112.09 |

## Interpretation

- The current implementation fans out across comments, decisions, events, optional access telemetry, and recipient display-name lookup.
- Public anonymous activity is cheaper because it skips recipient responses/events and internal comments.
- This benchmark is local CPU-only; do not use it to claim hosted latency or Supabase query performance.
- Before RPC consolidation, tighter pagination, or index proposals, capture live Supabase EXPLAIN/provider metrics and hosted endpoint timing.
