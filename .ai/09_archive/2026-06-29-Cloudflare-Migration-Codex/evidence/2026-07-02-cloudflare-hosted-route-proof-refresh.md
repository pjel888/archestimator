# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T20:01:58.271Z
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
| health | health | yes | 1 | 200 | 1265.23ms | 0.41ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 133.52ms | 24.12ms | max-age=14400, s-maxage=31536000 | HIT | 46111 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 602.48ms | 9.32ms | max-age=14400, s-maxage=31536000 | HIT | 46111 | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 554.7ms | 10.59ms | max-age=14400, s-maxage=31536000 | HIT | 46111 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 89.43ms | 10.9ms | max-age=14400, s-maxage=31536000 | HIT | 46111 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 320.77ms | 7.73ms | max-age=14400, s-maxage=31536000 | HIT | 46111 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 1779.76ms | 9.57ms | max-age=14400, s-maxage=31536000 | HIT | 46112 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 544.27ms | 13.66ms | max-age=14400, s-maxage=31536000 | HIT | 46112 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 438.75ms | 4.52ms | max-age=14400, s-maxage=31536000 | HIT | 46112 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 407.01ms | 9.67ms | max-age=14400, s-maxage=31536000 | HIT | 46112 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 551.75ms | 5.88ms | max-age=14400, s-maxage=31536000 | HIT | 9960 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 884.59ms | 6.28ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 1060.92ms | 0.11ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 621.4ms | 0.25ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 713.03ms | 4.41ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 687.6ms | 3.87ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
