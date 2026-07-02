# Cloudflare Hosted Worker Performance

Generated: 2026-07-02T11:03:22.605Z
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
| home | / | 757.42ms | 200ms | 557.42ms | HIT | a14d27f0eb9fcddd-SIN, a14d27f39bcfcddd-SIN, a14d27f5db06cddd-SIN, a14d27f7a86acddd-SIN, a14d27fb5b9fcddd-SIN, a14d27fdbb2acddd-SIN, a14d28011dddcddd-SIN, a14d2802ba60cddd-SIN, a14d28042f0ecddd-SIN, a14d2808fca3cddd-SIN, a14d280d8a21cddd-SIN, a14d280fb8d6cddd-SIN, a14d28104a9ecddd-SIN, a14d2817688ccddd-SIN, a14d281a8a27cddd-SIN, a14d281b0ba7cddd-SIN, a14d281bad91cddd-SIN, a14d281c2f26cddd-SIN, a14d281c9858cddd-SIN, a14d281d19f7cddd-SIN |
| login | /login | 505.19ms | 300ms | 205.19ms | (none) | a14d28265d71cddd-SIN, a14d28270f7dcddd-SIN, a14d282a39b1cddd-SIN, a14d282acb7bcddd-SIN, a14d282c99b3cddd-SIN, a14d282ee8fbcddd-SIN, a14d28316866cddd-SIN, a14d2831e9cecddd-SIN, a14d28349b1fcddd-SIN, a14d28353d39cddd-SIN, a14d2835cf1bcddd-SIN, a14d28386e79cddd-SIN, a14d283b8fb0cddd-SIN, a14d283c5a63cddd-SIN, a14d283e789dcddd-SIN, a14d2840ef82cddd-SIN, a14d28440928cddd-SIN, a14d28465874cddd-SIN, a14d2846fa54cddd-SIN, a14d28495a10cddd-SIN |
| pricing | /pricing | 508.82ms | 200ms | 308.82ms | HIT | a14d284e8971cddd-SIN, a14d2851badacddd-SIN, a14d28552e0bcddd-SIN, a14d28558ef4cddd-SIN, a14d28585ed9cddd-SIN, a14d2858b815cddd-SIN, a14d285abd93cddd-SIN, a14d285b1e8dcddd-SIN, a14d285b8fb7cddd-SIN, a14d285be8f7cddd-SIN, a14d285eca05cddd-SIN, a14d286149c3cddd-SIN, a14d2861aad9cddd-SIN, a14d28621c5ccddd-SIN, a14d28641a3bcddd-SIN, a14d2866caa1cddd-SIN, a14d28692a2acddd-SIN, a14d286b7933cddd-SIN, a14d286bea50cddd-SIN, a14d286dd848cddd-SIN |
| features | /features | 398.4ms | 200ms | 198.4ms | HIT | a14d28722cd7cddd-SIN, a14d2872ae51cddd-SIN, a14d28730f81cddd-SIN, a14d28750d97cddd-SIN, a14d28776c65cddd-SIN, a14d2879db42cddd-SIN, a14d287c6b87cddd-SIN, a14d287eca34cddd-SIN, a14d288128d5cddd-SIN, a14d28833f23cddd-SIN, a14d28858e49cddd-SIN, a14d28877c94cddd-SIN, a14d2887eddccddd-SIN, a14d288a2dadcddd-SIN, a14d288a9f76cddd-SIN, a14d288cbe5bcddd-SIN, a14d288f3e5bcddd-SIN, a14d28915cf2cddd-SIN, a14d2891be19cddd-SIN, a14d28923fa2cddd-SIN |
| about | /about | 565.12ms | 300ms | 265.12ms | HIT | a14d2899cf74cddd-SIN, a14d289a28aacddd-SIN, a14d289bad49cddd-SIN, a14d289c0e73cddd-SIN, a14d289c7f93cddd-SIN, a14d289cd86ecddd-SIN, a14d289e8d4bcddd-SIN, a14d28a2b9d3cddd-SIN, a14d28a31adacddd-SIN, a14d28a5090dcddd-SIN, a14d28a57ab5cddd-SIN, a14d28a788cccddd-SIN, a14d28aa69c6cddd-SIN, a14d28aacaf6cddd-SIN, a14d28ae5da0cddd-SIN, a14d28b0dd75cddd-SIN, a14d28b42fa3cddd-SIN, a14d28b769fdcddd-SIN, a14d28b7cb13cddd-SIN, a14d28b83c3ecddd-SIN |
| contact | /contact | 616.72ms | 300ms | 316.72ms | HIT | a14d28b91ecbcddd-SIN, a14d28b98ff5cddd-SIN, a14d28b9e96ccddd-SIN, a14d28bbbed8cddd-SIN, a14d28bee8b6cddd-SIN, a14d28bf49eacddd-SIN, a14d28c21adacddd-SIN, a14d28c28c1acddd-SIN, a14d28c50c0ccddd-SIN, a14d28cbd8e9cddd-SIN, a14d28cc4a2ccddd-SIN, a14d28ccbb72cddd-SIN, a14d28cf3b58cddd-SIN, a14d28d15a52cddd-SIN, a14d28d1cbd3cddd-SIN, a14d28d24d27cddd-SIN, a14d28d2ae83cddd-SIN, a14d28d54e97cddd-SIN, a14d28d83fb9cddd-SIN, a14d28dc1b5acddd-SIN |
| trust | /trust | 950.72ms | 300ms | 650.72ms | HIT | a14d28df5d38cddd-SIN, a14d28e1bd06cddd-SIN, a14d28e4dec9cddd-SIN, a14d28e54843cddd-SIN, a14d28e7f88fcddd-SIN, a14d28e9be92cddd-SIN, a14d28ebee87cddd-SIN, a14d28ec5feccddd-SIN, a14d28ecc911cddd-SIN, a14d28ef29cbcddd-SIN, a14d28ef8b10cddd-SIN, a14d28f1c9bfcddd-SIN, a14d28fb081ecddd-SIN, a14d28fd989dcddd-SIN, a14d29006a0bcddd-SIN, a14d2900dbbdcddd-SIN, a14d2903edb7cddd-SIN, a14d2909d8b0cddd-SIN, a14d290a5a7acddd-SIN, a14d290d1b79cddd-SIN |
| privacy | /privacy | 1039.69ms | 300ms | 739.69ms | HIT | a14d2912cccfcddd-SIN, a14d29132e07cddd-SIN, a14d2915ae52cddd-SIN, a14d2917fe71cddd-SIN, a14d291acf21cddd-SIN, a14d291f7ce5cddd-SIN, a14d29270e94cddd-SIN, a14d2929cf90cddd-SIN, a14d292a18d0cddd-SIN, a14d292d5bd7cddd-SIN, a14d292f8a96cddd-SIN, a14d29335dc4cddd-SIN, a14d2933bf47cddd-SIN, a14d29369f30cddd-SIN, a14d2936f851cddd-SIN, a14d29376996cddd-SIN, a14d293bef8acddd-SIN, a14d29426be4cddd-SIN, a14d29455d39cddd-SIN, a14d2945be4ecddd-SIN |
| terms | /terms | 412.47ms | 300ms | 112.47ms | HIT | a14d294b2f20cddd-SIN, a14d294efab5cddd-SIN, a14d29518b53cddd-SIN, a14d2951fccecddd-SIN, a14d29526e13cddd-SIN, a14d2952cfa0cddd-SIN, a14d29533914cddd-SIN, a14d2953aa9bcddd-SIN, a14d29541c1dcddd-SIN, a14d29547d17cddd-SIN, a14d2954de7fcddd-SIN, a14d29553f94cddd-SIN, a14d29559885cddd-SIN, a14d2955f9a1cddd-SIN, a14d29565abfcddd-SIN, a14d2956cbc1cddd-SIN, a14d29573d70cddd-SIN, a14d2957ae9dcddd-SIN, a14d2958180fcddd-SIN, a14d2958793dcddd-SIN |
| signup | /signup | 1208.99ms | 300ms | 908.99ms | HIT | a14d29596c60cddd-SIN, a14d2959ddbacddd-SIN, a14d295a2ec0cddd-SIN, a14d295a9fd8cddd-SIN, a14d295ae8dccddd-SIN, a14d295b49f1cddd-SIN, a14d295f4e75cddd-SIN, a14d29650930cddd-SIN, a14d29656a84cddd-SIN, a14d296cfa43cddd-SIN, a14d296ed839cddd-SIN, a14d296f2930cddd-SIN, a14d296f8a2dcddd-SIN, a14d296ffbb5cddd-SIN, a14d29727b8fcddd-SIN, a14d2972ccbbcddd-SIN, a14d29732e09cddd-SIN, a14d297b2e59cddd-SIN, a14d297e9a1dcddd-SIN, a14d29800e1fcddd-SIN |
| access-required | /access-required | 564.84ms | 300ms | 264.84ms | (none) | a14d29850cd9cddd-SIN, a14d29858e50cddd-SIN, a14d29860fddcddd-SIN, a14d29869937cddd-SIN, a14d298cfb9bcddd-SIN, a14d298d7d13cddd-SIN, a14d298dee53cddd-SIN, a14d298e5fcacddd-SIN, a14d2991ea87cddd-SIN, a14d29937fafcddd-SIN, a14d2993f97bcddd-SIN, a14d29947ad3cddd-SIN, a14d2994fc22cddd-SIN, a14d29957ddfcddd-SIN, a14d2995df1ecddd-SIN, a14d2996589ccddd-SIN, a14d2996c9e0cddd-SIN, a14d29974b2fcddd-SIN, a14d2997ccc4cddd-SIN, a14d29983e51cddd-SIN |
| workshop-signed-out | /workshop | 645.31ms | 600ms | 45.31ms | (none) | a14d299939d3cddd-SIN, a14d2999ab1fcddd-SIN, a14d299a2c8dcddd-SIN, a14d299a8db7cddd-SIN, a14d299afefecddd-SIN, a14d299b683dcddd-SIN, a14d299c0a14cddd-SIN, a14d299c6b50cddd-SIN, a14d299cdc92cddd-SIN, a14d29a21d3acddd-SIN, a14d29a27e6bcddd-SIN, a14d29a699c9cddd-SIN, a14d29a6eac1cddd-SIN, a14d29a74be8cddd-SIN, a14d29a7bcfbcddd-SIN, a14d29a82e51cddd-SIN, a14d29ac2a17cddd-SIN, a14d29ac8af7cddd-SIN, a14d29acec09cddd-SIN, a14d29ad4d0ecddd-SIN |
| share-invalid-page | /share/not-a-real-hosted-worker-share-token | 478.99ms | 400ms | 78.99ms | (none) | a14d29af7b7ecddd-SIN, a14d29afcc36cddd-SIN, a14d29b17946cddd-SIN, a14d29b1ca24cddd-SIN, a14d29b22b25cddd-SIN, a14d29b27c22cddd-SIN, a14d29b2ccf4cddd-SIN, a14d29b5cd50cddd-SIN, a14d29b61e42cddd-SIN, a14d29b67f3bcddd-SIN, a14d29b6c82fcddd-SIN, a14d29b71906cddd-SIN, a14d29b769f8cddd-SIN, a14d29b7cb03cddd-SIN, a14d29b81c0dcddd-SIN, a14d29bb2cf6cddd-SIN, a14d29bbdea3cddd-SIN, a14d29bc2f94cddd-SIN, a14d29be2d17cddd-SIN, a14d29be7e02cddd-SIN |

