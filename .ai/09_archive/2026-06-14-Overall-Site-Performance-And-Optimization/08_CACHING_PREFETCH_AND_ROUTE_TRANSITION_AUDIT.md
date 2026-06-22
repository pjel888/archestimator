# 08 — Caching, Prefetch & Route Transition Audit

Purpose: assess what the app caches, prefetches, and how it transitions between routes — where warm-cache/prefetch/loading-shell infrastructure is mature, where the remaining gaps block instant paint, and where caching can mask (vs. not mask) the dominant server-data cost.

Status: AUDIT / PLANNING ONLY
Date: 2026-06-14

---

## 1. Dimension summary

The route-transition infrastructure is genuinely mature and most of the canonical plan (Phases 0-7) is implemented and verified in code: `src/proxy.ts` has the public-route early return plus marketing-page bfcache cache-header relaxation (`no-store` only on redirects, NOT on successful authenticated GETs), the QueryClient runs 5-min stale/gc with `refetchOnWindowFocus` off, `experimental.staleTimes {dynamic:60, static:180}` is set, the navigation-ui-store uses a 150ms `SHOW_DELAY` + 250ms `MIN_VISIBLE` so prefetched/cached transitions never flash the global blur overlay, `usePrefetchOnHover` does real `router.prefetch` + optional TanStack query warming, and 10 `loading.tsx` shells + 7 `error.tsx` boundaries exist with mostly correctly-shaped skeletons.

The remaining gaps are concrete:

- Several user-reachable authenticated routes have NO loading boundary that applies to them (`settings/profile`, `settings/workspace`, `settings/feedback`, `settings/beta-users`, project `[projectId]` dashboard, `share/[token]`, `invite/[token]`, `login`) and block shell paint on server data.
- Hover/viewport prefetch is wired to only the 3 top-level sidebar items plus project cards and estimate rows, leaving settings, the project dashboard, charts, and estimate nodes with no warm-cache or prefetch path.
- `LiveProjectCard` warms only `router.prefetch` (no TanStack query) while `ProjectEstimatesTable` warms three queries — an inconsistency.
- `error.tsx` coverage is absent on the entire `/workshop` top-level segment, `/workshop/settings`, `/workshop/projects` (list), and all public routes, so any RSC throw there bubbles to the global error boundary.

Two confirmed cosmetic/observability discrepancies: `layout.tsx` ships `next/font/google` Roboto_Mono (not the documented SF Pro) and only sets the CSS variable without applying it to body text; and `@vercel/speed-insights` is absent from `package.json` so field Web Vitals RUM is not wired despite the readiness-check script.

The one true OPEN item from the plan remains: manual Chrome DevTools bfcache proof and a production Chrome React Profiler trace are still missing (Playwright reports `pageshow.persisted=false` even for a trivial control, so automated bfcache evidence is inconclusive).

Honest posture: this dimension is the most complete of the performance surfaces — the route-transition layer is *complete-enough*. The residual perceived latency is gated by the server-data path (authed LCP ~3.5-3.9s in lab evidence), which caching/prefetch cannot mask and which hands off to the server-data/DB dimension. Live authenticated route-transition measurement is **BLOCKED this session** (no dev server, dev-auth disabled, no Playwright storage state); all timing claims below are cited from existing archive evidence, never freshly observed.

---

## 2. Already implemented (do not re-recommend)

Reconciled against the orchestrator ground truth (verified against live repo, this section re-verified at audit HEAD `4f0ca5ab`). These are DONE — do not file them as gaps:

| Implemented | Where (verified) |
|---|---|
| `proxy.ts` public-route early return before Supabase client creation | `src/proxy.ts:75-80` |
| Marketing-page Cache-Control bfcache mitigation (`private, no-cache, max-age=0, must-revalidate`) | `src/proxy.ts:12,77` |
| `no-store` applied **only to redirects**; successful authed GETs return without `no-store` | `src/proxy.ts:13,141` |
| `getUser()` (never `getSession()`) in proxy | `src/proxy.ts:114` |
| workshop/invite/share hardening headers + CSP (report-only landing/workshop/invite, ENFORCED `/share`) | `src/proxy.ts` |
| QueryClient `staleTime` 5min / `gcTime` 5min / `refetchOnWindowFocus` false / `retry` 1 | `src/app/providers.tsx:14-28` |
| `next.config` `optimizePackageImports` phosphor + `experimental.staleTimes {dynamic:60, static:180}` | `next.config.ts:64-67` |
| `images.remotePatterns` supabase component-images + `@next/bundle-analyzer` (treemap only with `ANALYZE=true` AND `--webpack`, NOT turbopack) | `next.config.ts` |
| Overlay gate: 150ms `SHOW_DELAY` + 250ms `MIN_VISIBLE` so cached/prefetched nav never flashes the blur | `navigation-ui-store.ts:16-19` |
| `usePrefetchOnHover` = `router.prefetch` + optional TanStack query warming | `src/hooks/use-prefetch-on-hover.ts` |
| Sidebar hover-intent (`prefetch={null}` + hover prefetch) | `SidebarNavItemRow.tsx:41`, `MainSidebar.tsx:55` (3 routes) |
| 10 static `loading.tsx` shells | inventory below (gaps on key authed routes — see RT01/RT02/RT03) |
| 7 `error.tsx` boundaries (estimates, charts, library, library/templates, templates/[templateId], library/components) | (no `/workshop`, `/settings`, projects-list, share, invite, no global-error — see RT04) |
| `React.cache` on `getCurrentWorkspaceProject` | imported in layout + page (dedup not re-verified — LIKELY) |
| 10 files use `next/dynamic` (estimate tree/content, `ComponentLibraryManager`, `AddComponentModal`, `LibraryFolderTreeSurface`, `NeatWireframeBackground` ssr:false, bubble chart, D3 submodule imports) | per archive manifest audit; library JS 618KB → ~232KB |
| `BfcacheHandler` listens `pageshow.persisted` and calls `bfcacheRestore()` | `src/components/bfcache-handler.tsx` |
| `@vercel/analytics` Web Analytics page-views (NOT Web Vitals RUM) | `src/app/layout.tsx:3,28` |
| Recently LANDED: estimates-list RPC summaries, charts buckets-only payload, teamspace presence migration, estimate-tree unification corridor P0-P3 | (cross-dimension; see DB/server docs) |

