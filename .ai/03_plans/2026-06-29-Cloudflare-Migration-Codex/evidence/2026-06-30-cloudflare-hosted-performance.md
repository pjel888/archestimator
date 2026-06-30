# Cloudflare Hosted Worker Performance

Generated: 2026-06-30T03:52:57.281Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Runs: 20
Warm-up runs: 2
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
| health | health | yes | PASS | 1311.37ms | under 200 ms | FAIL |
| home | public-page | yes | PASS | 891.74ms | under 200 ms | FAIL |
| login | public-page | yes | PASS | 913.46ms | under 300 ms | FAIL |
| pricing | public-page | yes | PASS | 597.13ms | under 200 ms | FAIL |
| features | public-page | yes | PASS | 1178.46ms | under 200 ms | FAIL |
| about | public-page | yes | PASS | 76.35ms | under 300 ms | PASS |
| contact | public-page | yes | PASS | 98.72ms | under 300 ms | PASS |
| trust | public-page | yes | PASS | 150.22ms | under 300 ms | PASS |
| privacy | public-page | yes | PASS | 1169.35ms | under 300 ms | FAIL |
| terms | public-page | yes | PASS | 1075.08ms | under 300 ms | FAIL |
| signup | public-page | yes | PASS | 500.97ms | under 300 ms | FAIL |
| access-required | public-page | yes | PASS | 73.39ms | under 300 ms | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 53.25ms | under 600 ms | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 804.34ms | under 400 ms | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 954.32ms | record only | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 409.9ms | record only | n/a |
