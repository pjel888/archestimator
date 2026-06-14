# 02 — Repo & Architecture Inventory (Route & Surface Inventory + Architecture)

One-line purpose: map every route, surface, provider, and server/DB hop of Archestimator so the rest of the audit pack can reason about *where* the app spends time and *what* breaks if we touch it.

**Status: AUDIT / PLANNING ONLY** — no source file modified, no build/deploy/migration run.
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ `main` (audited @ HEAD `3070c46c`; tree advanced to `4f0ca5ab` mid-session under concurrent agents — the cited `layout.tsx`/`providers.tsx`/`proxy.ts` evidence was re-verified against the live tree and is unchanged).
**Dimension:** Route & Surface Inventory + Architecture.

---

## 1. Dimension summary (honest posture)

The App Router surface is fully mapped: 21 page routes (7 public/marketing, 1 login, 1 beta gate, share+invite tokens, ~11 workshop pages including 3 redirect stubs), 18 API route handlers, 1 auth callback, ~19 `use server` action modules, and a deep workspace data layer (7 repositories, 48+ RPCs, 35+ tables, RLS everywhere).

The route-transition optimization work is **genuinely landed and verified in code**: 10 static `loading.tsx` shells, 7 client `error.tsx` boundaries, `React.cache` on `getCurrentWorkspaceProject` + `getCurrentUserContext`, `dynamic()` code-splitting on the heaviest clients (estimate tree/content, library manager, charts donut, NeatWireframe WebGL `ssr:false`), `usePrefetchOnHover` wired into the sidebar and project tables, and a Suspense-deferred `ProjectChromeAsync` fan-out so the heavy collaboration/publication/sheets queries no longer block project first paint.

The dominant architecture-level risks are **structural, not regressions**:

1. The root layout wraps **EVERY** route — marketing, login, share, invite, beta — in the full client provider tree (QueryClient + Toast + Notification + Bfcache + PerformanceMonitor + NavigationListener + RealtimeAuthBridge + RouteLoadingOverlay), so unauthenticated public pages ship and hydrate authenticated-app machinery they never use.
2. Authed identity is resolved **at least twice per workshop navigation** — once in `proxy.ts` via `auth.getUser()` (a Supabase network round-trip on every `/workshop/*` request) and again in `WorkshopPageShell` via `getCurrentUserContext()` (another `auth.getUser()` + `profiles` SELECT) — `React.cache` only dedupes within a single render, not across the proxy↔render boundary.
3. Every authed/share route is effectively **dynamic with RLS-gated queries on the first-paint path**, and the measured authed LCP is 3865ms with a 630ms server response (Lighthouse 0.86).

Field RUM is not wired (`@vercel/speed-insights` absent; `WebVitalsProbe` is dev-gated), so production Web Vitals are **Unknown**. A confirmed cosmetic/IA discrepancy: the design system claims SF Pro but `layout.tsx` actually loads `Roboto_Mono` from `next/font/google`. **All live measurement is BLOCKED this session** (no dev server, dev-auth disabled, no storage state); cited numbers come only from the archived Lighthouse artifact.

---

## 2. Already implemented (do not re-recommend)

Reconciled against the orchestrator GROUND TRUTH (verified 2026-06-14 @ HEAD `3070c46c`) and re-checked against the live tree this session. These are **done** — other audit dimensions must not re-propose them as missing:

- **Proxy public-route early-return before Supabase client creation** (`src/proxy.ts:75-80`), uses `auth.getUser()` (never `getSession()`). Verified.
- **Marketing `Cache-Control` bfcache mitigation** (`MARKETING_PAGE_CACHE_CONTROL`, no `no-store`); workshop/invite/share hardening headers; CSP report-only on landing/workshop/invite, **ENFORCED** on `/share`. Verified (header logic present).
- **`providers.tsx` QueryClient config**: `staleTime 5min`, `gcTime 5min`, `refetchOnWindowFocus false`, `retry 1`, mutations `retry 0`. Verified exact values this session (`src/app/providers.tsx:14-28`).
- **`next.config` tuning**: `optimizePackageImports:['@phosphor-icons/react']`, `experimental.staleTimes{dynamic:60,static:180}`, `images.remotePatterns` for Supabase component images, `@next/bundle-analyzer` (emits treemap only with `ANALYZE=true` **AND** `--webpack`, NOT turbopack). Verified.
- **Route-transition plan Phases 0–7 largely done**: 10 `loading.tsx` static shells, 7 `error.tsx`, `usePrefetchOnHover` + `router.prefetch` + sidebar hover-intent, `React.cache` on `getCurrentWorkspaceProject` + `getCurrentUserContext`, 10+ files use `next/dynamic` (estimate tree/content, ComponentLibraryManager, AddComponentModal, LibraryFolderTreeSurface, NeatWireframeBackground `ssr:false`, bubble/donut chart, D3 submodule imports). Verified (INV11).
- **Recently LANDED**: estimates-list RPC summaries (`project_estimate_list_summaries` SECURITY INVOKER) + `is_workspace_member` initplan-wrapped (migration `20260614162000`); charts buckets-only payload + `get_project_chart_buckets` WITH RECURSIVE (SECURITY INVOKER, **NOT yet wired/applied to hosted**); teamspace presence/cursors (migration `20260614120100` wraps `auth.uid()`); estimate-tree unification corridor P0–P3.
- **Suspense fan-out** of the project-page heavy collaboration/publication/sheets queries into `ProjectChromeAsync` (`src/components/workshop/ProjectChromeAsync.tsx`). Verified (INV07 — this is the correct pattern; the remaining cost is the chained estimate-context awaits, not this).

> Note: middleware is `src/proxy.ts`, **not** `middleware.ts`. `@vercel/analytics` is Web Analytics only; `@vercel/speed-insights` is **NOT** installed (INV04). `.github/workflows/ci.yml` exists (CI is not fully deferred).

---

## 3. Findings

### INV01 — Root layout mounts the full authenticated client provider tree on EVERY route (public, login, share, invite, beta)

