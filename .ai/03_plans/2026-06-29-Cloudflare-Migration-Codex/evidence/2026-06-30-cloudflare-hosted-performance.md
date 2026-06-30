# Cloudflare Hosted Worker Performance

Generated: 2026-06-30T06:28:45.927Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Runs: 20
Warm-up runs: 1
Minimum p95 runs for readiness: 20
P95 method: nearest-rank
P95 sample count ready: yes
Route contract ready: yes
P95 budget ready: yes
Credential-free hosted performance ready: yes
Production hosted performance ready: no

Hosted, credential-free Worker performance proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtimes flows, or make Vercel/Supabase/Resend removable.

| Probe | Kind | Required | Contract | P95 | Budget | Budget result |
| --- | --- | --- | --- | ---: | --- | --- |
| health | health | yes | PASS | 43.18ms | under 200 ms | PASS |
| home | public-page | yes | PASS | 134.25ms | under 200 ms | PASS |
| login | public-page | yes | PASS | 66.91ms | under 300 ms | PASS |
| pricing | public-page | yes | PASS | 69.57ms | under 200 ms | PASS |
| features | public-page | yes | PASS | 80.99ms | under 200 ms | PASS |
| about | public-page | yes | PASS | 107.97ms | under 300 ms | PASS |
| contact | public-page | yes | PASS | 152.66ms | under 300 ms | PASS |
| trust | public-page | yes | PASS | 208.27ms | under 300 ms | PASS |
| privacy | public-page | yes | PASS | 70.03ms | under 300 ms | PASS |
| terms | public-page | yes | PASS | 65.95ms | under 300 ms | PASS |
| signup | public-page | yes | PASS | 63.73ms | under 300 ms | PASS |
| access-required | public-page | yes | PASS | 50.92ms | under 300 ms | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 438.52ms | under 600 ms | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 55.16ms | under 400 ms | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 728.58ms | record only | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 44.49ms | record only | n/a |
