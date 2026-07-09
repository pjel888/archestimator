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

Each open decision is bounded with owner, trigger, and implementation impact so it can be resolved without blocking Phase 0 baseline work. None of these block Phase 0; all of them affect later architecture scope.

| ID | Decision | Owner | Trigger / Deadline | Implementation impact if unresolved |
|---|---|---|---|---|
| OPEN-01 | Should search cover only loaded branches, or full estimate including unloaded subtrees? | Product (Philip) | Phase 2 graph store design (selector `selectSearchMatches`) | If "loaded-only": Phase 2 ships behind `NEXT_PUBLIC_ESTIMATE_SELECTOR_SEARCH_ENABLED`. If "global": adds a new server action, a `search_estimate` RPC, a server-access predicate, and a Phase 7 server-assisted search track. Architecture, security review, and D1 cost budget differ materially. |
| OPEN-02 | Should move-position selection support exact arbitrary row placement in huge areas, or only top/bottom/near-visible/search-target placement? | Product (Philip) | Phase 3.3 facet/move indexes | If "arbitrary": `selectMovePositionOptions` must accept a numeric row index or label search and resolve it to a row id at granularity ≤ 1 row. If "semantic only": the searchable Combobox pattern in doc 05 is sufficient. UI work and accessibility pattern (combobox vs slider) differ. |
| OPEN-03 | Is 5,000 loaded rows the steady-state cap, or should the product target 10,000+ rows with server-side row windows? | Product (Philip) with Eng input | Phase 4 render boundary migration | If 5k cap stays: current `ESTIMATE_SHEET_TREE_LOAD_LIMITS` caps plus truncation UX are sufficient. If 10k+: Phase 4 must add cursor-paginated server row windows (`estimateQueryKeys.rowWindow`), server-side sort/filter, and a new DTO shape; non-trivial scope addition. |
| OPEN-04 | Should proposal preview always use full data even when the interactive sheet is truncated? | Product (Philip) | Phase 4.2 / export work | If yes: proposal preview/export must call a non-truncated server read path and document that materialization is outside the keystroke hot path. If no: proposal preview must surface the same truncation UX as the sheet. |
| OPEN-05 | Library-master edit from estimate sheet (GAP-02 in doc 22) — should users be able to edit the library master directly from a library-linked row? | Product (Philip) | Post-Phase 0.5, after MVP | If yes: new "Edit master" entry point in AddComponentModal edit mode that routes to `updateCostLibraryComponent`; new authz scope; new write-amplification budget. If no (current default): doc 22 stands. |
| OPEN-06 | Inline component addition UX (GAP-04) — should there be an explicit "Convert to Project Component" or "Link to Library Component" affordance? | Product (Philip) | Post-MVP UX polish | If yes: new modal entry points; new optimistic flow; new tests. If no: current multi-step flow (insert blank → inline edit → optional promote) stands. |

These do not block Phase 0 baseline. They affect later architecture scope.

