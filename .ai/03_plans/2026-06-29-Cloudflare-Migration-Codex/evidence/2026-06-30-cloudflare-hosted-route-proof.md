# Cloudflare Hosted Worker Route Proof

Generated: 2026-06-30T13:54:43.182Z
Configured: yes
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
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
| health | health | yes | 1 | 200 | 5648.26ms | 0.77ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 72.85ms | 5.57ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 79.15ms | 0.36ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 42.7ms | 1.62ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 64.35ms | 1.23ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 535.95ms | 0.46ms | s-maxage=31536000 | HIT | 10314 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 47.48ms | 0.77ms | s-maxage=31536000 | HIT | 10314 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 47.08ms | 1.19ms | s-maxage=31536000 | HIT | 10314 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 43.54ms | 0.05ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 46.61ms | 0.58ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 51.93ms | 0.07ms | s-maxage=31536000 | HIT | 10313 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 1055.58ms | 7.25ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 748.44ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 39.51ms | 0.03ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 1783.36ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 60.97ms | 0.02ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