Severity: High
Confidence: Verified
Bottleneck class: HYDRATION
Affected surface: All routes (marketing `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/beta/access-required`, `/share/[token]`, `/invite/[token]`, plus all `/workshop/*`)
User symptom: Marketing and auth-boundary pages download, parse, and hydrate app-shell JavaScript (QueryClient, notifications, realtime auth bridge, navigation listener, performance monitor, route overlay) that those pages never use, inflating TBT/INP and main-thread work on the very surfaces meant to be lightest.
Technical cause: `src/app/layout.tsx` unconditionally wraps `children` in `AppProviders`. `src/app/providers.tsx` (`'use client'`) mounts `QueryClientProvider > ToastProvider > NotificationProvider > {BfcacheHandler, PerformanceMonitor, NavigationListener, RealtimeAuthBridge, children, RouteLoadingOverlay}`. There is no public-vs-app provider split — `PublicPageShell` renders inside the same global tree as `WorkshopPageShell`.
Evidence:
- `/Users/philiplewis/archestimator/src/app/layout.tsx:23-32` (re-verified this session: `<body><AppProviders>{children}</AppProviders>...`)
- `/Users/philiplewis/archestimator/src/app/providers.tsx:30-47` (re-verified: provider nesting exactly as described)
- `/Users/philiplewis/archestimator/src/components/landing/PublicPageShell.tsx:14-45`
Current metric:
- Public routes hydrate `NotificationProvider` + `RealtimeAuthBridge` + `QueryClient` despite never authenticating; authed `/workshop/projects` scriptTransfer ~220KB, TBT 124ms (archived Lighthouse). Exact public-route JS attributable to global providers: **blocked** (no build/analyzer run this session).
Target metric:
- Public/auth-boundary routes carry only marketing-needed JS; realtime/notification/query providers scoped to an authenticated subtree (e.g. a workshop-only provider layer).
Recommended action:
- Plan a provider-tree split: keep only universally-required providers (`Toast`, `Bfcache`, `RouteLoadingOverlay`) global, and relocate `QueryClientProvider`/`NotificationProvider`/`RealtimeAuthBridge`/`NavigationListener`/`PerformanceMonitor` into an authenticated boundary (workshop layout or a dedicated `AuthedProviders`) so public/login/share/invite/beta routes never instantiate them. Quantify the saving with `ANALYZE=true --webpack` before/after.
Validation gate:
- Bundle-analyzer treemap diff (`ANALYZE=true`) showing realtime/query/notification chunks removed from public-route initial JS; Lighthouse TBT on `/features` and `/login` not regressed and ideally lower.
Risk:
- Splitting providers can break components that assume a global QueryClient or notification context if any public component transitively uses them; requires an import audit of public-route component trees.
Rollback/deletion criteria:
- Revert to single `AppProviders` if any public route throws a missing-provider/context error or if hydration mismatch count increases.

### INV02 — Authenticated identity is resolved twice per workshop navigation (proxy auth.getUser + shell getCurrentUserContext), across the React.cache boundary

Severity: High
Confidence: Verified
Bottleneck class: SERVER_WATERFALL
Affected surface: Every `/workshop/*` request (all workshop pages + project subroutes)
User symptom: Each authenticated navigation pays a Supabase auth round-trip in middleware before the request even reaches the route, then the page shell pays another `auth.getUser()` plus a `profiles` SELECT before the first skeleton can paint, adding server-side latency on top of the 630ms measured server response.
Technical cause: `src/proxy.ts` calls `supabase.auth.getUser()` on every protected request (after creating a per-request server client). The page then renders `WorkshopPageShell` which awaits `getCurrentUserContext()` — verified to call `createSupabaseServerClient()` + `supabase.auth.getUser()` + `supabase.from('profiles').select('*')`. `getCurrentUserContext` is `React.cache`-wrapped, but `React.cache` only dedupes within a single render pass; it cannot dedupe the proxy's `getUser` (a separate runtime invocation) against the render's `getUser`.
Evidence:
- `/Users/philiplewis/archestimator/src/proxy.ts:112-114`
- `/Users/philiplewis/archestimator/src/lib/auth/session.ts:31` (`getCurrentUserContext = cache(... auth.getUser() + profiles select)`)
- `/Users/philiplewis/archestimator/src/components/workshop/WorkshopPageShell.tsx:84-87`
Current metric:
- `>=2` `auth.getUser()` round-trips per authed navigation (1 proxy + `>=1` render) + 1 `profiles` SELECT; archived authed serverResponseTime 630ms, LCP 3865ms.
Target metric:
- One authoritative identity resolution per navigation, or a verified-claims/JWT path that avoids a second network `getUser` in the shell.
Recommended action:
- Plan to pass the proxy-resolved identity forward (e.g. via the existing `AUTH_REQUEST_PATH_HEADER` mechanism extended to a lightweight identity hint, or a `getClaims()`-based local verification in the shell) so the shell does not re-issue a network `auth.getUser()`; keep the `profiles` read but ensure it is the only DB hop on the identity path. Do **NOT** move to `getSession()` in middleware (insecure). Measure server-timing before/after.
Validation gate:
- Server-Timing / `traced()` spans on a workshop navigation showing a single network auth resolution; serverResponseTime not increased; auth correctness preserved (logged-out still redirected).
Risk:
- Forwarding identity from middleware risks trusting an unverified header if done naively; must remain server-verified. Auth is CRITICAL-risk surface.
Rollback/deletion criteria:
- Revert if any unauthenticated request reaches a workshop page or if identity mismatch/stale-user bugs appear.

### INV03 — All authenticated and share routes are effectively dynamic with RLS-gated queries on the first-paint path

Severity: Medium
Confidence: Verified
Bottleneck class: RLS_POLICY
Affected surface: All `/workshop/*` pages, `/share/[token]` (force-dynamic), `/invite/[token]`, and all `/api/share/*` + proposal export (force-dynamic)
User symptom: No authenticated or share surface can be statically served or CDN-cached; every visit executes RLS-checked Postgres queries server-side before HTML streams, so TTFB/LCP scale with DB latency and policy cost rather than being amortized by caching.
Technical cause: Workshop pages each await a repository call (`listProjectEstimates`, `getProjectChartsData`, `resolveEstimateTabRouteContext`, `getWorkshopHomebaseData`, `getLibraryOverview`, etc.) that hits RLS-protected tables. `/share/[token]/page.tsx` and all `/api/share/*` handlers export `dynamic='force-dynamic'`. RLS is applied "everywhere" per stack ground truth (verified by the broad `.from()`/`.rpc()` surface across repositories). `next.config staleTimes` (`dynamic:60`) helps client-side router cache reuse but does not make the server render cacheable.
Evidence:
- `/Users/philiplewis/archestimator/src/app/share/[token]/page.tsx:45` (`export const dynamic = 'force-dynamic'`)
- `/Users/philiplewis/archestimator/src/app/workshop/projects/[projectId]/estimates/page.tsx:10-13`
- grep of `src/lib/repositories`: 35+ distinct `.from(table)` and 48+ `.rpc()` calls; force-dynamic on 9 `api/share` + proposal-export routes
Current metric:
- Authed serverResponseTime 630ms (archived); standalone no-throttle medians Projects 2325ms / Library 2675ms / Settings 2725ms (archived `perf:measure-routes`).
Target metric:
- Reduced DB hops on first paint per route (fewer sequential awaits), and where safe, partial prerender (PPR) of static chrome with dynamic data streamed in.
Recommended action:
- Treat this as an architecture constraint to optimize within rather than remove: continue the pattern of pushing non-critical reads behind Suspense (already done in `ProjectChromeAsync`), audit each page's first-await for a single RLS-cheap summary query (estimates-list already uses `project_estimate_list_summaries` RPC), and evaluate Next 16 PPR/cacheComponents for the static shell of workshop pages. Do not attempt to cache RLS-gated payloads across users.
Validation gate:
- Per-route server-timing showing reduced count of sequential DB awaits on the first-paint path; no cross-user data leakage in RLS tests.
Risk:
- PPR/caching of authed surfaces risks serving one tenant's data to another if cache keys omit identity; high blast radius.
Rollback/deletion criteria:
- Any cache-correctness or RLS-leak finding triggers immediate revert to `force-dynamic`.

