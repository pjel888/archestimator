<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Codebase Performance Audit

## A. Root layout and global client/provider cost

| Evidence | Why it can affect Speed Insights | Planning response |
| --- | --- | --- |
| `src/app/layout.tsx:2-7` imports Inter, Poppins, Roboto Mono, Source Serif, `VercelWebAnalytics`, `AppProviders`, `react-complex-tree` global CSS, `lenis` global CSS, and globals. | Global font/CSS/provider choices can affect every route, including public pages that should be mostly static. | Measure first-load JS/CSS and font waterfalls. Evaluate route scoping or CSS reduction only after confirming Next.js 16 CSS constraints. |
| `src/app/layout.tsx:32-33` applies four font variables to the body and wraps all routes in `AppProviders`. | More font families can increase font CSS/preload work and layout-shift risk. | Audit actual font use by route; keep only fonts needed for first paint or defer specialty fonts. |
| `src/app/providers.tsx:1-41` is a root client provider with QueryClient, ToastProvider, BfcacheHandler, PerformanceMonitor, NavigationListener, and RouteLoadingOverlay. | Root client boundary makes all routes hydrate provider shell, even static marketing pages. | Consider split providers: public shell vs authenticated/workshop providers, with regression tests for route overlay and toast behavior. |
| `src/components/analytics/VercelWebAnalytics.tsx:1-8` loads Vercel Analytics globally. | Analytics script can add network/main-thread work, but wrapper blast radius is low. | Keep redaction tests; measure script cost. Do not remove analytics without owner decision. |

## B. Landing/public page LCP and INP candidates

| Evidence | Candidate bottleneck | Planning response |
| --- | --- | --- |
| `src/components/landing/PublicPageShell.tsx:35-45` wraps non-home pages with `LandingSmoothScrollProvider`, footer, cookie banner, and analytics loader. | Non-home public pages get smooth-scroll/consent/analytics clients. | Verify if public route p75 problems are on home vs non-home pages; route-split or lazy-load smooth scroll when not needed. |
| `src/components/landing/LandingAnalyticsLoader.tsx:7-21` loads GA and Clarity after analytics consent. | Post-consent third-party scripts can harm INP and long tasks. | Measure consented vs non-consented sessions; keep privacy gate; consider delaying Clarity or sampling. |
| `src/components/landing/ClarityScript.tsx:5-20` injects Clarity script with `afterInteractive`. | Can compete with hydration/interaction on public pages. | Use Speed Insights route/device data and Chrome trace before changing. |
| `src/components/landing/LandingSmoothScrollProvider.tsx:20-41` imports Lenis and renders `ReactLenis` unless reduced motion is true. | Smooth scrolling can add JS and input handling cost. | Test INP with/without Lenis in a feature branch; preserve reduced-motion behavior. |
| `src/components/landing/NeatWireframeBackground.tsx:52-111` creates a NeatGradient canvas, scroll listener, MutationObserver, and IntersectionObserver. | Canvas/scroll effects can affect LCP/INP and battery on mobile. | Measure hero LCP and main-thread tasks; gate with reduced motion, device class, or static fallback if needed. |

## C. Protected route and auth/proxy TTFB candidates

| Evidence | Candidate bottleneck | Planning response |
| --- | --- | --- |
| `src/proxy.ts:42-131` runs for non-static/non-api paths and calls Supabase `auth.getUser()` when env is present. | Protected route TTFB includes auth verification. | Do not replace `getUser()` with less secure session-only checks. Optimize only public-route fast paths, closed-beta access caching, and redirect/header overhead after tests. |
| `src/proxy.ts:55-60` returns early for public routes and sets marketing `Cache-Control` to private/no-cache. | Public marketing cache policy may prevent CDN reuse. | Reassess public marketing cache policy separately from auth-sensitive routes. |
| `getClosedBetaAccessForEmail` has CRITICAL GitNexus upstream impact: 71 impacted nodes, 32 processes, 12 modules. | Beta access checks are broad blast-radius auth infrastructure. | Any optimization here must get auth/security tests and provider proof; avoid speculative changes. |

## D. Estimate workspace INP/render candidates

