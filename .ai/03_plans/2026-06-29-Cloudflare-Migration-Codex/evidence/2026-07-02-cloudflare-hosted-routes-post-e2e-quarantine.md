# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T12:07:15.286Z
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
| health | health | yes | 1 | 200 | 877.2ms | 0.38ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 86.03ms | 5.46ms | max-age=14400, s-maxage=31536000 | HIT | 104034 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 995.42ms | 3.55ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 72.85ms | 5.15ms | max-age=14400, s-maxage=31536000 | HIT | 104034 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 409.64ms | 3.73ms | max-age=14400, s-maxage=31536000 | HIT | 104034 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 68.51ms | 1.48ms | max-age=14400, s-maxage=31536000 | HIT | 104033 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 74.44ms | 1.17ms | max-age=14400, s-maxage=31536000 | HIT | 104033 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 145.2ms | 3.63ms | max-age=14400, s-maxage=31536000 | HIT | 104033 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 67.39ms | 5.88ms | max-age=14400, s-maxage=31536000 | HIT | 104032 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 78.48ms | 3.86ms | max-age=14400, s-maxage=31536000 | HIT | 104032 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 96.2ms | 3.14ms | max-age=14400, s-maxage=31536000 | HIT | 67879 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 102.64ms | 3.66ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 76.98ms | 3.7ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 55.13ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 820.39ms | 7.08ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 82.3ms | 14.73ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
