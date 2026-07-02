# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T21:56:26.902Z
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
| health | health | yes | 1 | 200 | 159.58ms | 0.32ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 66.62ms | 5.6ms | max-age=14400, s-maxage=31536000 | HIT | 52987 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 58.99ms | 5.01ms | max-age=14400, s-maxage=31536000 | HIT | 52986 | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 56.13ms | 4.38ms | max-age=14400, s-maxage=31536000 | HIT | 52986 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 55.7ms | 4.85ms | max-age=14400, s-maxage=31536000 | HIT | 52986 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 55.6ms | 5.21ms | max-age=14400, s-maxage=31536000 | HIT | 52985 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 58.76ms | 3.75ms | max-age=14400, s-maxage=31536000 | HIT | 52985 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 56.53ms | 6.09ms | max-age=14400, s-maxage=31536000 | HIT | 52984 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 63.08ms | 8.55ms | max-age=14400, s-maxage=31536000 | HIT | 52984 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 557.78ms | 5.14ms | max-age=14400, s-maxage=31536000 | HIT | 52984 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 54.87ms | 7.33ms | max-age=14400, s-maxage=31536000 | HIT | 16831 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 71.83ms | 7.87ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 51.52ms | 7.92ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 47.66ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 663.27ms | 5.22ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 61.46ms | 6.7ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
