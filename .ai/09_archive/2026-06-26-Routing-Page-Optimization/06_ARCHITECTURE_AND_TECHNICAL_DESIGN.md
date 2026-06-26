# 06 - Architecture and Technical Design

## Current Architecture

```mermaid
flowchart TD
  A[/workshop layout/] --> B[Auth and terms gate]
  B --> C[/projects/[projectId] layout/]
  C --> D[getCurrentWorkspaceProject]
  D --> E[WorkshopPageShell]
  E --> F[Suspense: ProjectRouteContentFallback]
  F --> G[/estimates/[nodeId] page/]
  G --> H[resolveEstimateTabRouteContext + requireCurrentUserContext]
  H --> I[Suspense: EstimateSheetRouteSkeleton]
  I --> J[EstimateWorkspaceResolved tail]
```

Problem:

The page-level route-context await happens before the leaf `EstimateSheetRouteSkeleton` boundary is returned. If that await suspends during navigation, the parent project layout fallback can render first.

## Target Architecture

```mermaid
flowchart TD
  A[/workshop layout/] --> B[Auth and terms gate]
  B --> C[/projects/[projectId] layout/]
  C --> D[Project shell and chrome]
  D --> E[Suspense: ProjectRouteContentFallback]
  E --> F[/estimates/[nodeId] page returns immediately/]
  F --> G[Suspense: EstimateSheetRouteSkeleton]
  G --> H[Async EstimateRouteContent]
  H --> I[resolveEstimateTabRouteContext + requireCurrentUserContext]
  I --> J[EstimateWorkspaceResolved]
  J --> K[Local tail fallback if needed]
```

Primary target:

- The leaf page should return a leaf Suspense boundary before route-context work suspends.
- Route-context and current-user reads stay server-side and fail-closed.
- The result should be described as faster and correctly shaped, not "instant", unless Next's `unstable_instant` validation path is separately adopted.

## Proposed Narrow Refactor

### Before

`ProjectEstimateNodePage` is async and awaits route-context before returning JSX.

### After

`ProjectEstimateNodePage` returns:

- A leaf Suspense fallback immediately.
- An async server child that awaits `params`, `searchParams`, `resolveEstimateTabRouteContext`, and `requireCurrentUserContext`.

The exact implementation should preserve existing smoke behavior:

- `assertRouteErrorSmoke(searchParams)` still runs.
- `notFound()` still runs after project/estimate validation.
- `withPerfTraceRequest("workshop.estimate-sheet", ...)` remains around route-context and current-user work.
- `ProjectEstimateMetadataPublisher` and `EstimateWorkspaceClient` render only after route context proves `project` and `estimate`.
- `EstimateWorkspaceResolved` remains the owner of tail work unless Phase 0 shows it causes a second full-page fallback.
- **Tail Suspense + lazy subtree interaction:** commit `a12488cf` added lazy subtree loading inside `EstimateWorkspaceResolved`. The tail Suspense fallback must remain a local affordance (not `EstimateSheetRouteSkeleton`) so lazy-loaded subtree Suspense episodes do not replay the full sheet skeleton. See UX-03 and the new R-19 risk.
- **Async child navId cancellation:** the async child must respect navigation identity; a late-resolving async child whose navigation was superseded must be discarded. See the new R-16 risk and P1-T1 instructions.
- **React.cache lifetime across boundary:** verify that request-scoped caches (`getCurrentUserContext`, `ensureDefaultWorkspace`, `getCurrentWorkspaceProject`, `resolveEstimateTabRouteContext`) behave identically across the new async-child Suspense subtree as they did in the prior top-level await form.

## Project Layout Strategy

Do not edit `src/app/workshop/projects/[projectId]/layout.tsx` in the first implementation slice unless benchmark evidence proves it is necessary after the leaf-page refactor.

If needed, the safer direction is:

- Keep generic project shell content renderable without blocking on non-critical project metadata.
- Move project-specific title/header chrome into async child components with local fallbacks.
- Preserve project access checks in pages/repositories before rendering project-specific content.
- Accept that this means generic initial project chrome or a streamed title. There is no safe way to both skip the await and synchronously show the real project name.

Avoid:

- Removing authorization checks from server paths.
- Rendering project name/client data before validation.
- Replacing project layout fallback with sheet-specific logic that breaks dashboard/data/charts routes.

## Overlay Strategy

Treat overlay changes as a separate evidence-gated slice.

Possible options:

1. Keep overlay unchanged if leaf fallback sequencing fixes the observed cascade.
2. Bound overlay for estimate sheet transitions so it never outlives the sheet skeleton.
3. Disable overlay for transitions where route-specific skeletons are known and sufficient.

Recommended starting option: keep overlay unchanged for the first code slice and measure it.

## Cache Strategy

Current cache facts:

- `getCurrentUserContext` uses `React.cache`.
- `ensureDefaultWorkspace` uses `React.cache`.
- `getCurrentWorkspaceProject` uses `React.cache`.
- `next.config.ts` sets `experimental.staleTimes.dynamic = 60` and `static = 180`.
- `cacheComponents` is not enabled.

Implication:

The plan should not assume missing request-level caching is the main issue. Focus on boundary placement and measurement first.

Disallowed without a separate security design:

- `unstable_cache` for protected project/estimate payloads.
- Static route caching for user-specific project/estimate data.
- Module-global caches keyed only by project ID or estimate ID.
- Service-role reads for route prefetch.
- Cross-user TanStack hydration for protected data.

## Prefetch Strategy

Current estimate open links use:

- `prefetch={false}`
- custom `usePrefetchOnHover`
- debounced `router.prefetch(href)` after 150 ms

Plan:

- Keep custom prefetch during the first benchmark.
- Measure hover-prefetched and no-hover variants separately.
- Only modify prefetch behavior if measured hover prefetch is absent, ineffective, or causing extra RSC churn.

## Query Sharing Strategy

If `estimate-sheet.route-context` remains above budget after boundary fixes:

- Measure selected-node, tab lookup, tab list, node read, and row-item read timings separately.
- Consider passing already-resolved tab data through the tree helper to avoid duplicate tab-row resolution.
- Do not broaden legacy-schema fallback branches to hide real errors.
- Do not move edit capability or data authorization checks to the client.

## Technical Alternatives

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Move leaf page awaits into async child behind leaf Suspense | Narrow, directly matches React/Next Suspense guidance | Requires careful static tests | Recommended first |
| Change project layout fallback by child route | Can remove dashboard-shaped fallback for known leaves | Higher blast radius across project subroutes | Evidence-gated |
| Disable global overlay for sheet routes | Removes spinner/blur masking | Cross-app navigation behavior risk | Evidence-gated |
| Enable `cacheComponents` / PPR | Aligns with Next 16 static shell model | Repo-wide behavior change | Out of scope |
| Add DB/RPC/index optimization | Can improve real latency if data-bound | Not indicated without traces | Evidence-gated after Phase 0 |
