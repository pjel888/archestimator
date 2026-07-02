# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T16:38:45.937Z
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
| health | health | yes | 1 | 200 | 10016.77ms | 1.15ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 90.99ms | 26.11ms | max-age=14400, s-maxage=31536000 | HIT | 122110 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1345.39ms | 8.85ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 315.3ms | 10.5ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 905.91ms | 8.11ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 379.94ms | 7.07ms | max-age=14400, s-maxage=31536000 | HIT | 7436 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 117.95ms | 7.5ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 156.12ms | 10.64ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 98.87ms | 4.54ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 746ms | 0.03ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 99.06ms | 5.53ms | s-maxage=31536000 | (none) | (none) | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 714.71ms | 13.51ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 111.95ms | 6.62ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 51.63ms | 0.08ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 1203.06ms | 13.88ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 333.05ms | 10.74ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
