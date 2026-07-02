# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T09:30:52.938Z
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
| health | health | yes | 1 | 200 | 926.19ms | 0.01ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 295.8ms | 4.25ms | max-age=14400, s-maxage=31536000 | HIT | 94652 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 981.15ms | 2.55ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 68.92ms | 3.66ms | max-age=14400, s-maxage=31536000 | HIT | 94652 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 71.11ms | 4.43ms | max-age=14400, s-maxage=31536000 | HIT | 94652 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 66.45ms | 6.26ms | max-age=14400, s-maxage=31536000 | HIT | 94651 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 63.98ms | 7.54ms | max-age=14400, s-maxage=31536000 | HIT | 94651 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 93.33ms | 2.11ms | max-age=14400, s-maxage=31536000 | HIT | 94650 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 68.23ms | 4.77ms | max-age=14400, s-maxage=31536000 | HIT | 94650 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 70.03ms | 4.16ms | max-age=14400, s-maxage=31536000 | HIT | 94650 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 859.15ms | 3.28ms | max-age=14400, s-maxage=31536000 | HIT | 58497 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 97.38ms | 8.91ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 66.57ms | 10.07ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 67.21ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 322.09ms | 3.19ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 82.66ms | 18.56ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
