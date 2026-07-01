# Cloudflare D1 Runtime Performance Proof

Generated: 2026-07-01T09:15:14.833Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Endpoint: /__cloudflare/d1-performance-proof
Provider backed: yes
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed proof Worker D1 performance endpoint with a local bearer secret, then records sanitized provider behavior: D1 binding/schema/seed/cleanup readiness and hosted indexed query p95/query-count proof. It does not print secret values, deploy Workers, change DNS, purchase plans, delete provider resources, or make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Query-count budgets ready | yes |
| Hosted p95 budgets ready | yes |
| Hosted Worker+D1 performance ready | yes |
| D1 runtime proof ready | yes |
| Production cutover | no |

## Sanitized Results

- D1 binding present: yes
- Schema ready: yes
- Seed ready: yes
- Cleanup ready: yes
- Rows seeded: 132
- Rows cleaned: 0
- Endpoint error: (none)

## Hosted Benchmark

| Surface | Planned/query budget | Hosted p95/budget | Samples | Rows returned | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| workspace_homebase_summary | 1/3 | 80ms/600ms | 9 | 2 | hosted-pass |
| project_estimate_list_summaries | 1/3 | 57ms/600ms | 9 | 2 | hosted-pass |
| library_overview_summary | 1/3 | 65ms/600ms | 9 | 3 | hosted-pass |
| can_edit_project | 1/2 | 55ms/600ms | 9 | 1 | hosted-pass |
| estimate_row_mutation | 1/3 | 91ms/500ms | 9 | 1 | hosted-pass |

## Blockers

- (none)