Do not re-chase: proxy is already optimized; overlay does NOT flash on warm transitions by design; `/workshop/components` and `/workshop/templates` are `redirect()` stubs (no loading/error needed); the ground-truth-suspected `templates/[templateId]/[nodeId]/error.tsx` nested route **does not exist** (actual is `templates/[templateId]/error.tsx`).

---

## 3. Findings

### RT01 — settings/profile, settings/workspace, settings/feedback, settings/beta-users have no loading boundary that applies to them

Severity: Medium
Confidence: Verified
Bottleneck class: PREFETCH_GAP
Affected surface: `/workshop/settings/profile`, `/workshop/settings/workspace`, `/workshop/settings/feedback`, `/workshop/settings/beta-users`
User symptom: Navigating from the Settings index to a settings sub-page blanks/blocks the whole workshop shell while the server awaits `getAccountSetupState()` / `requireCurrentUserContext()` with no route-level skeleton.
Technical cause: Each settings sub-page is its OWN route segment under `/workshop/settings/<sub>/page.tsx` and is an async server component (`await getAccountSetupState()`). `loading.tsx` only exists at `/workshop/settings/loading.tsx`, which applies to the `/workshop/settings` segment and its children — but the sibling sub-page transitions have no closer instant fallback, and these pages render inside `WorkshopPageShell` which awaits server data before painting. None of these routes appear in the sidebar nav, so they also have zero hover prefetch.
Evidence:
- `/Users/philiplewis/archestimator/src/app/workshop/settings/profile/page.tsx` (async, `await getAccountSetupState()`)
- `/Users/philiplewis/archestimator/src/app/workshop/settings/workspace/page.tsx` (async, `await getAccountSetupState()`)
- `/Users/philiplewis/archestimator/src/app/workshop/settings/loading.tsx` (only settings-index-level)
- bash inventory: `NO loading.tsx: src/app/workshop/settings/{workspace,beta-users,feedback,profile}`
Current metric:
- blocked (no live authed measurement this session); Settings no-throttle median 2725ms / Slow 3G 11963ms observed at `.ai/09_archive` `perf:measure-routes` (route family, not sub-page-specific)
Target metric:
- Instant route-level skeleton (<150ms to first shell paint) for every settings sub-page; sub-page server data streamed behind Suspense
Recommended action:
- Add a per-segment `loading.tsx` (or a Suspense fallback in a shared settings layout) for each settings sub-route reusing `StaticWorkshopLoadingShell` with a form-shaped skeleton; consider a `/workshop/settings/layout.tsx` that wraps children in Suspense so all sub-pages inherit one fallback.
Validation gate:
- Playwright authed transition from `/workshop/settings` to each sub-page records overlay-free instant skeleton; `perf:measure-routes` Settings median unchanged or improved
Risk:
- Low — additive `loading.tsx` files, no behavior change to data fetching
Rollback/deletion criteria:
- If a settings sub-page skeleton flashes on warm cached revisits (staleTimes should prevent this), remove the per-segment `loading.tsx` and rely on the parent.

### RT02 — Project dashboard route ([projectId]/page.tsx) has no loading.tsx and blocks shell title paint on getCurrentWorkspaceProject

Severity: Medium
Confidence: Verified
Bottleneck class: SERVER_WATERFALL
Affected surface: `/workshop/projects/[projectId]`
User symptom: Opening a project from the projects list waits on a server round-trip before the shell title/header can paint; no instant dashboard skeleton, only the layout's `ProjectRouteContentFallback` for children.
Technical cause: `ProjectLayout` awaits `getCurrentWorkspaceProject(projectId)` to resolve title/notFound BEFORE rendering `WorkshopPageShell` (the heavy fan-out is correctly deferred behind `ProjectChromeAsync`/Suspense, but the title await still gates first paint). The `[projectId]` segment has no `loading.tsx`, so the only fallback is the layout's `<Suspense fallback={ProjectRouteContentFallback}>` around children — the shell chrome itself still blocks on the layout await.
Evidence:
- `/Users/philiplewis/archestimator/src/app/workshop/projects/[projectId]/layout.tsx:22` (await `getCurrentWorkspaceProject` before shell)
- `/Users/philiplewis/archestimator/src/app/workshop/projects/[projectId]/page.tsx:14` (await `getCurrentWorkspaceProject` again)
- bash inventory: `NO loading.tsx: src/app/workshop/projects/[projectId]`
- memory obs 5728/5756: ProjectLayout awaits then fan-out before children paint
Current metric:
- blocked live; Projects route no-throttle median 2325ms / Slow 3G 6941ms (`.ai/09_archive/store/route-transition-production-auth-refresh-20260601T093203Z`)
Target metric:
- Project shell chrome (title/breadcrumb) paints from prefetched cache or a `[projectId]/loading.tsx` within <200ms; dashboard body streams
Recommended action:
- Add a `[projectId]/loading.tsx` with a dashboard-shaped skeleton; `React.cache` on `getCurrentWorkspaceProject` already dedupes the layout+page double-call (verify cache hit), so the second await is free. Consider moving the title resolution to a lighter query so layout paint is not gated on the full project read.
Validation gate:
- Project-open transition shows instant dashboard skeleton; `getCurrentWorkspaceProject` confirmed deduped (single DB hit per request)
Risk:
- Low — additive skeleton; the title-source change is Medium and needs impact analysis on `getCurrentWorkspaceProject` callers
Rollback/deletion criteria:
- Remove `loading.tsx` if it causes a skeleton flash on warm staleTimes revisits.