| Evidence | Candidate bottleneck | Planning response |
| --- | --- | --- |
| `src/components/workshop/EstimateSheetContent.tsx` is 4,071 lines; exported component body spans `3239-4071`. | Large client island with many states, effects, memo calculations, modals, history, proposal preview, collaboration cursors, and row mutations. | Use React Profiler and jsdom peak-load tests before splitting; split by modal/sidebar/history/proposal preview boundaries only with regression tests. |
| `EstimateSheetContent` initializes many states/effects at `3267-3294`, computes totals/rows/scope maps at `3315-3359`, loads history at `3436-3572`, and broadcasts cursor movement at `3518-3532`. | INP and render stalls can come from broad recalculation, large row flattening, history fetches, and pointer-move collaboration work. | Plan memo boundary audits, throttled cursor broadcast, and lazy modal/history/sidebar loading. |
| `src/components/workshop/EstimateSheetTree.tsx` exported component body spans `219-1575`. | Tree DnD, search, selection, local syncing, and context menus are high interaction-cost areas. | Use route-transition peak-load and tree DnD tests before changes; consider virtualization/windowing only after preserving RCT behavior. |
| `src/components/workshop/ProjectEstimatesTable.tsx` imports TanStack table and is 1,002 lines. | Table sorting/inline edit UX can affect INP on projects/estimates route. | Profile before changing; keep inline edit tests. |

## E. Data, Supabase, and cache candidates

| Evidence | Candidate bottleneck | Planning response |
| --- | --- | --- |
| `src/lib/repositories/workspace-repository.ts` is 1,664 lines and participates in project/workspace/estimate route data. | Large repository functions can hide query fan-out and repeated reads. | Inventory query count per route with Vercel logs and local instrumentation. |
| `getProjectPublicationSummary` (`workspace-repository.ts:1258-1326`) calls many helper reads for members, publication status, staleness, latest estimate update, and recipient opens. | Project layout may pay multiple Supabase reads before dashboard render. | Consider consolidated SQL/RPC only after EXPLAIN and RLS proof. |
| `getProjectEstimateTreeByNode` (`workspace-repository.ts:1634-1663`) resolves project, selected node, and full tree through Supabase server client. | Estimate detail route can have large tree payload and database costs. | Keep load limits; measure tree sizes and route TTFB by representative project. |
| Database-indexing plan already exists under `.ai/03_plans/database-indexing-and-query-performance`. | There is prior query/index planning that should not be duplicated blindly. | Reuse DBIDX inventory and require live EXPLAIN/provider evidence before migration proposals. |

## F. Public share and proposal/export candidates