| Probe | Kind | Required | Contract | P95 TTFB | Budget | CF Cache | Prerender | Budget result |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| health | health | yes | PASS | 1073.95ms | liveness contract only | (none) | (none) | n/a |
| home | public-page | yes | PASS | 757.42ms | under 200 ms | HIT | 1 | FAIL |
| login | public-page | yes | PASS | 505.19ms | under 300 ms | (none) | 1 | FAIL |
| pricing | public-page | yes | PASS | 508.82ms | under 200 ms | HIT | 1 | FAIL |
| features | public-page | yes | PASS | 398.4ms | under 200 ms | HIT | 1 | FAIL |
| about | public-page | yes | PASS | 565.12ms | under 300 ms | HIT | 1 | FAIL |
| contact | public-page | yes | PASS | 616.72ms | under 300 ms | HIT | 1 | FAIL |
| trust | public-page | yes | PASS | 950.72ms | under 300 ms | HIT | 1 | FAIL |
| privacy | public-page | yes | PASS | 1039.69ms | under 300 ms | HIT | 1 | FAIL |
| terms | public-page | yes | PASS | 412.47ms | under 300 ms | HIT | 1 | FAIL |
| signup | public-page | yes | PASS | 1208.99ms | under 300 ms | HIT | 1 | FAIL |
| access-required | public-page | yes | PASS | 564.84ms | under 300 ms | (none) | (none) | FAIL |
| workshop-signed-out | signed-out-redirect | yes | PASS | 645.31ms | under 600 ms | (none) | (none) | FAIL |
| share-invalid-page | invalid-share-page | yes | PASS | 478.99ms | under 400 ms | (none) | (none) | FAIL |
| share-invalid-api | sensitive-fail-closed | no | PASS | 330.07ms | record only | (none) | (none) | n/a |
| project-image-missing-path | sensitive-fail-closed | yes | PASS | 68.3ms | record only | (none) | (none) | n/a |
