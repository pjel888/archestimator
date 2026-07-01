# Cloudflare Hosted Worker Performance

Generated: 2026-07-01T09:16:40.468Z
Base URL: https://archestimator.com
Runs: 20
Warm-up runs: 2
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
| health | health | yes | PASS | 55.5ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 65.8ms | under 200 ms | HIT | 1 | PASS |
| login | public-page | yes | PASS | 69.95ms | under 300 ms | HIT | 1 | PASS |
| pricing | public-page | yes | PASS | 59.96ms | under 200 ms | HIT | 1 | PASS |
| features | public-page | yes | PASS | 257.29ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 63.62ms | under 300 ms | HIT | 1 | PASS |
| contact | public-page | yes | PASS | 482.14ms | under 300 ms | HIT | 1 | FAIL |
| trust | public-page | yes | PASS | 849.43ms | under 300 ms | HIT | 1 | FAIL |
| privacy | public-page | yes | PASS | 492.85ms | under 300 ms | HIT | 1 | FAIL |
| terms | public-page | yes | PASS | 675.52ms | under 300 ms | HIT | 1 | FAIL |
| signup | public-page | yes | PASS | 644.58ms | under 300 ms | HIT | 1 | FAIL |
| access-required | public-page | yes | PASS | 78.04ms | under 300 ms | (none) | (none) | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 79.43ms | under 600 ms | (none) | (none) | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 60.89ms | under 400 ms | (none) | (none) | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 138.57ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 61.45ms | record only | (none) | (none) | n/a |