| Evidence | Candidate bottleneck | Planning response |
| --- | --- | --- |
| `src/app/share/[token]/page.tsx:42` is force-dynamic and uses cookies/headers. | Public share page is security-sensitive and not static. | Preserve token/password/session security; optimize snapshot reads and render payloads only with share tests. |
| `src/app/api/share/[token]/activity/route.ts:78-264` validates origin/session/password, does rate-limit, loads comments/responses/events, fetches recipient names, composes and sorts activities, and returns `Cache-Control: no-store`. | Activity polling/fetches may be slow but no-store is security intentional. | Improve query shape and pagination only after preserving no-store and rate-limit tests. |
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:9-10` is Node runtime and force-dynamic. | XLSX export latency/memory is outside Core Web Vitals but affects user-perceived speed. | Keep async UI feedback; benchmark with `scripts/benchmark-proposal-workbook.ts`; avoid loading ExcelJS into client bundle. |

## G. Existing performance validation surfaces

- `e2e/route-transition-performance.spec.ts:327-449` captures authenticated hover prefetch and transition budgets.
- `scripts/check-route-transition-readiness.ts` exists for readiness gates.
- `scripts/measure-route-transitions.ts` exists for route measurements.
- `tests/vitest/route-transition-peak-load-profile.test.tsx` exists for local render/peak-load profiling.
- Prior archived route-transition evidence exists under `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-*` and `.ai/09_archive/store/2026-06-01-route-transition-production-auth-refresh`.


## H. Second-pass missing slow surfaces to include in future implementation

| Surface | Exact anchors | Why it matters | Required evidence |
| --- | --- | --- | --- |
| Root analytics and third-party scripts | `src/components/analytics/VercelWebAnalytics.tsx`, `src/components/landing/LandingAnalyticsLoader.tsx`, `src/components/landing/ClarityScript.tsx`, `src/components/landing/CookieConsentBanner.tsx` | Consent-dependent GA/Clarity and root Vercel Analytics can affect public route JS/main-thread and privacy posture. | consent off/on Lighthouse trace, analytics privacy tests, bundle analyzer. |
| Share receiver cold load | `src/app/share/[token]/page.tsx`, `SharePageTabs`, `SharePageComments`, `SharePageDecision`, `SharePageHero`, `SharePageProposalHeader` | `force-dynamic` share page resolves access, snapshot, recipient/session state, and records events before render. | redacted share Lighthouse/`httpstat`, publication tests, no-store headers. |
| Proposal export hosted runtime | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `createProposalWorkbookBuffer`, `buildProposalExportModel` | Node/ExcelJS buffer generation is server-only but may hit hosted function duration/memory/cold-start limits. | local workbook benchmark and hosted export verifier. |
| Image/attachment routes | `src/app/api/projects/images/route.ts`, `src/app/api/component-library/images/route.ts`, `src/app/api/component-library/attachments/route.ts` | Image-heavy project cards, component images, and share pages can affect LCP and payload size but were not benchmarked in the first pass. | route-specific image waterfall, Next/Image/CDN cache headers, upload/download smoke. |
| AB/landing auth state | `src/components/landing/ABExperimentProvider.tsx`, `src/lib/landing/get-landing-auth-state.ts`, `src/lib/ab-testing/variant-assigner.ts` | Landing personalization/experiments may influence cacheability and TTFB. | header/cookie/cache proof and experiment assignment tests. |

## I. Exact symbol/file anchors for future docs and impact analysis

Future implementation packets should include these anchors when relevant:

- `src/app/layout.tsx` — `RootLayout`
- `src/app/providers.tsx` — `createQueryClient`, `AppProviders`
- `src/proxy.ts` — `proxy`, `getClosedBetaAccessForEmail`
- `src/lib/auth/session.ts` — `getCurrentUserContext`, `requireCurrentUserContext`
- `src/lib/repositories/workspace-repository.ts` — `getWorkshopHomebaseData`, `listCurrentWorkspaceProjects`, `getCurrentWorkspaceProject`, `listProjectEstimates`, `getProjectEstimateTreeByNode`, `getProjectEstimateTreeByEstimate`
- `src/lib/repositories/component-library-repository.ts` — `getCurrentWorkspaceComponentRowsLibrary`, `getCurrentWorkspaceComponentLibrary`
- `src/lib/repositories/project-charts-repository.ts` — `getProjectChartsData`
- `src/components/workshop/EstimateWorkspaceClient.tsx` — dynamic `EstimateSheetTree`, dynamic `EstimateSheetContent`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/lib/publication/public-repository.ts` — `resolveProjectPublicationAccessByToken`, `resolveProjectPublicationSnapshotByToken`, `recordProjectPublicationAnalyticsEvent`, `recordProjectPublicationEvent`, `loadSharedLinkPublicComments`, `loadSharedLinkRecipientDecision`
- `scripts/measure-route-transitions.ts`, `scripts/check-route-transition-readiness.ts`, `e2e/route-transition-performance.spec.ts`
- `scripts/benchmark-proposal-workbook.ts`, `scripts/verify-hosted-export-route.ts`
- `scripts/sql/linked-supabase-launch-readiness.sql`


## J. Public cache personalization risk added in second pass

Marketing TTFB/cache optimization must account for current public-page personalization and cookies. Before relaxing `MARKETING_PAGE_CACHE_CONTROL`, inspect and test:

- `src/app/page.tsx` for home-page cookie/A-B behavior,
- `src/lib/landing/get-landing-auth-state.ts` for logged-in/public CTA/header variance,
- `src/components/landing/ABExperimentProvider.tsx` and `src/lib/ab-testing/variant-assigner.ts` for variant output,
- `src/components/landing/CookieConsentBanner.tsx` and `LandingAnalyticsLoader.tsx` for consent-dependent behavior.

Use `24-cache-safety-and-public-personalization-matrix.md` before any cache-header change.