### INV04 — Field Web Vitals RUM is not wired in production (@vercel/speed-insights absent; WebVitalsProbe dev-gated)

Severity: Medium
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: All routes (observability for the whole app)
User symptom: There is no production field data for FCP/LCP/INP/CLS/TTFB, so real-user regressions on any route go undetected until users complain; all readiness claims rest on a single synthetic Lighthouse artifact.
Technical cause: `package.json` declares `@vercel/analytics` (`^2.0.1`) but NOT `@vercel/speed-insights`, despite `scripts/check-vercel-speed-insights-readiness.ts` existing. The only Web Vitals reporter, `WebVitalsProbe` (`useReportWebVitals`), early-returns unless `NEXT_PUBLIC_PERF_TRACE==='1'`, so it logs to console in dev only and ships no telemetry.
Evidence:
- `/Users/philiplewis/archestimator/package.json:60` (`@vercel/analytics`) with no `@vercel/speed-insights` entry
- `/Users/philiplewis/archestimator/src/components/workshop/WebVitalsProbe.tsx` (returns early unless `NEXT_PUBLIC_PERF_TRACE=1`)
- `/Users/philiplewis/archestimator/scripts/check-vercel-speed-insights-readiness.ts` (exists, 13853 bytes)
Current metric:
- 0 production RUM data points; only synthetic Lighthouse (perf 0.86 on one authed route, 2026-06-01).
Target metric:
- Continuous field Web Vitals per route (at least LCP + INP + CLS) feeding a dashboard/alert.
Recommended action:
- Plan to add `@vercel/speed-insights` and mount `<SpeedInsights/>` in the root layout (or wire `WebVitalsProbe` to a beacon endpoint) so the benchmark dimension can compare field vs synthetic; gate by route to attribute regressions. This is observability scaffolding, not a perf fix per se, but it unblocks every other readiness claim.
Validation gate:
- Speed Insights dashboard receiving events for top routes within 24h of deploy; `scripts/check-vercel-speed-insights-readiness.ts` passing.
Risk:
- Adds a small third-party client script; ensure it respects existing cookie-consent gating used by `LandingAnalyticsLoader`.
Rollback/deletion criteria:
- Remove if it materially increases client JS on consent-sensitive public routes or violates consent.

### INV05 — Proxy middleware runs on the entire request space and only short-circuits inside the handler, not via the matcher

Severity: Medium
Confidence: Verified
Bottleneck class: ROUTE_TRANSITION
Affected surface: All requests except `_next/static`, `_next/image`, `favicon.ico` (matcher); includes `/api/*` and dotted paths which then early-return in code
User symptom: Every navigable request invokes the middleware function; while public/api paths return quickly, the middleware module (which imports `@supabase/ssr`, closed-beta-access, dev-auth-gate) is on the hot path for all of them.
Technical cause: `src/proxy.ts` `config.matcher` excludes only `_next/static`, `_next/image`, `favicon.ico`. `/api` and dotted paths are handled by an in-function early return (`pathname.includes('.') || startsWith('/_next') || startsWith('/api')`) rather than being excluded from the matcher, so the middleware still executes (and its module graph still loads) for them. The public-route early-return before Supabase client creation is correct and verified.
Evidence:
- `/Users/philiplewis/archestimator/src/proxy.ts:144-146` (matcher)
- `/Users/philiplewis/archestimator/src/proxy.ts:56-58` (in-function early return for `.`/`_next`/`/api`)
- `/Users/philiplewis/archestimator/src/proxy.ts:75-80` (public-route early return before `createServerClient`)
Current metric:
- Middleware invoked on all non-static paths; `auth.getUser` network call only on protected, non-bypassed paths (verified path).
Target metric:
- Matcher excludes `/api` and clearly-static patterns so the middleware function is not invoked for them at all.
Recommended action:
- Plan to tighten `config.matcher` to additionally exclude `/api` and common asset extensions (so the in-function early-return becomes a safety net, not the primary filter). Low effort, low risk; verify the share/invite hardening-header and CSP logic still applies to the routes that need it (those are page routes, not `/api`).
Validation gate:
- Confirm middleware no longer logs/executes for `/api/*` and static requests; share/invite/workshop hardening headers + `/share` CSP-enforced still present (header assertions in e2e).
Risk:
- Over-narrowing the matcher could drop hardening headers from a route that needs them; cross-check the header-injection routes (`/workshop`, `/invite`, `/share`) stay matched.
Rollback/deletion criteria:
- Restore broad matcher if any protected route loses its security headers or auth redirect.

