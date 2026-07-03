# Cloudflare Hosted Worker Performance

Generated: 2026-07-03T10:32:52.047Z
Base URL: https://archestimator.com
Runs: 20
Warm-up runs: 1
Minimum p95 runs for readiness: 20
P95 method: nearest-rank
Budget metric: ttfbMs
P95 sample count ready: yes
Route contract ready: yes
P95 budget ready: no
P95 budget watch: yes
Strict hosted client p95 ready: no
Credential-free hosted performance ready: yes
Aggregate hosted performance ready (workbook-owned): no

Hosted, credential-free Worker performance proof only. This does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, prove D1/Auth/Realtimes flows, or make Vercel/Supabase/Resend removable.

Readiness note: route contracts and sample count are the hard verifier gate; strict p95 budget misses are watch-grade evidence for tuning unless a route contract fails. Aggregate hosted performance readiness is computed by the cost/performance workbook.

## P95 Budget Misses

| Probe | Path | P95 TTFB | Budget | Delta | CF Cache | CF Rays |
| --- | --- | ---: | ---: | ---: | --- | --- |
| terms | /terms | 564.56ms | 300ms | 264.56ms | HIT | a1553a399a689c8c-SIN, a1553a3a0ad69c8c-SIN, a1553a3a7b2c9c8c-SIN, a1553a3acb6d9c8c-SIN, a1553a3c8cd19c8c-SIN, a1553a3cfd2a9c8c-SIN, a1553a3d5d7d9c8c-SIN, a1553a3dbdc79c8c-SIN, a1553a3e1e159c8c-SIN, a1553a3e7e4a9c8c-SIN, a1553a3eeeb19c8c-SIN, a1553a3f5f059c8c-SIN, a1553a3fbf569c8c-SIN, a1553a401f919c8c-SIN, a1553a438a959c8c-SIN, a1553a43fae99c8c-SIN, a1553a445b329c8c-SIN, a1553a44bb8d9c8c-SIN, a1553a483e7b9c8c-SIN, a1553a48aeef9c8c-SIN |

| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| health | health | yes | PASS | 64.19ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 76.15ms | under 200 ms | HIT | 1 | PASS |
| login | public-page | yes | PASS | 121.93ms | under 300 ms | (none) | 1 | PASS |
| pricing | public-page | yes | PASS | 66.77ms | under 200 ms | HIT | 1 | PASS |
| features | public-page | yes | PASS | 66.87ms | under 200 ms | HIT | 1 | PASS |
| about | public-page | yes | PASS | 75.8ms | under 300 ms | HIT | 1 | PASS |
| contact | public-page | yes | PASS | 72.82ms | under 300 ms | HIT | 1 | PASS |
| trust | public-page | yes | PASS | 73.4ms | under 300 ms | HIT | 1 | PASS |
| privacy | public-page | yes | PASS | 66.72ms | under 300 ms | HIT | 1 | PASS |
| terms | public-page | yes | PASS | 564.56ms | under 300 ms | HIT | 1 | FAIL |
| signup | public-page | yes | PASS | 69.35ms | under 300 ms | HIT | 1 | PASS |
| access-required | public-page | yes | PASS | 96.72ms | under 300 ms | (none) | (none) | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 71.59ms | under 600 ms | (none) | (none) | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 63.61ms | under 400 ms | (none) | (none) | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 137.92ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 88.72ms | record only | (none) | (none) | n/a |
