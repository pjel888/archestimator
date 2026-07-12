# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-12T12:43:50.952Z
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
| health | health | yes | 1 | 200 | 770.77ms | 0.11ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 74.01ms | 3.62ms | max-age=14400, s-maxage=31536000 | HIT | 73542 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1765.89ms | 1.17ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 297.33ms | 6.32ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 1282.41ms | 2.84ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 343.65ms | 3.6ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 345.05ms | 3.1ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 267.27ms | 3.85ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 425.1ms | 1.85ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 853.26ms | 3.67ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 449.66ms | 3.69ms | max-age=14400, s-maxage=31536000 | HIT | 48745 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 78.68ms | 2.81ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 282.74ms | 3.65ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 54.16ms | 0.03ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 709.64ms | 3.2ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 189.68ms | 4.18ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
