# 10 - Blast Radius And Dependencies

## High-Risk Areas

### Route And Repository

Files:
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/subtree-actions.ts`

Risks:
- Authorization regression.
- Route not-found/selected-node behavior regression.
- D1 query regression.
- RSC payload shape changes.

### Client State

Files:
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-workspace-state.ts`

Risks:
- Dual-state divergence.
- Lost selection/active tab.
- Stale tree after mutation.
- Extra refetch churn.

### Rows And Derived Models

Files:
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`

Risks:
- Totals mismatch.
- Focus loss.
- Virtualization blank gaps.
- Selection bugs.
- Dirty state bugs.

### Mutations

Files:
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/lib/estimates/estimate-row-tree-move.ts`

Risks:
- Rollback corruption.
- Race under concurrent edits.
- Row order mismatch.
- Server revision conflict mishandling.

### Tests And Proof Scripts

Files:
- `tests/vitest/perf/*`
- `tests/vitest/estimate-*`
- `e2e/*`
- `scripts/measure-route-transitions.ts`
- `scripts/check-route-transition-readiness.ts`
- `scripts/generate-cloudflare-d1-performance-proof.ts`
- `src/lib/cloudflare/d1-performance-proof-router.ts`

Risks:
- Flaky perf assertions.
- Browser proof too slow for routine development.
- Provider proof leaks data if redaction is weak.

## Dependencies

Existing dependencies:
- Next.js 16.2.10.
- React 19.2.7.
- TanStack Query v5.
- TanStack Virtual v3.
- Zustand.
- Cloudflare D1.
- SQLite query planner semantics.
- Bun/Vitest/Playwright.
- React Doctor.

Dependency posture:
- No new dependency is planned.
- Use existing TanStack Virtual.
- Use existing Zustand or a sibling store module.
- Use existing proof-script patterns.
- Use existing D1 migration path only if D1 proof requires indexes.

## GitNexus / Graph Note

GitNexus reported a usable code graph for `archestimator`, but the index was four commits behind HEAD. This pack therefore uses graph evidence only as navigation and blast-radius support. Direct source reads are the final evidence for exact current state.

code-review-graph reported no registered repositories in this session. That is not a blocker because direct source inspection and GitNexus were available.