### INV06 — Shipped font is Roboto_Mono (next/font/google), contradicting the SF Pro design-system claim

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: All routes (global font in root layout)
User symptom: The product renders in a monospace Google font (Roboto Mono) rather than the SF Pro the design system/README documents; this is an IA/brand discrepancy and a Google-Fonts dependency on a brand surface, not a stated system font stack.
Technical cause: `src/app/layout.tsx` imports `Roboto_Mono` from `next/font/google` and applies its CSS variable to `<body>`. No SF Pro / system-font definition is present in the root font setup. `next/font` self-hosts the font (no runtime Google request), but the typeface itself diverges from the documented brand.
Evidence:
- `/Users/philiplewis/archestimator/src/app/layout.tsx:2` (`import { Roboto_Mono } from 'next/font/google'`) — re-verified this session
- `/Users/philiplewis/archestimator/src/app/layout.tsx:7,26` (`robotoMono.variable` applied to body) — re-verified this session
Current metric:
- 1 Google webfont family (Roboto Mono, latin subset) self-hosted via `next/font`; documented brand font SF Pro not loaded.
Target metric:
- Decision recorded: either switch to an SF Pro / system-font stack (matching the design system, removing the Google-font dependency) or update the design system to declare Roboto Mono as canonical.
Recommended action:
- Raise as a brand/IA reconciliation decision for the owner: confirm intended typeface. If SF Pro is intended, plan a swap to a system-font stack (`-apple-system, BlinkMacSystemFont, ...`) which also eliminates the webfont payload entirely; if Roboto Mono is intended, update `DESIGN.md`/`README` to match. No code change in this audit.
Validation gate:
- Design-system doc and `layout.tsx` agree on the typeface; if switched to system fonts, confirm no font-file network request and no CLS from font swap.
Risk:
- Switching the global typeface changes visual metrics across the entire app and can shift layouts; needs visual regression review.
Rollback/deletion criteria:
- Revert if the type change causes layout breakage or fails brand review.

### INV07 — Project layout + estimate-node page run multi-hop sequential awaits before content paints (partially mitigated)

Severity: Medium
Confidence: Verified
Bottleneck class: SERVER_WATERFALL
Affected surface: `/workshop/projects/[projectId]` and nested `/estimates`, `/estimates/[nodeId]`, `/charts`
User symptom: Opening a project or an estimate sheet pays several sequential server round-trips (layout resolves the project, then the shell resolves the user, then the page resolves the estimate tree, then a second `Promise.all` for tabs + edit capability) before the heavy client tree even begins hydrating.
Technical cause: `ProjectLayout` awaits `getCurrentWorkspaceProject(projectId)` (`React.cache`-wrapped, good) then renders `WorkshopPageShell` which awaits `getCurrentUserContext()` + cookies; the `[nodeId]` page then awaits `Promise.all([resolveEstimateTabRouteContext, requireCurrentUserContext])` and a SECOND `await Promise.all([getEstimateTabs|tabs, resolveEstimateEditCapability])` because `estimate.id` is only known after the first load. The heavy collaboration/publication/sheets fan-out was correctly moved behind Suspense into `ProjectChromeAsync` (verified), which is the right pattern — the remaining cost is the chained estimate-context awaits.
Evidence:
- `/Users/philiplewis/archestimator/src/app/workshop/projects/[projectId]/layout.tsx:22-44`
- `/Users/philiplewis/archestimator/src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:35-74` (two sequential `Promise.all` blocks)
- `/Users/philiplewis/archestimator/src/components/workshop/ProjectChromeAsync.tsx:27-33` (deferred summaries fan-out)
Current metric:
- Estimate-node page: 1 layout await + 1 shell user await + 2 sequential `Promise.all` blocks before client render; project estimates listed by orchestrator among largest remaining initial-JS routes.
Target metric:
- Collapse the second estimate-tabs/edit-capability `Promise.all` into the first where data dependencies allow, or defer edit-capability/tabs behind Suspense like `ProjectChromeAsync`, so the sheet client streams sooner.
Recommended action:
- Plan a first-paint-path audit of the estimate-node route: identify which of `{tabs, canEditEstimate}` are needed for initial paint vs UX affordances, and stream the non-critical ones (`canEditEstimate` already fails-closed to false) behind Suspense rather than awaiting them before `EstimateWorkspaceClient` renders. Keep the resolver's bundled tab list to avoid the extra `getEstimateTabs` round-trip.
Validation gate:
- Server-timing on `/estimates/[nodeId]` showing fewer sequential awaits before first byte of `EstimateWorkspaceClient`; live measurement currently **BLOCKED** (no dev server).
Risk:
- Deferring `canEditEstimate` could briefly show edit affordances before the server confirms; must keep fail-closed default.
Rollback/deletion criteria:
- Revert if edit affordances flicker or if a viewer ever sees an enabled edit control pre-confirmation.

### INV08 — Authenticated LCP is 3865ms with a Lighthouse score of 0.86 on the lightest authed route; heavier routes have no synthetic coverage

Severity: High
Confidence: Verified
Bottleneck class: ROUTE_TRANSITION
Affected surface: `/workshop/projects` (measured) and by extension heavier authed routes (estimates, charts, estimate workspace) which are unmeasured
User symptom: Even after the project-list payload trim, the largest contentful paint on the projects list lands at ~3.9s; the estimate workspace and charts routes (larger initial JS, more data) are very likely slower but have no Lighthouse artifact.
Technical cause: Authed routes are dynamic + RLS-gated (INV03) with a 630ms server response, then ship ~220KB script transfer that must parse/hydrate the global provider tree (INV01) plus the route's client tree. The single archived run only covers `/workshop/projects`; the orchestrator identifies project estimates, charts, and estimate workspace as the largest remaining initial-JS routes with no synthetic measurement.
Evidence:
- `/Users/philiplewis/archestimator/.ai/09_archive/store/2026-06-01-route-transition-lighthouse-after-project-list-trim/lighthouse-workshop-projects-auth-after-payload-trim-summary.json` (performanceScore 0.86, lcp 3865.73, fcp 1208.69, tbt 124.65, speedIndex 3514.5, serverResponseTime 630, scriptTransfer 220719, bfcacheScore 0)
Current metric:
- `/workshop/projects`: perf 0.86, LCP 3865ms, FCP 1209ms, TBT 124ms, SI 3514ms, serverResp 630ms, script 220KB. Heavier routes: **Unknown** (no artifact).
Target metric:
- Establish synthetic + field baselines for the estimate workspace, charts, and project detail routes; drive authed LCP below the route-transition readiness target the budget owner sets (current budgets are loose smoke budgets, not readiness budgets).
Recommended action:
- Plan to extend the Lighthouse/`perf:measure-routes` harness to the unmeasured heavy authed routes (estimate workspace, charts, project detail) so the benchmark dimension has real numbers; this audit cannot run them (dev server down, dev-auth disabled, no storage state). Pair with INV04 field RUM.
Validation gate:
- Lighthouse summaries archived for the 3 heavy routes; LCP/TBT trend tracked across changes.
Risk:
- None for measuring; the risk is acting on the single existing data point as if representative.
Rollback/deletion criteria:
- N/A (measurement task).

### INV09 — bfcache restore is unproven (Lighthouse bfcacheScore 0; Playwright control inconclusive)

