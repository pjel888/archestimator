# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T22:47:43.887Z
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
| health | health | yes | 1 | 200 | 645.3ms | 0.26ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 65.08ms | 5.38ms | max-age=14400, s-maxage=31536000 | HIT | 56061 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 52.76ms | 4.4ms | max-age=14400, s-maxage=31536000 | HIT | 56061 | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 56.36ms | 3.73ms | max-age=14400, s-maxage=31536000 | HIT | 56060 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 53.36ms | 4.44ms | max-age=14400, s-maxage=31536000 | HIT | 56060 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 53.52ms | 2.74ms | max-age=14400, s-maxage=31536000 | HIT | 56059 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 60.03ms | 2.3ms | max-age=14400, s-maxage=31536000 | HIT | 56059 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 1102.98ms | 2.18ms | max-age=14400, s-maxage=31536000 | HIT | 56060 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 450.1ms | 3.7ms | max-age=14400, s-maxage=31536000 | HIT | 56059 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 55.25ms | 1.85ms | max-age=14400, s-maxage=31536000 | HIT | 56059 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 54.82ms | 3.18ms | max-age=14400, s-maxage=31536000 | HIT | 19906 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 1382.29ms | 9.57ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 396.72ms | 3.38ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 46.65ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 781.51ms | 3.21ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 116.81ms | 0.84ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
