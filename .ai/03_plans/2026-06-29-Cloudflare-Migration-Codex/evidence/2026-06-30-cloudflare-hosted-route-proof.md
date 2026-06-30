# Cloudflare Hosted Worker Route Proof

Generated: 2026-06-30T09:43:02.141Z
Configured: yes
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Runs: 1
Fake token: redacted-fake-token
Route contract ready: yes
Hosted route proof ready: yes

Hosted, credential-free Worker route proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtime flows, or make Vercel/Supabase/Resend removable.

## Blockers

- (none)

## Probes

| Probe | Kind | Required | Run | Status | Duration | Cache-Control | Location | Reason | Result |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |
| health | health | yes | 1 | 200 | 2815.88ms | no-store | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 751.54ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 103.69ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 87.6ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 117.79ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 86.82ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 100.57ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 511.77ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 77.87ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 85.3ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 63.87ms | s-maxage=31536000 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 62.54ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 49.4ms | private, no-cache, no-store, max-age=0, must-revalidate | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 200 | 89.06ms | private, no-cache, no-store, max-age=0, must-revalidate, no-store | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 1755.27ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 65.34ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | sensitive_fail_closed_ok | PASS |
