# Cloudflare Hosted Worker Performance

Generated: 2026-06-30T11:04:27.729Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Runs: 20
Warm-up runs: 1
Minimum p95 runs for readiness: 20
P95 method: nearest-rank
P95 sample count ready: yes
Route contract ready: yes
P95 budget ready: no
Credential-free hosted performance ready: no
Production hosted performance ready: no

Hosted, credential-free Worker performance proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtimes flows, or make Vercel/Supabase/Resend removable.

| Probe | Kind | Required | Contract | P95 | Budget | Budget result |
| --- | --- | --- | --- | ---: | --- | --- |
| health | health | yes | PASS | 89.53ms | under 200 ms | PASS |
| home | public-page | yes | PASS | 103.08ms | under 200 ms | PASS |
| login | public-page | yes | PASS | 82.83ms | under 300 ms | PASS |
| pricing | public-page | yes | PASS | 74.84ms | under 200 ms | PASS |
| features | public-page | yes | PASS | 313.57ms | under 200 ms | FAIL |
| about | public-page | yes | PASS | 72.14ms | under 300 ms | PASS |
| contact | public-page | yes | PASS | 576.99ms | under 300 ms | FAIL |
| trust | public-page | yes | PASS | 106.84ms | under 300 ms | PASS |
| privacy | public-page | yes | PASS | 73.11ms | under 300 ms | PASS |
| terms | public-page | yes | PASS | 72.7ms | under 300 ms | PASS |
| signup | public-page | yes | PASS | 72.82ms | under 300 ms | PASS |
| access-required | public-page | yes | PASS | 136.48ms | under 300 ms | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 103.37ms | under 600 ms | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 65.53ms | under 400 ms | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 739.83ms | record only | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 75.05ms | record only | n/a |
