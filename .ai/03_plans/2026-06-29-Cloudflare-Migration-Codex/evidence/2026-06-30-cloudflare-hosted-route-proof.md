# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T13:11:14.069Z
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
| health | health | yes | 1 | 200 | 970.85ms | 0.01ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 143.76ms | 5.56ms | max-age=14400, s-maxage=31536000 | HIT | 107871 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1348.82ms | 7.79ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 1135.25ms | 8.97ms | max-age=14400, s-maxage=31536000 | HIT | 107872 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 277.62ms | 4.56ms | max-age=14400, s-maxage=31536000 | HIT | 107872 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 458.84ms | 1.2ms | max-age=14400, s-maxage=31536000 | HIT | 107872 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 81.43ms | 7.83ms | max-age=14400, s-maxage=31536000 | HIT | 107871 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 134.74ms | 5.41ms | max-age=14400, s-maxage=31536000 | HIT | 107871 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 389.95ms | 6.76ms | max-age=14400, s-maxage=31536000 | HIT | 107871 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 145.36ms | 0.04ms | max-age=14400, s-maxage=31536000 | HIT | 107871 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 150.11ms | 11.39ms | max-age=14400, s-maxage=31536000 | HIT | 71718 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 178.5ms | 11.27ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 497.72ms | 10.51ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 96.98ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 328.35ms | 12.32ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 89.64ms | 11.33ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
