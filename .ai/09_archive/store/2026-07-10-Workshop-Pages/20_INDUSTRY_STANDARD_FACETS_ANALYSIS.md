# 20 — Industry-Standard Facets Analysis

Facets researched this cycle (beyond the original pack) with relevance verdicts and repo enablement evidence. Sourced from local Next.js 16.2.10 docs + web.dev/MDN. Read-only research; no code changed.

## Facet relevance matrix

| # | Facet | Repo status (verified) | Relevant to this fix? | Posture / recommendation |
|---|---|---|---|---|
| 1 | **INP (Interaction to Next Paint)** | No prod RUM; `WebVitalsProbe` dev-only (`NEXT_PUBLIC_PERF_TRACE=1`) | **Yes (most likely improved)** | Sidebar remount = main-thread work competing with next interaction; persisting chrome should improve post-nav INP. Measure via probe/Lighthouse in Phase 0; flag missing prod RUM as P2-1 gap. |
| 2 | **CLS (Cumulative Layout Shift)** | No prod measurement | **Yes (likely improved as side effect)** | Chrome remount can cause async-driven size shifts; persistent chrome = stable anchor. Add CLS assertion to PERF-1. |
| 3 | **LCP (Largest Contentful Paint)** | No prod measurement | Least affected (initial-load metric; this is a nav fix) | Not the target; just ensure no blocking async delays first paint (B7: Suspense async chrome). |
| 4 | **View Transitions API** (`document.startViewTransition`/React `<ViewTransition>`) | NOT used; `experimental.viewTransition` OFF | Orthogonal/low-priority | Chrome no longer unmounts → nothing to morph. Could add content-area crossfade later (separate polish; needs flag + CSS + reduced-motion). **Non-goal.** |
| 5 | **React Compiler** | OFF (no `reactCompiler`; no babel plugin) | Complementary, NOT substitute | Primary problem is *unmount*, not re-render; memoization can't prevent tree destruction. **Non-goal** (separate eval). |
| 6 | **bfcache (Back/Forward Cache)** | `BfcacheHandler` mounted in `AppProviders`; `bfcacheRestore` in nav store; workshop pages do NOT set `no-store` on serve path | Verify, largely neutral-to-positive | Moving chrome into layout changes what's in the bfcache snapshot; `bfcacheRestore` must reconcile (sidebar state, scroll). **Action:** rerun existing bfcache e2e post-change (P2-2). No header-side blocker. |
| 7 | **Route segment config** (`export const dynamic`) | NONE in `src/app/workshop` | Nuanced — do NOT add | `headers()` auto-opts into dynamic; `force-dynamic` redundant + removed under Cache Components. Decision: comment-only (18). |
| 8 | **`template.tsx` vs `layout.tsx`** | No `template.tsx` anywhere | Confirms anti-pattern | Current per-page-shell = effectively template behavior (remount every nav). Move to `layout.tsx` is the textbook fix. Never use `template.tsx` for chrome. |
| 9 | **Streaming + Suspense placement** | `WorkshopPageShell` already wraps `AuthenticatedMainSidebar` + content in Suspense | Core to the fix | Keep chrome's own Suspense; put content Suspense around `{children}`; gate reads NOT Suspense-wrapped (SEC). |
| 10 | **Bundle budget / `@next/bundle-analyzer`** | Installed (16.2.6), `ANALYZE=true` env-gated | Net payload reduction (shell dedup) | Optional before/after evidence; not a budget gate for this change. |
| 11 | **Prefetch + `loading.tsx`** | `staleTimes{dynamic:60,static:180}` already tuned | Composes favorably | Shared layout prefetched once + reused across siblings; `loading.tsx` boundaries already in place. Verify `workshop/loading.tsx` doesn't double-render sidebar post-Phase-1. |
| 12 | **`staleTimes` / Router Cache** | Already set deliberately | No change needed | 60s/180s appropriate for single-user-per-workspace SPA-like product. Flag `experimental` status. |

## Key cross-cutting findings
1. **`WebVitalsProbe` placement is itself a symptom** — it lives in `WorkshopPageShell` (remounts every nav), so even dev perf tracing resets per page. After Phase 1, relocate it into the persistent `WorkshopShell` (or `AppProviders`) so it survives nav. Next.js docs recommend a single vitals component at root.
2. **Existing perf harness is strong — extend, don't rebuild.** `e2e/route-transition-performance.spec.ts` `authenticatedWorkshopTransition` + budgets is the right vehicle for the "sidebar persists" regression assertion.
3. **No production INP/CLS/LCP telemetry** — the single biggest industry-facet gap; fix is structurally correct but real-world CWV win currently unmeasurable in prod. Recommend a follow-up RUM task (out of scope here).
4. **Cache Components off** is load-bearing: `<Activity>` nav-state-preservation (which would auto-solve remount) is NOT active; `dynamic`/`revalidate` exports still valid.

## Citations
- Local: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{layout,template,loading}.md`, `.../02-route-segment-config/index.md`, `.../05-config/01-next-config-js/{staleTimes,cacheComponents,reactCompiler}.md`, `.../01-app/02-guides/{prefetching,view-transitions}.md`, `.../04-functions/use-report-web-vitals.md`.
- Official: web.dev INP thresholds; MDN bfcache; React `<ViewTransition>`.
