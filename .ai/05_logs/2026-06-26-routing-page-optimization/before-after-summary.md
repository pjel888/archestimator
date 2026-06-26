# Routing Page Optimization Before/After Summary

Date: 2026-06-26

Scope: authenticated target estimate route transition evidence for the documented plan fixture, using sanitized local artifacts under `.ai/05_logs/2026-06-26-routing-page-optimization/`.

## Baseline

Source artifacts:
- `before-route-transition.json`
- `before-readiness.json`

Baseline readiness was red. Scenario medians were:

| Scenario | Baseline median |
|---|---:|
| Cold Direct Target Estimate | 5846 ms |
| Estimates to Target Estimate No Hover | 6363 ms |
| Estimates to Target Estimate Hover Prefetch | 5775 ms |
| Estimates to Target Estimate Warm Revisit | 7549 ms |

The baseline also showed ancestor fallback and overlay issues, and the warm revisit scenario was unstable.

## Final

Source artifacts:
- `after-p31-route-context-process-cache-existing-fixture-route-transition.json`
- `after-p31-route-context-process-cache-existing-fixture-readiness-final.json`

Final readiness is green: `routeTransitionReady: true`.

| Scenario | Final median | Required budget | Baseline delta |
|---|---:|---:|---:|
| Cold Direct Target Estimate | 2404 ms | 3500 ms | 58.9 percent faster |
| Estimates to Target Estimate No Hover | 365 ms | 1000 ms | 94.3 percent faster |
| Estimates to Target Estimate Hover Prefetch | 237 ms | 500 ms | 95.9 percent faster |
| Estimates to Target Estimate Warm Revisit | 349 ms | 500 ms | 95.4 percent faster |

Final fallback and overlay gates:
- Parent fallback count: 0 in all target scenarios.
- Overlay visibility rate: 0.
- Sheet skeleton episodes: max 1.
- Scenario coverage: 7 runs per authenticated target scenario, no skipped scenarios, no missing checks.

## Final Validation

Commands passed in the continuation verification pass:

```bash
bun run type-check
bunx vitest run tests/vitest/estimate-sheet-route-loading.test.ts tests/vitest/project-estimates-list-skeleton.test.tsx tests/vitest/navigation-ui-store.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
npx --yes react-doctor@latest --verbose --scope changed
ROUTE_TRANSITION_BENCHMARK_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/after-p31-route-context-process-cache-existing-fixture-route-transition.json ROUTE_TRANSITION_BASELINE_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-route-transition.json ROUTE_TRANSITION_REQUIRE_HERO=1 ROUTE_TRANSITION_MIN_RUNS=5 ROUTE_TRANSITION_WARM_MEDIAN_BUDGET_MS=500 ROUTE_TRANSITION_GENERAL_MEDIAN_BUDGET_MS=1000 ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN=0.30 ROUTE_TRANSITION_DIRECT_MEDIAN_BUDGET_MS=3500 ROUTE_TRANSITION_PARENT_FALLBACK_MAX=0 ROUTE_TRANSITION_SHEET_SKELETON_EPISODES_MAX=1 ROUTE_TRANSITION_OVERLAY_RATE_MAX=0.10 OUTPUT_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/after-p31-route-context-process-cache-existing-fixture-readiness-final.json bun run perf:check-routes
PLAYWRIGHT_PORT=3020 bun run test:e2e -- e2e/estimate-sheet-loading-performance.spec.ts
git diff --check
```

The Playwright proof passed 5 Chromium tests: authenticated sheet fallback shape, unauthenticated direct fail-closed, invalid project/estimate fail-closed, invalid storage-state direct fail-closed, and invalid storage-state prefetch-style route-data fail-closed.

## Caveats

This is local production-like evidence against `127.0.0.1:3020`; it does not claim hosted production proof. Raw browser traces, screenshots, auth-state files, credentials, and protected row data are not stored in this evidence folder.
