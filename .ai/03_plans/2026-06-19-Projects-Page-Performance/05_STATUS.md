# Projects Page Performance Status

Date: 2026-06-19. Canonical status for the `/workshop/projects` performance pack.

## Current verdict

Phase 1-3 work is implemented locally and measured. This pack is no longer a
rediscovery plan. Remaining work is follow-up hardening and additional measurement,
not a launch-readiness blocker unless the owner separately makes `/workshop/projects`
LCP a release gate.

## Status table

| Area | Status | Proof / caveat |
|---|---|---|
| Server data tail | Implemented | Parallel waves + `cache()` recorded in `LOOP_LEDGER.md`; server-parallelism test in `03_METRICS.md`. |
| Card image bandwidth | Implemented | 512px thumbnail path + browser `<img>` confirmed in production-build local proof. |
| `next/image` | Rejected for private covers | Auth-gated proxy needs browser cookies; server-side optimizer fetch cannot prove user session. |
| Client render cost | Implemented | Render-count proof: search and sort cause 0 card-body re-renders in fixture. |
| Content visibility | Implemented | Lightweight browser hardening; large-list visual spot-check remains useful. |
| Production-representative Lighthouse | Measured locally | `next build` -> `next start` + real Supabase session. This is not hosted Vercel proof. |
| Slow-3G | Uncaptured | Optional unless it will decide the next implementation lever. |
| CI route-transition harness | Needs patch | `e2e/route-transition-performance.spec.ts` does not inject the bypass cookie. |

## Remaining follow-ups

1. Patch the route-transition spec to authenticate correctly or use `PLAYWRIGHT_STORAGE_STATE`.
2. Capture Slow-3G only if the next lever depends on throttled evidence.
3. Spot-check large-list scroll/menu/focus behavior for `content-visibility`.
4. Investigate main-thread/hydration and serial auth-gated image-proxy fetches if LCP
   under 3s becomes a release target.

## Source-sensitive invariant

P1.1 parallelized authenticated reads. Any future edit must prove that shared projects,
publications, and pending-invite visibility remain RLS/authz-scoped exactly as before.
Use targeted repository tests and, for risky changes, a live/scratch Postgres proof.

