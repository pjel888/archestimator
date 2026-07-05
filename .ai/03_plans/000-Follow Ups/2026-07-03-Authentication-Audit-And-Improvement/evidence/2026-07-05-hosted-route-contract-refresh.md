# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-05T04:00:57.157Z
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
| health | health | yes | 1 | 200 | 2085.42ms | 0.04ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 97.58ms | 4.13ms | max-age=14400, s-maxage=31536000 | HIT | 334056 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1790.43ms | 0.08ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 83.86ms | 8.5ms | max-age=14400, s-maxage=31536000 | HIT | 334056 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 74.6ms | 22.97ms | max-age=14400, s-maxage=31536000 | HIT | 334056 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 80.78ms | 3.25ms | max-age=14400, s-maxage=31536000 | HIT | 334056 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 72.13ms | 1.32ms | max-age=14400, s-maxage=31536000 | HIT | 334055 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 204.11ms | 5.66ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 79.3ms | 0.1ms | max-age=14400, s-maxage=31536000 | HIT | 334054 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 74.77ms | 2.36ms | max-age=14400, s-maxage=31536000 | HIT | 334054 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 72.65ms | 16.52ms | max-age=14400, s-maxage=31536000 | HIT | 297901 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 101.64ms | 18.26ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 341.89ms | 0.04ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 73.39ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 209.52ms | 9.58ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 92.88ms | 11.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
