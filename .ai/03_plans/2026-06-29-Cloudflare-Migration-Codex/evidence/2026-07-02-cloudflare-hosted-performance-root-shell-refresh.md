# Cloudflare Hosted Worker Performance

Generated: 2026-07-02T02:43:25.918Z
Base URL: https://archestimator.com
Runs: 20
Warm-up runs: 1
Minimum p95 runs for readiness: 20
P95 method: nearest-rank
Budget metric: ttfbMs
P95 sample count ready: yes
Route contract ready: yes
P95 budget ready: no
Credential-free hosted performance ready: no
Production hosted performance ready: no

Hosted, credential-free Worker performance proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtimes flows, or make Vercel/Supabase/Resend removable.

| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| health | health | yes | PASS | 947.99ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 884.72ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 1536.33ms | under 300 ms | (none) | (none) | FAIL |
| pricing | public-page | yes | PASS | 997.03ms | under 200 ms | HIT | 1 | FAIL |
| features | public-page | yes | PASS | 584.38ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 607.88ms | under 300 ms | HIT | 1 | FAIL |
| contact | public-page | yes | PASS | 973.88ms | under 300 ms | HIT | 1 | FAIL |
| trust | public-page | yes | PASS | 1047.97ms | under 300 ms | HIT | 1 | FAIL |
| privacy | public-page | yes | PASS | 855.07ms | under 300 ms | HIT | 1 | FAIL |
| terms | public-page | yes | PASS | 725.49ms | under 300 ms | HIT | 1 | FAIL |
| signup | public-page | yes | PASS | 1181.86ms | under 300 ms | HIT | 1 | FAIL |
| access-required | public-page | yes | PASS | 939.12ms | under 300 ms | (none) | (none) | FAIL |
| workshop-signed-out | signed-out-redirect | yes | PASS | 759.74ms | under 600 ms | (none) | (none) | FAIL |
| share-invalid-page | invalid-share-page | yes | PASS | 954.69ms | under 400 ms | (none) | (none) | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 673.4ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 846.83ms | record only | (none) | (none) | n/a |
