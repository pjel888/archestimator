# 01 — Current-State Audit (Executive)

**Read this first.** Roll-up of the seven lane docs (10–16). The mechanism-level
detail lives in `02-ROOT-CAUSE-AND-SYMPTOM-MAP.md`; per-lane evidence in docs 10–16.

## TL;DR

The Estimate Sheet is slow **and** shows a skeleton cascade because of **three
independent, compounding problems**, none of which is a prefetch/N+1/RLS issue:

1. **A 6-layer skeleton stack** with the heaviest skeleton (a full dashboard
   bento, ~80–90 nodes) at the *shallowest* segment, plus a **missing leaf
   `loading.tsx`** that falls through to the *estimates-list* skeleton for the
   sheet route. (doc 10)
2. **A fully `await`-gated server path**: async layouts + a 5-RTT page waterfall
   block first paint. (doc 11)
3. **A client second phase**: the lazy library query lives *inside* the
   `next/dynamic` `EstimateSheetContent` chunk, so it can't start until that chunk
   hydrates → a third skeleton + a Realtime websocket handshake on mount. No
   double-fetch (server seeds the client). (doc 13)

Measured on the owner's own browser session (local dev, network-bound): **TTFB
≈ 2.0–2.2 s, FCP ≈ 2.3 s, LCP ≈ 7.1 s** (doc 15). The single lowest-risk,
highest-leverage fix is **adding `estimates/[nodeId]/loading.tsx`** (zero
consumers — doc 14).

## The route and its loading boundaries

```
/workshop                                 loading.tsx → dashboard bento (~80-90 nodes) ★ heaviest
  /projects                               loading.tsx → ProjectsList (~68 nodes)
    /[projectId]                          loading.tsx → ProjectDashboard (5 nodes)
      layout.tsx: <Suspense ProjectHeaderChromeSkeleton/> + <Suspense ProjectRouteContentFallback>{children}</Suspense>
      /estimates                          loading.tsx → ProjectEstimatesListSkeleton (~101 nodes = LIST table)
        /[nodeId]   ← THE SHEET            (NO loading.tsx) → falls through to the LIST skeleton above
```

Six skeleton boundaries stack above the sheet. The two heaviest paint first on a
hard load. The leaf has no loading file, so a **client-nav** to the sheet shows
the **list** skeleton (search bar + 12×8 table grid) for a route that renders no
list. The team already documented this mismatch in a code comment
(`ProjectEstimatesListSkeleton.tsx:3-6`) — the fix is anticipated, just not done.

A global `RouteLoadingOverlay` adds a full-screen blur+spinner on any client-nav
> 150 ms — well-debounced, so it's a *symptom* of the slow nav, not a bug.

## The server critical path (why it's slow)

| Hop | What | Where |
|-----|------|-------|
| Layout | `getCurrentUserContext()` → `getCurrentUserTermsAcceptanceStatus()` (sequential) | `workshop/layout.tsx:25,28` |
| Layout | `getCurrentWorkspaceProject(projectId)` | `[projectId]/layout.tsx:22` |
| Page Block 1 | `resolveEstimateTabRouteContext` ∥ `requireCurrentUserContext` | `estimates/[nodeId]/page.tsx:36-41` |
| ↳ inside resolver | `estimate_nodes+estimates` join → `tab nodes (LIMIT 1500+1)` → `tab rows .in(node_id, LIMIT 5000+1)` | `workspace-repository.ts` (doc 11) |
| Page Block 2 | `tabs` ∥ `can_edit_estimate` RPC (runs after Block 1; needs `estimate.id`) | `estimates/[nodeId]/page.tsx:64-71` |

≈ **5 serial RTTs** on the common path. No N+1, no RLS loop, no prefetch gap.
The page streams **nothing** until all of this resolves — no in-page `<Suspense>`
(modulo the layout's `ProjectChromeAsync` precedent at `[projectId]/layout.tsx:42-44`).

## What's already good (don't break these)

- **Skeleton-mirror discipline**: skeletons reuse the real page's layout classes → CLS is 0.0004–0.0069 (stable). (docs 10, 15)
- **Hover prefetch**: the sheet link prefetches via `usePrefetchOnHover` (`ProjectEstimatesTable.tsx:1087`); `prefetch={false}` on `<Link>` is deliberate. (doc 16)
- **`ProjectChromeAsync` precedent**: the layout already streams heavy chrome behind Suspense with a shape-correct fallback — the exact pattern to copy for the page. (doc 16)
- **Extensive `React cache()` coverage** in `workspace-repository.ts` (per-request dedupe). (doc 16)
- **Route-transition + perf instrumentation already exists**: `scripts/measure-route-transitions.ts`, `scripts/bench-hero-browser.mjs`, and the `PERF_TRACE=1` tracer. (doc 15)

## Blast radius (doc 14) — what's safe vs risky to touch

- **Safe (LOW blast, do first):** add `estimates/[nodeId]/loading.tsx` (0 consumers, pure addition).
- **Risky (HIGH blast, careful):** `WorkshopPageShell` (11 routes + 5 tests), `requireCurrentUserContext` (30 consumers — signature off-limits, call-order only), `getCurrentWorkspaceProject` (10 consumers, but `cache()`-memoized so parallelization is free if the projectId key is preserved), the two shared layouts, `StaticWorkshopLoadingShell`, `ProjectHeaderChromeSkeleton` (test-locked node-count contract).
- **Biggest test gap:** no test walks the full `/workshop → /projects → /[projectId] → /estimates → /[nodeId]` skeleton sequence, and the dashboard-shell skeleton that flashes on the sheet has zero behavioral assertions.

## What this audit is NOT

Not an implementation. No source under `src/` was modified. All findings are
plan-level; the roadmap (doc 05) sequences the fixes by blast radius. Network
caveat: local numbers reflect dev→hosted-Supabase RTT; re-measure on Vercel
in-region before any production claim (doc 15, [[hero-path-perf-network-bound]]).

## Doc index

| Doc | Lane | Subject |
|-----|------|---------|
| 00 | — | Plan / scope / orchestration |
| 01 | LEAD | This executive audit |
| 02 | LEAD | Root cause & symptom map |
| 10 | L1 | Loading-skeleton cascade |
| 11 | L2 | Server data-fetch waterfall |
| 12 | L3 | Layout & caching critical path |
| 13 | L4 | Client hydration & bundle |
| 14 | L5 | Blast-radius matrix |
| 15 | L6 | Benchmark & measurements |
| 16 | L7 | Best practices & target state |
| 05 | LEAD | Implementation roadmap (phased, blast-radius-ordered) |
| 06 | LEAD | Validation & QA plan |
| 18 | LEAD | Adversarial review |
