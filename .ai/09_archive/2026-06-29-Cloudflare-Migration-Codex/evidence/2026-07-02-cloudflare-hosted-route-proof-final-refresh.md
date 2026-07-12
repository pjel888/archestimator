# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T04:35:24.198Z
Configured: yes
Base URL: https://archestimator.com
Runs: 1
Fake token: redacted-fake-token
Route contract ready: yes
Hosted route proof ready: yes

Hosted, credential-free Worker route proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtime flows, or make Vercel/Supabase/Resend removable.

## Blockers

- (none)

## Probes

| Probe | Kind | Required | Run | Status | TTFB | Body download | Cache-Control | CF Cache | Age | Prerender | Location | Reason | Result |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |
| health | health | yes | 1 | 200 | 5961.18ms | 0.75ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 118.61ms | 88.72ms | max-age=14400, s-maxage=31536000 | HIT | 76917 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1733.02ms | 39.77ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 65.5ms | 23.3ms | max-age=14400, s-maxage=31536000 | HIT | 76918 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 757.86ms | 23.33ms | max-age=14400, s-maxage=31536000 | HIT | 76919 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 291.21ms | 22.2ms | max-age=14400, s-maxage=31536000 | HIT | 76918 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 86.24ms | 12.75ms | max-age=14400, s-maxage=31536000 | HIT | 76918 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 602.75ms | 18.23ms | max-age=14400, s-maxage=31536000 | HIT | 76918 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 548.47ms | 9.09ms | max-age=14400, s-maxage=31536000 | HIT | 76918 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 752.47ms | 9.64ms | max-age=14400, s-maxage=31536000 | HIT | 76918 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 504.36ms | 7.59ms | max-age=14400, s-maxage=31536000 | HIT | 40766 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 1149.63ms | 7.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 540.45ms | 8.45ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 61.73ms | 0.64ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 1019.1ms | 8.83ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 628.49ms | 6.82ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
