# Cloudflare Hosted Worker Performance

Generated: 2026-07-01T18:10:29.011Z
Base URL: https://archestimator.com
Runs: 20
Warm-up runs: 2
Minimum p95 runs for readiness: 20
P95 method: nearest-rank
Budget metric: ttfbMs
P95 sample count ready: yes
Route contract ready: yes
P95 budget ready: yes
Credential-free hosted performance ready: yes
Production hosted performance ready: no

Hosted, credential-free Worker performance proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtimes flows, or make Vercel/Supabase/Resend removable.

| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| health | health | yes | PASS | 88.92ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 73.9ms | under 200 ms | HIT | 1 | PASS |
| login | public-page | yes | PASS | 70.84ms | under 300 ms | HIT | 1 | PASS |
| pricing | public-page | yes | PASS | 123.93ms | under 200 ms | HIT | 1 | PASS |
| features | public-page | yes | PASS | 84.01ms | under 200 ms | HIT | 1 | PASS |
| about | public-page | yes | PASS | 71.36ms | under 300 ms | HIT | 1 | PASS |
| contact | public-page | yes | PASS | 79.75ms | under 300 ms | HIT | 1 | PASS |
| trust | public-page | yes | PASS | 134.93ms | under 300 ms | HIT | 1 | PASS |
| privacy | public-page | yes | PASS | 72.11ms | under 300 ms | HIT | 1 | PASS |
| terms | public-page | yes | PASS | 106.04ms | under 300 ms | HIT | 1 | PASS |
| signup | public-page | yes | PASS | 78.93ms | under 300 ms | HIT | 1 | PASS |
| access-required | public-page | yes | PASS | 125.45ms | under 300 ms | (none) | (none) | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 92.97ms | under 600 ms | (none) | (none) | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 66.25ms | under 400 ms | (none) | (none) | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 131.35ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 76.67ms | record only | (none) | (none) | n/a |
