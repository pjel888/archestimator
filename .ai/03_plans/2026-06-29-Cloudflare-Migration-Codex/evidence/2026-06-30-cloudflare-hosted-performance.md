# Cloudflare Hosted Worker Performance

Generated: 2026-07-02T13:12:13.574Z
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
| home | / | 829.3ms | 200ms | 629.3ms | HIT | a14de5879a7c1473-SIN, a14de5882c361473-SIN, a14de588bd851473-SIN, a14de5892ecf1473-SIN, a14de589c8721473-SIN, a14de58a49e61473-SIN, a14de58acb701473-SIN, a14de58b4cce1473-SIN, a14de58bbe391473-SIN, a14de58c2f591473-SIN, a14de58c98c41473-SIN, a14de58d1a591473-SIN, a14de58d8ba01473-SIN, a14de5936f561473-SIN, a14de593e9281473-SIN, a14de5948b871473-SIN, a14de5950d001473-SIN, a14de5957eb11473-SIN, a14de59acf631473-SIN, a14de59b38dd1473-SIN |
| login | /login | 542.16ms | 300ms | 242.16ms | (none) | a14de59cad1a1473-SIN, a14de59db81f1473-SIN, a14de59e9a991473-SIN, a14de59f5d0a1473-SIN, a14de5a01f7c1473-SIN, a14de5a0ea0e1473-SIN, a14de5a1dcba1473-SIN, a14de5a56f511473-SIN, a14de5a639ea1473-SIN, a14de5a6dc0c1473-SIN, a14de5a78de81473-SIN, a14de5acadd41473-SIN, a14de5af2dc81473-SIN, a14de5afc8031473-SIN, a14de5b13d831473-SIN, a14de5b1ffc11473-SIN, a14de5b2aa181473-SIN, a14de5b498a51473-SIN, a14de5b53ac11473-SIN, a14de5b61d6a1473-SIN |
| trust | /trust | 629.05ms | 300ms | 329.05ms | HIT | a14de5dc68571473-SIN, a14de5dcfa461473-SIN, a14de5dd6b811473-SIN, a14de5dddca21473-SIN, a14de5de5e0e1473-SIN, a14de5e24ac91473-SIN, a14de5e428291473-SIN, a14de5e4a9a21473-SIN, a14de5e66ec51473-SIN, a14de5e79a3d1473-SIN, a14de5e95fd71473-SIN, a14de5ecda381473-SIN, a14de5f168ab1473-SIN, a14de5f1d9fb1473-SIN, a14de5f23b4c1473-SIN, a14de5f2acf11473-SIN, a14de5f31e7e1473-SIN, a14de5f38fb91473-SIN, a14de5f4092c1473-SIN, a14de5f4ab2d1473-SIN |
| access-required | /access-required | 387.67ms | 300ms | 87.67ms | (none) | a14de618285a1473-SIN, a14de618ca6b1473-SIN, a14de6196c7e1473-SIN, a14de61a0e741473-SIN, a14de61ae9361473-SIN, a14de61bbb4f1473-SIN, a14de61c5d5f1473-SIN, a14de61d1f661473-SIN, a14de61dc95c1473-SIN, a14de61eabe71473-SIN, a14de61f6dec1473-SIN, a14de621bd8a1473-SIN, a14de622982d1473-SIN, a14de6237b121473-SIN, a14de6249ecf1473-SIN, a14de62548f01473-SIN, a14de625dacb1473-SIN, a14de6271e9b1473-SIN, a14de62c0ec91473-SIN, a14de62ca8801473-SIN |

| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| health | health | yes | PASS | 84.08ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 829.3ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 542.16ms | under 300 ms | (none) | 1 | FAIL |
| pricing | public-page | yes | PASS | 73.72ms | under 200 ms | HIT | 1 | PASS |
| features | public-page | yes | PASS | 74.37ms | under 200 ms | HIT | 1 | PASS |
| about | public-page | yes | PASS | 95.93ms | under 300 ms | HIT | 1 | PASS |
| contact | public-page | yes | PASS | 92.36ms | under 300 ms | HIT | 1 | PASS |
| trust | public-page | yes | PASS | 629.05ms | under 300 ms | HIT | 1 | FAIL |
| privacy | public-page | yes | PASS | 122.33ms | under 300 ms | HIT | 1 | PASS |
| terms | public-page | yes | PASS | 79.8ms | under 300 ms | HIT | 1 | PASS |
| signup | public-page | yes | PASS | 117.37ms | under 300 ms | HIT | 1 | PASS |
| access-required | public-page | yes | PASS | 387.67ms | under 300 ms | (none) | (none) | FAIL |
| workshop-signed-out | signed-out-redirect | yes | PASS | 396.01ms | under 600 ms | (none) | (none) | PASS |
| share-invalid-page | invalid-share-page | yes | PASS | 66.64ms | under 400 ms | (none) | (none) | PASS |
| share-invalid-api | sensitive-fail-closed | no | PASS | 662.46ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 983.78ms | record only | (none) | (none) | n/a |
