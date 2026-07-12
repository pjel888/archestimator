# Cloudflare D1 Performance Proof

Generated: 2026-06-30T09:15:01.648Z

D1 performance proof combines a local SQLite query-budget scaffold with hosted Worker+D1 runtime evidence from the deployed proof Worker. It records sanitized rows only and does not make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Query-count budgets ready | yes |
| Local p95 route/action proof ready | yes |
| Hosted Worker+D1 performance ready | yes |
| Local-only proof | no |
| Provider-backed D1 proof | yes |

## Local Benchmark

| Item | Value |
| --- | ---: |
| SQLite version | 3.54.0 |
| Fixture tables | 6 |
| Rows seeded | 132 |
| Benchmark surfaces | 4 |
| Temp artifacts removed | yes |

## Query Surfaces

| Surface | Planned/query budget | Local p95/budget | Rows returned | Status | Notes |
| --- | ---: | ---: | ---: | --- | --- |
| workspace_homebase_summary | 1/3 | 6.87ms/150ms | 2 | local-pass | Workspace summary read model should stay within one grouped D1 query plus authorization guard. |
| project_estimate_list_summaries | 1/3 | 5.56ms/150ms | 2 | local-pass | Project estimate list should avoid per-estimate follow-up queries. |
| library_overview_summary | 1/3 | 4.28ms/150ms | 3 | local-pass | Library overview should stay as a grouped indexed read-model query. |
| can_edit_project | 1/2 | 4.25ms/150ms | 1 | local-pass | Authorization guard should stay as one indexed membership lookup. |

## Hosted D1 Runtime Benchmark

Source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-d1-runtime-performance-proof.json

| Item | Value |
| --- | ---: |
| Schema ready | yes |
| Seed ready | yes |
| Cleanup ready | yes |
| Rows seeded | 132 |
| Rows cleaned | 0 |

| Surface | Planned/query budget | Hosted p95/budget | Samples | Rows returned | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| workspace_homebase_summary | 1/3 | 65ms/600ms | 9 | 2 | hosted-pass |
| project_estimate_list_summaries | 1/3 | 76ms/600ms | 9 | 2 | hosted-pass |
| library_overview_summary | 1/3 | 57ms/600ms | 9 | 3 | hosted-pass |
| can_edit_project | 1/2 | 61ms/600ms | 9 | 1 | hosted-pass |

## Hosted Proof Requirements

- Run the same route/action surfaces against a deployed Cloudflare Worker bound to a hosted D1 database.
- Capture p50/p95 duration, query count, rows returned, errors, and Cloudflare Worker CPU/duration/subrequest metrics.
- Compare hosted D1 numbers with the accepted current-provider baseline before cutover.
- Keep protected routes no-store and preserve authorization checks during performance proof.

## Blockers

- (none)
