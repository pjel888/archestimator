# 15 - Decisions, Assumptions, and Alternatives

## Decisions

### D-01 - Baseline Before Implementation

Decision: future implementation must capture benchmark evidence before route code edits.

Reason: the user asked for before/after measurements, and prior archive notes explicitly avoided claiming provider/live latency wins without timing evidence.

Rejected alternative: implement the obvious Suspense refactor first and measure after. Rejected because it destroys a trustworthy baseline.

### D-02 - First Code Slice is Leaf Boundary Sequencing

Decision: first implementation slice should move route-context work behind the leaf sheet Suspense boundary.

Reason: this is the narrowest code path matching the symptom and official React/Next guidance.

Rejected alternative: rewrite shared project layout first. Rejected because it affects every project child route.

### D-03 - PPR and `cacheComponents` Are Out of Scope

Decision: do not enable `cacheComponents` or migrate to PPR in this plan.

Reason: Next 16 docs recommend Cache Components for static shell plus streamed dynamic content, but enabling it is repo-wide and high blast radius.

Rejected alternative: use this task to adopt PPR. Rejected because the current symptom can likely be addressed with existing Suspense boundaries.

### D-04 - Overlay Work is Evidence-Gated

Decision: do not change `RouteLoadingOverlay` until a benchmark proves it masks or outlives the leaf loading state.

Reason: the overlay applies to all internal links through `NavigationListener` and `useNavigationRouter`.

Rejected alternative: disable overlay for all workshop routes. Rejected due cross-route risk.

### D-05 - Prefetch Must Be Measured Separately

Decision: report hover-prefetched and no-hover path separately.

Reason: the estimate open action disables default `Link` prefetch and relies on custom hover/focus prefetch.

Rejected alternative: use only the fastest observed path. Rejected because it hides cold/warm regressions.

### D-06 - No Static or Cross-User Cache for Protected Route Data

Decision: protected project and estimate route data remains request-scoped or explicitly keyed by user, workspace, project, and estimate in a separate approved design.

Reason: the route contains tenant-sensitive project, estimate, client, cost, publication, collaborator, and edit-capability data.

Rejected alternative: add `unstable_cache` or module-global caches for route-context/project lookups. Rejected because keying and invalidation are security-sensitive and not required for the first slice.

### D-07 - Do Not Claim Instant Navigation

Decision: this plan targets faster and correctly shaped navigation, not framework-certified instant navigation.

Reason: local Next 16 docs tie instant-navigation validation to Cache Components and `unstable_instant`, which are out of scope.

Rejected alternative: add `unstable_instant` now. Rejected because it implies a broader Cache Components/PPR adoption path.

## Assumptions

| ID | Assumption | Evidence | Validation |
|---|---|---|---|
| A-01 | Supplied IDs are valid in the user's local/dev data | User provided a concrete working URL | Phase 0 route load |
| A-02 | Remaining issue is fallback cascade, not only slow data | User described multiple skeletons; source has parent fallbacks | Skeleton timeline |
| A-03 | Request-level caching is not the missing primary optimization | `getCurrentUserContext`, `ensureDefaultWorkspace`, `getCurrentWorkspaceProject` use `React.cache` | PERF_TRACE |
| A-04 | Browser proof is required for final claim | Static tests cannot observe visible fallback sequence | E2E timeline |
| A-05 | Local production-like build is sufficient for implementation gate | User referenced localhost route | Optional preview run before release |
| A-06 | Project layout title streaming is acceptable only with product review | It may briefly show generic chrome | Product/UX review before layout slice |

## Alternatives

| Alternative | Advantages | Disadvantages | Decision |
|---|---|---|---|
| Leaf async child behind Suspense | Narrow, direct, testable | Does not solve layout-level suspension if that dominates | Recommended |
| Route-specific parent fallback mapping | Can make project layout use sheet/list-specific fallbacks | Coupled to child route knowledge, broad tests needed | Reserve |
| Generic project fallback replacement | Reduces wrong-shape fallback | May harm dashboard loading fidelity | Reserve |
| Overlay suppression for sheet routes | Removes spinner/blur conflict | Could create inconsistent navigation feedback | Evidence-gated |
| Wider server data optimization | Improves actual content readiness if data-bound | Requires DB/provider analysis | Evidence-gated |
| PPR/cacheComponents migration | Long-term static shell benefits | Repo-wide behavior change | Separate plan |
