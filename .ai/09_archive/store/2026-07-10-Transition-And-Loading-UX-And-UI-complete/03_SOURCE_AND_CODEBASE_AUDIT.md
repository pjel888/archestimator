# Source and Codebase Audit

All paths repo-relative. Evidence gathered 2026-07-06 by four parallel read-only `Explore` lanes plus lead reads of Next.js 16 local docs and the existing perf roadmap. This document is the evidence backbone for the rest of the pack.

---

## A. Route, loading, error, and streaming inventory

### A.1 Stack facts (verified from source)

- `next` **16.2.6**, `react`/`react-dom` **19.2.6**, `@tanstack/react-query` **5.100.14**, `zustand` **5.0.14**, `@opennextjs/cloudflare` **^1.20.1**, `better-auth` **1.6.22**, `wrangler` **^4.105.0**, `vitest` **^4.1.9**, `@playwright/test` **^1.60.0**, `@next/bundle-analyzer` **16.2.6**, `storybook` **10.4.6**, `typescript` **^6.0.3**, `tailwindcss` **^4.3.0**. (`package.json`)
- `next.config.ts`: `experimental.optimizePackageImports: ["@phosphor-icons/react"]`, `experimental.staleTimes: { dynamic: 60, static: 180 }`. **No** `ppr`, `dynamicIO`, or `cacheComponents`. Bundle analyzer enabled via `ANALYZE=true`. Per-route CSP (Report-Only landing/workshop/invite; **enforced** on `/share/:path*`) + HSTS/X-Frame-Options/DENY/Referrer-Policy/no-referrer.
- Runtime: OpenNext on Cloudflare Workers (`wrangler.jsonc`, Worker `archestimator-proof`, custom domain `archestimator.com`). `observability.enabled: true` with logs (10% head sampling) + traces (5%) + invocation logs persisted. **Free-tier posture** (no paid add-ons).
- No `web-vitals` package, no Lighthouse CI, no Sentry/OTel/Datadog. `@next/third-parties` GoogleAnalytics present (landing traffic only).

### A.2 Route tree (UI `page.tsx` only; API `route.ts` omitted except where noted)

```
src/app/layout.tsx                 ROOT (providers, metadata, global-error sibling; NO root loading.tsx, NO root error.tsx)
├─ not-found.tsx                   root 404
├─ global-error.tsx                root error (full-page replacement)
├─ page.tsx                        /                        force-static, metadata
├─ (about, contact, features, login, new, pricing, security, signup, trust)  marketing/auth/legal — mostly force-static
├─ (privacy, terms, access-required)
├─ invite/[token]/                 DYNAMIC — NO loading, NO error, NO not-found
├─ share/[token]/                  DYNAMIC — force-dynamic, generateMetadata, loading.tsx, not-found.tsx
└─ workshop/layout.tsx             WORKSHOP (server auth + terms gate)
   ├─ page.tsx                     /workshop                loading.tsx
   ├─ (feedback, onboarding, proposals, publisher, terms)
   ├─ library/...                  loading.tsx + error.tsx on library, components, templates, templates/[templateId]
   ├─ projects/...                 loading.tsx on projects, [projectId], [projectId]/activity, [projectId]/data(+error), [projectId]/estimates/[nodeId](+loading+error); estimates list = error only; charts redirects→data
   └─ settings/...                 single shared loading.tsx covers subtree; no error.tsx
```

### A.3 Master route table (UI pages)

Legend: **L**=loading.tsx (own or inherited), **E**=error.tsx, **NF**=not-found.tsx, **MD**=metadata, **Susp**=uses `<Suspense>`.

