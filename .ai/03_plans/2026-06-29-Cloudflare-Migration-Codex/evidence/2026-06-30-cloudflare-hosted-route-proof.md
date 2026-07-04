# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-03T17:36:07.357Z
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
| health | health | yes | 1 | 200 | 811.71ms | 0.4ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 73.79ms | 3.66ms | max-age=14400, s-maxage=31536000 | HIT | 210166 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 911.01ms | 1.09ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 67.27ms | 1.25ms | max-age=14400, s-maxage=31536000 | HIT | 210166 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 68.96ms | 0.6ms | max-age=14400, s-maxage=31536000 | HIT | 210165 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 59.42ms | 0.99ms | max-age=14400, s-maxage=31536000 | HIT | 210165 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 67.92ms | 1.18ms | max-age=14400, s-maxage=31536000 | HIT | 210164 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 62.31ms | 5.05ms | max-age=14400, s-maxage=31536000 | HIT | 210164 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 66.58ms | 10.54ms | max-age=14400, s-maxage=31536000 | HIT | 210163 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 69.03ms | 0.73ms | max-age=14400, s-maxage=31536000 | HIT | 210163 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 71.29ms | 2.56ms | max-age=14400, s-maxage=31536000 | HIT | 174010 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 94.8ms | 14.97ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 62.21ms | 6.83ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 53.04ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 1895.24ms | 8.68ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 69.22ms | 5.62ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
