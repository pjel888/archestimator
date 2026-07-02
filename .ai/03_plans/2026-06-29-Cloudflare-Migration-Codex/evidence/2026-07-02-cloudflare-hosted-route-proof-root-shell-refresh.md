# Cloudflare Hosted Worker Route Proof

Generated: 2026-07-02T02:40:14.436Z
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
| health | health | yes | 1 | 200 | 870.87ms | 1.71ms | no-store | (none) | (none) | (none) | (none) | health_json_ok | PASS |
| home | public-page | yes | 1 | 200 | 540.65ms | 4.73ms | max-age=14400, s-maxage=31536000 | HIT | 70007 | 1 | (none) | public_html_ok | PASS |
| login | public-page | yes | 1 | 200 | 1692.26ms | 5.41ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| pricing | public-page | yes | 1 | 200 | 461.03ms | 1.74ms | max-age=14400, s-maxage=31536000 | HIT | 70007 | 1 | (none) | public_html_ok | PASS |
| features | public-page | yes | 1 | 200 | 1391.79ms | 5.32ms | max-age=14400, s-maxage=31536000 | HIT | 70009 | 1 | (none) | public_html_ok | PASS |
| about | public-page | yes | 1 | 200 | 578.01ms | 5.06ms | max-age=14400, s-maxage=31536000 | HIT | 70008 | 1 | (none) | public_html_ok | PASS |
| contact | public-page | yes | 1 | 200 | 810.8ms | 5.27ms | max-age=14400, s-maxage=31536000 | HIT | 70009 | 1 | (none) | public_html_ok | PASS |
| trust | public-page | yes | 1 | 200 | 410.44ms | 4.69ms | max-age=14400, s-maxage=31536000 | HIT | 70009 | 1 | (none) | public_html_ok | PASS |
| privacy | public-page | yes | 1 | 200 | 70.88ms | 0.66ms | max-age=14400, s-maxage=31536000 | HIT | 70008 | 1 | (none) | public_html_ok | PASS |
| terms | public-page | yes | 1 | 200 | 1742.77ms | 5.16ms | max-age=14400, s-maxage=31536000 | HIT | 70010 | 1 | (none) | public_html_ok | PASS |
| signup | public-page | yes | 1 | 200 | 390.92ms | 3.34ms | max-age=14400, s-maxage=31536000 | HIT | 33857 | 1 | (none) | public_html_ok | PASS |
| access-required | public-page | yes | 1 | 200 | 690.13ms | 10.48ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | public_html_ok | PASS |
| workshop-signed-out | signed-out-redirect | yes | 1 | 307 | 83.53ms | 6.77ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | /login?next=%2Fworkshop | signed_out_redirect_ok | PASS |
| share-invalid-page | invalid-share-page | yes | 1 | 404 | 60.15ms | 0.01ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | invalid_share_page_safe | PASS |
| share-invalid-api | sensitive-fail-closed | no | 1 | 404 | 729.02ms | 4.97ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
| project-image-missing-path | sensitive-fail-closed | yes | 1 | 404 | 866.16ms | 5.25ms | private, no-cache, no-store, max-age=0, must-revalidate | (none) | (none) | (none) | (none) | sensitive_fail_closed_ok | PASS |
