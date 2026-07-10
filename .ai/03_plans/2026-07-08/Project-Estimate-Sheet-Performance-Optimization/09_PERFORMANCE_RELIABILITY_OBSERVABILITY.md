# 09 - Performance, Reliability, And Observability

> Supporting budget context. `IMPLEMENTATION_PLAN.md` and `20_PERFORMANCE_EVALUATOR_SPEC.md` are authoritative for metric methods, thresholds, sample counts, and artifact names.

## Performance Budgets

| Metric | Budget |
|---|---:|
| Mounted estimate row markers for 5,000 logical rows | <= 120 per active row-table window |
| Mounted branch markers for 1,500 logical nodes | <= 150 |
| jsdom keystroke average | <= 16 ms |
| jsdom keystroke worst case | <= 50 ms |
| Browser edit p95 | <= 75 ms |
| Browser search/facet p95 | <= 100 ms |
| Browser scroll p95 frame gap | <= 50 ms |
| Lab Event Timing interaction p75 (diagnostic proxy, not field INP) | <= 200 ms |
| LoAF/long-task maximum / over-50-ms count | <= 50 ms / 0 |
| Scalar-edit derived-state CPU p95 / full-tree recomputes | <= 25 ms / 0 |
| Scalar-mutation whole-tree snapshots | 0 |
| Project-component client fan-out at 1,000 matches | <= 75 ms p95 |
| Ancestor-chain lookup at the limit fixture | <= 5 ms p95 |
| Component identity lookup at exactly 1,000 matches | <= 5 ms p95 |
| Second/later independently owned complete tree bytes | 0 |
| Cold direct target estimate route median | <= 3,500 ms |
| Warm/hover target estimate route median | <= 500 ms |
| Sheet content visible after warm navigation | <= 1,000 ms |
| Parent fallback during target estimate transition | 0 runs |
| Sheet skeleton episodes | <= 1 per run |
| Route-context planned D1 queries | <= 4; any threshold change requires a new evidence-backed decision |
| Tab-tree planned D1 queries | <= 3 target |
| Row update planned D1 queries | <= 3 target |
| Hosted D1 read p95 per proof surface | <= 600 ms |
| Hosted D1 mutation p95 per proof surface | <= 500 ms |

## Legacy Phase 0 Baseline Artifacts

The list below is retained as naming history. In the 14-name stable inventory in `IMPLEMENTATION_PLAN.md`, the first 13 are index-owned current projections of immutable `evidence/runtime/runs/...` artifacts and the last is the current registry projected from an immutable snapshot. None is a direct producer destination.

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
- Test-only graph activation probes for deepest-path ancestor lookup, 1,000-match identity lookup, and independently owned complete-tree byte census.
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
- Ten repetitions are smoke evidence only.
- A <=2% observed failure-rate claim requires at least 100 independent repetitions.
- Do not mask flakes with sleeps or retries.
- Fix root causes: shared state, timers, uncontrolled network, fixture mutation, layout races.

## Observability Plan

Local:
- Use existing `bun run logs:debug` and `bun run logs:tail -- --error --last 20` when runtime errors appear.
- Use benchmark artifacts for local proof.

Hosted:
- Use direct Wrangler remote-D1 metrics/query-plan evidence for provider claims; this pack adds no proof endpoint or deploy.
- Use `bun run ops:check-observability-env` before hosted observability proof if that surface is touched later.
- Do not claim production readiness from local checks alone.

## Regression Policy

Every optimization phase must produce:
- Before metrics.
- After metrics.
- Delta table.
- Pass/fail against budget.
- Failure diagnosis for any missed budget; no strategy or prose exception can turn it green.
- Rollback path.

## Cloudflare Free-Tier Budget (Pass-3 addition)

AGENTS.md mandates staying on free-tier/bundled Cloudflare limits. Numbers below are baseline free-tier caps as commonly published by Cloudflare (verify current numbers at https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/d1/platform/limits/ before relying on them). Each row estimates per-action consumption for the estimate sheet and the projected MVP headroom.

The MVP projection assumes: 10 design-partner users × 50 actions/day = 500 actions/day; 5,000 rows × 1.5 D1 reads/action avg = ~7,500 D1 rows read/day from edit activity; route opens ~50/day × 5,000 rows read avg = ~250,000 rows read/day from routes. Both are well under free-tier caps but the D1 row-read projection needs Phase 0 confirmation.

