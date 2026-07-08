# 15 - Decisions, Assumptions, And Alternatives

## Decisions

### DEC-001 - Baseline Before Optimization

Decision: Phase 0 must create browser, D1, route, and DOM baselines before optimization code.

Rationale: The current sheet has multiple plausible bottlenecks. Guessing would risk optimizing the wrong layer.

Rejected: Start by refactoring `EstimateSheetContent` immediately. Reason: it may improve code shape but does not prove the primary bottleneck.

### DEC-002 - Normalized Graph As Target State

Decision: Use a staged normalized graph read model as the target architecture.

Rationale: Current hot paths scale with nested tree size. A graph enables O(affected ancestors) edits and visible-window rendering.

Rejected: Add broad `useMemo`/`memo` wrappers around existing nested tree. Reason: memoization does not remove whole-tree derivation.

### DEC-003 - TanStack Query Remains Transport Cache

Decision: Keep TanStack Query for server-state payloads and freshness. Do not make it the interactive graph mutation store.

Rationale: Query caching, invalidation, and structural sharing remain useful, but hot editing needs local entity-level selectors and inverse patches.

Rejected: Store every per-cell edit directly in query cache. Reason: query cache invalidation is too coarse for high-frequency editing.

### DEC-004 - No New Dependencies

Decision: Use existing TanStack Virtual, TanStack Query, Zustand, Vitest, Playwright, and D1 proof patterns.

Rationale: The current stack already has the required tools.

Rejected: Add a new grid/data-table engine. Reason: too disruptive and unnecessary before current primitives are proven insufficient.

### DEC-005 - D1 Indexes Must Be Proven

Decision: Candidate indexes require query-plan and row-read proof before migration.

Rationale: Cloudflare D1/SQLite performance depends on exact query shape and index prefix use.

Rejected: Add broad composite indexes immediately. Reason: write cost and free-tier posture matter.

### DEC-006 - Preserve UX First

Decision: Keep current UI behavior and component boundaries initially.

Rationale: Estimate sheet is mission-critical. Staged internals reduce regression risk.

Rejected: Big-bang visual/interaction redesign. Reason: not requested and would hide performance regression sources.

## Assumptions

- The target MVP scale is at least current caps: 1,500 nodes and 5,000 loaded rows.
- The active estimate route remains protected/authenticated.
- Cloudflare D1 remains the active database provider.
- Users value edit responsiveness and correctness over immediate global search across unloaded subtrees.
- Feature flags are acceptable for staged rollout.
- Existing route/profile scripts can be extended rather than replaced.

## Open Product Decisions

- Should search cover only loaded branches, or should it search the full estimate including unloaded subtrees?
- Should move-position selection support exact arbitrary row placement in huge areas, or only top/bottom/near-visible-row/search-target placement?
- Is 5,000 loaded rows the intended steady-state cap, or should the product target 10,000+ rows with server-side row windows?
- Should proposal preview always use full data even when the interactive sheet is truncated?

These do not block Phase 0 baseline. They do affect later architecture scope.