### RT03 — share/[token] is force-dynamic with NO loading.tsx and no parent loading boundary — blank screen during share resolution

Severity: Medium
Confidence: Verified
Bottleneck class: ROUTE_TRANSITION
Affected surface: `/share/[token]`
User symptom: A recipient opening a shared proposal link sees a blank page (no skeleton) while the server resolves token access, snapshot, password gate, and recipient identity — the worst first-impression surface for external clients.
Technical cause: `src/app/share/[token]/page.tsx` declares `export const dynamic = 'force-dynamic'` and performs multiple sequential awaits (`resolveProjectPublicationAccessByToken`, `resolveProjectPublicationSnapshotByToken`, cookie/identity verification). There is no `share/[token]/loading.tsx`, no `/share` `layout.tsx`, and no parent loading boundary, so the route streams nothing until the server finishes. `force-dynamic` also disables any static prefetch benefit at the link boundary.
Evidence:
- `/Users/philiplewis/archestimator/src/app/share/[token]/page.tsx:45` (`export const dynamic = 'force-dynamic'`)
- `/Users/philiplewis/archestimator/src/app/share/[token]/page.tsx:26-39` (multi-await publication resolution)
- `find src/app/share`: only `page.tsx` + `print.css`, no loading/layout/error
- bash inventory: `NO loading.tsx: src/app/share/[token]` and `NO error.tsx: src/app/share/[token]`
Current metric:
- blocked live; no share-route median in archive evidence
Target metric:
- Share page paints a branded proposal skeleton within <200ms while the server resolves token/snapshot
Recommended action:
- Add `share/[token]/loading.tsx` with a proposal-hero + summary-card skeleton, and a `share/[token]/error.tsx` for invalid/expired tokens. Keep `force-dynamic` (correct for token security) but stream the shell; move non-critical analytics recording (already using `after()`) off the paint path.
Validation gate:
- Cold share-link open shows skeleton before content; expired/invalid token renders `error.tsx` not a thrown 500
Risk:
- Low — additive loading/error files on a public surface; verify CSP-enforced `/share` still renders the skeleton
Rollback/deletion criteria:
- Remove if the skeleton conflicts with the password-gate form rendering order.

### RT04 — No error.tsx on /workshop, /workshop/settings, /workshop/projects (list), or any public route — RSC throws bubble to global boundary

Severity: Medium
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: `/workshop`, `/workshop/settings`, `/workshop/projects`, `/workshop/onboarding`, `/workshop/feedback`, `/share/[token]`, `/invite/[token]`, `/login`, and all marketing routes
User symptom: If a server component throws on these routes (e.g. transient Supabase/RLS failure, missing workspace), the user sees the app-root fallback or a generic Next error instead of a scoped, retryable in-shell error.
Technical cause: `error.tsx` boundaries exist for estimates, charts, library, and templates subtrees, but the `/workshop` top-level segment, the settings subtree, the projects list, onboarding, feedback, and every public/auth route have none. There is also no root `app/error.tsx` and no `global-error.tsx`, so an uncaught throw in these segments escalates to Next's default error UI.
Evidence:
- bash inventory: `NO error.tsx: src/app/workshop`, `.../workshop/settings`, `.../workshop/projects`, `.../workshop/onboarding`, `.../workshop/feedback`, `.../share/[token]`, `.../invite/[token]`, `.../login`
- Existing `error.tsx` confirmed at `estimates/`, `charts/`, `library/`, `library/templates/`, `library/templates/[templateId]/`, `library/components/`
- memory obs 4879 (May 30): earlier state had zero `error.tsx` — partially remediated since
Current metric:
- Coverage: 7 `error.tsx` for ~30 page routes; 0 root/global error boundary
Target metric:
- Every top-level authenticated segment + public share/invite/login has a scoped `error.tsx` with a retry action; one root `global-error.tsx`
Recommended action:
- Add `error.tsx` at `/workshop` (covers settings/projects/onboarding/feedback by inheritance) and at `/share/[token]`, `/invite/[token]`; add `app/global-error.tsx`. Each should offer `reset()` retry and avoid leaking server error detail (note prior obs 5084 re: DeepSeek error leakage).
Validation gate:
- route-error-smoke harness (already present via `assertRouteErrorSmoke`) triggers a throw on each segment and confirms the scoped `error.tsx` renders, not the default Next error
Risk:
- Low — additive boundaries; ensure `error.tsx` are client components and do not over-catch expected `notFound()`/`redirect()`
Rollback/deletion criteria:
- Remove a boundary if it swallows `redirect()`/`notFound()` control-flow (these throw and must NOT be caught).

### RT05 — Hover/viewport prefetch covers only 3 sidebar items + project cards + estimate rows; settings, dashboard, charts, estimate nodes have no prefetch path

