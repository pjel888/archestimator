# Hosted Sensitive Route Fail-Closed Probe

Generated: 2026-06-06T02:19:02.592Z
Base URL: https://www.archestimator.com
Overall: FAIL

Credential-free hosted probe for invalid share tokens and unauthenticated private image routes. It proves fail-closed/no-store behavior only; valid share tokens and private media fixtures remain separate owner-approved evidence gates.

| Route | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Location | Result |
| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| share-page-invalid-token | 1 | 404 | 1959.84ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-page-invalid-token | 2 | 404 | 1272.63ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-api-invalid-token | 1 | 404 | 1289.65ms | no-store | yes | no | (none) | PASS |
| share-api-invalid-token | 2 | 404 | 2545.43ms | no-store | yes | no | (none) | PASS |
| share-activity-invalid-token | 1 | 404 | 1294.44ms | no-store | yes | no | (none) | PASS |
| share-activity-invalid-token | 2 | 404 | 2099.45ms | no-store | yes | no | (none) | PASS |
| project-image-missing-path | 1 | 307 | 447.65ms | public, max-age=0, must-revalidate | no | no | /login | FAIL |
| project-image-missing-path | 2 | 307 | 320.05ms | public, max-age=0, must-revalidate | no | no | /login | FAIL |
| project-image-invalid-path | 1 | 307 | 321.47ms | public, max-age=0, must-revalidate | no | no | /login | FAIL |
| project-image-invalid-path | 2 | 307 | 638.11ms | public, max-age=0, must-revalidate | no | no | /login | FAIL |

## Interpretation

This probe intentionally uses only a fake share token and unauthenticated private-image requests. It does not prove valid private-token or private-media latency. Any FAIL means the route either did not fail closed or did not carry a no-store cache policy and must remain provider-proof-open.
