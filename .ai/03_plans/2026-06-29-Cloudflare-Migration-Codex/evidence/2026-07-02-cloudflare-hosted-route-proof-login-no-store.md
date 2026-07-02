# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T23:19:43.850Z
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
| health | health | yes | 1 | 200 | 659.44ms | 0.18ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 83.27ms | 4.49ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 693.77ms | 11.32ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 240.34ms | 6.36ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 678.58ms | 6.15ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 552.11ms | 4.39ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 610.22ms | 5.83ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 737.76ms | 2.17ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 699.79ms | 4.07ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 60.2ms | 5.32ms | max-age=14400, s-maxage=31536000 | HIT | 57980 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 61ms | 5.62ms | max-age=14400, s-maxage=31536000 | HIT | 21827 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 749.85ms | 3.99ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 56.66ms | 6.97ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 55.14ms | 0.03ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 687.91ms | 7.74ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 64.15ms | 7ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