Severity: Medium
Confidence: Verified
Bottleneck class: PREFETCH_GAP
Affected surface: Settings sub-pages, project `[projectId]` dashboard from cards, charts route, estimate `[nodeId]`, breadcrumb links, mini-sidebar links
User symptom: Many in-app navigations have no warm route/data cache before the click, so they pay the full cold server transition (these are the same routes flagged for missing `loading.tsx`, compounding perceived latency).
Technical cause: `usePrefetchOnHover` is wired in exactly three places: `MainSidebar` (only `/workshop`, `/workshop/projects`, `/workshop/library`), `LiveProjectCard` (the project dashboard href), and `ProjectEstimatesTable` (estimate detail). All other internal Links (`breadcrumbs.tsx`, `ProjectMiniSidebar.tsx`, `LibraryTitleBarClient.tsx`, `ProjectChartsClient.tsx`, `WorkshopHomebaseClient.tsx`) rely on Next's default Link prefetch, which is disabled in dev and conservative for dynamic/auth segments. Settings is not even in the sidebar.
Evidence:
- grep `usePrefetchOnHover`: only `MainSidebar.tsx`, `ProjectEstimatesTable.tsx`, `LiveProjectCard.tsx`
- `/Users/philiplewis/archestimator/src/components/sidebar/MainSidebar.tsx:39-45` (3 routes only)
- Many `<Link>` with no explicit prefetch in `breadcrumbs.tsx`, `ProjectMiniSidebar.tsx`, `ProjectChartsClient.tsx`, `LibraryTitleBarClient.tsx`
- Plan note 04 line 44: App Router prefetch URL creation is disabled in `next dev` (gap is dev-only but auth-boundary prefetch is still conservative in prod)
Current metric:
- Sidebar hover-before-click `_rsc` proof captured in archive; project-card and estimate-row hover `_rsc` proof captured; settings/charts/mini-sidebar: no prefetch (unknown)
Target metric:
- Primary in-app navigation targets (project mini-sidebar tabs, charts, settings entry) have hover-intent `router.prefetch` + relevant TanStack warm-cache
Recommended action:
- Extend `usePrefetchOnHover` to the project mini-sidebar (estimates/charts tabs) and add a settings entry to the prefetch map; warm the charts buckets query and the project dashboard query on hover where the data is already wired into TanStack.
Validation gate:
- Playwright hover-before-click records `_rsc` (or warm TanStack cache hit) for mini-sidebar tabs and charts under storage-state auth
Risk:
- Low-Medium — over-prefetching at auth boundaries wastes RSC bandwidth; debounce (150ms) already mitigates
Rollback/deletion criteria:
- If prefetch `_rsc` volume spikes without transition-time improvement in `perf:measure-routes`, narrow the prefetch map back.

### RT06 — LiveProjectCard warms only router.prefetch (no TanStack query), inconsistent with ProjectEstimatesTable which warms 3 queries

Severity: Low
Confidence: Verified
Bottleneck class: CACHE_MISS
Affected surface: `/workshop/projects` card -> `/workshop/projects/[projectId]`
User symptom: Hovering a project card prefetches the RSC payload but not the client-side project/dashboard query, so the dashboard still fetches its data on arrival even though the route shell is warm.
Technical cause: `LiveProjectCard` passes `usePrefetchOnHover([{ pathname: projectHref }])` with no `queryClient`/`queries`, so only `router.prefetch` runs. `ProjectEstimatesTable` passes a full config warming `estimateQueryKeys.detail`, `estimateQueryKeys.areaTree`, and the component-library-lite key. The dashboard route's data (if served via TanStack) is therefore cold on arrival.
Evidence:
- `/Users/philiplewis/archestimator/src/components/workshop/LiveProjectCard.tsx:124-125` (`prefetchRoutes = [{ pathname: projectHref }]`, no queries)
- `/Users/philiplewis/archestimator/src/components/workshop/ProjectEstimatesTable.tsx:765-791` (queryClient + 3 queries warmed)
Current metric:
- blocked live; Projects->dashboard transition 392ms (one click `_rsc`) at archive `20260601T093203Z` (route warm, data cold)
Target metric:
- Project-card hover warms the dashboard's primary TanStack query (if one exists) in addition to `router.prefetch`
Recommended action:
- If the project dashboard reads data through TanStack, add a `queries` entry (project summary key) to `LiveProjectCard`'s prefetch config mirroring `ProjectEstimatesTable`. If the dashboard is purely server-rendered, document that `router.prefetch` alone is correct here and close the inconsistency as intentional.
Validation gate:
- Confirm via `query_graph` whether `ProjectDashboardClient` consumes a TanStack query; if yes, hover warms it and dashboard arrival shows cache hit
Risk:
- Low — additive warm query; only meaningful if the dashboard uses TanStack
Rollback/deletion criteria:
- Remove the warm query if the dashboard is server-only (no client query to warm).

### RT07 — Manual Chrome DevTools bfcache proof and production Chrome React Profiler trace remain OPEN (only true plan-completion gate)

Severity: Medium
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: Public marketing back/forward (bfcache); authenticated workshop routes (Profiler)
User symptom: Back/forward restore performance and authenticated render-cost on real Chrome are unproven; the plan explicitly forbids archiving until these exist.
Technical cause: `BfcacheHandler` correctly listens for `pageshow.persisted` and calls `bfcacheRestore()`; `proxy.ts` already relaxed marketing pages from `no-store` to `private, no-cache, must-revalidate` (a bfcache enabler) and successful authenticated GETs return WITHOUT `no-store` (`no-store` only on redirects). But Playwright Chromium reports `pageshow.persisted=false` even for a trivial 2-page control, so automated bfcache evidence is inconclusive; no manual DevTools "Back/forward cache" test and no production React Profiler trace have been captured.
Evidence:
- `/Users/philiplewis/archestimator/src/components/bfcache-handler.tsx` (pageshow.persisted handler)
- `/Users/philiplewis/archestimator/src/proxy.ts:12-13,77,141` (marketing no-store removed; authed GET returns `response` w/o no-store; no-store only on redirects)
- `CURRENT_CANONICAL_PLAN.md` lines 64-66 ("Do not archive yet ... manual Chrome bfcache DevTools proof and production Chrome React Profiler proof")
- Plan line 50/64: `pageshow.persisted=false` under Playwright even for a trivial control
Current metric:
- Automated bfcache restore 22-352ms with no stuck overlay but `pageshow.persisted=false` (INCONCLUSIVE); Lighthouse bfcache audit score 0 on authed `/workshop/projects`
Target metric:
- Manual DevTools confirms public pages are bfcache-eligible (`persisted=true`); production React Profiler trace of `/workshop/projects` render cost captured
Recommended action:
- Run the manual Chrome DevTools Application > Back/forward cache test on `/` and `/features` against a production-like build; capture a production Chrome React Profiler flamegraph of the projects/estimates surface. Record both as archive evidence, then the owner can narrow the completion gate.
Validation gate:
- Archived DevTools bfcache screenshot showing eligibility + React Profiler trace JSON; Lighthouse bfcache audit moves above 0 where applicable
Risk:
- None (measurement only); BLOCKED this session (no dev server, dev-auth disabled, no storage state)
Rollback/deletion criteria:
- N/A — evidence capture, not a code change.

