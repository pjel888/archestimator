# 09 - Performance, Reliability, And Observability

## Performance Budgets

| Metric | Budget |
|---|---:|
| Mounted estimate row markers for 5,000 logical rows | <= 120 per active row-table window |
| Mounted branch markers for 1,500 logical nodes | <= 150 |
| jsdom keystroke average | <= 16 ms |
| jsdom keystroke worst case | <= 50 ms |
| Browser edit p95 | <= 75 ms |
| Browser scroll p95 frame gap | <= 50 ms |
| Browser INP-style interaction p75 | <= 200 ms |
| Cold direct target estimate route median | <= 3,500 ms |
| Warm/hover target estimate route median | <= 500 ms |
| Sheet content visible after warm navigation | <= 1,000 ms |
| Parent fallback during target estimate transition | 0 runs |
| Sheet skeleton episodes | <= 1 per run |
| Route-context planned D1 queries | <= 4 target, documented exceptions allowed |
| Tab-tree planned D1 queries | <= 3 target |
| Row update planned D1 queries | <= 3 target |
| Hosted D1 read p95 per proof surface | <= 600 ms |
| Hosted D1 mutation p95 per proof surface | <= 500 ms |

## Phase 0 Baseline Artifacts

Required files:
- `evidence/estimate-route-benchmark.json`
- `evidence/estimate-route-readiness.json`
- `evidence/estimate-sheet-browser-profile.json`
- `evidence/estimate-sheet-dom-profile.json`
- `evidence/estimate-sheet-d1-performance-proof.json`
- `evidence/estimate-sheet-d1-performance-proof.md`
- `evidence/hosted-estimate-sheet-d1-proof.json` when hosted env gates are available

## Instrumentation Plan

Add or extend:
- React Profiler wrappers around tree, sheet content, branch list, and row table in test-only/perf mode.
- Existing render probes for row/table/branch/total recompute counts.
- Route transition benchmark for exact target estimate URL.
- Browser performance marks:
  - route start
  - skeleton visible
  - sheet visible
  - tree hydrated
  - first row table mounted
  - edit input start/end
  - search input start/result paint
  - expand click/subtree merged
  - virtualizer mounted count
- D1 proof metrics:
  - query name
  - SQL shape hash
  - rows read
  - rows written
  - duration
  - query plan summary
  - index used or not used

## Reliability Plan

- Perf tests remain serial with `--maxWorkers=1` where render-count semantics matter.
- Minimum N=5 for smoke stability.
- Minimum N=10 for formal flake-rate evidence.
- File-level flake budget: <= 2% over 10 runs.
- Do not mask flakes with sleeps or retries.
- Fix root causes: shared state, timers, uncontrolled network, fixture mutation, layout races.

## Observability Plan

Local:
- Use existing `bun run logs:debug` and `bun run logs:tail -- --error --last 20` when runtime errors appear.
- Use benchmark artifacts for local proof.

Hosted:
- Use Workers logs or hosted proof endpoint for provider claims.
- Use `bun run ops:check-observability-env` before hosted observability proof if that surface is touched later.
- Do not claim production readiness from local checks alone.

## Regression Policy

Every optimization phase must produce:
- Before metrics.
- After metrics.
- Delta table.
- Pass/fail against budget.
- Explanation for any budget exception.
- Rollback path.

