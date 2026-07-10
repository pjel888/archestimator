# Performance, Loading, and Mount Protocol

**Status:** Universal agent rule (all tools).  
**Authority:** Entry via `AGENTS.md` Core rules. Numeric budgets live only in `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` — **reference, never duplicate**. Engineering law context: `.ai/13_research/` Master Performance bible (when present).  
**Scope:** Next.js 16 App Router + React 19 + Cloudflare Workers/OpenNext loading, streaming, mount, prefetch, and measurement decisions.

---

## 1. Status / authority

- This file governs every agent when adding or changing pages, layouts, client islands, loading UI, or perf instrumentation.
- Do not fork this protocol into `.cursor` / `.codex` / tool adapters — point here.
- React Compiler is **OFF**. Justify each `useMemo` / `useCallback`. Do not assume compiler memoization.

## 2. Server / Client boundary law

- Default to Server Components.
- Smallest `"use client"` boundary; keep server-only data out of client bundles.
- State owner decision tree: URL → server props/RSC → TanStack Query → Zustand (high-frequency UI) → local `useState`.

## 3. Mount law

- Heavy modules: `next/dynamic` with an explicit `loading` fallback when a skeleton exists.
- Modals/dialogs that are not first-paint critical: `ssr: false`.
- Critical-path estimate chunks: tree pane may use `ssr: false` + skeleton; avoid default-SSR of giant unused subtrees.
- Virtualize large lists/trees.

## 4. Streaming / Suspense law

- Static shell first; push dynamic access down.
- Place `<Suspense>` close to dynamic access; keep LCP content outside/above Suspense when possible.
- LCP images: `preload` / priority discipline.
- Skeletons must match layout dimensions (CLS).
- Token routes: resolve invalid/expired before expensive work; soft-404/noindex is acceptable for beta invite/share invalid states.

## 5. Loading-state taxonomy

| Kind | When |
|---|---|
| Skeleton | Preferred for route/segment loading (`loading.tsx`) |
| Spinner | Indeterminate inline only |
| Global overlay (`RouteLoadingOverlay`) | Cross-shell fallback; **debounced** (`SHOW_DELAY_MS=150`); **suppressed** when target has a `loading.tsx` (`shouldSuppressGlobalRouteOverlay`) |
| Progress | Determinate long jobs only |

Never show skeleton + global overlay together for the same navigation.

## 6. Prefetch law

- Default Next.js `<Link>` prefetch.
- Dense dashboards: `prefetch={false}` + `usePrefetchOnHover`.
- `experimental.staleTimes` (dynamic 60s / static 180s) — do not change without measurement evidence.

## 7. Cache / freshness law

- Current model: `revalidatePath` + client TanStack Query + selective `router.refresh`. Prefer **one** revalidation path per mutation (server `revalidatePath` preferred for RSC lists).
- Token-bearing / auth / share / invite routes: **no-store** (proxy-enforced). Never cache token routes.
- **Cache Components + `unstable_instant`:** deferred (owner decision OPEN-ARCH-01). Do not enable in this protocol's default path.

## 8. No `fetch` in `useEffect` for server data

- Use TanStack Query (`useQuery` / `useSuspenseQuery`). Prefer `HydrationBoundary` when SSR-bridging.
- Mutations may still `fetch` POST endpoints with CSRF; initial reads belong in Query.

## 9. Concurrency law

- `useTransition` for mutation feedback.
- `useDeferredValue` for expensive filtering.
- Effects for external sync only, with cleanup.

## 10. Instrumentation law

- Idle-deferred (`requestIdleCallback` / `scheduler.postTask`).
- Production RUM: Cloudflare Web Analytics Tier-1 (`NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`, `CloudflareWebAnalytics`). No paid APM by default.
- Dev-only `WebVitalsProbe` stays behind `NEXT_PUBLIC_PERF_TRACE`.

## 11. Bundle law

- Report KB gzip impact for meaningful client additions.
- Flag >10KB main-bundle regressions (see Rule 9 in roadmap budgets doc).
- Heavy deps require explicit owner approval.

## 12. Accessibility law

- Loading UI: `role="status"` / `aria-live` / `aria-label` / `aria-busy` as appropriate.
- Honor `prefers-reduced-motion` (`motion-reduce:`).
- Global overlay must not trap focus (`pointer-events-none`).

## 13. `viewport` + LCP-image preload

- Root layout exports `viewport`.
- LCP hero/marketing images use preload/priority; workshop sheets prefer skeleton-matched chrome.

## 14. "Add a page" checklist

1. force-static vs dynamic decision documented.
2. `loading.tsx` when async/authenticated/dynamic.
3. `error.tsx` for authenticated subtrees (use `WorkshopRouteErrorState` in workshop).
4. `not-found` / soft-invalid UX for token routes.
5. `metadata` (+ root `viewport`).
6. Suspense placement; LCP outside Suspense.
7. Prefetch choice.
8. Skeleton uses design-system `Skeleton`.
9. a11y loading states.
10. Bundle impact considered.
11. Touch EV-* / Playwright route-transition if navigation-critical.

## 15. "Add a component" checklist

1. Server vs Client boundary.
2. If Client: smallest boundary + bundle impact.
3. If heavy: `dynamic` + skeleton.
4. If data: TanStack Query (not fetch-in-effect).
5. If list: stable keys + virtualize when large.
6. a11y + reduced-motion.
7. Memoization only if justified (compiler off).

## 16. Measurement handoff

- Evaluators / budgets: `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`.
- Plan-pack evaluators EV-01..10: `.ai/09_archive/store/2026-07-10-Transition-And-Loading-UX-And-UI-complete/09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.
- Scripts: `bun run test:e2e:perf`, `node scripts/check-performance-budgets.mjs`, `perf:*` package scripts.