### RT08 — Documented font is SF Pro but layout.tsx ships next/font/google Roboto_Mono — and the variable is never applied to body text

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: All routes (global font)
User symptom: The app renders in Roboto Mono (a Google-hosted monospace), not the SF Pro the design system documents; additionally the font variable is declared but not bound to the body's font-family, so actual typography may fall through to the CSS default rather than the loaded font.
Technical cause: `src/app/layout.tsx` imports `Roboto_Mono` from `next/font/google` and sets only `className={robotoMono.variable}` on `<body>` (the `--font-roboto-mono` CSS variable). There is no `font-sans`/font-family class applied to body, so whether text actually uses the loaded font depends entirely on `globals.css` wiring the variable into a `font-family`. `next/font/google` self-hosts the font (no runtime Google request) so this is not a third-party latency issue, but it is a correctness/observability discrepancy vs README/design-system.
Evidence:
- `/Users/philiplewis/archestimator/src/app/layout.tsx:2,7,26` (Roboto_Mono import, variable only on body — verified at audit: `import { Roboto_Mono } from "next/font/google"`, `robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", ... })`, `<body className={robotoMono.variable}>`)
- Ground-truth note: README/design-system says SF Pro
- Plan doc `20-font-and-bundle-optimization.md` exists (font handling tracked)
Current metric:
- Font: Roboto_Mono self-hosted via `next/font` (no FOUT/runtime fetch); variable bound to body but no explicit font-family class on body
Target metric:
- Shipped font matches documented design intent; font variable bound to body font-family so CLS/FOIT is controlled
Recommended action:
- Reconcile design-system docs with reality: either adopt the intended font (SF Pro local or a chosen webfont) via `next/font/local`, or update the README/design-system to state Roboto Mono. Verify `globals.css` maps `--font-roboto-mono` to body font-family; add `font-display swap` if not already implied by `next/font` defaults.
Validation gate:
- Computed body font-family in DevTools matches the documented font; no layout shift on font load (CLS stays 0 as in archive Lighthouse)
Risk:
- Low — visual/typographic change; verify against design-system tokens before swapping
Rollback/deletion criteria:
- Revert the font import if the swap regresses CLS or breaks the monospace-dependent table/number layouts.

### RT09 — @vercel/speed-insights absent from package.json — field Web Vitals RUM not wired despite readiness-check script

Severity: Low
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: Production observability (all routes)
User symptom: No real-user field data (LCP/INP/CLS/TTFB) is collected in production, so route-transition regressions can only be caught by lab/synthetic runs, not real users.
Technical cause: `package.json` includes `@vercel/analytics` (`^2.0.1`) and a `perf:check-speed-insights` script (`scripts/check-vercel-speed-insights-readiness.ts`), but does NOT include `@vercel/speed-insights` and no `<SpeedInsights/>` component is mounted. `VercelWebAnalytics` (page-view analytics) is mounted in `layout.tsx` but that is not Web Vitals RUM.
Evidence:
- `package.json`: `'@vercel/analytics': '^2.0.1'` present (line 60); grep `speed-insights` returns only the `perf:check-speed-insights` script (line 49), no dependency — verified at audit HEAD
- `/Users/philiplewis/archestimator/src/app/layout.tsx:3,28` (`VercelWebAnalytics` mounted, not `SpeedInsights`)
- `scripts/check-vercel-speed-insights-readiness.ts` exists (readiness checker without the package)
Current metric:
- Field Web Vitals RUM: not collected (no `@vercel/speed-insights`)
Target metric:
- Production p75 LCP/INP/CLS/TTFB per route collected via Speed Insights and surfaced against the readiness (not smoke) budgets
Recommended action:
- If the product is hosted on Vercel, add `@vercel/speed-insights` and mount `<SpeedInsights/>` in root layout; run `scripts/check-vercel-speed-insights-readiness.ts` as the gate. This closes the lab-vs-field gap so the deliberately-loose smoke budgets can be supplemented with real readiness thresholds.
Validation gate:
- `perf:check-speed-insights` passes; Vercel dashboard shows route-level Web Vitals after deploy
Risk:
- Low — adds a small client script; respects existing consent gate (verify it does not bypass the GA4/Clarity consent flow)
Rollback/deletion criteria:
- Remove the component if it conflicts with the consent gate or adds measurable INP regression.

### RT10 — revalidatePath fan-out on estimate/project mutations invalidates 3 route segments (project + estimates + charts) per write

