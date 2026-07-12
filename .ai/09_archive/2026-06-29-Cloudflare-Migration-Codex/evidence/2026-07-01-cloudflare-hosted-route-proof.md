# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-03T10:35:09.780Z
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
| health | health | yes | 1 | 200 | 1052.41ms | 0.01ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 97.06ms | 5.54ms | max-age=14400, s-maxage=31536000 | HIT | 184909 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1521.87ms | 5.7ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 94.53ms | 5.6ms | max-age=14400, s-maxage=31536000 | HIT | 184909 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 95.93ms | 3.95ms | max-age=14400, s-maxage=31536000 | HIT | 184909 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 74.42ms | 3.17ms | max-age=14400, s-maxage=31536000 | HIT | 184908 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 91.81ms | 1.03ms | max-age=14400, s-maxage=31536000 | HIT | 184908 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 75.35ms | 1.92ms | max-age=14400, s-maxage=31536000 | HIT | 184907 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 75.25ms | 0.77ms | max-age=14400, s-maxage=31536000 | HIT | 184907 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 66.36ms | 12.65ms | max-age=14400, s-maxage=31536000 | HIT | 184907 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 70.84ms | 1.97ms | max-age=14400, s-maxage=31536000 | HIT | 148753 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 110.91ms | 10.58ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 71.43ms | 6.67ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 57.83ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 831.63ms | 8.48ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 84.93ms | 6.35ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
