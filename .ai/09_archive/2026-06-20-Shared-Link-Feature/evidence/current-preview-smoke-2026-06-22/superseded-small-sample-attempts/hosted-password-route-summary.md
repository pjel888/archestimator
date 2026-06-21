# Hosted Shared-Link Password Route Proof

Status: **SUPERSEDED TIMING ATTEMPT**

This 5-sample timing run was superseded by `../password-current-preview-rerun/hosted-password-route-summary.md`, which passed with 20 samples, and by `../current-preview-section-6-smoke-summary.md`, which passed the current-preview §6 password route checks.

- Generated: `2026-06-21T16:46:38.657Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app`
- Route: `/api/share/<redacted-token>/password`
- Samples: `5`
- p50: `1756.72 ms`
- p95: `7447.57 ms`
- Budget: `2500 ms`
- Cleanup: **PASS**

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 204 | 7447.57 ms |
| 2 | 204 | 1756.72 ms |
| 3 | 204 | 785.31 ms |
| 4 | 204 | 2527.72 ms |
| 5 | 204 | 1040.82 ms |

## Cleanup Counts

```json
{
  "project_publication_events": 0,
  "project_publications": 0,
  "projects": 0,
  "shared_link_events": 0,
  "workspaces": 0
}
```

Notes: measurement uses `vercel curl` against the protected preview deployment and the same same-origin CSRF cookie/header contract used by the browser form. The raw share token, password, CSRF token, cookies, and provider credentials are never written to this artifact.
