# Cloudflare Hosted Worker Performance

Generated: 2026-06-30T13:55:22.070Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
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
| health | health | yes | PASS | 75.58ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 634.6ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 424.13ms | under 300 ms | HIT | 1 | FAIL |
| pricing | public-page | yes | PASS | 473.43ms | under 200 ms | HIT | 1 | FAIL |
| features | public-page | yes | PASS | 767.1ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 55.7ms | under 300 ms | HIT | 1 | PASS |
| contact | public-page | yes | PASS | 120.07ms | under 300 ms | HIT | 1 | PASS |
| trust | public-page | yes | PASS | 527.35ms | under 300 ms | HIT | 1 | FAIL |
| privacy | public-page | yes | PASS | 545.25ms | under 300 ms | HIT | 1 | FAIL |
| terms | public-page | yes | PASS | 56.82ms | under 300 ms | HIT | 1 | PASS |
| signup | public-page | yes | PASS | 51.2ms | under 300 ms | HIT | 1 | PASS |
| access-required | public-page | yes | PASS | 96.05ms | under 300 ms | (none) | (none) | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 105.54ms | under 600 ms | (none) | (none) | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 511.5ms | under 400 ms | (none) | (none) | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 566.54ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 67.11ms | record only | (none) | (none) | n/a |
