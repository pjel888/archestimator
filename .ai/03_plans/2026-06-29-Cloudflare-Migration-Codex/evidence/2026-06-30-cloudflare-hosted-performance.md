# Cloudflare Hosted Worker Performance

Generated: 2026-07-02T16:39:35.430Z
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
| home | / | 662.85ms | 200ms | 462.85ms | HIT | a14f1518f85925e5-HKG, a14f1519490725e5-HKG, a14f1519ba0a25e5-HKG, a14f151a0abe25e5-HKG, a14f151e8fa925e5-HKG, a14f151f7a4325e5-HKG, a14f151fcb0825e5-HKG, a14f15201bde25e5-HKG, a14f15209d4825e5-HKG, a14f1520ee7525e5-HKG, a14f15213f5f25e5-HKG, a14f1521988f25e5-HKG, a14f1521e98d25e5-HKG, a14f15222a9c25e5-HKG, a14f15228bb525e5-HKG, a14f1522dcd225e5-HKG, a14f15232ddb25e5-HKG, a14f15237ec525e5-HKG, a14f1523e8a325e5-HKG, a14f1525ee9325e5-HKG |
| login | /login | 812.97ms | 300ms | 512.97ms | (none) | a14f152ee89525e5-HKG, a14f1533ffa925e5-HKG, a14f1534b9b825e5-HKG, a14f1539eaa425e5-HKG, a14f153a8cd525e5-HKG, a14f153b3eec25e5-HKG, a14f153bc8aa25e5-HKG, a14f153c5a6225e5-HKG, a14f153d0c5b25e5-HKG, a14f1541394825e5-HKG, a14f1541ebc225e5-HKG, a14f15475ba325e5-HKG, a14f1547ed7225e5-HKG, a14f15487f4325e5-HKG, a14f154ba95425e5-HKG, a14f154ecb2c25e5-HKG, a14f154f2c7f25e5-HKG, a14f154fbe7125e5-HKG, a14f155068b025e5-HKG, a14f1552afb625e5-HKG |
| pricing | /pricing | 551.14ms | 200ms | 351.14ms | HIT | a14f15538a5725e5-HKG, a14f1553cb3825e5-HKG, a14f15540c0525e5-HKG, a14f15545cd325e5-HKG, a14f15579e7a25e5-HKG, a14f1557df3425e5-HKG, a14f1558282f25e5-HKG, a14f155868e925e5-HKG, a14f1558b9d025e5-HKG, a14f15590aa825e5-HKG, a14f15594b7925e5-HKG, a14f15599c9625e5-HKG, a14f155db82025e5-HKG, a14f155df8ff25e5-HKG, a14f15616adf25e5-HKG, a14f1561bbb325e5-HKG, a14f15621cc325e5-HKG, a14f15625d6925e5-HKG, a14f15629e3225e5-HKG, a14f1562ef0d25e5-HKG |
| features | /features | 539.65ms | 200ms | 339.65ms | HIT | a14f15676bf525e5-HKG, a14f15682dfd25e5-HKG, a14f15686ebc25e5-HKG, a14f1568bfa225e5-HKG, a14f1568f86725e5-HKG, a14f156c5a1225e5-HKG, a14f156c9add25e5-HKG, a14f156cfbb025e5-HKG, a14f156d4c6625e5-HKG, a14f156d8d3a25e5-HKG, a14f156dde0825e5-HKG, a14f156e2ee525e5-HKG, a14f156e7fe925e5-HKG, a14f156ec8f725e5-HKG, a14f156f19b925e5-HKG, a14f156f5aa825e5-HKG, a14f156fab7025e5-HKG, a14f156fec4325e5-HKG, a14f15703d2225e5-HKG, a14f1570be9725e5-HKG |
| trust | /trust | 480.74ms | 300ms | 180.74ms | HIT | a14f157eb8b325e5-HKG, a14f157f09aa25e5-HKG, a14f15821b2f25e5-HKG, a14f15850c3f25e5-HKG, a14f15854d4125e5-HKG, a14f15859e6f25e5-HKG, a14f1585df9e25e5-HKG, a14f1589193125e5-HKG, a14f15895a0125e5-HKG, a14f158a4cce25e5-HKG, a14f158c1af025e5-HKG, a14f158c5bc025e5-HKG, a14f158cac8c25e5-HKG, a14f158cfd3425e5-HKG, a14f158f6c5225e5-HKG, a14f158fad2a25e5-HKG, a14f158ffdfd25e5-HKG, a14f15904f1c25e5-HKG, a14f1590881b25e5-HKG, a14f1590d92925e5-HKG |
| terms | /terms | 1019.73ms | 300ms | 719.73ms | HIT | a14f1597af8525e5-HKG, a14f1597e86d25e5-HKG, a14f1598294525e5-HKG, a14f15987a1525e5-HKG, a14f1598caf125e5-HKG, a14f15990bf125e5-HKG, a14f15997d4625e5-HKG, a14f1599ce4e25e5-HKG, a14f15a02c2e25e5-HKG, a14f15a34eb225e5-HKG, a14f15a9ba4a25e5-HKG, a14f15accab925e5-HKG, a14f15ad0b7125e5-HKG, a14f15ad6c5525e5-HKG, a14f15b17f0d25e5-HKG, a14f15b1c81a25e5-HKG, a14f15b2190425e5-HKG, a14f15b3de5f25e5-HKG, a14f15b42f5a25e5-HKG, a14f15b4788a25e5-HKG |
| signup | /signup | 604.56ms | 300ms | 304.56ms | HIT | a14f15b7bb0925e5-HKG, a14f15bacbc625e5-HKG, a14f15bb1cac25e5-HKG, a14f15bb5d6525e5-HKG, a14f15bbae1a25e5-HKG, a14f15bbff1f25e5-HKG, a14f15bc585525e5-HKG, a14f15bca93425e5-HKG, a14f15bcf9f525e5-HKG, a14f15bd3ab525e5-HKG, a14f15c14f0025e5-HKG, a14f15c19fbf25e5-HKG, a14f15c1d88b25e5-HKG, a14f15c2292725e5-HKG, a14f15c279fc25e5-HKG, a14f15c4f89525e5-HKG, a14f15c8ab0325e5-HKG, a14f15c90c2125e5-HKG, a14f15c95d5725e5-HKG, a14f15c9ae3425e5-HKG |
| access-required | /access-required | 797.81ms | 300ms | 497.81ms | (none) | a14f15cd497d25e5-HKG, a14f15cdcb2525e5-HKG, a14f15ce3c5e25e5-HKG, a14f15cead8f25e5-HKG, a14f15d3edc525e5-HKG, a14f15db4a7925e5-HKG, a14f15dbab8425e5-HKG, a14f15e0994925e5-HKG, a14f15e13b3525e5-HKG, a14f15e1bc9e25e5-HKG, a14f15e47d0825e5-HKG, a14f15e51ecc25e5-HKG, a14f15e5880e25e5-HKG, a14f15e629e125e5-HKG, a14f15e69b6c25e5-HKG, a14f15e96b8825e5-HKG, a14f15e9ed2225e5-HKG, a14f15ea5e5525e5-HKG, a14f15eacfcd25e5-HKG, a14f15eb392125e5-HKG |
| workshop-signed-out | /workshop | 983.59ms | 600ms | 383.59ms | (none) | a14f15ec5c9325e5-HKG, a14f15ecad8d25e5-HKG, a14f15f13a7125e5-HKG, a14f15f18b6825e5-HKG, a14f15f1fc8325e5-HKG, a14f15f25dd725e5-HKG, a14f15f8880d25e5-HKG, a14f15f8e90525e5-HKG, a14f15f929ec25e5-HKG, a14f15f97aec25e5-HKG, a14f15faff6525e5-HKG, a14f15fb585625e5-HKG, a14f15fba92b25e5-HKG, a14f15fffec525e5-HKG, a14f16062ab125e5-HKG, a14f16068bec25e5-HKG, a14f1606dcf725e5-HKG, a14f16072dd425e5-HKG, a14f1609eeaf25e5-HKG, a14f160a4fda25e5-HKG |
| share-invalid-page | /share/not-a-real-hosted-worker-share-token | 787.06ms | 400ms | 387.06ms | (none) | a14f160e1d2e25e5-HKG, a14f160e5df625e5-HKG, a14f160eaed125e5-HKG, a14f160eef9925e5-HKG, a14f160f38bc25e5-HKG, a14f160f799025e5-HKG, a14f160fca8625e5-HKG, a14f16100b6c25e5-HKG, a14f16105c5925e5-HKG, a14f16154cac25e5-HKG, a14f1618e84825e5-HKG, a14f1619293225e5-HKG, a14f161ba9c825e5-HKG, a14f161beaae25e5-HKG, a14f161c2b9325e5-HKG, a14f1621cde925e5-HKG, a14f16222f0025e5-HKG, a14f1622882c25e5-HKG, a14f1622c92925e5-HKG, a14f16230a1925e5-HKG |

| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| health | health | yes | PASS | 621ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 662.85ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 812.97ms | under 300 ms | (none) | 1 | FAIL |
| pricing | public-page | yes | PASS | 551.14ms | under 200 ms | HIT | 1 | FAIL |
| features | public-page | yes | PASS | 539.65ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 55.81ms | under 300 ms | HIT | 1 | PASS |
| contact | public-page | yes | PASS | 56.48ms | under 300 ms | HIT | 1 | PASS |
| trust | public-page | yes | PASS | 480.74ms | under 300 ms | HIT | 1 | FAIL |
| privacy | public-page | yes | PASS | 54.1ms | under 300 ms | HIT | 1 | PASS |
| terms | public-page | yes | PASS | 1019.73ms | under 300 ms | HIT | 1 | FAIL |
| signup | public-page | yes | PASS | 604.56ms | under 300 ms | HIT | 1 | FAIL |
| access-required | public-page | yes | PASS | 797.81ms | under 300 ms | (none) | (none) | FAIL |
| workshop-signed-out | signed-out-redirect | yes | PASS | 983.59ms | under 600 ms | (none) | (none) | FAIL |
| share-invalid-page | invalid-share-page | yes | PASS | 787.06ms | under 400 ms | (none) | (none) | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 770.34ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 75.29ms | record only | (none) | (none) | n/a |
