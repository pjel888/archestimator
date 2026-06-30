# Cloudflare Hosted Worker Performance

Generated: 2026-06-30T09:45:01.055Z
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
| health | health | yes | PASS | 131.06ms | under 200 ms | PASS |
| home | public-page | yes | PASS | 245.61ms | under 200 ms | FAIL |
| login | public-page | yes | PASS | 507.03ms | under 300 ms | FAIL |
| pricing | public-page | yes | PASS | 73.21ms | under 200 ms | PASS |
| features | public-page | yes | PASS | 96.87ms | under 200 ms | PASS |
| about | public-page | yes | PASS | 232.28ms | under 300 ms | PASS |
| contact | public-page | yes | PASS | 214.48ms | under 300 ms | PASS |
| trust | public-page | yes | PASS | 433.71ms | under 300 ms | FAIL |
| privacy | public-page | yes | PASS | 227.58ms | under 300 ms | PASS |
| terms | public-page | yes | PASS | 329.31ms | under 300 ms | FAIL |
| signup | public-page | yes | PASS | 274.25ms | under 300 ms | PASS |
| access-required | public-page | yes | PASS | 262.48ms | under 300 ms | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 41.64ms | under 600 ms | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 679.43ms | under 400 ms | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 665.48ms | record only | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 119.06ms | record only | n/a |
