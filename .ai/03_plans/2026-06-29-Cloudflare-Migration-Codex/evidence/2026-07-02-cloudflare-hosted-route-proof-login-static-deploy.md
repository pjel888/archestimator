# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T04:06:31.161Z
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
| health | health | yes | 1 | 200 | 925.04ms | 0.64ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 116.8ms | 12.97ms | max-age=14400, s-maxage=31536000 | HIT | 75188 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1645.83ms | 4.81ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 258.19ms | 1.34ms | max-age=14400, s-maxage=31536000 | HIT | 75189 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 90.74ms | 1.83ms | max-age=14400, s-maxage=31536000 | HIT | 75189 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 66.77ms | 1.32ms | max-age=14400, s-maxage=31536000 | HIT | 75188 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 381.58ms | 4ms | max-age=14400, s-maxage=31536000 | HIT | 75188 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 59.4ms | 4.61ms | max-age=14400, s-maxage=31536000 | HIT | 75188 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 61.47ms | 5.16ms | max-age=14400, s-maxage=31536000 | HIT | 75187 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 348.65ms | 4.16ms | max-age=14400, s-maxage=31536000 | HIT | 75187 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 57.94ms | 3.55ms | max-age=14400, s-maxage=31536000 | HIT | 39034 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 85.69ms | 6.3ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 390.15ms | 2.58ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 52.29ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 1127.36ms | 6.42ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 401.03ms | 5.57ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
