# Hosted Shared-Link Recipient + Activity Performance Proof

Status: **SUPERSEDED MIXED TIMING RUN**

This run is retained as raw timing evidence. It closed PERF-01A recipient-link timing (`1622.11 ms` p95 vs `2500 ms`) but did not close PERF-04 provider activity timing. PERF-04 is instead closed by `../perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md`, and current-preview route health is proven by `../current-preview-smoke-2026-06-22/current-preview-section-6-smoke-summary.md`.

- Generated: `2026-06-21T16:03:11.531Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app`
- Recipient route: `/share/<redacted-token>?recipient=<redacted>`
- Activity route: `/api/share/<redacted-token>/activity?limit=100`
- Samples per route: `20`
- Warm-up samples per route: `3` (reported in JSON; excluded from p50/p95)
- Recipient-link p50/p95: `1055.76 ms` / `1622.11 ms` (budget `2500 ms`)
- Hosted activity API p50/p95: `1338.54 ms` / `2439.84 ms` (observed through protected-preview tunnel; not the PERF-04 close gate)
- Provider activity query p50/p95: `1503.96 ms` / `2257.48 ms` (budget `1200 ms`)
- Cleanup: **PASS**

## Recipient-Link Samples

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 200 | 412.59 ms |
| 2 | 200 | 1097.88 ms |
| 3 | 200 | 754.82 ms |
| 4 | 200 | 1055.76 ms |
| 5 | 200 | 1145.64 ms |
| 6 | 200 | 8280.25 ms |
| 7 | 200 | 1404.79 ms |
| 8 | 200 | 1117.41 ms |
| 9 | 200 | 1622.11 ms |
| 10 | 200 | 882.97 ms |
| 11 | 200 | 860.95 ms |
| 12 | 200 | 960.87 ms |
| 13 | 200 | 821.29 ms |
| 14 | 200 | 993.92 ms |
| 15 | 200 | 958.22 ms |
| 16 | 200 | 1403.62 ms |
| 17 | 200 | 1520.98 ms |
| 18 | 200 | 1545.43 ms |
| 19 | 200 | 1292.52 ms |
| 20 | 200 | 929.96 ms |

## Activity API Samples

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 200 | 1134.66 ms |
| 2 | 200 | 1338.54 ms |
| 3 | 200 | 707.69 ms |
| 4 | 200 | 1731.60 ms |
| 5 | 200 | 1385.02 ms |
| 6 | 200 | 1311.53 ms |
| 7 | 200 | 1036.07 ms |
| 8 | 200 | 1298.35 ms |
| 9 | 200 | 1342.91 ms |
| 10 | 200 | 2180.49 ms |
| 11 | 200 | 1143.95 ms |
| 12 | 200 | 1477.42 ms |
| 13 | 200 | 1137.60 ms |
| 14 | 200 | 2439.84 ms |
| 15 | 200 | 1551.73 ms |
| 16 | 200 | 1048.02 ms |
| 17 | 200 | 953.35 ms |
| 18 | 200 | 2083.28 ms |
| 19 | 200 | 2552.98 ms |
| 20 | 200 | 2286.47 ms |

## Provider Activity Query Samples

| Sample | Comments | Recipients | Query-shape time |
| ---: | ---: | ---: | ---: |
| 1 | 100 | 1 | 1253.30 ms |
| 2 | 100 | 1 | 1184.18 ms |
| 3 | 100 | 1 | 2628.34 ms |
| 4 | 100 | 1 | 1545.01 ms |
| 5 | 100 | 1 | 1825.64 ms |
| 6 | 100 | 1 | 1503.96 ms |
| 7 | 100 | 1 | 2257.48 ms |
| 8 | 100 | 1 | 1417.11 ms |
| 9 | 100 | 1 | 2069.05 ms |
| 10 | 100 | 1 | 1487.09 ms |
| 11 | 100 | 1 | 1593.69 ms |
| 12 | 100 | 1 | 1348.11 ms |
| 13 | 100 | 1 | 1074.56 ms |
| 14 | 100 | 1 | 2074.06 ms |
| 15 | 100 | 1 | 1893.21 ms |
| 16 | 100 | 1 | 801.49 ms |
| 17 | 100 | 1 | 1028.21 ms |
| 18 | 100 | 1 | 961.26 ms |
| 19 | 100 | 1 | 1508.42 ms |
| 20 | 100 | 1 | 1868.86 ms |

## Cleanup Counts

```json
{
  "project_publication_events": 0,
  "project_publications": 0,
  "projects": 0,
  "shared_link_comments": 0,
  "shared_link_events": 0,
  "shared_link_recipients": 0,
  "shared_link_responses": 0,
  "workspaces": 0
}
```

Notes: recipient and hosted-activity measurements use `vercel curl` against the protected preview deployment. Recipient-link timing gates PERF-01A. Hosted activity must return HTTP 200, but PERF-04 is closed by the provider activity query harness because the plan accepts provider-side timing for the indexed query shape and the protected-preview tunnel adds non-app variance. The provider harness performs the route's compact-publication lookup, public comment page, and recipient-label lookup without selecting `snapshot_json`. The fixture writes one disposable no-password publication, one recipient, and 100 public comments, then deletes the workspace and verifies cascade cleanup. Raw publication tokens, recipient tokens, cookies, and provider credentials are never written to this artifact.
