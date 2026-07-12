# Cloudflare Hosted Worker Performance

Generated: 2026-07-02T04:02:47.625Z
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
| health | health | yes | PASS | 397.55ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 595.1ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 551.22ms | under 300 ms | (none) | 1 | FAIL |
| pricing | public-page | yes | PASS | 688.89ms | under 200 ms | HIT | 1 | FAIL |
| features | public-page | yes | PASS | 329.47ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 645.58ms | under 300 ms | HIT | 1 | FAIL |
| contact | public-page | yes | PASS | 301.85ms | under 300 ms | HIT | 1 | FAIL |
| trust | public-page | yes | PASS | 101.39ms | under 300 ms | HIT | 1 | PASS |
| privacy | public-page | yes | PASS | 609.9ms | under 300 ms | HIT | 1 | FAIL |
| terms | public-page | yes | PASS | 265.87ms | under 300 ms | HIT | 1 | PASS |
| signup | public-page | yes | PASS | 472.57ms | under 300 ms | HIT | 1 | FAIL |
| access-required | public-page | yes | PASS | 583.62ms | under 300 ms | (none) | (none) | FAIL |
| workshop-signed-out | signed-out-redirect | yes | PASS | 655.19ms | under 600 ms | (none) | (none) | FAIL |
| share-invalid-page | invalid-share-page | yes | PASS | 634.97ms | under 400 ms | (none) | (none) | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 1050.26ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 664.3ms | record only | (none) | (none) | n/a |
