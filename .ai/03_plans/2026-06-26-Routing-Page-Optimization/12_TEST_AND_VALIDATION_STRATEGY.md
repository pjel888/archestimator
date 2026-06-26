# 12 - Test and Validation Strategy

## Validation Ladder

1. Static source guards.
2. DOM/component skeleton guards.
3. Targeted E2E timeline.
4. Route-transition benchmark readiness.
5. Server timing and bundle analysis.
6. Broader E2E only if shared layout or overlay changes occur.

## Static Tests

Update `tests/vitest/estimate-sheet-route-loading.test.ts`:

- Assert leaf `loading.tsx` imports `EstimateSheetRouteSkeleton`.
- Assert it does not import parent skeletons.
- Assert `ProjectEstimateNodePage` returns a leaf Suspense fallback before route-context await.
- Assert `resolveEstimateTabRouteContext` remains server-side and is not moved to a client component.
- Assert `ProjectEstimateMetadataPublisher` and `EstimateWorkspaceClient` remain after `notFound()`/authorized project and estimate validation.
- Assert no protected route data uses static or user-agnostic cache APIs in the changed files.

## DOM Tests

Keep/extend:

- `tests/vitest/project-estimates-list-skeleton.test.tsx`
- `tests/vitest/project-dashboard-route-shell-ui.test.ts`
- `tests/vitest/navigation-ui-store.test.ts` if overlay timing changes.

Assertions:

- One status role per skeleton root.
- Accessible loading name.
- `aria-busy="true"`.
- Decorative skeleton blocks hidden.
- Sheet skeleton preserves tree/content/library panes and width contracts.

## E2E Tests

Extend `e2e/estimate-sheet-loading-performance.spec.ts`:

- Replace current boolean proof with timeline proof.
- Observe parent and leaf selectors.
- Delay the target RSC request.
- Optionally delay tail spans if supported.
- Verify shell remains mounted.
- Verify no parent fallback episodes.
- Verify overlay timing and hide.

Required scenario variants:

- Direct cold target URL.
- Estimates list to target estimate with no hover prefetch.
- Estimates list to target estimate with hover/focus prefetch.
- Warm revisit/back-forward.
- Invalid/missing estimate.
- Unauthenticated direct target load.
- Unauthorized direct target load with a storage state that lacks access to the project/estimate.
- Unauthorized hover/focus prefetch attempt from a page containing an inaccessible or stale target link, if such a fixture can be constructed safely.
- Query-only or same-path changes if the route overlay is changed.

Negative-auth acceptance:

- No `[data-estimate-center-column='sheet']` appears for unauthenticated or unauthorized users.
- No project title, estimate name, client/proposal data, or row content appears before redirect/notFound/error handling.
- No benchmark log or trace summary contains cookies, tokens, emails, row contents, or proposal/client data.

## Benchmark Tests

Extend `scripts/measure-route-transitions.ts` and `scripts/check-route-transition-readiness.ts`.

Expected JSON additions:

```json
{
  "skeletonTimeline": [
    {
      "selector": "[data-testid='estimate-sheet-route-skeleton']",
      "attachedAtMs": 124,
      "hiddenAtMs": 980,
      "durationMs": 856,
      "episodes": 1
    }
  ],
  "parentFallbackSeen": false,
  "sheetSkeletonEpisodes": 1,
  "overlayDurationMs": 0,
  "sheetContentVisibleAtMs": 1120
}
```

Readiness checker must fail on:

- Parent fallback seen.
- Sheet skeleton episodes greater than 1.
- Overlay duration over budget.
- Missing target hero scenario.
- Fewer than 5 runs.
- Median duration over target without improvement.
- Missing baseline file when the after-readiness command needs the no-hover/general relative-improvement fallback.

Required route-specific targets:

- Warm/prefetched scenario p50 <= 500 ms; <= 250 ms is the stretch pass.
- No-hover/general scenario p50 <= 1000 ms or >= 30 percent faster than enhanced baseline, enforced by `ROUTE_TRANSITION_BASELINE_FILE` plus `ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN=0.30`.
- Direct cold target median <= 3500 ms in local production-like mode.
- Parent fallback episode count 0.
- Sheet full-page skeleton episodes <= 1.
- Overlay visible on warm/prefetched transition <= 10 percent of runs and 0 percent as the stretch pass.

## React and Next Quality Gates

After React code changes:

```bash
npx react-doctor@latest --verbose --scope changed
```

React/Next best-practice review:

- No server-only imports in client components.
- No client-side auth shortcuts.
- No uncached promise recreated in render loops.
- No unnecessary state/effect for server data.
- Use Suspense boundaries at meaningful UX granularity.
- Do not claim or configure instant navigation unless Cache Components / `unstable_instant` validation is explicitly in scope.

## Browser Proof Requirement

Browser automation is not needed for this docs-only planning pass. It is required for future implementation completion because static tests cannot prove:

- Actual skeleton attach/detach order.
- Overlay masking behavior.
- RSC request timing.
- Real route transition duration.
- Browser back/forward overlay recovery.

Raw browser screenshots and trace archives may capture protected route data. Use synthetic fixtures when possible. If real data must be used, keep raw artifacts under ignored `.ai/99_scratch/2026-06-26-routing-page-optimization/...` and commit only sanitized JSON/log/summary evidence under `.ai/05_logs/...`.

## Validation Gaps to Report Honestly

- Local dev timings include compile noise.
- Local production timings do not prove Vercel preview or production.
- Supabase latency varies by environment.
- Browser cache can hide cold-load problems.
- Existing `e2e/route-transition-performance-budgets.json` values are loose smoke budgets, not readiness targets.
