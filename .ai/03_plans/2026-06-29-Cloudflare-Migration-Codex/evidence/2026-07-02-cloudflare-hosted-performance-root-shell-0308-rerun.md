# Cloudflare Hosted Worker Performance

Generated: 2026-07-02T03:12:12.072Z
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
| health | health | yes | PASS | 63.65ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 704.12ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 817.24ms | under 300 ms | (none) | (none) | FAIL |
| pricing | public-page | yes | PASS | 63.47ms | under 200 ms | HIT | 1 | PASS |
| features | public-page | yes | PASS | 272.23ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 409.98ms | under 300 ms | HIT | 1 | FAIL |
| contact | public-page | yes | PASS | 63ms | under 300 ms | HIT | 1 | PASS |
| trust | public-page | yes | PASS | 69.15ms | under 300 ms | HIT | 1 | PASS |
| privacy | public-page | yes | PASS | 68.65ms | under 300 ms | HIT | 1 | PASS |
| terms | public-page | yes | PASS | 126.63ms | under 300 ms | HIT | 1 | PASS |
| signup | public-page | yes | PASS | 282.6ms | under 300 ms | HIT | 1 | PASS |
| access-required | public-page | yes | PASS | 90.44ms | under 300 ms | (none) | (none) | PASS |
| workshop-signed-out | signed-out-redirect | yes | PASS | 73.03ms | under 600 ms | (none) | (none) | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 144.18ms | under 400 ms | (none) | (none) | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 911.76ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 127.11ms | record only | (none) | (none) | n/a |