Severity: Medium
Confidence: Likely
Bottleneck class: CACHE_MISS
Affected surface: Marketing/public routes (where `BfcacheHandler` + bfcache Cache-Control mitigation apply) and back/forward navigation app-wide
User symptom: Back/forward navigations may do a full reload instead of an instant bfcache restore, costing seconds especially on slow networks; this is asserted-mitigated but not proven.
Technical cause: Marketing pages set `Cache-Control 'private, no-cache, max-age=0, must-revalidate'` in `proxy.ts` (a bfcache-permitting header, no `no-store`), and `BfcacheHandler` is mounted globally — both verified. But the archived Lighthouse `bfcacheScore` is 0 and the orchestrator notes the Playwright Chromium control yields `pageshow.persisted=false` even for a trivial page, so the mitigation's real-world effect is unconfirmed. Note the `SENSITIVE_ROUTE_CACHE_CONTROL` used on redirects DOES include `no-store` (correctly blocks bfcache for auth redirects only).
Evidence:
- `/Users/philiplewis/archestimator/src/proxy.ts:12` (`MARKETING_PAGE_CACHE_CONTROL`, no `no-store`) (INV09)
- `/Users/philiplewis/archestimator/src/app/providers.tsx:37` (`BfcacheHandler` mounted)
- `/Users/philiplewis/archestimator/.ai/09_archive/store/2026-06-01-route-transition-lighthouse-after-project-list-trim/lighthouse-workshop-projects-auth-after-payload-trim-summary.json` (bfcacheScore 0)
Current metric:
- `bfcacheScore` 0 (synthetic, authed route which legitimately may not bfcache); manual Chrome DevTools bfcache proof **OPEN**.
Target metric:
- Documented manual Chrome DevTools 'Back/forward cache' test showing `pageshow.persisted=true` on marketing routes.
Recommended action:
- Plan a manual Chrome DevTools bfcache verification on `/features` and `/pricing` (Application > Back/forward cache > Test) since automated tooling is inconclusive; record the persisted flag. No code change unless the test shows a blocking header on a public route.
Validation gate:
- Manual DevTools bfcache test reports 'Restored from back/forward cache' on at least the marketing routes.
Risk:
- Low; this is a verification task.
Rollback/deletion criteria:
- N/A.

### INV10 — Heavy public-route bundle deps (three/WebGL, lenis, roughjs) on the landing page — code-split but unmeasured

Severity: Low
Confidence: Likely
Bottleneck class: BUNDLE_WEIGHT
Affected surface: `/` (landing) and the public marketing shell
User symptom: The landing page pulls a WebGL background (`three` + `@firecms/neat`), a smooth-scroll engine (`lenis`), and `rough-notation`/`roughjs` for annotations; if any leak into the critical path they delay interactivity on the highest-traffic public surface.
Technical cause: `HeroSection` lazy-loads `NeatWireframeBackground` via `next/dynamic` with `ssr:false` (verified, good), and `LandingSmoothScrollProvider` is a `'use client'` wrapper around `ReactLenis`. `rough-notation` is imported directly in `HeroSection` (`annotate`). `three`/`@firecms/neat` are confined to the dynamically-imported `NeatWireframeBackground` (the only `three` importer outside `CostDonutChart`). The split is correct in structure but the actual landing initial-JS weight is unmeasured this session (Turbopack build does not emit analyzer reports; `ANALYZE` requires `--webpack`).
Evidence:
- `/Users/philiplewis/archestimator/src/components/landing/HeroSection.tsx:7,11-15` (`rough-notation` static import; `NeatWireframeBackground` dynamic `ssr:false`)
- `/Users/philiplewis/archestimator/src/components/landing/LandingSmoothScrollProvider.tsx:3-4,38` (`ReactLenis`)
- grep: `three`/`@firecms` imported only in landing `NeatWireframe` + charts `CostDonutChart`
Current metric:
- WebGL bg + lenis + roughjs present on landing; landing initial-JS attributable weight: **blocked** (no analyzer run). Public `/features`->`/pricing` Link transition median ~179-394ms normal (archived).
Target metric:
- Confirmed landing initial-JS budget with the WebGL/lenis/annotation deps either deferred or below an agreed threshold.
Recommended action:
- Plan an `ANALYZE=true --webpack` build to quantify landing initial JS and confirm `three`/`lenis`/`roughjs` stay out of the first chunk; if `rough-notation`'s static import in `HeroSection` pulls weight into the critical path, consider deferring it post-LCP. No change without the measurement.
Validation gate:
- Bundle-analyzer treemap showing `three`/`@firecms` in a deferred chunk and landing initial JS within budget.
Risk:
- Deferring the WebGL bg further could change the hero's first impression; coordinate with design.
Rollback/deletion criteria:
- Revert deferral if the hero visibly degrades or CLS increases.

### INV11 — Route-transition optimization plan is genuinely landed (loading/error shells, prefetch, code-splitting, request-cache) — reconciliation confirms, not a regression