Severity: Low
Confidence: Likely
Bottleneck class: STATE_INVALIDATION
Affected surface: Server actions in `lib/estimates/actions.ts`, `lib/projects/actions.ts`, `lib/ai/package-builder/apply.ts`
User symptom: After a project/estimate mutation, the Next Router Cache for the project, estimates, and charts segments is all invalidated, so the next visit to any of those re-runs the full server segment instead of reusing the warm staleTimes cache.
Technical cause: `estimates/actions.ts` and `projects/actions.ts` call `revalidatePath` for `${projectId}`, `${projectId}/estimates`, and `${projectId}/charts` together on a single mutation. This is correct for data freshness but is broad: it discards the dynamic-segment Router Cache (`staleTimes.dynamic=60`) that the prefetch/warm-cache work depends on, so the perceived "instant warm revisit" is lost right after any edit. The client estimates table mostly reconciles optimistically (good), but the server actions still churn all three paths.
Evidence:
- `/Users/philiplewis/archestimator/src/lib/estimates/actions.ts:1140-1142` (revalidatePath project + estimates + charts)
- `/Users/philiplewis/archestimator/src/lib/projects/actions.ts:168-170` (same 3-path fan-out)
- `/Users/philiplewis/archestimator/src/lib/ai/package-builder/apply.ts:1229` (project revalidate)
- `next.config.ts:64-67` (`staleTimes dynamic:60` — the cache this churn discards)
Current metric:
- blocked live; `revalidatePath` count per estimate mutation: 3 segments
Target metric:
- Mutations invalidate only the segment(s) whose data actually changed; charts revalidated only when cost-affecting data changes
Recommended action:
- Audit each `revalidatePath` fan-out: only revalidate `/charts` when a cost-affecting field changed; prefer client-side TanStack invalidation (already wired for estimates) over server `revalidatePath` where the UI reconciles optimistically. Consider `revalidateTag` for finer-grained invalidation than path-level.
Validation gate:
- After a non-cost edit, a warm revisit to `/charts` shows a Router Cache hit (no server re-run); estimates list reconciles without full segment churn
Risk:
- Medium — narrowing revalidation risks stale data; must verify each path's data dependency before trimming
Rollback/deletion criteria:
- Restore the broad `revalidatePath` set if any route shows stale data after a mutation.

### RT11 — projects-page-client and ProjectEstimatesTable retain router.refresh() full-segment churn on several non-optimistic paths

Severity: Low
Confidence: Verified
Bottleneck class: STATE_INVALIDATION
Affected surface: `/workshop/projects` (list), `/workshop/projects/[projectId]/estimates`
User symptom: Some mutation paths still call `router.refresh()`, which re-runs the whole server segment (a full-route data refetch) rather than an in-place optimistic patch — perceptible as a brief content re-settle on those actions.
Technical cause: `useNavigationRouter.refresh()` was deliberately made overlay-free (no blur) per the Library Optimization plan, but the underlying `router.refresh()` still re-executes the server segment. `projects-page-client.tsx` (lines 388, 504), `ProjectEstimatesTable.tsx` (lines 249, 397, 537, 653, 890 — guarded by `!optimistic`), `ProjectEstimateMetadataStrip.tsx` (156), `NewProjectForm.tsx` (127), and `use-template-editor.ts` (76) still call refresh on non-optimistic branches. This is intentional fallback for paths without optimistic reconciliation, but it is residual full-route churn.
Evidence:
- grep `router.refresh`: `projects-page-client.tsx:388,504`; `ProjectEstimatesTable.tsx:249,397,537,653,890`; `ProjectEstimateMetadataStrip.tsx:156`; `NewProjectForm.tsx:127`; `use-template-editor.ts:76`
- `/Users/philiplewis/archestimator/src/hooks/use-navigation-router.ts:26-36` (refresh is overlay-free but still `router.refresh`)
- `ProjectEstimatesTable.tsx:47-53` (optimistic flag; refresh only when `!optimistic` — backout aid D10)
Current metric:
- `router.refresh` callers: ~10 sites; most estimate-table refreshes are gated behind `!optimistic`
Target metric:
- Remaining non-optimistic refresh paths converted to targeted TanStack invalidation / optimistic patches; refresh reserved for true reconciliation
Recommended action:
- Inventory each remaining `router.refresh()` call: where an optimistic reconciliation path exists (estimates store already does this), retire the refresh; keep refresh only where no client cache mirrors the server state. Document the optimistic flag as the long-term default so the backout branch can eventually be removed.
Validation gate:
- Mutations on these surfaces complete without a visible content re-settle; `perf:measure-routes` shows no extra server segment runs post-mutation
Risk:
- Medium — removing a refresh fallback risks stale UI if the optimistic path has a gap
Rollback/deletion criteria:
- Re-enable `router.refresh` on any path where the optimistic reconciliation is found incomplete.

### RT12 — Authenticated route LCP remains ~3.5-3.9s in lab evidence — server response, not route-transition infra, is the dominant cost

