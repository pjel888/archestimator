# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T09:55:58.020Z
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
| health | health | yes | 1 | 200 | 3381.63ms | 0.44ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 313.81ms | 92.95ms | max-age=14400, s-maxage=31536000 | HIT | 9751 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1077.15ms | 37.25ms | max-age=14400, s-maxage=31536000 | HIT | 9751 | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 748.53ms | 50.3ms | max-age=14400, s-maxage=31536000 | HIT | 9752 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 590.77ms | 55.43ms | max-age=14400, s-maxage=31536000 | HIT | 9752 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 198.49ms | 35.18ms | max-age=14400, s-maxage=31536000 | HIT | 9752 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 102.81ms | 30.81ms | max-age=14400, s-maxage=31536000 | HIT | 9751 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 782.56ms | 36.37ms | max-age=14400, s-maxage=31536000 | HIT | 9752 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 224.23ms | 14.02ms | max-age=14400, s-maxage=31536000 | HIT | 9751 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 77.62ms | 16.03ms | max-age=14400, s-maxage=31536000 | HIT | 9751 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 348.35ms | 10.11ms | max-age=14400, s-maxage=31536000 | HIT | 9751 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 2107.54ms | 10.59ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 635.8ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 54.39ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 819.16ms | 0.49ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 936.41ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