Severity: Low
Confidence: Verified
Bottleneck class: PREFETCH_GAP
Affected surface: All workshop routes + sidebar/project-table navigation
User symptom: Navigations between workshop routes show a static skeleton immediately (no blank flash) and hover-prefetch warms the next route; this is working as designed and should **NOT** be re-recommended as missing.
Technical cause: Verified in code: 10 `loading.tsx` static shells (sizes 5-55 lines), 7 `'use client'` `error.tsx` boundaries on estimates/charts/library(+nested), `usePrefetchOnHover` wired into `MainSidebar`, `LiveProjectCard`, and `ProjectEstimatesTable` (`router.prefetch` + hover-intent), `React.cache` on `getCurrentWorkspaceProject` and `getCurrentUserContext`, `dynamic()` on `EstimateSheetTree`/`Content`, `ComponentLibraryManager`, `AddComponentModal`, `LibraryFolderTreeSurface`, NewProject/Details modals, `ProjectCostDonutChart`, `NeatWireframeBackground` (`ssr:false`). `next.config` has `optimizePackageImports:['@phosphor-icons/react']` and `staleTimes{dynamic:60,static:180}`.
Evidence:
- `find src/app -name loading.tsx` (10 files) and `-name error.tsx` (7 files)
- `/Users/philiplewis/archestimator/src/hooks/use-prefetch-on-hover.ts` + usages in `MainSidebar.tsx`, `LiveProjectCard.tsx`, `ProjectEstimatesTable.tsx`
- `/Users/philiplewis/archestimator/src/lib/repositories/workspace-repository.ts:1153` (`getCurrentWorkspaceProject = cache(...)`)
- `/Users/philiplewis/archestimator/next.config.ts:55,64-66`
Current metric:
- 10 `loading.tsx`, 7 `error.tsx`, 14 `dynamic()` split points, 2 `React.cache` identity/project loaders, prefetch on 3 nav surfaces.
Target metric:
- Maintain coverage; extend `error.tsx`/`loading.tsx` to any route still lacking them (e.g. settings subroutes, project detail page) if validation finds gaps.
Recommended action:
- No new action beyond reconciliation: record that the route-transition phases are implemented so other dimensions do not re-propose them. Optionally plan to fill the few segments without an `error.tsx` (settings/*, project `[projectId]` root, library/components has one but verify parity).
Validation gate:
- Route-transition e2e smoke budget (`publicRouteTransition medianTransitionMs <15000`, `authenticatedWorkshopTransition prefetchRscRequestMin>=1`) continues to pass.
Risk:
- None (status/reconciliation finding).
Rollback/deletion criteria:
- N/A.

### INV12 — Proposal XLSX export is a synchronous heavy server operation (ExcelJS, node runtime, maxDuration 60s) with a multi-tree DB fan-out

Severity: Medium
Confidence: Verified
Bottleneck class: EXPORT_HEAVY_OPERATION
Affected surface: `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`
User symptom: Generating a proposal export blocks a Node serverless function for up to 60s while it fetches every tab's estimate tree and builds an ExcelJS workbook in memory; large estimates risk slow downloads or timeouts and pin a function instance.
Technical cause: The route is `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration=60`. It resolves the user, rate-limits, then fans out `getEstimateTabs` + `getEstimateTabTree`/`getEstimateTreesForTabs`/`getProjectEstimateTreeByEstimate`, builds a `ProposalTabbedWorkbookModel`, and synthesizes the workbook via `createProposalWorkbookBuffer` (ExcelJS). ExcelJS workbook construction is CPU- and memory-bound and synchronous relative to the response.
Evidence:
- `/Users/philiplewis/archestimator/src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:9` (multi-tree repository imports), `:15-19` (runtime nodejs, force-dynamic, maxDuration 60)
- `/Users/philiplewis/archestimator/src/lib/proposal-export/create-proposal-workbook.ts` (exceljs importer)
Current metric:
- maxDuration 60s; node-pinned; per-export DB fan-out across all tabs + ExcelJS build. No measured export latency this session (**blocked**).
Target metric:
- Bounded export time with measured p95; consider streaming the workbook or capping rows/tabs (the comment claims node/row caps exist — verify) so the function does not approach 60s.
Recommended action:
- Plan to (a) measure real export latency for a large estimate, (b) confirm the asserted node/row caps are enforced before the ExcelJS build, and (c) evaluate streaming the XLSX response or moving very large exports to a background job. No code change in this audit.
Validation gate:
- Export latency p95 well under maxDuration for the largest realistic estimate; memory ceiling not exceeded.
Risk:
- Caps that are too aggressive could truncate exports; row/tab limits must match product expectations.
Rollback/deletion criteria:
- Revert export-path changes if any export omits rows or fails for previously-working estimates.

---

## 4. Dimension tables & notes

## Route & Surface Inventory (verified against live repo @ HEAD, 2026-06-14)

Legend — Type: PUB=public/marketing, AUTH=authenticated, SHARE=public-token, INVITE=public-token, API=route handler, SA=server-action surface, REDIR=redirect stub. RLS=RLS-sensitive query on path. Bench priority P0 (heaviest/most-trafficked) → P3 (trivial). "Blocked" = could not measure this session.

### Page routes

| Route | Type | page/layout/loading/error | Key client components | Repo/data fns | Tables/RPCs | RLS | Suspense/loading | router.refresh | TanStack | Zustand | Realtime | Heavy deps | Bench |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | PUB | page (+root layout) | PublicPageShell, HeroSection, NeatWireframeBackground(dyn ssr:false), LandingSmoothScrollProvider(lenis), ABExperimentProvider, CookieConsentBanner | getLandingAuthState, getVariant | auth.getUser (landing state), cookies | no | none (no loading.tsx) | no | global only | no | global bridge only | three+@firecms/neat (split), lenis, roughjs, rough-notation | P1 |
| `/about` `/features` `/pricing` `/contact` `/privacy` `/terms` | PUB | page | PublicPageShell, LandingHeader/Footer | getLandingAuthState | auth.getUser | no | none | no | global only | no | global bridge only | (shared landing chunk) | P2 |
| `/login` | PUB(auth-boundary) | page | ControlInput, Button; signInWithEmail/Google actions | (none on render) | auth actions (SA) | no | none | no | global only | no | global bridge only | — | P2 |
| `/beta/access-required` | PUB | page | BetaAccessStatusCopy | (none) | — | no | none | no | global only | no | global bridge only | — | P3 |
| `/auth/callback` | API(GET) | route.ts | — | exchangeCodeForSession, getClosedBetaAccessForEmail, recordAccountSecurityEvent | auth, beta allowlist, audit | yes(auth) | n/a | n/a | n/a | n/a | n/a | — | P2 |
| `/invite/[token]` | INVITE | page | InviteShell/InvitePreview (server-rendered) | resolveInviteEntryState, checkInviteResolutionRateLimit | rpc resolve_collaboration_invitation; auth.getUser | yes | none | no | no | no | no | — | P2 |
| `/invite/[token]/accept` `/continue` `/sign-out` | API(POST/GET) | route.ts | — | accept_collaboration_invitation* RPCs | collaboration_invitations, project/sheet members | yes | n/a | n/a | n/a | n/a | n/a | — | P2 |
| `/share/[token]` | SHARE | page (force-dynamic) | ShareContainer, SharePageTabs/Comments/Decision/Hero/Summary/SessionBanner/RecipientSessionInitializer | resolveProjectPublicationAccessByToken, resolveProjectPublicationSnapshotByToken, resolveSharedLinkRecipientIdentity; after()×2 telemetry | project_publications, shared_link_*; rpc increment_project_publication_open | yes(public-firewall) | after() defers telemetry off response path | no | no | no | no | next/image hero | P1 |
| `/workshop` | AUTH | page (+workshop layout, loading) | WorkshopHomebaseClient, MainSidebar, WorkshopPageShell | getWorkshopHomebaseData, requireCurrentUserContext, cookies | projects, members, invites, profiles | yes | shell Suspense + loading.tsx | no | global | navigation-ui-store | bridge | — | P1 |
| `/workshop/projects` | AUTH | page (+loading) | ProjectsPageClient, LiveProjectCard(prefetch), NewProjectModal(dyn), ProjectDetailsModal(dyn) | listCurrentWorkspaceProjects | projects, project_favorites, members | yes | loading.tsx (41L) | yes | global | project-estimates-store | bridge | — | **P0** (measured) |
| `/workshop/projects/[projectId]` | AUTH | page (+[projectId] layout) | ProjectDashboardClient; layout: WorkshopPageShell + ProjectChromeAsync(Suspense), ProjectMiniSidebar, ProjectEstimateMetadataStrip | getCurrentWorkspaceProject(cache); layout: +ProjectChromeAsync fan-out (collab/publication/sheets) | projects, project_members; chrome: collaboration summary, publication summary, sheets list | yes | layout Suspense (chrome + content) | no | global | navigation-ui-store | ProjectCursorLayer(flagged off) | — | P1 |
| `/workshop/projects/[projectId]/estimates` | AUTH | page (+loading,error) | ProjectEstimatesClient, ProjectEstimatesTable(prefetch,refresh) | listProjectEstimates (firstNode/nodeCount/rowCount/totalCost maps) | estimates, estimate_nodes, estimate_row_items | yes | loading.tsx (5L) + route content fallback | yes | global | project-estimates-store, estimate-ui-store | bridge | — | **P0** |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | AUTH | page (+error) | EstimateWorkspaceClient → EstimateSheetTree(dyn), EstimateSheetContent(dyn, Realtime), ProjectEstimateMetadataPublisher | resolveEstimateTabRouteContext, requireCurrentUserContext, then getEstimateTabs + resolveEstimateEditCapability (2nd Promise.all) | estimates, estimate_nodes, estimate_row_items, estimate_tabs; can_edit_estimate RPC | yes | parent layout Suspense; no own loading.tsx | no | useEstimateTabsQuery | estimate-ui-store, use-estimate-workspace-state, estimate-workshop-drag | EstimateSheetContent realtime channel | react-complex-tree | **P0** (largest initial JS) |
| `/workshop/projects/[projectId]/charts` | AUTH | page (+loading,error) | ProjectChartsClient, ProjectCostDonutChart(dyn) | getProjectChartsData, getProjectChartDefaultPair, assertRouteErrorSmoke | estimates, estimate_nodes/rows (buckets payload) | yes | loading.tsx (55L) | no | no | no | no | d3 (CostDonutChart) | P1 |
| `/workshop/library` | AUTH | page (+library layout, loading, error) | LibraryOverview, NewTemplateModal(dyn); layout: LibraryTabsLayoutClient, LibraryTitleBarClient, LibraryTabPanel | getLibraryOverview | cost_library_items, estimate_templates, folders (counts) | yes | loading.tsx (51L) + shell Suspense | no | global | use-library-editor-chrome | no | — | **P0** (618→232KB after split) |
| `/workshop/library/components` | AUTH | page (+loading,error) | LibraryComponentsRoute → ComponentLibraryManager(dyn) → LibraryFolderTreeSurface(dyn), AddComponentModal(dyn) | (client-fetched via actions) | cost_library_items, suppliers, brands, category nodes, folders | yes | loading.tsx (25L) | yes | warm cache reuse | use-library-editor-chrome | no | — | P1 |
| `/workshop/library/templates` | AUTH | page (+loading,error) | TemplatesBrowsePageClient → TemplatesBrowseManager(dyn), NewTemplateModal/InsertIntoEstimatePicker(dyn) | getCurrentWorkspaceEstimateTemplates | estimate_templates, template_nodes, template_row_items | yes | loading.tsx (28L) | yes | global | no | no | — | P2 |
| `/workshop/library/templates/[templateId]` | AUTH | page (+loading,error) | TemplateEditorClient | getEstimateTemplateById | estimate_templates(+nodes,row_items) | yes | loading.tsx (26L) | yes(use-template-editor) | global | no | no | — | P2 |
| `/workshop/settings` (+ profile, workspace, beta-users, feedback) | AUTH | page (+loading at settings root) | WorkshopSettingsModal(+Content), per-tab _components | requireCurrentUserContext; admin: beta-allowlist actions | profiles, workspaces, members; closed_beta_allowlist RPCs | yes | loading.tsx (29L) settings root only | no | global | no | no | — | P2 |
| `/workshop/feedback` | AUTH | page | BetaFeedbackForm; WorkshopPageShell | beta-feedback-actions (SA) | beta feedback table | yes | shell Suspense | no | global | no | no | — | P3 |
| `/workshop/terms` | AUTH(gate) | page | TermsAcceptancePanel | requireCurrentUserContext, acceptCurrentTermsAction | terms acceptance | yes | none | no | global | no | no | — | P3 |
| `/workshop/components` `/workshop/templates` `/workshop/onboarding` | REDIR | page (+onboarding loading) | — (redirect()) | — | — | n/a | n/a | n/a | n/a | n/a | n/a | — | P3 |

### API route handlers

| Route | Method | dynamic/runtime | Data fns / RPCs | RLS | Heavy | Bench |
|---|---|---|---|---|---|---|
| `/api/health` | GET | force-dynamic | — | no | — | P3 |
| `/api/ai/ask` | POST | (lazy handler) | flag-gated; `await import('./handler')` | yes | LLM | P2 |
| `/api/ai/package-builder` | POST | (lazy handler) | create_ai_package_library_components_with_history | yes | LLM | P2 |
| `/api/component-library/attachments` | GET/POST | runtime nodejs | storage + cost_library variant attachments | yes | upload | P2 |
| `/api/component-library/images` | GET/POST | runtime nodejs | storage / sharp | yes | sharp/image | P2 |
| `/api/projects/images` | GET/POST | runtime nodejs | storage | yes | image | P2 |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | GET | nodejs, force-dynamic, **maxDuration 60** | getEstimateTabs + getEstimateTabTree/getEstimateTreesForTabs/getProjectEstimateTreeByEstimate, createProposalWorkbookBuffer | yes | **ExcelJS** | **P0** (heavy op) |
| `/api/share/[token]` | GET | force-dynamic | resolveProjectPublicationAccess/Snapshot, sanitize for public read, rate-limit | yes(firewall) | — | P1 |
| `/api/share/[token]/{activity,comment,decision,events,password,session,unsubscribe}` | GET/POST | force-dynamic | insert_client_comment, submit_client_response, publication events | yes(firewall) | — | P1 |
| `/api/webhooks/resend` | POST | runtime nodejs | email delivery events | service | — | P2 |

### Architecture summary

- **Provider tree weight (INV01):** root `layout.tsx` wraps ALL routes in `AppProviders` (`src/app/providers.tsx`): QueryClientProvider > ToastProvider > NotificationProvider > {BfcacheHandler, PerformanceMonitor(dev-only), NavigationListener, RealtimeAuthBridge, children, RouteLoadingOverlay}. There is NO public-vs-authed provider split, so marketing/login/share/invite/beta pay for notification + realtime + query machinery they never use. QueryClient config verified: staleTime 5min, gcTime 5min, refetchOnWindowFocus false, retry 1, mutations retry 0.
- **WorkshopPageShell pattern (INV02/INV07):** NOT in `workshop/layout.tsx` (that layout only does terms-gating + a redirect-to-login). Each workshop page imports `WorkshopPageShell` itself; the shell `await`s `getCurrentUserContext()` + cookie-derived side-panel widths in a `Promise.all`, renders MainSidebar + WebVitalsProbe + title header + a `<Suspense>` content slot + footer (ProjectTotalHeader on project routes). `getCurrentUserContext` (cache-wrapped) does `auth.getUser()` + `profiles` SELECT — a SECOND auth resolution after the proxy's `auth.getUser()`.
- **PublicPageShell pattern:** `src/components/landing/PublicPageShell.tsx` — LandingHeader/Footer/CookieConsentBanner/LandingAnalyticsLoader; isHomePage path renders children bare (landing composes its own header/scroll provider). Used by the 6 marketing pages + landing.
- **Dynamic vs static:** Effectively EVERY route is dynamic. Public marketing pages read cookies/auth state (landing A/B + consent) so they render dynamically too; `/share/[token]` and all `/api/share/*` + proposal export are explicit `force-dynamic`; workshop pages are dynamic by virtue of per-request RLS queries. No route uses `force-static`/`revalidate`. `next.config staleTimes{dynamic:60,static:180}` tunes the client router cache, not server cacheability.
- **Request-scoped caching (verified):** `getCurrentWorkspaceProject`, `getCurrentUserContext`, `ensureDefaultWorkspace`, `getCachedProjectMembers` are all `cache()`-wrapped (React per-render dedupe). The project layout's heavy fan-out (collaboration/publication/sheets + project cursor layer) is correctly deferred into `ProjectChromeAsync` behind `<Suspense>`.

### Reconciliation matrix (ground-truth claim → live finding)

| Ground-truth claim | Verified? | Note |
|---|---|---|
| proxy.ts public-route early-return before Supabase client | ✅ Verified | `src/proxy.ts:75-80`; uses `auth.getUser()` (safe), not getSession |
| marketing Cache-Control bfcache mitigation | ✅ Verified | `MARKETING_PAGE_CACHE_CONTROL` no `no-store` (INV09) |
| /share CSP enforced, /workshop+invite headers | ✅ (header logic present; CSP strings not re-read here) | matcher covers these page routes (INV05) |
| providers.tsx QueryClient config | ✅ Verified | exact values match (re-verified this session) |
| optimizePackageImports + staleTimes + bundle-analyzer ANALYZE+--webpack | ✅ Verified | `next.config.ts:55,64-66,182` |
| 10 loading.tsx, error.tsx on estimates/charts/library(+nested) | ✅ Verified | 10 loading.tsx, 7 error.tsx (INV11) |
| usePrefetchOnHover + React.cache + dynamic imports | ✅ Verified | INV11 evidence |
| estimates-list RPC summaries landed | ✅ Verified | `project_estimate_list_summaries` RPC present; listProjectEstimates returns summary maps |
| charts buckets-only payload | ✅ Verified | `getProjectChartsData` buckets path; charts page reads left/right/mode |
| middleware file is proxy.ts not middleware.ts | ✅ Verified | `src/proxy.ts` |
| README says SF Pro, layout loads Roboto_Mono | ✅ Verified | INV06 (re-verified `layout.tsx:2,7,26` this session) |
| @vercel/speed-insights NOT wired | ✅ Verified | absent in package.json; WebVitalsProbe dev-gated (INV04) |
| /workshop/library 618→232KB after split | ⏳ Asserted (archive claim) | dynamic() splits present; analyzer not re-run (blocked) |
| Lighthouse authed /workshop/projects 0.86 / LCP 3865 / etc. | ✅ Verified | archived summary JSON read (INV08) |

### Budget critique
`e2e/route-transition-performance-budgets.json` (verified contents): publicRoute nav 15000ms, slow3g 30000ms, bfcache restore 1500ms, authenticatedWorkshopTransition 10000ms + prefetchRscRequestMin 1 + overlayCount 0. These are **regression smoke budgets, not readiness budgets** — a 10s authed transition or 15s public nav would "pass" while being a terrible user experience. The real measured authed LCP (3865ms) is far better than these ceilings but still slow. Recommend the benchmark dimension propose SEPARATE readiness budgets (e.g. authed LCP target, INP target) distinct from these legacy smoke gates.

### Measurement status (this session)
BLOCKED: no dev server (ports 3000-3020 closed), dev-auth bypass disabled, no Playwright storage state, build/next dev deliberately not run. Only the archived 2026-06-01 Lighthouse artifact provides real authed numbers (one route). bfcache real-world restore, heavy-route Lighthouse, landing initial-JS weight, and export latency are all unmeasured.

---

## 5. Cross-references

- **`03_ROUTE_SPEED_MATRIX.md`** — consumes the bench priorities (P0–P3) and the route table above; INV08 (authed LCP 3865ms) and the archived no-throttle/Slow3G medians feed the per-route speed grades. The "Blocked" cells here map directly to the matrix's unmeasured rows.
- **`12_OPTIMIZATION_BACKLOG.md`** — INV01 (provider split), INV02 (single identity resolution), INV05 (matcher tightening), INV07 (estimate-node await collapse), and INV12 (export bounding) are the actionable backlog items; INV04 (RUM) and INV08 (heavy-route Lighthouse) are the measurement-unblock prerequisites.
- **`13_RISK_REGISTER_AND_BLAST_RADIUS.md`** — INV02 (auth = CRITICAL), INV03 (RLS cache correctness / cross-tenant leak), and INV06 (global typeface = app-wide visual blast) carry the highest blast radius; concurrent-agent safety (no shared `.next` build) is recorded there.
- **`15_READINESS_DECISION.md`** — the "all live measurement BLOCKED this session" posture and the absence of field RUM (INV04) are the gating reasons no production-readiness claim can be made from this dimension alone; INV08's single synthetic data point is explicitly insufficient.
