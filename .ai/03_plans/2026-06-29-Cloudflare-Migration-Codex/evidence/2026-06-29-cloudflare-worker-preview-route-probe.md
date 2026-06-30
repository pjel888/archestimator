# Cloudflare Worker Preview Route Probe

Generated: 2026-06-29T16:04:24.849Z
Base URL: http://localhost:8787
Runs: 1
Overall: PASS

Credential-free Worker route probe. Passing means the required probes on the local/preview Worker URL serve the signed-out route contract only; non-required probes are recorded as findings. This is not provider deployment, custom-domain, authenticated workflow, database migration, upload-provider, analytics receipt, or rollback proof.

| Probe | Kind | Required | Run | Status | Duration | Cache-Control | Location | Reason | Result |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |
| health | health | yes | 1 | 200 | 294.36ms | no-store | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 168.47ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 13.07ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 13.68ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 12.67ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 11.64ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 9.36ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 12ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 8.47ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 13.24ms | private, no-cache, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 8.16ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 7.47ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 4.03ms | private, no-cache, no-store, max-age=0, must-revalidate | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 200 | 327.35ms | private, no-cache, no-store, max-age=0, must-revalidate, no-store | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 2194.13ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 18.9ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | sensitive_fail_closed_ok | PASS |
