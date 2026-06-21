# Hosted Shared-Link Password Route Proof

Status: **PASS**

- Generated: `2026-06-21T14:36:25.053Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-lgni894nv-philipjonlewis-projects.vercel.app`
- Route: `/api/share/<redacted-token>/password`
- Samples: `20`
- p50: `1322.66 ms`
- p95: `2327.11 ms`
- Budget: `2500 ms`
- Cleanup: **PASS**

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
| 1 | 204 | 3902.33 ms |
| 2 | 204 | 1129.27 ms |
| 3 | 204 | 1762.60 ms |
| 4 | 204 | 1890.43 ms |
| 5 | 204 | 1113.53 ms |
| 6 | 204 | 954.41 ms |
| 7 | 204 | 2114.31 ms |
| 8 | 204 | 1457.20 ms |
| 9 | 204 | 2327.11 ms |
| 10 | 204 | 933.97 ms |
| 11 | 204 | 1854.83 ms |
| 12 | 204 | 1322.66 ms |
| 13 | 204 | 769.85 ms |
| 14 | 204 | 1114.69 ms |
| 15 | 204 | 1157.11 ms |
| 16 | 204 | 1751.61 ms |
| 17 | 204 | 1149.57 ms |
| 18 | 204 | 1844.07 ms |
| 19 | 204 | 1462.34 ms |
| 20 | 204 | 984.48 ms |

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
