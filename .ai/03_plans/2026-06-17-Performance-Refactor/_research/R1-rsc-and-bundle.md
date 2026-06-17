# R1 — App Router / RSC + Bundle/Runtime Cost (Research Dossier)

Research agent: R1. Scope: (A) React/Next.js App-Router architecture & RSC boundaries, (B) bundle/runtime cost.
Stack: Next.js 16.2.6 (App Router), React 19.2.6, Bun, TS strict, Tailwind v4. Read-only audit.
Method: code-review-graph + GitNexus for mapping, confirmed with `rg`/`grep` + targeted file reads. Every claim cites `file:line`.

---

## Domain A: App Router / RSC

### A0. Structure overview (map)
- App tree lives under `src/app/`. Route segments: marketing/public (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/beta/access-required`), `/invite/[token]`, `/share/[token]`, and the authed app under `/workshop/**` (projects, estimates, library, templates, settings, onboarding). API routes under `src/app/api/**`.
- Layouts: 4 total — `src/app/layout.tsx` (root), `src/app/workshop/layout.tsx`, `src/app/workshop/library/layout.tsx`, `src/app/workshop/projects/[projectId]/layout.tsx` (confirmed: `find src/app -name layout.tsx`).
- `loading.tsx`/`error.tsx`: 18 route-loading/error files, all under `/workshop/**` (none on public/landing). e.g. `src/app/workshop/loading.tsx`, `src/app/workshop/projects/[projectId]/loading.tsx`, `.../estimates/loading.tsx`, library + templates variants.
- **All 32 `page.tsx` files are Server Components** — none start with `"use client"` (verified by scanning the first 3 lines of every `page.tsx`). This is good RSC discipline: pages do server data work, then hand to client islands.

### A1. "use client" footprint
- **193 files carry `"use client"`** (`grep -rlE "['\"]use client['\"]" src` → 193). 24 files carry `"use server"`.
- Largest client components (LOC) — the oversized-island hotlist:
  - `src/components/workshop/EstimateSheetContent.tsx` — **2949 LOC** (single client file)
  - `src/components/workshop/component-library/index.tsx` — 2540
  - `src/components/workshop/component-library-manager/AddComponentModal.tsx` — 2359
  - `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — 1695
  - `src/components/workshop/estimate-sheet/activity-history.tsx` — 1688
  - `src/components/workshop/EstimateSheetTree.tsx` — 1587
  - `src/components/workshop/projects-page-client.tsx` — 1481
  - `src/components/ui/tree.tsx` — 1328
  - `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` — 1311
  - `src/components/workshop/component-library/tree/TemplatesTree.tsx` — 1252
  - `src/components/workshop/ProjectEstimatesTable.tsx` — 1211
  - `src/components/workshop/ProjectPublicationHeader.tsx` — 1174
  - `src/components/workshop/ProjectTeamspaceHeader.tsx` — 1063
- **`EstimateSheetContent.tsx` (2949 LOC) is the single biggest refactor target.** Its import header (`EstimateSheetContent.tsx:1-60`) shows a very wide client surface: `useEstimateRowMutations`, `loadProjectComponentLibraryLite` (server action), `useEstimateCursorCollaboration`, `buildProposalExportModel` (`src/lib/proposal-export/build-proposal-export-model`), `CommandPalette`, `ProposalExportPreviewDialog`, multiple stores, react-query. Much of this (filtering, tab orchestration, export-model building, proposal preview) could be split into smaller client islands or moved server-side. This file alone dominates the `/workshop/projects/[projectId]/estimates/[nodeId]` client bundle.

### A2. Dynamic imports (good patterns, but inconsistent)
Dynamic boundaries are used deliberately in several heavy spots:
- `src/components/workshop/EstimateWorkspaceClient.tsx:19-31` — `EstimateSheetTree` and `EstimateSheetContent` are both `dynamic()` with skeleton `loading:` fallbacks (so the 2949-LOC content chunk is split out of the workspace shell). Good.
- `src/components/workshop/LibraryPageClient.tsx:20-23` — `ComponentLibraryManager` dynamic with `LibraryManagerFallback`.
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:70-85` — `LibraryFolderTreeSurface` and `AddComponentModal` dynamic.
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:48-55` — `NewTemplateModal`, `InsertIntoEstimatePicker` dynamic.
- `src/components/workshop/projects-page-client.tsx:105-106` — `NewProjectModal`, `ProjectDetailsModal` dynamic (modals lazy-loaded).
- `src/components/workshop/project-charts/ProjectChartsClient.tsx:26-29` — `ProjectCostDonutChart` dynamic (defers d3-shape on the charts route).
- `src/components/landing/HeroSection.tsx:11-14` — `NeatWireframeBackground` dynamic with `loading: () => null` (defers the WebGL/three chunk off the landing critical path).

**Inconsistency to fix:** `CostDonutChart` (the d3-shape chart, `src/components/charts/CostDonutChart.tsx`) is dynamic only on the charts route. It is imported **statically** in two other places:
- `src/components/workshop/project-data/CostBreakdownSection.tsx:5` (rendered by `ProjectDataClient.tsx:82`, the `/workshop/projects/[projectId]/data` route)
- `src/components/share/SharePageTabs.tsx:23` (the public `/share/[token]` page)
So d3-shape is pulled eagerly into both the Data route and the **public share-page** bundle even when the cost chart isn't the active tab. (See B2.)

### A3. Suspense / streaming
- Only ~4 files use `Suspense`. Server-side streaming is used well in `src/app/workshop/projects/[projectId]/layout.tsx:42-51` — project header chrome and route content are each wrapped in `<Suspense>` with skeletons "so they no longer block first paint (F5/P1-2)" (comment at line 21). Also `src/components/workshop/WorkshopPageShell.tsx:141`.
- **Opportunity:** streaming/`Suspense` server-projection is sparse outside the project layout. Most authed routes lean on route-level `loading.tsx` + client-side TanStack Query fetching inside large client islands rather than streaming server-rendered data. Candidate areas: estimates list, library overview.

### A4. router.refresh / shallow state sync
- `router.refresh()` (or `.refresh()`) appears in 12 files, including `src/stores/project-estimates-store.ts`, `ProjectEstimatesTable.tsx`, `NewProjectForm.tsx`, `ProjectEstimateMetadataStrip.tsx`, `LibraryPageClient.tsx`, `library/template-editor/use-template-editor.ts`, `templates-browse/TemplatesBrowsePageClient.tsx`, `projects-page-client.tsx`, `ComponentLibraryManager.tsx`, `TemplatesBrowseManager.tsx`, `hooks/use-navigation-router.ts`. Each `router.refresh()` re-runs the server segment + RSC payload fetch. Worth auditing whether some of these could be replaced by targeted TanStack Query cache invalidation (the codebase already prefers scoped cache busting per `next.config.ts:64-67` comment and the favorites Route-A decision in MEMORY). Possible overlap with **R-state** and **R-data** domains.

### A5. Next cache / config perf settings (`next.config.ts`)
- `experimental.staleTimes: { dynamic: 60, static: 180 }` (`next.config.ts:64-67`) — intentionally lets the client Router Cache reuse warm dynamic segments so Link/back-forward nav doesn't re-suspend and re-fire `loading.tsx`. Documented decision; pairs with warm TanStack Query caches. Reasonable.
- `experimental.optimizePackageImports: ["@phosphor-icons/react"]` (`next.config.ts:55`) — only phosphor is optimized. **No `modularizeImports`** (confirmed: grep `modularizeImports` → NONE). See B5 for other candidates.
- `images.remotePatterns` restricted to the Supabase public component-images bucket (`next.config.ts:31-50, 69-71`). `sharp` is a dependency (image optimization). Fine.
- Bundle analyzer **is wired** (`next.config.ts:2,190-194`, gated by `ANALYZE=true`), but **there is no `analyze` npm script** in `package.json` `scripts` (confirmed: scripts list has no `analyze`/`ANALYZE`). Devs must remember `ANALYZE=true next build`. Low-cost ergonomics fix.

### A6. Global providers run on EVERY route (incl. public/landing)
`src/app/layout.tsx:25-31` mounts `<AppProviders>` around all children, and `src/app/providers.tsx:30-46` (`"use client"`) renders, for every route including marketing pages:
`QueryClientProvider`, `ToastProvider`, `NotificationProvider`, `BfcacheHandler`, `PerformanceMonitor`, `NavigationListener`, `RealtimeAuthBridge`, `RouteLoadingOverlay`.
- **`RealtimeAuthBridge` (`src/components/realtime-auth-bridge.tsx`) is the worst offender.** On mount it `createSupabaseBrowserClient()`, calls `supabase.auth.getSession()`, and subscribes to `supabase.auth.onAuthStateChange` (lines 22-66). This pulls `@supabase/ssr` + `@supabase/supabase-js` into the **shared client bundle that loads on the landing page** and fires an auth roundtrip on the public marketing site where no realtime channels exist.
- `NotificationProvider` (`src/features/notifications/components/NotificationProvider`), `PerformanceMonitor`, `NavigationListener`, `RealtimeAuthBridge` are all authed-app concerns but run on `/`, `/pricing`, etc.
- **Fix direction:** move the authed-only providers (RealtimeAuthBridge, NotificationProvider, possibly NavigationListener/PerformanceMonitor) into `src/app/workshop/layout.tsx` instead of the root layout, leaving only the minimal provider set (QueryClient/Toast if even needed) on public routes. This is the highest-leverage app-shell win and overlaps with **R-state** (provider topology).

---

## Domain B: Bundle / Runtime

### B1. Heavy-dep inventory & install sizes
`du -sh node_modules/<dep>`:
- `three` — **38M** (transitive via `@firecms/neat`)
- `@firecms/neat` — 596K
- `exceljs` — **22M**
- `@phosphor-icons/react` — **57M** (huge; optimized via dist/ssr + optimizePackageImports)
- `react-complex-tree` — 2.7M
- `d3` — 868K (full, **redundant**, see B5); `d3-shape` — 440K (the one actually used)

### B2. exceljs — clean server-only boundary (good)
- `exceljs` is imported only in `src/lib/proposal-export/create-proposal-workbook.ts:1`.
- That module is imported only by the API route `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:4` (`createProposalWorkbookBuffer`) and by `src/lib/proposal-export/build-proposal-export-model.ts`. **No client component imports exceljs.** The client export path (`EstimateSheetContent` → `ProposalExportPreviewDialog`) builds the *model* client-side but POSTs to the server route for the actual workbook; `ProposalExportPreviewDialog.tsx` contains no `exceljs`/`create-proposal-workbook` import. **No ExcelJS leak into client bundles.** Confirmed clean.

### B3. three / @firecms/neat (WebGL) — exemplary lifecycle (good)
- Only consumer is `src/components/landing/NeatWireframeBackground.tsx` (the `three` matches elsewhere were the English word "three" in comments/strings, not imports — verified).
- It is dynamic-imported off the landing critical path (`HeroSection.tsx:11-14`, `loading: () => null`), and `@firecms/neat` itself is **further** dynamically imported inside the effect (`NeatWireframeBackground.tsx:117` `await import('@firecms/neat')`). So three/neat never enters the initial landing chunk.
- Runtime loop is well-managed: static fallback for reduced-motion/coarse-pointer/mobile (`:6, :57-62`), `requestIdleCallback` activation (`:66-79`), **`IntersectionObserver` pauses the gradient when off-screen** (`:132-141` sets `gradient.paused = !isIntersecting`), and `gradient?.destroy()` on unmount (`:148-153`). This is the gold-standard pattern; **no action needed** — note it as the reference for other animated/WebGL work.

### B4. d3-shape charts — defer everywhere, not just charts route
- `CostDonutChart.tsx` imports only `d3-shape` (`arc`, `pie`) — `:4-5`. No bare `d3` usage anywhere (verified). The chart bundle is ~440K of d3-shape + the chart code.
- It is dynamic on the charts route (`ProjectChartsClient.tsx:26-29`) but **statically eager** on the Data route (`CostBreakdownSection.tsx:5` → `ProjectDataClient.tsx:82`) and the **public share page** (`SharePageTabs.tsx:23`). On `/share/[token]` this ships d3-shape to external recipients even when the cost-chart tab isn't open. **Fix:** make CostDonutChart dynamic at all three consumers (or gate on tab visibility), especially `SharePageTabs`.

### B5. Redundant / optimizable deps
- **`d3` (full, 868K) is a redundant dependency** — only `d3-shape` is imported anywhere in `src` (and `@types/d3` is dev). Removing `d3` from `package.json` (keeping `d3-shape`) trims the dependency tree. Verify no transitive need first.
- **`optimizePackageImports` covers only `@phosphor-icons/react`** (`next.config.ts:55`). Additional barrel-heavy candidates: `@tanstack/react-table` (1 importer), `@tanstack/react-virtual` (3 importers), `@radix-ui/react-context-menu` (1 importer), `d3-shape`, `lenis`. Adding these to `optimizePackageImports` is low-risk and prunes barrel imports. (`@radix-ui` and `@tanstack` are commonly recommended entries.)

### B6. Icons — already on the efficient path (mostly)
- 127 files import from `@phosphor-icons/react`. The dominant style is the **SSR/per-icon subpath** `@phosphor-icons/react/dist/ssr` (13 multi-icon blocks + many single-icon imports like `{ X }`, `{ Plus }`, `{ CaretDown }`). This avoids the giant barrel and is the recommended path; combined with `optimizePackageImports` it tree-shakes well.
- **Minor inconsistency:** a few files still import from the bare barrel `@phosphor-icons/react` (2 value imports: e.g. `{ FolderSimple, Cube, CaretDown }`, plus 3 `import type { Icon }`). The type-only imports are free; the value-import barrel usages should be migrated to `/dist/ssr` for consistency. Low impact given optimizePackageImports, but worth normalizing.

### B7. Landing-only libs — correctly scoped to landing (good)
- `lenis` — only `src/components/landing/LandingSmoothScrollProvider.tsx:3-4`, and it short-circuits to plain children under reduced-motion (`:35-37`) and only wraps `ReactLenis` otherwise. Landing-only. Good.
- `rough-notation` — `src/components/landing/LaunchFeatureHeading.tsx:4`, `HeroSection.tsx:7`. `roughjs` — `src/components/landing/AnimatedProposalRecordSection.tsx:12-13`. All under `src/components/landing/**`. **Confirm these never leak into the app shell** — they don't appear in providers/layout, so they should only ship on landing routes. (Worth a final bundle-analyzer confirmation per B-open.)
- `react-complex-tree` — only a `type`-only import in `src/lib/component-library/library-folder-reorder.ts:1`. Type imports are erased; **the 2.7M runtime is likely NOT bundled** unless a value import exists elsewhere (none found). Verify with analyzer; if truly type-only, the dep could move to devDependencies or be removed if the project's own tree (`src/components/ui/tree.tsx`, 1328 LOC) fully replaced it.

### B8. Analytics / third-party scripts — gated, landing-only (good)
- `@next/third-parties/google` (`GoogleAnalytics`) only in `src/components/landing/LandingAnalyticsLoader.tsx:3` (consent-gated per landing page logic).
- `@vercel/analytics/next` (`Analytics`) in `src/components/analytics/VercelWebAnalytics.tsx:3`, mounted globally in `layout.tsx:32`. This is the standard lightweight Vercel analytics; acceptable globally. `src/lib/analytics/vercel-web-analytics.ts:1` is a type-only import.
- `resend` (email) only in `src/lib/email/resend-client.ts`, `resend-webhooks.ts` — server-only. Clean.

---

## Top findings (ranked, highest-leverage first)

1. **Authed-only global providers run on public/landing routes** — `src/app/providers.tsx:30-46` mounts `RealtimeAuthBridge`, `NotificationProvider`, `PerformanceMonitor`, `NavigationListener` for every route via root `layout.tsx:25`. `RealtimeAuthBridge` (`realtime-auth-bridge.tsx:22-66`) drags `@supabase/ssr` + supabase-js into the shared/landing client bundle and runs an auth roundtrip on marketing pages. **Move authed providers to `src/app/workshop/layout.tsx`.** Biggest app-shell win. (Overlaps R-state.)

2. **`EstimateSheetContent.tsx` is a 2949-LOC client monolith** (`:1`) — single largest client file, owns filtering, tab orchestration, proposal-export model building, command palette, collaboration. Split into smaller client islands and push pure-data work (export model, projections) server-side. (Overlaps R-sheet, R-state.)

3. **d3-shape charts shipped eagerly to the Data route and the public Share page** — `CostBreakdownSection.tsx:5` and `SharePageTabs.tsx:23` import `CostDonutChart` statically; only `ProjectChartsClient.tsx:26` lazy-loads it. Make all three dynamic / tab-gated, especially the external-facing `/share/[token]`.

4. **Redundant `d3` dependency + thin `optimizePackageImports`** — full `d3` (868K) is in `package.json` but only `d3-shape` is imported anywhere; remove `d3`. Extend `next.config.ts:55` `optimizePackageImports` beyond phosphor to `@tanstack/react-table`, `@tanstack/react-virtual`, `@radix-ui/react-context-menu`, `d3-shape`.

5. **No streaming beyond the project layout; heavy reliance on client islands + `router.refresh()`** — only ~4 `Suspense` sites; `router.refresh()` in 12 files re-runs server segments. Audit which refreshes could become scoped TanStack invalidations, and identify server-projection/streaming opportunities (estimates list, library overview). (Overlaps R-data, R-state.)

Notable positives (do NOT spend effort here): exceljs is cleanly server-only (B2); the NeatWireframe WebGL lifecycle is exemplary (B3); all `page.tsx` are Server Components (A0); landing-only libs (lenis/rough*) are scoped to `src/components/landing/**` (B7); phosphor icons mostly use the efficient `/dist/ssr` path (B6).

---

## Open questions / things I couldn't verify

- **No measured bundle sizes.** Bundle analyzer is wired (`next.config.ts:190-194`) but I am read-only and did not run `ANALYZE=true next build`. All "ships into bundle X" claims are derived from import graphs, not analyzer output. **Recommend the plan's first step run the analyzer** to confirm: (a) the landing chunk actually contains supabase/realtime via providers, (b) rough-notation/roughjs/lenis don't leak past landing, (c) whether `react-complex-tree` (type-only import found) is bundled at all.
- **`react-complex-tree` runtime**: only a `type`-only import was found (`library-folder-reorder.ts:1`). If there is truly no value import, the 2.7M lib may be removable / moved to devDeps — needs analyzer + a broader value-import sweep to confirm.
- **`router.refresh()` necessity** per call site — distinguishing "needs fresh RSC payload" vs "could be a cache invalidation" requires per-feature behavioral knowledge owned by R-state/R-data.
- **Whether `EstimateSheetContent` server-actions (`loadProjectComponentLibraryLite`, `fetchEstimateSheetVersionControl`) pull server-only code into the client graph** — server actions are stubbed on the client, but the surrounding model-building (`build-proposal-export-model`) is client-bundled; exact weight needs the analyzer.
- **`@firecms/neat` → three (38M install)**: confirmed dynamic-imported, but I could not confirm how much of three's runtime the neat chunk actually pulls (neat may import a three subset). Analyzer needed for the real landing-lazy-chunk size.