| Resource | Free-tier cap (verify before rely) | Per-action estimate (estimate sheet) | Projected MVP/day | Headroom | Trigger for paid upgrade |
|---|---|---|---|---|---|
| Workers requests/day | 100,000 | 1 request/user action | ~500 | >99% | Sustained >60% for 7 days |
| Workers CPU time/request | 10ms (free) / 30s (paid) | <5ms typical | <5ms | High | p95 >8ms |
| Workers subrequests/request | 50 | <6 (route + subtree) | <6 | High | >25 |
| D1 rows read/day | 5,000,000 | Route: ~5,000; edit: ~50 | ~260,000 | ~95% | Sustained >50% for 7 days |
| D1 rows written/day | 100,000 | Edit: ~3; insert: ~10 | ~3,000 | ~97% | Sustained >50% for 7 days |
| D1 storage | 5 GB | ~500 bytes/row × 5,000 rows + overhead = ~3 MB/estimate | <1 GB | >80% | Sustained >50% |
| Durable Objects requests/day | 1,000,000 (paid) — free tier allows limited DO usage | Per collab session: ~100 | ~5,000 | Plenty | Sustained >40% |
| Queues operations/month | 100,000 | Per upload: ~5 | <500 | Plenty | — |
| R2 storage | 10 GB | Per upload: ~1 MB | <1 GB | >90% | — |
| R2 Class A operations/month | 1,000,000 | Per upload: ~5 | <500 | Plenty | — |
| R2 Class B operations/month | 10,000,000 | Per image load: ~1 | ~5,000 | Plenty | — |
| Cloudflare Images | 100,000 transformations/month (paid $5) — free tier: limited stored images | Per upload: 1 transformation | <100 | Plenty | — |
| Cloudflare Email | Free tier: limited | Per invite/share: 1 email | <50 | Plenty | — |
| Workers Logs | Free tier: 200k logs/day; paid: extended retention | Per route/action: ~10 logs | ~5,000 | Plenty | — |

**Action items**:
- Verify all numbers against https://developers.cloudflare.com/workers/platform/limits/, https://developers.cloudflare.com/d1/platform/limits/, https://developers.cloudflare.com/durable-objects/platform/limits/, https://developers.cloudflare.com/r2/platform/limits/, https://developers.cloudflare.com/queues/platform/limits/, https://developers.cloudflare.com/email-routing/ before Phase 6 hosted proof.
- Phase 0 D1 proof must capture actual rows_read/route to confirm the 5,000-row-read/route estimate.
- Add D1 rows-read/day telemetry to doc 13 operator checklist.
- If any projection crosses 50% headroom, escalate to owner before exceeding free-tier.

## Client Bundle And RSC Payload Budget (Pass-3 addition)

Industry standard: declare a First Load JS budget for the estimate sheet route and track it as a regression gate. Numbers below are baseline targets; Phase 0 route benchmark should capture current actual and Phase 2 should add the graph store cost.

| Budget | Target | Why | Measurement |
|---|---|---|---|
| First Load JS (estimate route) | ≤ 350 KB gzipped | Mobile/tablet friendly; web.dev LCP target | `bun run build` + bundle analyzer (e.g., `@next/bundle-analyzer`); capture in Phase 0 |
| First Load JS (landing route) | ≤ 200 KB gzipped | Landing is public-facing | Same |
| RSC payload size (stress fixture) | ≤ 500 KB | Avoid TTFB regression | Phase 0 route benchmark artifact |
| Per-keystroke JS work | ≤ 16 ms | REQ-P01 | Existing jsdom keystroke budget |
| Client graph store memory | ≤ 20 MB at 5,000 rows | Avoid mobile memory pressure | Phase 2 memory profile |

**Bundle regression gate**: add a `bun run perf:bundle-audit` script (or use existing `bun run build` analyzer) that fails CI if First Load JS for the estimate route exceeds budget by >5%. Pin the budget in repo config so it's not silently exceeded.

**Action items**:
- Use the existing bundle analyzer configuration in `next.config.ts`; add no dependency.
- Add bundle size artifact to Phase 0 evidence.
- Track First Load JS trend across phases in `evidence/bundle-trend.json`.

## Device And Network Throttling (Pass-3 addition)

Performance claims must be measured under realistic conditions, not just dev hardware.

| Profile | When | Why |
|---|---|---|
| Built OpenNext desktop, 1440x900/DPR 1, CPU 4x, 20 ms added latency, 10 Mbps down/5 Mbps up | Canonical budget profile for `UNIT-002`, `UNIT-008`, `UNIT-010` | Reproducible local browser budget |
| Mobile 390x844/DPR 1 | Functional/a11y only | Proves `DEC-AUTO-008` view-only mobile behavior; does not substitute for the budget profile |
| Tablet 1024x768/DPR 1 | Functional/a11y only | Proves tablet-editable scope |

The exact server, auth, cache, worker, retry, warmup, browser, and throttling protocol is mandatory in `IMPLEMENTATION_PLAN.md` and doc 20. Lab data is a proxy for field data; field data requires production deployment.
