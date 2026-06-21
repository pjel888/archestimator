# Hosted Shared-Link Recipient + Activity Performance Proof

Status: **SUPERSEDED TIMING ATTEMPT**

This small-sample timing run was superseded for archive by `../current-preview-section-6-smoke-summary.md`, which passed the current-preview §6 route checks, and by the provider PERF-04 evidence in `../../perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md`.

- Generated: `2026-06-21T16:47:23.495Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app`
- Recipient route: `/share/<redacted-token>?recipient=<redacted>`
- Activity route: `/api/share/<redacted-token>/activity?limit=100`
- Samples per route: `5`
- Warm-up samples per route: `1` (reported in JSON; excluded from p50/p95)
- Recipient-link p50/p95: `551.15 ms` / `2278.96 ms` (budget `2500 ms`)
- Hosted activity API p50/p95: `1108.59 ms` / `2555.95 ms` (observed through protected-preview tunnel; not the PERF-04 close gate)
- Provider activity query p50/p95: `1400.21 ms` / `2071.54 ms` (budget `1200 ms`)
- Cleanup: **PASS**

## Recipient-Link Samples

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 200 | 2278.96 ms |
| 2 | 200 | 551.15 ms |
| 3 | 200 | 532.30 ms |
| 4 | 200 | 949.12 ms |
| 5 | 200 | 381.92 ms |

## Activity API Samples

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 200 | 643.18 ms |
| 2 | 200 | 1033.73 ms |
| 3 | 200 | 1108.59 ms |
| 4 | 200 | 2176.06 ms |
| 5 | 200 | 2555.95 ms |

## Provider Activity Query Samples

| Sample | Comments | Recipients | Query-shape time |
| ---: | ---: | ---: | ---: |
| 1 | 100 | 1 | 1685.51 ms |
| 2 | 100 | 1 | 1350.50 ms |
| 3 | 100 | 1 | 1400.21 ms |
| 4 | 100 | 1 | 2071.54 ms |
| 5 | 100 | 1 | 1088.49 ms |

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