Severity: High
Confidence: Likely
Bottleneck class: SERVER_WATERFALL
Affected surface: `/workshop/projects` and other authenticated list/detail routes
User symptom: Even with the route-transition/prefetch work done, the authenticated projects page LCP is ~3.5-3.9s in lab Lighthouse — the route-transition polish cannot mask a slow server data path.
Technical cause: Captured authed Lighthouse (post project-list payload trim) shows perf 0.86 but LCP 3865ms, SpeedIndex 3514ms, serverResponse 630ms — and earlier runs hit LCP 3585-3960ms with serverResponse 2303ms. The proxy adds a `supabase.auth.getUser()` round-trip on every protected request (memory obs 6506), and project/settings pages await server data before paint (RT01/RT02). This is a SERVER_WATERFALL/DB dimension overlap, but it bounds what caching/prefetch can achieve: prefetch warms the route, but cold first-load LCP is gated by server response. This dimension's `loading.tsx`/prefetch work is the correct mitigation envelope; the residual is server-side.
Evidence:
- `.ai/09_archive/store/route-transition-lighthouse-after-project-list-trim-20260601T112341Z` (perf 0.86, LCP 3865ms, serverResponse 630ms, TBT 124ms, scriptTransfer 220KB)
- Earlier archive runs: LCP 3585-3960ms, TBT 422-533ms, serverResponse ~2300ms
- memory obs 6506: proxy auth `getUser()` on every protected request is a latency source
- `perf:measure-routes` authed medians: Projects 2325ms, Settings 2725ms (no-throttle)
Current metric:
- Authed `/workshop/projects` LCP 3865ms (lab, post-trim); serverResponse 630ms; perf score 0.86
Target metric:
- Authed LCP under a readiness budget (e.g. <2.5s p75) — requires server-data-path work outside this dimension
Recommended action:
- Treat the route-transition/prefetch layer as complete-enough and escalate the residual to the server-data/DB dimension: the auth `getUser` round-trip, the project layout fan-out, and list-query cost dominate LCP. This finding is a hand-off marker, not a caching action — the loose e2e budgets (authenticated transition 10000ms) must NOT be read as readiness.
Validation gate:
- Production React Profiler + Speed Insights (RT07/RT09) confirm whether LCP is server-bound or render-bound before further client-side optimization
Risk:
- N/A — diagnostic hand-off; no code change in this dimension
Rollback/deletion criteria:
- N/A

---

## 4. Dimension tables & notes

### Repo / measurement context
- HEAD at audit time: `4f0ca5ab` (ahead of ground-truth `3070c46c`). Only dirty file: `next-env.d.ts` (generated).
- Live authenticated route-transition measurement: **BLOCKED** (no dev server on 3000-3020, dev-auth disabled, no Playwright storage state). All timing numbers below are cited from existing archive evidence, never freshly observed.
- `bun run build` / `next dev` deliberately NOT run (shared `.next`, concurrent agents).

### Route inventory — loading.tsx / error.tsx / prefetch coverage
(P = page route; ✅ has; ❌ missing; ↑ inherits from a parent boundary)

| Route | loading.tsx | error.tsx | hover/viewport prefetch | server-blocks-shell | Notes |
|---|---|---|---|---|---|
| `/` (landing) | ❌ | ❌ | n/a | client-heavy | marketing; bfcache header relaxed in proxy |
| `/features`,`/pricing`,`/about`,`/contact`,`/privacy`,`/terms` | ❌ | ❌ | default Link | mostly static | public Link transition median ~179-394ms (archive) |
| `/login` | ❌ | ❌ | n/a | server | auth route |
| `/share/[token]` | ❌ | ❌ | n/a (force-dynamic) | **yes, multi-await** | **RT03** — blank during resolution |
| `/invite/[token]` | ❌ | ❌ | n/a | server | token route |
| `/workshop` | ✅ | ❌ | ✅ sidebar | shell streams | homebase |
| `/workshop/projects` | ✅ (good skeleton) | ❌ | ✅ sidebar | shell streams | card-grid skeleton matches |
| `/workshop/projects/[projectId]` | ❌ | ❌ | ✅ LiveProjectCard (route only) | **title await** | **RT02** — no dashboard loading.tsx |
| `/workshop/projects/[projectId]/estimates` | ✅ (ProjectEstimatesListSkeleton) | ✅ | ✅ table rows (+3 warm queries) | streams via layout Suspense | well-covered |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | ❌ (inherits estimates loading? NO — sibling) | ✅ | ✅ table | server | nodeId has its own segment; estimates/loading.tsx does not cover it |
| `/workshop/projects/[projectId]/charts` | ✅ | ✅ | ❌ | server | no hover prefetch to charts |
| `/workshop/settings` | ✅ | ❌ | ❌ (not in sidebar) | server | index only |
| `/workshop/settings/profile` | ❌ | ❌ | ❌ | **getAccountSetupState await** | **RT01** |
| `/workshop/settings/workspace` | ❌ | ❌ | ❌ | **getAccountSetupState await** | **RT01** |
| `/workshop/settings/feedback`,`/beta-users` | ❌ | ❌ | ❌ | server | **RT01** |
| `/workshop/library` | ✅ | ✅ | ✅ sidebar | warm TanStack reuse | library opt landed |
| `/workshop/library/components` | ✅ | ✅ | ↑ | streams | |
| `/workshop/library/templates` | ✅ | ✅ | ↑ | streams | |
| `/workshop/library/templates/[templateId]` | ✅ | ✅ | ↑ | streams | (no `[nodeId]` child exists — ground-truth said `[templateId]/[nodeId]` error.tsx; **that nested route does not exist**) |
| `/workshop/onboarding` | ✅ | ❌ | n/a | streams | |
| `/workshop/feedback` | ❌ | ❌ | ❌ | server | minor |
| `/workshop/components`,`/workshop/templates` | n/a | n/a | n/a | **redirect-only** | both are `redirect()` stubs to library |

