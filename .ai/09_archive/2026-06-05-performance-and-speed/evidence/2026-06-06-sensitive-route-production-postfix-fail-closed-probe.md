# Hosted Sensitive Route Fail-Closed Probe

Generated: 2026-06-06T02:42:28.439Z
Base URL: https://www.archestimator.com
Overall: PASS

Credential-free hosted probe for invalid share tokens and unauthenticated private image routes. It proves fail-closed/no-store behavior only; valid share tokens and private media fixtures remain separate owner-approved evidence gates.

| Route | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Location | Result |
| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| share-page-invalid-token | 1 | 404 | 2464.43ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-page-invalid-token | 2 | 404 | 1276.28ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-page-invalid-token | 3 | 404 | 836.75ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-api-invalid-token | 1 | 404 | 2040.01ms | no-store | yes | no | (none) | PASS |
| share-api-invalid-token | 2 | 404 | 1919.79ms | no-store | yes | no | (none) | PASS |
| share-api-invalid-token | 3 | 404 | 1250.55ms | no-store | yes | no | (none) | PASS |
| share-activity-invalid-token | 1 | 404 | 1575.66ms | no-store | yes | no | (none) | PASS |
| share-activity-invalid-token | 2 | 404 | 1270.14ms | no-store | yes | no | (none) | PASS |
| share-activity-invalid-token | 3 | 404 | 3113.86ms | no-store | yes | no | (none) | PASS |
| project-image-missing-path | 1 | 404 | 1418.12ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-missing-path | 2 | 404 | 323.11ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-missing-path | 3 | 404 | 322.07ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-invalid-path | 1 | 404 | 419.56ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-invalid-path | 2 | 404 | 318.59ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-invalid-path | 3 | 404 | 346.89ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-valid-shaped-path | 1 | 404 | 330.08ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-valid-shaped-path | 2 | 404 | 606.64ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-valid-shaped-path | 3 | 404 | 320.43ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |

## Interpretation

This probe intentionally uses only a fake share token and unauthenticated private-image requests. It does not prove valid private-token or private-media latency. Any FAIL means the route either did not fail closed or did not carry a no-store cache policy and must remain provider-proof-open.
