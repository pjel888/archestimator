# Hosted auth route smoke — 2026-06-06T03:20:55.109Z

Status: **PASSED**.

Mode: `hosted-auth-route-smoke`

Base URL: `https://www.archestimator.com`

Runs per provided case: 1

| Case | Result | Latest status | Latest redirect path | Cache-Control | Private/no-store | Min | Avg | Max | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signedOut | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | yes | 239ms | 239ms | 239ms |  |
| allowed | pass | 200 | n/a | private, no-cache, no-store, max-age=0, must-revalidate | yes | 876ms | 876ms | 876ms |  |
| denied | pass | 307 | /beta/access-required | private, no-cache, no-store, max-age=0, must-revalidate | yes | 635ms | 635ms | 635ms |  |
| revoked | pass | 307 | /beta/access-required?status=revoked | private, no-cache, no-store, max-age=0, must-revalidate | yes | 457ms | 457ms | 457ms |  |
| expired | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | yes | 82ms | 82ms | 82ms |  |

Note: Sanitized hosted auth smoke/benchmark. Session cookies and platform bypass headers are used only for requests and are never written to this report.