| Route | L | E | NF | MD | Susp | Notes |
|---|---|---|---|---|---|---|
| `/` | — | — | root | ✓ | ✗ | static; root global-error only |
| `/about`,`/features`,`/pricing`,`/security`,`/trust`,`/new` | ✗ | ✗ | root | ✓ | ✗ | static marketing |
| `/contact` | ✗ | ✗ | root | ✓ | ✓ | Suspense around ContactForm |
| `/login` | ✗ | ✗ | root | ✓ | ✓ | Suspense around LoginForm |
| `/signup` | ✗ | ✗ | root | ✓ | ✓ | Suspense beta gate |
| `/privacy`,`/terms`,`/access-required` | ✗ | ✗ | root | ~ | ✗ | static legal |
| `/invite/[token]` | **✗** | **✗** | root | ✗ | ✗ | **dynamic token route, GAP** |
| `/share/[token]` | ✓ | ✗ | ✓ | gen | ✗ | force-dynamic |
| `/workshop` | ✓ | ✗ | root | ✗ | ✗ | dashboard skeleton |
| `/workshop/onboarding` | ✓ | ✗ | root | ✗ | ✗ | |
| `/workshop/proposals` | ✓ | ✗ | root | ✗ | ✓ | |
| `/workshop/publisher` | **✗** | ✓ | root | ✗ | ✓ | **error-only, asymmetric** |
| `/workshop/feedback`,`/workshop/terms` | ✗ | ✗ | root | ✗ | ✗ | |
| `/workshop/library` (+components,+templates,+templates/[templateId]) | ✓ | ✓ | root | ✗ | ✗ | best-covered subtree |
| `/workshop/settings` (+ 6 subroutes) | ✓ (shared) | ✗ | root | ✗ | ✗ | one loading.tsx covers subtree; no error.tsx |
| `/workshop/projects` | ✓ | ✗ | root | ✗ | ✓ | |
| `/workshop/projects/[projectId]` | ✓ | ✗ | root | ✗ | ✗ | layout wraps children in Suspense |
| `/workshop/projects/[projectId]/activity` | ✓ | ✗ | root | ✗ | ✓ | |
| `/workshop/projects/[projectId]/data` | ✓ | ✓ | root | ✗ | ✗ | |
| `/workshop/projects/[projectId]/estimates` | **✗** | ✓ | root | ✗ | ✓ | **error-only, in-page Suspense only** |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | ✓ | ✓ | root | ✗ | ✓ | |

### A.4 Counts

- **42** UI page routes (incl. 3 redirect-only).
- **14** own `loading.tsx`; **6** settings-subroutes inherit `/workshop/settings/loading.tsx` → ~20 covered.
- **~19** routes without loading UI (mostly static marketing/legal — acceptable; plus `/invite/[token]`, `/workshop/feedback`, `/workshop/terms`, `/workshop/publisher`, estimates list).
- **8** own `error.tsx`; **2** `not-found.tsx` (root + share); **1** `global-error.tsx`.
- **0** `export const viewport` anywhere (grep confirmed) — gap vs. Next.js guidance.
- **5** layouts (root, workshop, library, projects/[projectId]).

### A.5 Loading UI contents (each loading.tsx uses `Skeleton`/`animate-pulse`, mostly `role="status"`)

