# Hosted Shared-Link Password Route Proof

Status: **PASS**

- Generated: `2026-06-21T16:50:51.689Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app`
- Route: `/api/share/<redacted-token>/password`
- Samples: `20`
- p50: `1015.83 ms`
- p95: `2120.01 ms`
- Budget: `2500 ms`
- Cleanup: **PASS**

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 204 | 2796.52 ms |
| 2 | 204 | 867.16 ms |
| 3 | 204 | 602.76 ms |
| 4 | 204 | 1084.52 ms |
| 5 | 204 | 1016.99 ms |
| 6 | 204 | 2120.01 ms |
| 7 | 204 | 709.88 ms |
| 8 | 204 | 587.91 ms |
| 9 | 204 | 1967.10 ms |
| 10 | 204 | 1249.15 ms |
| 11 | 204 | 1289.96 ms |
| 12 | 204 | 532.74 ms |
| 13 | 204 | 1204.70 ms |
| 14 | 204 | 923.15 ms |
| 15 | 204 | 813.30 ms |
| 16 | 204 | 611.60 ms |
| 17 | 204 | 943.05 ms |
| 18 | 204 | 1204.02 ms |
| 19 | 204 | 1015.83 ms |
| 20 | 204 | 1392.65 ms |

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
