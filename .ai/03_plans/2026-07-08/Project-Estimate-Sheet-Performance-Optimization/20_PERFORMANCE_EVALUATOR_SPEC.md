# 20 - Performance Evaluator Spec

## Purpose

Define the evaluator that future implementation must satisfy before claiming the estimate sheet is performant at MVP scale.

## Evaluator Inputs

- Target route URL:
  - `/workshop/projects/:projectId/estimates/:nodeId`
- Fixture tier:
  - small, medium, large, stress, limit, over-limit
- Auth mode:
  - local authenticated
  - hosted authenticated when env gates exist
- Feature flags:
  - graph store on/off
  - incremental totals on/off
  - selector search on/off
  - subtree dedupe on/off
  - entity patch mutations on/off

## Evaluator Outputs

Primary JSON:

```ts
type EstimateSheetPerformanceEvidence = {
  mode: "estimate-sheet-performance-evidence";
  createdAt: string;
  git: {
    branch: string;
    commit: string;
    dirty: boolean;
  };
  scenario: {
    fixtureTier: string;
    nodeCount: number;
    rowCount: number;
    route: string;
    featureFlags: Record<string, boolean>;
  };
  route: {
    coldMedianMs: number;
    warmMedianMs: number;
    skeletonEpisodes: number;
    parentFallbackEpisodes: number;
  };
  browser: {
    editP95Ms: number;
    scrollFrameGapP95Ms: number;
    searchP95Ms: number;
    expandP95Ms: number;
    longTaskCount: number;
    maxLongTaskMs: number;
  };
  dom: {
    mountedRowsMax: number;
    mountedBranchesMax: number;
    blankGapDetected: boolean;
    focusLost: boolean;
  };
  d1: {
    queries: Array<{
      name: string;
      rowsRead: number;
      rowsWritten: number;
      durationMs: number;
      planSummary: string;
      indexUsed: string | null;
    }>;
  };
  result: {
    passed: boolean;
    failedBudgets: string[];
    notes: string[];
  };
};
```

## Budget Evaluation

Pass requires:
- All required metric fields present.
- No unauthorized proof data.
- All route/browser/DOM/D1 budgets pass.
- No blank virtual gaps.
- No focus loss.
- D1 queries either use expected indexes or have documented acceptable plan.

## Required Scenarios

Scenario A - cold route:
- Navigate directly to target estimate route.
- Measure route shell, skeleton, sheet visible.

Scenario B - warm route:
- Hover/prefetch target estimate link.
- Click and measure transition.

Scenario C - edit:
- Edit a quantity in a visible row.
- Record input-to-paint, render counts, totals correctness.

Scenario D - scroll:
- Scroll top to bottom and back.
- Record frame gaps and mounted windows.

Scenario E - search/filter:
- Type search query.
- Toggle supplier/category/value filter.
- Record deferred render behavior and long tasks.

Scenario F - expansion:
- Expand deep and sibling branches rapidly.
- Record network requests and merge timing.

Scenario G - row move:
- Open move dialog for a row.
- Select target area and position.
- Confirm or cancel.
- Record option counts and interaction timing.

Scenario H - express editor:
- Activate express editor in a large table.
- Type and save/cancel.
- Record mounted DOM and focus.

Scenario I - unauthorized:
- Try cross-workspace/unauthorized IDs in proof harness.
- Confirm fail-closed.

## Artifact Naming

Use:
- `evidence/estimate-sheet-performance-evidence.json`
- `evidence/estimate-sheet-performance-evidence.md`
- `evidence/estimate-sheet-d1-performance-proof.json`
- `evidence/estimate-sheet-browser-profile.json`
- `evidence/estimate-route-benchmark.json`
- `evidence/estimate-route-readiness.json`

## Evaluator Implementation Notes

- Prefer existing `scripts/measure-route-transitions.ts` extension for route evidence.
- Prefer Playwright for browser interaction evidence.
- Prefer existing D1 proof script style for local/hosted D1 evidence.
- Keep fixture data deterministic.
- Use redacted identifiers in artifacts.
- Do not require hosted proof for local development loops, but do require it before hosted/provider readiness claims.

