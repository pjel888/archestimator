# Hosted Shared-Link Password Route Proof

Status: **SUPERSEDED COLD-START OBSERVATION**

This 5-sample cold-start observation is retained as diagnostic evidence. It was superseded by `hosted-password-route-summary.md`, which passed the 20-sample hosted password route budget, and by `../current-preview-smoke-2026-06-22/current-preview-section-6-smoke-summary.md`, which passed the current-preview §6 password checks.

- Generated: `2026-06-21T14:23:49.311Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-2tdtd8jmg-philipjonlewis-projects.vercel.app`
- Route: `/api/share/<redacted-token>/password`
- Samples: `5`
- p50: `1748.23 ms`
- p95: `5415.54 ms`
- Budget: `2500 ms`
- Cleanup: **PASS**

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 204 | 5415.54 ms |
| 2 | 204 | 1172.87 ms |
| 3 | 204 | 1748.23 ms |
| 4 | 204 | 1793.74 ms |
| 5 | 204 | 1708.94 ms |

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
