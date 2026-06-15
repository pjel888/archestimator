# Public Cache-Safety Harness Evidence

Generated: 2026-06-05T17:19:58.892Z
Origin: https://www.archestimator.com
Status: **IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED**

This PR-0B harness probes public marketing routes with controlled anonymous, consent, A/B, synthetic logged-in-cookie, and mobile request states. It records whether headers and HTML are currently compatible with a future shared HTML cache. It does **not** change runtime behavior or relax cache headers.

## Logged-in proof note

The synthetic logged-in-cookie HTTP probe does not grant real Supabase authentication. A real logged-in beta cookie is credential-gated and must not be captured in repo evidence. The companion Vitest coverage renders `LandingHeader` with `isLoggedIn=false` and `isLoggedIn=true`, proving public marketing markup can vary when `getLandingAuthState()` resolves true. Future cache-header relaxation must isolate or account for that auth-specific CTA output.

## Route summary

| Route | Shared HTML cache compatible now? | Body varies | Set-Cookie seen | Cache-Control | Vary | x-vercel-cache | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | no | yes | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache.; HTML body differs across cache-safety scenarios. |
| `/about` | no | no | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache. |
| `/features` | no | no | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache. |
| `/pricing` | no | no | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache. |
| `/contact` | no | no | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache. |
| `/privacy` | no | no | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache. |
| `/terms` | no | no | no | private, no-cache, no-store, max-age=0, must-revalidate | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch | MISS | Cache-Control contains private/no-store/no-cache. |

## Conservative conclusion

Routes marked `no` are not safe for broad shared HTML caching. Keep `MARKETING_PAGE_CACHE_CONTROL` unchanged until auth-specific CTA output, A/B variants, consent behavior, and hosted cache headers are either proven invariant or split into cache-keyed/client-only/dynamic boundaries.