### Reconciliation matrix vs CURRENT_CANONICAL_PLAN.md (Phases 0-7)
| Plan item | Claimed | Verified now | Status |
|---|---|---|---|
| proxy.ts public-route early return + marketing bfcache header | done | `src/proxy.ts:75-80,12` ✅ | DONE |
| proxy uses getUser() not getSession() | done | `src/proxy.ts:114` ✅ | DONE |
| `no-store` removed from marketing; authed GET no `no-store` | done | marketing `:77`; authed GET returns `response` `:141` w/o no-store; no-store only on redirects | DONE (better than feared — authed bfcache NOT proxy-blocked) |
| QueryClient 5min stale/gc, refetchOnWindowFocus false | done | `providers.tsx:14-28` ✅ | DONE |
| experimental.staleTimes {dynamic:60,static:180} | done | `next.config.ts:64-67` ✅ | DONE |
| SHOW_DELAY 150ms + MIN_VISIBLE 250ms overlay (no flash on cached nav) | done | `navigation-ui-store.ts:16-19` ✅ | DONE |
| usePrefetchOnHover with router.prefetch + query warming | done | `use-prefetch-on-hover.ts` ✅ | DONE (but coverage gaps — RT05/RT06) |
| sidebar hover-intent prefetch={null} | done | `SidebarNavItemRow.tsx:41`,`MainSidebar.tsx:55` ✅ | DONE (only 3 routes) |
| 10 loading.tsx shells | done | 10 found ✅ | DONE (but missing on key authed routes — RT01/RT02/RT03) |
| error.tsx for estimates/charts/library(+templates) | done | 7 found ✅ | PARTIAL (no /workshop, /settings, /projects-list, /share, /invite, no global-error — RT04) |
| React.cache on getCurrentWorkspaceProject | done | imported in layout+page (cache wrapper assumed in repository) | LIKELY DONE (dedup not re-verified) |
| dynamic imports (tree/content, ComponentLibraryManager, NeatWireframe ssr:false, bubble) | done | per plan line 41; library JS 618KB→~232KB | DONE (per archive manifest audit) |
| BfcacheHandler pageshow.persisted | done | `bfcache-handler.tsx` ✅ | DONE |
| **manual Chrome DevTools bfcache proof** | OPEN | not present; Playwright persisted=false inconclusive | **REMAINING (RT07)** |
| **production Chrome React Profiler proof** | OPEN | not present | **REMAINING (RT07)** |
| @vercel/speed-insights field RUM | n/a in plan | absent from package.json | **GAP (RT09)** |
| font = SF Pro | design-system | Roboto_Mono shipped, variable-only on body | **DISCREPANCY (RT08)** |

### Budget critique (e2e/route-transition-performance-budgets.json)
- publicRoute nav 15000ms, slow3g 30000ms, bfcache restore 1500ms, authenticated transition 10000ms, prefetchRscRequestMin 1.
- These are explicitly **smoke/regression** budgets, ~5-15x looser than any readiness threshold. Observed authed LCP 3.5-3.9s and Slow-3G route medians 6-12s pass these trivially. **Do NOT treat passing as readiness.** A readiness budget (p75 LCP <2.5s, INP <200ms, authed transition <1s warm) requires field RUM (RT09) + the server-data path work (RT12) — neither closeable in this dimension alone.

### Prefetch warm-cache inconsistency (RT06)
- `ProjectEstimatesTable.tsx:765-791`: warms `estimateQueryKeys.detail`, `estimateQueryKeys.areaTree`, `WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY` on hover. Good.
- `LiveProjectCard.tsx:124-125`: `[{ pathname: projectHref }]` — `router.prefetch` only, no `queries`. Dashboard data cold on arrival if it uses TanStack.
- `MainSidebar.tsx:45`: `sidebarNavItems.map(item => ({ pathname: item.href }))` — `router.prefetch` only for the 3 top-level routes, no query warming.

### bfcache cache-header reality (corrects a common stale claim)
- Marketing pages: `private, no-cache, max-age=0, must-revalidate` (proxy `:12,77`) — bfcache-eligible.
- Sensitive (`SENSITIVE_ROUTE_CACHE_CONTROL` = `...no-store...` proxy `:13,36`) is applied **only to redirects** (login redirect, auth redirect, beta-gate redirect). **Successful authenticated `/workshop/*` GETs return `response` (proxy `:141`) with NO `no-store`** — so authenticated routes are NOT proxy-blocked from bfcache. The remaining bfcache uncertainty is purely the missing manual DevTools proof (RT07), not a header bug.

### Confirmed non-issues (do not re-chase)
- proxy.ts already optimized (public early return + getUser + correct matcher) — CONFIRMED.
- Overlay does NOT flash on warm/prefetched/cached transitions (150ms SHOW_DELAY gate) — CONFIRMED by design.
- `/workshop/components` and `/workshop/templates` are redirect stubs — no loading/error needed.
- Ground-truth's `templates/[templateId]/[nodeId]/error.tsx` — **that nested route does not exist**; actual is `templates/[templateId]/error.tsx`.

---

## 5. Cross-references

- **`03_ROUTE_SPEED_MATRIX.md`** — the per-route loading/error/prefetch coverage table above (Section 4) feeds the route speed matrix; RT01/RT02/RT03 mark the routes that block shell paint, RT12 supplies the lab LCP/serverResponse numbers per authed route.
- **`12_OPTIMIZATION_BACKLOG.md`** — RT01-RT06 and RT08-RT11 are the actionable backlog items from this dimension (RT01/RT02/RT03 loading shells, RT04 error boundaries, RT05/RT06 prefetch coverage, RT08 font, RT09 Speed Insights, RT10/RT11 invalidation churn). RT07/RT12 are markers, not code tasks.
- **`13_RISK_REGISTER_AND_BLAST_RADIUS.md`** — RT10 (revalidatePath narrowing, Medium risk — stale data) and RT11 (router.refresh retirement, Medium risk — stale UI) carry the highest blast radius here; RT02's title-source change needs `getCurrentWorkspaceProject` caller impact analysis before action.
- **`15_READINESS_DECISION.md`** — the loose smoke budgets (Section 4 budget critique) and RT07/RT09/RT12 are the readiness blockers: no readiness claim is supportable until manual bfcache + React Profiler proof (RT07) and field RUM (RT09) exist, and the authed LCP residual (RT12) hands off to the server-data/DB dimension.
