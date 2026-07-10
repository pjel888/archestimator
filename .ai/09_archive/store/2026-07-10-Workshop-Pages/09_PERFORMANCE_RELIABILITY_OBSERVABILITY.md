# 09 — Performance, Reliability, Observability

## Performance evaluator contract (PERF-1)

Because this is a client-perceived performance/UX problem (shell stability, nav latency) and NOT a provider/data problem, the declared evaluator is **production-build + lab measurement**. No hosted/provider proof is required for Phases 1–3 (per AGENTS.md proportional-verification and the doc-cited fact that prefetching is production-only).

| Field | Value |
|---|---|
| **Baseline metric** | (a) React mount count of `MainSidebar` across `/workshop`↔`/workshop/projects` nav (today: ≥2 remounts). (b) Whether the 9.3 KB `workshop/loading.tsx` renders during client nav (today: possibly yes on page load; should be no on client nav). (c) `transitionMs` + RSC prefetch count + `overlayCount` via the **existing** `e2e/route-transition-performance.spec.ts` `authenticatedWorkshopTransition` test + `route-transition-performance-budgets.json`. (d) **INP/CLS/LCP** via `WebVitalsProbe` (`NEXT_PUBLIC_PERF_TRACE=1`) or Lighthouse. |
| **Target metric** | (a) `MainSidebar` mount count = 1. (b) Dashboard skeleton absent on client nav. (c) `transitionMs ≤ existing budget` (currently ≤10000ms — set a tighter target post-baseline). (d) No CLS regression during content swap (target CLS < 0.05 during the swap); INP not worsened. |
| **Measurement command/harness** | `bun run build && bun run start` (production build — prefetching enabled). Use the existing e2e perf spec + a `MainSidebar` mount-count probe (inject `useEffect` counter) + `WebVitalsProbe`. Optionally `ANALYZE=true bun run build` for before/after chunk size. |
| **Dataset/fixture size** | N/A (no data-size dimension). |
| **Number of runs / flake policy** | ≥5 nav transitions; report median. Single flaky run = inconclusive; re-run. |
| **Regression threshold** | `MainSidebar` remount >1 = hard regression. Dashboard skeleton on client nav = hard regression. CLS > 0.1 during swap = hard regression. `overlayCount > 0` on a warm transition = regression. |
| **Related functional tests** | existing workshop route tests; SEC-1 denial tests; shell-governance tests (WP-1.7). |
| **Evidence artifact location** | `.ai/03_plans/2026-07-09/Workshop-Pages/perf-baseline.md` (Phase 0). |

> **Dev vs prod caveat (doc-cited):** prefetching is production-only (`link.md:298`). Phase 0 MUST measure in a production build (`bun run build && bun run start`); `bun run dev` shows no prefetch and will mislead. Label build mode in the artifact.
> **Prod RUM gap (P2-1):** no production INP/CLS/LCP telemetry exists today (`WebVitalsProbe` is dev-only, `PerformanceMonitor` is dev-only). The fix is structurally correct (proven by `template.md`/`layout.md`) but its real-world CWV win is unmeasurable in prod until a RUM sink is wired. Recommend a follow-up; out of scope here.

## Performance budgets (for the workshop transition)
| Metric | Budget | Rationale |
|---|---|---|
| Client JS added by Phase 1 | ≤ 0 KB net (refactor; shell code already loaded) | `WorkshopShell` reuses existing components. |
| `MainSidebar` remounts per cross-page nav | 0 (mount-once) | RC-1 fix. |
| Content-slot layout shift (CLS) during nav | ~0 | shell persists; only content swaps. |

No RSC-payload/API/query budgets needed — Phase 1 is a client-render structure change; the server data fetching per page is unchanged.

## Reliability
- **Failure mode:** Phase 1 reconciliation with `library/layout.tsx`/`projects/[projectId]/layout.tsx` could double-wrap the shell → visual duplication. **Mitigation:** Phase 1 WP-1.5 explicitly handles the two nested layouts + DOM invariant (ONE `[data-workshop-page-shell-root]`, `ProjectMiniSidebar` only under project subtree).
- **Failure mode (CORRECTED):** the original "moving the gate reads could change redirect behavior" was understated — the gate is the sole prod verifier and CANNOT be deferred (SEC-T1/T2). **Mitigation:** Phase 2 rewritten; gate stays synchronous-first; SEC-1 denial + static gate.
- **Error boundaries:** existing `error.tsx` files remain; a shell-level error boundary should be considered in Phase 1 so a content error does not blank the persistent chrome.

## bfcache (Back/Forward Cache) interaction (resolves P2-2)
- **Repo posture (verified):** `BfcacheHandler` is mounted globally in `AppProviders`; on `pageshow` with `persisted` it calls `useNavigationUiStore.bfcacheRestore()` (clears nav timers, forces `isNavigating:false`) so the route overlay never gets stuck. Workshop pages do NOT set `Cache-Control: no-store` on the serve path (`request-proxy.ts` applies sensitive cache-control only to `/login` redirects + `/share`; `next.config.ts headers()` applies `no-store` only to `/share/:path*`). So header-side bfcache is not blocked.
- **Effect of Phase 1:** moving chrome into the layout changes what is captured in the bfcache snapshot and what `bfcacheRestore` must reconcile (sidebar state, scroll, favorites query cache). Since `MainSidebar` becomes persistent, its state survives bfcache restore naturally — an improvement.
- **Action:** rerun the existing bfcache e2e (`route-transition-performance.spec.ts` back/forward test asserting `notRestoredReasons` + `overlayCount===0`) post-Phase-1. No bfcache-specific code change required; preserve `BfcacheHandler` + `RealtimeAuthBridge` behavior.

## Observability
- `WebVitalsProbe` relocates into the persistent `WorkshopShell` (improvement — survives nav; aligns with Next.js "single vitals component" guidance) or stays in `AppProviders`. `PerformanceMonitor` (dev) unchanged.
- Existing structured logging / `ops:*` scripts unaffected.
- **Measurement gap (P2-1):** no production RUM for CWV; lab proof is the declared evaluator (see PERF-1 caveat).

## Observability
- Existing `WebVitalsProbe` + `PerformanceMonitor` (mounted in `providers.tsx`) already capture nav/vitals. Use them as the measurement source — no new telemetry needed for Phases 1–3.
- Structured logging / `ops:*` scripts are not affected.

## Rollout performance gates (13_ROLLOUT… content folded here for this standard profile)
| Gate | Blocks merge? | Blocks prod? | Metric |
|---|---|---|---|
| `MainSidebar` remount = 1 on client nav | Yes | Yes | PERF-1 harness |
| Auth/terms denial tests pass | Yes | Yes | SEC-1 |
| No duplicate `[data-workshop-page-shell-root]` | Yes | n/a | DOM assertion |
| `type-check` + `build` green | Yes | Yes | repo scripts |
