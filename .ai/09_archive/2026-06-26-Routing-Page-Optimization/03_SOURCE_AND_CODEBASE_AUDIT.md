# 03 - Source and Codebase Audit

## Route Stack

Target route:

`/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/estimates/8080f04c-fe18-4314-a1d8-9222e62d1eed`

Expected App Router chain:

1. `src/app/workshop/layout.tsx`
2. `src/app/workshop/projects/[projectId]/layout.tsx`
3. `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

No target-chain `template.tsx` was found.

## Current Loading Boundaries

| Path | Responsibility | Impact |
|---|---|---|
| `src/app/workshop/loading.tsx` | Workshop-level loading | Can appear for broad workshop segment loads |
| `src/app/workshop/projects/loading.tsx` | Projects collection loading | Should not be visible once user is navigating to a known sheet leaf |
| `src/app/workshop/projects/[projectId]/loading.tsx` | Project dashboard loading | Valid for project dashboard, wrong-shaped for estimate sheet |
| `src/app/workshop/projects/[projectId]/estimates/loading.tsx` | Estimate-list loading | Valid for estimates list, wrong-shaped for sheet |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` | Estimate sheet loading | Correct leaf fallback for target route |

## Key Source Findings

### `src/app/workshop/layout.tsx`

Responsibility:

- Authenticated workshop segment gate.
- Terms-acceptance redirect gate.
- Uses `headers()`, `getCurrentUserContext()`, and `getCurrentUserTermsAcceptanceStatus(userId)`.

Impact:

- This can block every `/workshop/*` route, but changing it is high risk.
- It should stay verification-only unless tracing proves it is the dominant source of ancestor fallback time.
- Specialist architecture review notes that `getCurrentUserTermsAcceptanceStatus()` is a separate Supabase read after identity is known. It is a real parent blocker, but it is also a security/product gate.

### `src/components/workshop/WorkshopPageShell.tsx`

Responsibility:

- Renders the main workshop chrome, sidebar, title header, and content slot.
- Reads `cookies()` for panel widths.
- Awaits `getCurrentUserContext()` and then `ensureDefaultWorkspace()`.
- Wraps `children` in `<Suspense fallback={<WorkshopShellContentFallback />}>`.

Impact:

- Shell-level fallback can produce a generic "Loading workspace" state.
- Because auth/workspace functions are request-cached, this is less likely than page/layout boundary sequencing, but it must be included in the skeleton timeline.

### `src/app/workshop/projects/[projectId]/layout.tsx`

Responsibility:

- Awaits `params`.
- Awaits `getCurrentWorkspaceProject(projectId)`.
- Builds project title and breadcrumbs.
- Renders `WorkshopPageShell`.
- Streams header chrome through `ProjectChromeAsync`.
- Wraps children in `<Suspense fallback={<ProjectRouteContentFallback />}>`.

Impact:

- This is a primary suspect. The layout awaits project data before returning the shell and uses a dashboard-shaped fallback for children.
- Future changes here affect dashboard, estimates list, charts/data, and every project child route.
- Feasibility constraint: the layout cannot both avoid awaiting `getCurrentWorkspaceProject()` and synchronously render the resolved project name/client/breadcrumbs. A future layout split needs a product decision between generic initial chrome and streamed title/header chrome.

### `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

Responsibility:

- Awaits `params` and `searchParams`.
- Runs `withPerfTraceRequest("workshop.estimate-sheet", Promise.all([...]))`.
- Awaits `resolveEstimateTabRouteContext(projectId, nodeId, limits)`.
- Awaits `requireCurrentUserContext()`.
- Returns `notFound()` if project or estimate is missing.
- Wraps `EstimateWorkspaceResolved` in `<Suspense fallback={<EstimateSheetRouteSkeleton />}>`.

Impact:

- The page performs its first heavy await before returning the leaf Suspense boundary. This can let parent fallback boundaries show first.
- Narrow recommended fix: return the leaf Suspense boundary immediately and move route-context/current-user work into an async child.
- Security constraint: `ProjectEstimateMetadataPublisher` and `EstimateWorkspaceClient` must only render after project and estimate are authorized and non-null.

### `src/lib/auth/session.ts`

Responsibility:

- `getCurrentUserContext` is wrapped in `React.cache`.
- `requireCurrentUserContext` redirects to `/login` if unauthenticated.

Impact:

- Request-level duplicate work is already deduped.
- Do not bypass this path.

### `src/lib/repositories/workspace-repository.ts`

Responsibility:

- `ensureDefaultWorkspace` is wrapped in `React.cache`.
- `getCurrentWorkspaceProject` is wrapped in `React.cache`.
- `resolveEstimateTabRouteContext` validates project and estimate/node relationship.

Impact:

- Caching already exists for duplicated request work.
- Optimization should not replace authorization/data-validation behavior with client assumptions.

Query hotspots to measure:

