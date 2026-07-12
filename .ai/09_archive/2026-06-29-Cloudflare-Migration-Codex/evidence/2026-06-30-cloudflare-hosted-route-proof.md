# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-05T05:05:30.426Z
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
| health | health | yes | 1 | 200 | 4401.23ms | 0.6ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 174.33ms | 6.66ms | max-age=14400, s-maxage=31536000 | HIT | 337929 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 2036.75ms | 6.98ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 67.81ms | 8.73ms | max-age=14400, s-maxage=31536000 | HIT | 337930 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 69.58ms | 6.94ms | max-age=14400, s-maxage=31536000 | HIT | 337930 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 74.03ms | 6ms | max-age=14400, s-maxage=31536000 | HIT | 337929 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 79.71ms | 6.74ms | max-age=14400, s-maxage=31536000 | HIT | 337929 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 283.97ms | 2.08ms | max-age=14400, s-maxage=31536000 | HIT | 3873 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 68.44ms | 5.74ms | max-age=14400, s-maxage=31536000 | HIT | 337928 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 68.5ms | 5.95ms | max-age=14400, s-maxage=31536000 | HIT | 337928 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 86.4ms | 0.03ms | max-age=14400, s-maxage=31536000 | HIT | 301775 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 101.78ms | 9.75ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 66.59ms | 5.76ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 53.42ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 229.12ms | 5.92ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 83.01ms | 10.06ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