- `share/[token]/loading.tsx` — proposal-review skeleton (header, 6 KPI, tabs, sidebar 8, body 7), `role="status"` + `aria-live`.
- `workshop/loading.tsx` (215 LOC) — full dashboard bento skeleton via `StaticWorkshopLoadingShell` + `Skeleton`.
- `workshop/onboarding/loading.tsx` — centered card skeleton.
- `workshop/projects/loading.tsx` — `ProjectsListSkeleton`.
- `workshop/projects/[projectId]/loading.tsx` — `ProjectDashboardLoading`, `aria-busy`.
- `workshop/projects/[projectId]/activity/loading.tsx` (71 LOC) — activity-table skeleton (header, filter row, 7×5 table), `role="status"`; **hand-rolled divs, not `Skeleton`**.
- `workshop/projects/[projectId]/data/loading.tsx` — comparison-board skeleton, `aria-busy`, `data-project-data-loading`.
- `workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` — `<EstimateSheetRouteSkeleton/>` (avoids parent list skeleton flashing on sheet transitions).
- `workshop/proposals/loading.tsx` — `ProposalsListSkeleton`.
- `workshop/settings/loading.tsx` — 3 bordered card skeletons + action button; **shared by all settings/* subroutes**.
- `workshop/library/**/loading.tsx` (4) — `"use client"` browse/editor skeletons with `role="status"`.

### A.6 Error UI shape (all 8 error.tsx identical)

All delegate to `<WorkshopRouteErrorState routeLabel="…">` from `@/components/workshop/WorkshopRouteErrorState`. `global-error.tsx` is the catch-all that renders its own `<html>/<body>`, reports via `postClientErrorReport`, and auto-focuses a "Try again" button calling `unstable_retry()`.

### A.7 Root layout + providers

`src/app/layout.tsx` — metadata (title template, icons, manifest), `<AppProviders>`, plus always-mounted `AuthStateMismatchRecoveryScript`, `LiquidGlassReady`, `LandingStructuredData`. **No root Suspense, no root loading.tsx, no root error.tsx.**

`src/app/providers.tsx` (`"use client"`) — per-tab `QueryClient` (via `useState(createQueryClient)`, correct for App Router); defaults `staleTime`/`gcTime` 5 min, `refetchOnWindowFocus:false`, `retry:1`, `mutations.retry:0`. Wraps `ToastProvider` → `NotificationProvider` and mounts `BfcacheHandler`, `PerformanceMonitor`, `NavigationListener`, `RealtimeAuthBridge`, and `<RouteLoadingOverlay/>`.

### A.8 Global transition UX

`src/components/ui/route-loading-overlay.tsx` (`"use client"`) — `createPortal` full-screen `Spinner` overlay (`bg-white/25 backdrop-blur-md`, `aria-live="polite"`, `aria-label="Loading page"`) driven by `useNavigationUiStore.isNavigating`. While navigating it sets `aria-hidden="true"` on `[data-workshop-page-shell-root]`/`[data-landing-page-root]`. **This is the global loading UX**, distinct from per-segment `loading.tsx`. It is a *spinner* — the roadmap rule says "Loading states must use design-system Skeleton. No spinners" — so the overlay is a documented, route-level exception (full-route transitions have no skeleton shape).

---

## B. Client-component mount and hydrate audit

### B.1 Footprint

- **252** `"use client"` files, ~**72,266 LOC** of client JS.
- Heaviest (top 5, all `src/components/workshop/`): `component-library/index.tsx` (3315), `projects-page-client.tsx` (3132), `component-library-manager/ComponentLibraryManager.tsx` (2875), `EstimateSheetContent.tsx` (2764), `EstimateSheetTree.tsx` (2165). Top 4 alone ≈ **12,000 LOC** on the estimate/projects surfaces.

### B.2 `next/dynamic` (27 sites, 14 files)

- **Modals/dialogs** consistently `{ ssr: false }` (correct): `NewProjectModal`, `ProjectDetailsModal`, `BulkDestructivePreviewModal`, `BetaFeedbackForm`, `CommandPalette`, `EstimateRightSidebar`, `ProposalExportPreviewDialog`, `ActivityHistoryModal`, `RowDetailsModal`, `WorkshopSettingsModalContentView`, `WorkshopFeedbackModal`.
- **Critical-path estimate chunks** at `EstimateWorkspaceClient.tsx:27,30`: `EstimateSheetTree` (2165 LOC) and `EstimateSheetContent` (2764 LOC) use **default SSR dynamic, no `loading`**. They SSR + hydrate on the critical estimate route. **Highest-leverage mount optimization target** — `EstimateSheetRouteSkeleton` already exists.
- Many `loading: () => null` patterns on side docks (fine) — but risky where above-the-fold.
- `library/template-editor/TemplateEditorClient.tsx:35` uses `loading: () => <TemplateEditorDockFallback/>` (good).

### B.3 `<Suspense>` (19 usages)

- Strong RSC streaming: `workshop/projects/[projectId]/layout.tsx` (3 boundaries: title, header chrome, children), `projects/page.tsx` (shares `ProjectsListSkeleton` with its `loading.tsx` to avoid double-flash — documented), `WorkshopPageShell.tsx` (sidebar, settings entry, content).
- Page-level: `publisher`, `proposals`, `activity`, `estimates`, `estimates/[nodeId]`.
- Auth/marketing: `contact`, `login`, `signup`.
- Client-side Suspense: `projects-page-client.tsx:3080` (fallback `null`).

### B.4 `React.lazy` — **0** (correct for App Router).

### B.5 Loading primitives

- `src/components/ui/skeleton.tsx` — `Skeleton` (`animate-pulse rounded-xs bg-muted/40`, `motion-reduce`). Workhorse.
- `src/components/ui/spinner.tsx` — `Spinner` (xs/sm/md/lg), heavy inline SVG "blocks-shuffle" with 9 `@keyframes` (~140 LOC CSS-in-SVG) — **non-trivial paint cost**; used by `RouteLoadingOverlay` on every navigation.
- `src/components/ui/route-loading-overlay.tsx` — `RouteLoadingOverlay`.
- Domain skeletons: `EstimateSheetRouteSkeleton`, `ProjectsListSkeleton`, `ProjectEstimatesListSkeleton`, `ProposalsListSkeleton`, `PublisherRosterSkeleton`, `ProjectHeaderChromeSkeleton`, `ProjectRouteContentFallback`, `StaticWorkshopLoadingShell`.

### B.6 Concurrency primitives (good, deliberate)

- `useTransition` ~18 files; concentrated in `projects-page-client.tsx` (mutation feedback + `router.refresh`) and inline-edit cells.
- `useDeferredValue` for list/library search filtering (`projects-page-client.tsx:1592`, `component-library/index.tsx:1031`).
- `startTransition` wraps mutation cache updates in `use-estimate-row-mutations.ts`.

### B.7 TanStack Query

- `useQuery` 16, `useMutation` 16, `useInfiniteQuery` **0**, `useSuspenseQuery` **0**.
- **No `HydrationBoundary`/`dehydrate`** anywhere → no SSR prefetch → client hydration of query cache. Client queries start cold.
- **No data-driven Suspense on the client.**
- 1 prefetch site: `use-prefetch-on-hover.ts:65` (config-driven `queryClient.prefetchQuery`).

### B.8 Zustand stores (8)

`estimate-ui-store`, `navigation-ui-store` (drives overlay), `estimate-column-widths-store`, `project-estimates-store`, `estimate-workshop-drag`, `use-estimate-header-actions-store`, `use-estimate-workspace-state`, `use-library-editor-chrome`. Appropriate colocated client state; none mirroring server data improperly at the audit's resolution.

### B.9 Anti-patterns found

- **`fetch` inside `useEffect`** on share surface: `SharePageComments.tsx:275,310,356,387` and `SharedLinkActivityFeed.tsx:147,180,188` — no SSR, no dedupe, no cache. Delays first meaningful paint on `/share/[token]`.
- **Hand-rolled focus-refetch**: `proposals-page-client.tsx:79` re-implements `refetchOnWindowFocus` (globally disabled) via a `focus`+`visibilitychange` effect with a 150 ms `setTimeout`.

### B.10 Prefetch discipline (deliberate)

- **15** `prefetch={false}` sites paired with `usePrefetchOnHover` (`src/hooks/use-prefetch-on-hover.ts`, debounced 150 ms `router.prefetch` + optional `queryClient.prefetchQuery` on `mouseEnter`/`focus`). Used on link-heavy dashboards to cut automatic prefetch traffic. Good pattern; should be codified in the agent rules.

### B.11 `next/image` 17, `next/link` 43, `next/font` **0** (CSS fonts only — opportunity).

---

## C. Performance, build, and observability tooling inventory

### C.1 Test layers

- `bun test tests/unit` — 6 Bun unit tests.
- `vitest run --maxWorkers=1` — **624** jsdom component tests (`tests/vitest/**`), serial, 30s timeout. `tests/vitest/perf/` (9 files: render-baselines + RPC contracts for estimate-sheet, library, projects).
- `playwright test` — 9 e2e specs incl. `route-transition-performance.spec.ts` (468 LOC, Performance-Timeline + CDP Slow-3G), `estimates-crud-latency.spec.ts`, `estimates-shell-streaming.spec.ts`, `workshop-route-error-boundaries.spec.ts`. Budgets in `e2e/route-transition-performance-budgets.json`.
- Storybook 10.4.6 with `addon-a11y`.

### C.2 Perf scripts (`scripts/`)

- `measure-route-transitions.ts` (Playwright-driven; `BASE_URL`,`RUNS`,`NETWORK_PROFILE` No throttle/Fast 3G/Slow 3G; `INCLUDE_AUTHENTICATED`).
- `measure-shared-link-perf-budgets.ts`, `measure-library-performance-baseline.ts`, `measure-workshop-dashboard-query-count.ts`, `collect-live-db-performance-evidence.ts`, `build-performance-query-inventory.ts`, `seed-performance-test-data.ts`, `check-route-transition-readiness.ts`.
- Benchmarks: `benchmark-estimate-cursor-broadcast.ts`, `benchmark-proposal-workbook.ts`, `benchmark-shared-link-activity.ts`, `bench-hero-browser.mjs`, `bench-hero-server.mjs`, `measure-upload-smoke-benchmark.mjs`.
- npm scripts: `perf:measure-routes`, `perf:check-routes`, `perf:dashboard-query-count`, `perf:seed-fixture`, `perf:library-baseline`, `perf:profile-peak-load`, `perf:collect-live-evidence`.

### C.3 Bundle budgets

- `scripts/check-performance-budgets.mjs` — CI gate reading `.next/diagnostics/route-bundle-stats.json` (Turbopack), gzip per route, **default 350 KB gzipped first-load JS**, `PERF_BUDGET_KB`/`PERF_BUDGET_STRICT`. Currently **advisory** in CI (`continue-on-error` unless `PERF_BUDGET_STRICT=1`).
- `@next/bundle-analyzer` wired via `ANALYZE=true bun run build` (no dedicated `analyze` script).
- Route-transition timing budgets in `e2e/route-transition-performance-budgets.json`.

### C.4 RUM / Core Web Vitals (THE GAP)

- `src/components/workshop/WebVitalsProbe.tsx` — `useReportWebVitals` (FCP/LCP/INP/CLS/TTFB) but **dev-only** (`NEXT_PUBLIC_PERF_TRACE=1`), `console.log` only, mounted in workshop shell only.
- Landing: GA4 (`@next/third-parties/google`) + Microsoft Clarity — traffic/experiment events, **no CWV beacon**.
- **No production RUM. No `web-vitals` package. No Lighthouse CI. No Sentry/OTel/Datadog.** In-test CWV capture only (Playwright Performance-Timeline).
- Cloudflare Workers Observability is on (logs+traces 5–10% sampling) but **no custom CWV metric** is emitted to it from the client.

### C.5 CI (`.github/workflows/`)

- `ci.yml`: `bun run validate` (type-check→lint→design-system→design→unit→vitest) → `bun run build` → bundle budget advisory → `lint:design` → Playwright chromium install → `bun run test:e2e` → `bun run test:e2e:perf`. Authenticated perf scenarios **skip in CI** (no `PLAYWRIGHT_STORAGE_STATE`).
- `codeql.yml` (weekly JS/TS analysis). `react-doctor.yml` (advisory React scan, non-blocking).

### C.6 `metrics/` evidence folder exists (`after-estimates-list.md`, `baseline-estimates-list.md`, `p-1-evidence.md`, etc.).

---

## D. AI-agent rules infrastructure map (where new rules belong)

### D.1 `.ai/` brain structure (depth 2)

`00_system/` (governance protocols), `01_roadmap/` (numbered; **`27-performance-budget-and-regression-gates.md` is the numeric-budget home**), `03_plans/` (dated packs), `08_prompts/` (planning suite), `10_state/` (current-state, decisions, known-issues), `11_skills/` (repo-native procedures, e.g. `capture-perf-trace-baseline.md`), `12_agents/payloads/` (per-agent role adapters), `13_research/2026-06-17-Master-Performance/` (the perf bible). Anti-drift rule: "Do not create new unnumbered top-level `.ai` content folders."

### D.2 Authority chain

`AGENTS.md` (root entry) → `.ai/00_system/*_PROTOCOL.md` (flat files, **no `rules/` subdir**) → referenced budgets in `01_roadmap/27-*.md` → engineering law in `13_research/...Bible...md` → operationalized by `11_skills/*.md` and `.agents/skills/<name>/SKILL.md`. Per the canonical map: *"New agent performance/recovery protocol: `00_system/` if it governs all agents."*

### D.3 Existing perf/loading references (file:line)

- `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` L14–27 (Global Perf Rules: Link+prefetch, Skeleton-not-spinners, no >10KB main-bundle regression), L43–56 (3-tier targets: workshop transition <200ms/<100ms; LCP <2.5s/<2.0s; main chunk <200/<150KB), L58–96 (route/module/operation budgets), L112–124 (Enterprise MVP gates), L126–162 (regression gates + smoke test).
- `.ai/13_research/2026-06-17-Master-Performance/...Bible...md` — Laws 1–3 (state separation, no derived-data storage, normalize→index→project→virtualize), §6 Cache Components rollout incl. Suspense law, §7 React Compiler, tree budgets, "row editing keystrokes must be local," "virtualized tree test proves mounted row count stays bounded."
- `.ai/11_skills/capture-perf-trace-baseline.md` — operational trace-capture procedure (references `measure-workshop-dashboard-query-count.ts`, `measure-route-transitions.ts`).
- `.ai/01_roadmap/13-risk-register.md` R-008: no production monitoring/APM; dev-only perf probes.

### D.4 Tool-adapter surfaces (lower authority)

`CLAUDE.md`, `CODEX.md` defer to `AGENTS.md`. `GEMINI.md` deprecated/fail-closed. `opencode.json` includes `AGENTS.md`. `.cursor/`, `.codex/`, `.commandcode/` contain **generic third-party packs** (e.g. `.cursor/rules/web-performance.mdc`, `.codex/prompts/performance-reviewer.md`) — not Archestimator-authored; new rules must NOT fork into these.

### D.5 Canonical SKILL.md formats

- `.agents/skills/<name>/SKILL.md`: frontmatter (`name`,`description`) + `# Title` + named sections (`## Workflow`, `## Phase N`, `## Output Format`). See `web-perf`, `performance-goal`, `react-doctor`, `impeccable`.
- `.ai/11_skills/*.md`: frontmatter (`status`,`last_updated`,`plan_reference`,`work_package`) + `> Use when:` + `## Prerequisites` + `## Steps` + `## What to look for` + `## Common pitfalls` + `## Cross-references`. See `capture-perf-trace-baseline.md` — the closest repo-native analogue.

### D.6 Enforcement gate

`bun run validate:agents` (`scripts/validate-ai-workflow-adapters.mjs`) must pass after authoring new agent rules/payloads.

---

## E. Next.js 16 framework facts (from `node_modules/next/dist/docs/`, read in full)

- **`loading.js`** wraps `page.js` (and nested) in `<Suspense>`; **the fallback is prefetched**, giving instant loading on navigation; navigation is interruptible; shared layouts stay interactive. (loading.md L42–52, prefetching.md table.)
- **`loading.js` does NOT wrap `layout.js`/`template.js`/`error.js` in the same segment.** If a layout reads uncached/runtime data (`cookies()`,`headers()`), `loading.js` won't show a fallback for it — without Cache Components, navigation **blocks** until the layout renders. (loading.md L88–95.)
- **Static vs dynamic prefetch** (prefetching.md): static page → full route prefetched; dynamic page → only prefetched if `loading.js` exists (layout-to-first-loading-boundary), 30s client-cache TTL (`staleTimes` configurable). Archestimator sets `staleTimes: { dynamic: 60, static: 180 }` — so warm dynamic-segment revisits reuse the cached render for 60s and do **not** re-suspend/re-fire `loading.tsx`. **This is the principal lever for perceived loading UX on warm nav.**
- **Streaming & Web Vitals** (streaming.md §"Streaming and Web Vitals"): keep LCP elements **outside/above** Suspense; use `next/image` `preload` for LCP images; match skeleton dimensions to content to minimize CLS; each `<Suspense>` is a hydration unit (good for INP). **Repo gap:** skeletons are visually matched in most places but `viewport` export is missing everywhere and LCP-image `preload` discipline is not codified.
- **HTTP contract:** once streaming starts (Suspense fallback renders) status is `200`; `notFound()`/`redirect()` mid-stream become soft (noindex/`<meta>`). For real 404/redirect status, call before any `await`/Suspense. **Relevant to `/share/[token]` and `/invite/[token]` (dynamic, token-bearing).**
- **`unstable_instant` + Cache Components (draft doc, future path):** `export const unstable_instant = { prefetch: 'static' }` validates at dev+build time that a route produces an instant static shell at every shared-layout entry point; requires Cache Components enabled and uncached data wrapped in local `<Suspense>` + `"use cache"`. **Archestimator has Cache Components OFF** — adopting this is a cross-cutting, owner-gated future decision, not a Phase-1 mandate. Build-time validation + `@next/playwright` `instant()` helper are the framework-supported regression guard for instant navigation.
- **Reverse-proxy/CDN buffering** can defeat streaming (set `X-Accel-Buffering: no`). **Cloudflare Workers/OpenNext generally pass chunks through**, but this should be verified during the measurement phase (Phase 0).

## F. Document-impact matrix

| Document | Relevant? | Implementation would require update? |
|---|---|---|
| `AGENTS.md` | Yes | Yes — add 1-line pointer to new protocol (Phase 4) |
| `.ai/01_roadmap/27-*.md` | Yes | Reference only; do not duplicate numbers |
| `.ai/13_research/...Bible...md` | Yes | Reference only (engineering law) |
| `DESIGN.md` | Tangential (loading UX tokens) | No (alpha, not law) |
| `.ai/00_system/VALIDATION_MATRIX.md` | Yes | Possibly extend with loading/perf checks (Phase 4) |
| Existing archived perf plans (`09_archive/`) | Historical | No |