- `resolveEstimateTabRouteContext()` reads project, selected node, estimate/tab data, tree nodes, and row items.
- The tab-present path fetches a selected-node record, tab tree, and tab list. Query sharing may be possible but is a second-order optimization behind route-boundary proof.
- `buildEstimateTree` is bounded by load limits but may have sibling-group cost on large flat estimates; measure before changing.

### `src/components/ui/route-loading-overlay.tsx`

Responsibility:

- Renders `[data-route-overlay]` while `useNavigationUiStore().isNavigating`.
- Applies `aria-hidden` to main content.
- Uses a full-screen blur/spinner.

Impact:

- It can hide otherwise-correct leaf skeletons.
- Changes here are broad because `NavigationListener` shows the overlay for internal anchor clicks.

### `src/stores/navigation-ui-store.ts`

Responsibility:

- Shows overlay after `SHOW_DELAY_MS = 150`.
- Keeps it visible at least `MIN_VISIBLE_MS = 250`.
- Safety timeout is 10 seconds.

Impact:

- Good prior optimization exists, but this layer must be timed in benchmarks.

### `src/hooks/use-prefetch-on-hover.ts`

Responsibility:

- Debounced `router.prefetch(href)` after 150 ms hover/focus.
- Used by estimate-table open actions and other navigation.

Impact:

- Useful for warm paths.
- Benchmark must separate hover-prefetched and no-hover navigation.

### `src/components/workshop/project-estimates-table/ProjectEstimateOpenActionCell.tsx`

Responsibility:

- Opens estimate sheet links.
- Uses `prefetch={false}` with custom hover/focus prefetch.

Impact:

- Default Link prefetch is disabled here.
- Benchmark must prove custom prefetch is helping and not merely masking a cold boundary issue.

### Bundle and Hydration

Responsibility:

- `EstimateWorkspaceClient` eagerly imports `EstimateSheetContent` and `EstimateSheetTree`.
- Recent commit `a12488cf feat(estimate-sheet): add lazy subtree loading and tree realtime collaboration contract` added lazy subtree loading inside `EstimateWorkspaceResolved`. This interacts directly with the tail Suspense boundary that the leaf-page refactor depends on.

Impact:

- After server/RSC waits are reduced, first-load JS transfer and hydration may dominate. A reviewer observed stale local `.next` artifacts around 1.2 MiB uncompressed for the target entry; regenerate before treating that as current evidence.
- Lazy subtree loading may trigger the tail Suspense fallback after the base sheet content is already visible. If the tail fallback reuses `EstimateSheetRouteSkeleton`, this violates UX-03 ("No full-page skeleton after content"). P1-T2 must explicitly verify the lazy-subtree Suspense uses a local in-place fallback, not the full sheet skeleton.

### Next.js Instant Navigation Docs

Local docs inspected:

- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`

Impact:

- Next's draft instant-navigation guide says `unstable_instant` validates static-shell structure when Cache Components are enabled. This plan must not claim instant navigation without that separate framework validation path.

## Existing Performance Tooling

| File | Current Capability | Gap |
|---|---|---|
| `scripts/measure-route-transitions.ts` | Measures transition duration, overlay seen, RSC request count, final path | No skeleton attach/detach timeline |
| `scripts/check-route-transition-readiness.ts` | Scores benchmark JSON against loose budgets | No route-specific parent-fallback checks |
| `e2e/estimate-sheet-loading-performance.spec.ts` | Proves sheet skeleton appears and estimates-list skeleton does not for one delayed path | Does not record full ancestor cascade or timing |
| `src/lib/perf/server-timing.ts` | Emits `[perf-json]` when `PERF_TRACE=1` | Needs added spans if layout boundaries become suspect |
| `tests/vitest/estimate-sheet-route-loading.test.ts` | Static skeleton shape guard | Needs guard that page-level route context is inside leaf Suspense after refactor |

## Documentation Traced

| Document | Relevant Constraint |
|---|---|
| `AGENTS.md` | Planning-only, proportional verification, dirty worktree safety |
| `.ai/10_state/current-state.md` | Prior route transition, estimate list, and estimate sheet loading work |
| `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` | Required plan package shape and multi-agent review loop |
| `.ai/09_archive/2026-06-21-Estimate-Sheet-Loading-Performance/` | Historical implementation context; no provider/live timing claim |
| `.ai/09_archive/2026-06-14-Overall-Site-Performance-And-Optimization/` | Existing route-transition budget critique and benchmark protocols |

## External References

- React Suspense: `https://react.dev/reference/react/Suspense`
- React cache: `https://react.dev/reference/react/cache`
- React Server Components: `https://react.dev/reference/rsc/server-components`
- Next loading file convention: `https://nextjs.org/docs/app/api-reference/file-conventions/loading`
- Next streaming guide: `https://nextjs.org/docs/app/guides/streaming`
- Next prefetching guide: `https://nextjs.org/docs/app/guides/prefetching`
- Next caching guide: `https://nextjs.org/docs/app/getting-started/caching`
- web.dev Core Web Vitals: `https://web.dev/articles/vitals`
- web.dev SPA Web Vitals FAQ: `https://web.dev/articles/vitals-spa-faq`
