# Evidence — Current Budgets, Critique & Proposed Readiness Budgets

**Source of existing budgets:** `e2e/route-transition-performance-budgets.json` (consumed by
`e2e/route-transition-performance.spec.ts` and `scripts/check-route-transition-readiness.ts`).
The authoritative *targets* derived from these critiques live in
`../11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md` and `../03_ROUTE_SPEED_MATRIX.md`.

## 1. Existing budgets (verbatim) + critique

| Budget key | Current value | What it gates | Critique | Verdict |
|------------|---------------|---------------|----------|---------|
| `publicRoute.navigationDurationMs` | **15000** | public page nav duration | 15s would pass even a catastrophically broken page. Catches only total failure. | **Legacy smoke budget, not a readiness budget** |
| `publicRoute.resourceCount` / `scriptCount` / `nextAssetCount` | 250 / 120 / 160 | resource counts on public route | Counts, not weight or timing; 120 scripts is far beyond a healthy public LCP profile. | Smoke only |
| `protectedRedirect.navigationDurationMs` | **15000** (overlay 0) | unauth → /login redirect | Redirect should be <250ms; 15s is meaningless as a target. Overlay=0 assertion is useful. | Smoke only |
| `slow3gPublicRoute.navigationDurationMs` | **30000** | public route on Slow 3G | 30s is "did it ever finish", not a UX bar. | Smoke only |
| `slow3gPublicRouteTransition.medianTransitionMs` | **30000** (overlayRateMax 1) | Slow 3G Link transition | Same; overlay-rate cap of 1 (i.e. always allowed) is not a constraint. | Smoke only |
| `publicRouteTransition.medianTransitionMs` | **15000** (overlayRateMax 1) | warm public Link transition | Observed real medians are ~180–400ms; budget is ~40–80× looser than reality. | Smoke only |
| `bfcache.backForwardRestoreMs` | **1500** (overlayCount 0) | back/forward restore | Restore should be <100ms (bfcache) or <300ms (warm). 1500ms hides regressions. overlayCount=0 is good. | Smoke only |
| `authenticatedWorkshopTransition.transitionMs` | **10000** (prefetchRscRequestMin 1, overlay 0) | authed sidebar nav | Observed authed no-throttle medians are ~1.8–2.7s; 10s budget never trips. The `prefetchRscRequestMin: 1` and `overlayCount: 0` assertions ARE valuable correctness gates. | Smoke only (keep the assertions) |

**Headline:** every numeric budget in this file is a **regression smoke catcher**, not a
readiness bar. None is connected to a launch decision. They should be explicitly relabeled
(see below) so nobody mistakes a passing smoke run for "ready".

## 2. Proposed readiness budgets (three tiers)

Tiers map to launch decisions. **SMOKE** keeps the current loose numbers (rename only) to
catch catastrophic regressions in CI. **CLOSED-BETA** is the bar this audit gates against.
**PUBLIC-LAUNCH** requires production RUM proof, not just lab.

| Surface | Metric | SMOKE (keep, relabel) | CLOSED-BETA target | PUBLIC-LAUNCH target |
|---------|--------|------------------------|--------------------|-----------------------|
| Public landing `/` | LCP (No-throttle, lab) | (none) | ≤ 2500ms | ≤ 2000ms p75 RUM |
| Public landing `/` | TBT | (none) | ≤ 250ms | ≤ 200ms |
| Public → public Link (warm) | median | < 15000 | < 300ms | < 250ms p75 RUM |
| Public route (Slow 3G) | median | < 30000 | < 3000ms | < 3000ms p75 |
| Unauth → /login redirect | median | < 15000 | < 400ms | < 300ms |
| bfcache back/forward | restore | < 1500 (overlay 0) | < 300ms + DevTools "restored from bfcache" proof | < 100ms p75 |
| Authed sidebar nav (warm) | median | < 10000 (rsc≥1, overlay 0) | < 800ms (rsc≥1) | < 500ms p75 INP-adjacent |
| `/workshop/projects` (cold) | LCP (authed lab) | (none) | ≤ 3000ms (currently 3865ms observed → **gap**) | ≤ 2500ms p75 RUM |
| Estimate editor `[nodeId]` (cold) | shell/skeleton paint | (none) | < 300ms shell, data route-specific | RUM-proven |
| Charts (cold) | data ready | (none) | < 1500ms warm | RUM-proven |
| Excel export | first feedback | (none) | < 200ms feedback + progress state | same |
| INP (all interactive surfaces) | p75 | (none) | < 200ms (currently **unmeasured**) | < 200ms p75 RUM |

## 3. Which budget applies to which decision

- **CI / pre-merge:** SMOKE tier only (current JSON, relabeled). Purpose: block catastrophic
  regressions, not enforce readiness.
- **Closed-beta go/no-go:** CLOSED-BETA tier. Several rows are **gaps today** — notably
  `/workshop/projects` LCP (observed 3865ms vs ≤3000ms target) and INP (unmeasured). See
  `../15_READINESS_DECISION.md`.
- **Public launch:** PUBLIC-LAUNCH tier — requires production RUM (Vercel Speed Insights or
  equivalent), which is **not currently wired** (`@vercel/speed-insights` absent from
  `package.json`; only `@vercel/analytics` is present). This is a launch blocker, not a beta blocker.

## 4. Recommended action

1. Rename the JSON keys' intent in-doc as `*_smoke` and add a separate
   `route-transition-readiness-budgets.json` for the CLOSED-BETA tier (do not loosen the
   smoke file). (Backlog: see `../12_OPTIMIZATION_BACKLOG.md`, P0.)
2. Keep the **assertions** that already carry signal: `overlayCount: 0`,
   `prefetchRscRequestMin: 1`.
3. Wire production RUM before adopting any PUBLIC-LAUNCH p75 budget.
