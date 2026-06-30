# Cloudflare D1 Performance Proof

Generated: 2026-06-29T19:34:24.980Z

Local-only D1 performance scaffold. It runs representative indexed SQLite read-model and authorization queries against sanitized temporary data, records query-budget and local p95 evidence, and removes temp artifacts. It does not read env files, call Cloudflare APIs, create D1 databases, deploy Workers, hit hosted routes, or prove hosted Worker+D1 performance.

## Summary

| Gate | Ready |
| --- | --- |
| Query-count budgets ready | yes |
| Local p95 route/action proof ready | yes |
| Hosted Worker+D1 performance ready | no |
| Local-only proof | yes |
| Provider-backed D1 proof | no |

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
| workspace_homebase_summary | 1/3 | 5.89ms/150ms | 2 | local-pass | Workspace summary read model should stay within one grouped D1 query plus authorization guard. |
| project_estimate_list_summaries | 1/3 | 5.1ms/150ms | 2 | local-pass | Project estimate list should avoid per-estimate follow-up queries. |
| library_overview_summary | 1/3 | 3.99ms/150ms | 3 | local-pass | Library overview should stay as a grouped indexed read-model query. |
| can_edit_project | 1/2 | 3.62ms/150ms | 1 | local-pass | Authorization guard should stay as one indexed membership lookup. |

## Hosted Proof Requirements

- Run the same route/action surfaces against a deployed Cloudflare Worker bound to a hosted D1 database.
- Capture p50/p95 duration, query count, rows returned, errors, and Cloudflare Worker CPU/duration/subrequest metrics.
- Compare hosted D1 numbers with the accepted current-provider baseline before cutover.
- Keep protected routes no-store and preserve authorization checks during performance proof.

## Blockers

- Hosted Worker+D1 performance proof is still missing.
