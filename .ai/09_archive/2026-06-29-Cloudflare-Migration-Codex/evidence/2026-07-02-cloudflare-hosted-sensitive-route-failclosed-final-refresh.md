# Hosted Sensitive Route Fail-Closed Probe

Generated: 2026-07-02T04:37:35.210Z
Base URL: https://archestimator.com
Overall: PASS

Credential-free hosted probe for invalid share tokens and unauthenticated private image routes. It proves fail-closed/no-store behavior only; valid share tokens and private media fixtures remain separate owner-approved evidence gates.

| Route | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Location | Result |
| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| share-page-invalid-token | 1 | 404 | 1126.05ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-api-invalid-token | 1 | 404 | 1686.44ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| share-activity-invalid-token | 1 | 404 | 457.23ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-missing-path | 1 | 404 | 302.24ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-invalid-path | 1 | 404 | 576.35ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |
| project-image-valid-shaped-path | 1 | 404 | 178.44ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | (none) | PASS |

## Interpretation

This probe intentionally uses only a fake share token and unauthenticated private-image requests. It does not prove valid private-token or private-media latency. Any FAIL means the route either did not fail closed or did not carry a no-store cache policy and must remain provider-proof-open.
