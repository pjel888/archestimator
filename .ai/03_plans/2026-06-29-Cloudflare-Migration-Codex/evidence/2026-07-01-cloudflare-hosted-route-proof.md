# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-01T07:13:22.607Z
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
| health | health | yes | 1 | 200 | 1059.5ms | 0.28ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 1571.45ms | 5.59ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 839.23ms | 1.29ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 474.6ms | 1.47ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 114.37ms | 2ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 889.5ms | 1.4ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 397.06ms | 1.42ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 311.22ms | 3.29ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 859.21ms | 0.04ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 118.39ms | 0.04ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 97.2ms | 0.6ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 106.13ms | 4.48ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 470.62ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 51.21ms | 0.08ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 432.69ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 82.46ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
