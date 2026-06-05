# Shared-link activity benchmark — 2026-06-06

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
| 100 | 2.64 | 1.01 | 1.39 | 99 | 20 | 70 | 46.84 |
| 500 | 3.68 | 3.01 | 2.94 | 100 | 100 | 100 | 67.19 |
| 1000 | 5.47 | 4.2 | 5.86 | 100 | 100 | 100 | 92.25 |
| 2500 | 11.44 | 9.97 | 7.84 | 100 | 100 | 100 | 100.14 |

## Interpretation

- The current implementation fans out across comments, decisions, events, optional access telemetry, and recipient display-name lookup.
- Public anonymous activity is cheaper because it skips recipient responses/events and internal comments.
- This benchmark is local CPU-only; do not use it to claim hosted latency or Supabase query performance.
- Before RPC consolidation, tighter pagination, or index proposals, capture live Supabase EXPLAIN/provider metrics and hosted endpoint timing.
