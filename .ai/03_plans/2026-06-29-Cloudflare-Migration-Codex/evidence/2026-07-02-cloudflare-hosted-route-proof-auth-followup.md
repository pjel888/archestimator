# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T20:18:47.499Z
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
| health | health | yes | 1 | 200 | 156.75ms | 0.19ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 75.41ms | 4.33ms | max-age=14400, s-maxage=31536000 | HIT | 47128 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 61.14ms | 4.23ms | max-age=14400, s-maxage=31536000 | HIT | 47128 | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 61.14ms | 5.76ms | max-age=14400, s-maxage=31536000 | HIT | 47127 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 59.56ms | 6.05ms | max-age=14400, s-maxage=31536000 | HIT | 47127 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 61.78ms | 5.26ms | max-age=14400, s-maxage=31536000 | HIT | 47126 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 585.76ms | 5.52ms | max-age=14400, s-maxage=31536000 | HIT | 47126 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 65.29ms | 6.52ms | max-age=14400, s-maxage=31536000 | HIT | 47126 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 61.87ms | 9.71ms | max-age=14400, s-maxage=31536000 | HIT | 47125 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 59.16ms | 5.11ms | max-age=14400, s-maxage=31536000 | HIT | 47125 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 60.74ms | 5.76ms | max-age=14400, s-maxage=31536000 | HIT | 10972 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 80.22ms | 9.24ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 64.83ms | 5.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 55.12ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 169.63ms | 7.23ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 67.55ms | 5.63ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
