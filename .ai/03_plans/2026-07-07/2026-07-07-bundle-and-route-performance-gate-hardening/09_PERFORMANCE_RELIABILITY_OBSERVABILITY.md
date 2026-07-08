# Performance, Reliability, and Observability

This is the core gate-performance document. It defines the **layered gate posture**, the **evaluator contract per gate**, **budgets (current + proposed)**, **flake policy**, **observability signals**, and **failure/degraded behavior**.

## 1. Layered gate posture (DEC-01)

| Layer | Gate | Evaluator (command) | Trigger | Current posture | Proposed posture | Flake policy | Evidence artifact |
|---|---|---|---|---|---|---|---|
| L1 — per-PR (fast) | Bundle size | `bun run build` then `bun run scripts/check-performance-budgets.mjs` | Every PR/push to main/`feat/**` | Advisory; single 350 KB global; `continue-on-error: true` | Advisory → **blocking after window**; per-route budgets + global backstop (PERF-02) | Partial-read handling; strict fails on unreadable chunk | `.next/diagnostics/route-bundle-stats.json`; CI log |
| L1 — per-PR (fast) | Route-transition smoke (Tier-A) | `bun run test:e2e:perf` → `e2e/route-transition-performance.spec.ts` | Every PR/push | **Blocking**; loose Tier-A budgets; authed scenarios skipped | Keep blocking; **Tier-A values stay loose** (catch-catastrophic); reconcile source-of-truth (PERF-03) | Median-of-N where applicable; Playwright retry | Playwright attachments (`*.json`) |
| L2 — pre-merge / on-demand (slow) | Route-transition deep (Tier-B) | `bun run perf:measure-routes` then `bun run perf:check-routes` | On-demand / pre-merge for perf-touching PRs | Not in CI; exists | Optional CI job (manual dispatch / label) or required-for-perf-label; authed scenarios via OPEN-PERF-02 | median-of-N ≥ 3 runs; `ROUTE_TRANSITION_MIN_RUNS`; improvement-rate fallback vs baseline | Benchmark JSON + readiness JSON |
| L3 — pre-release / scheduled (slow, hosted) | Hosted p95 | `bun run cf:verify-hosted-performance` | Pre-release / scheduled / on-demand | Operator-run; not a launch blocker | Pre-release **advisory → blocking on owner decision** (OPEN-PERF-03); stays out of per-PR CI | ≥ 20 runs nearest-rank p95; `MIN_P95_RUNS`; route-contract gate is the hard gate | JSON + Markdown in evidence folder |

**No-slowdown guardrail (REL-01):** L1 is the only layer on the per-PR critical path. L1 increment target: keep `test:e2e:perf` wall-clock within current bounds (it already runs); the bundle gate runs against an already-produced build artifact (effectively free). L2 and L3 are opt-in/pre-release.

## 2. Performance evaluator contracts (performance-goal style)

### Evaluator E1 — Bundle size
| Field | Value |
|---|---|
| Baseline metric | gzipped first-load JS KB per route, from Phase-0 capture |
| Target metric | Per-route budget gz KB (PERF-02 table below) + global backstop |
| Measurement command | `bun run build && bun run scripts/check-performance-budgets.mjs` |
| Dataset/fixture | Production build on `ubuntu-24.04` CI runner |
| Runs / flake | Deterministic (build artifact); partial-read handling in strict mode |
| Regression threshold | Any route > per-route budget OR any route > global backstop (in strict mode) |
| Related functional tests | None (static) |
| Evidence artifact | `.next/diagnostics/route-bundle-stats.json` + script stdout |

### Evaluator E2 — Route-transition (Tier-A CI smoke)
| Field | Value |
|---|---|
| Baseline metric | Median navigation/transition ms; resource/script/nextAsset counts; overlay count |
| Target metric | Tier-A budgets in reconciled source-of-truth (PERF-03 table) |
| Measurement command | `bun run test:e2e:perf` |
| Dataset/fixture | Public + redirect routes (authed skipped in CI today) |
| Runs / flake | Spec-internal repeats (e.g. 3–5 runs for median); Playwright defaults |
| Regression threshold | Median > Tier-A budget; overlay count ≠ budget; resource/script/nextAsset > budget |
| Related functional tests | `route-transition-performance.spec.ts` |
| Evidence artifact | Playwright attachments |

### Evaluator E3 — Route-transition (Tier-B deep)
| Field | Value |
|---|---|
| Baseline metric | Per-scenario median ms; overlay duration; parent-fallback count; sheet-skeleton episodes; sheet-content-visible ms; RSC request count |
| Target metric | Tier-B budgets (PERF-03 table) |
| Measurement command | `bun run perf:measure-routes` (+ `BASE_URL`, auth env) then `bun run perf:check-routes` |
| Dataset/fixture | Seeded perf fixture (`perf:seed-fixture`); dev-auth bypass (localhost) or storage-state |
| Runs / flake | `RUNS=3` default; `ROUTE_TRANSITION_MIN_RUNS=3`; median; improvement-rate fallback vs baseline file |
| Regression threshold | Scenario median > Tier-B budget AND max > budget; timeline thresholds (parent-fallback 0, sheet-skeleton ≤1, overlay ≤200 ms, sheet-content-visible ≤ budget) |
| Related functional tests | `tests/vitest/route-transition-peak-load-profile.test.tsx` (`perf:profile-peak-load`) |
| Evidence artifact | Benchmark JSON (OUTPUT_FILE) + readiness JSON |

### Evaluator E4 — Hosted p95
| Field | Value |
|---|---|
| Baseline metric | TTFB p95 per probe (nearest-rank) |
| Target metric | `HOSTED_ROUTE_BUDGETS` (PERF-06 table) |
| Measurement command | `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=… bun run cf:verify-hosted-performance` |
| Dataset/fixture | Credential-free probes; fake token; ≥ 20 runs + warmup |
| Runs / flake | `MIN_P95_RUNS=20`; `MAX_RUNS=30`; nearest-rank p95; route-contract gate hard, p95 budget watch-grade unless owner promotes |
| Regression threshold | Required-probe contract fail (hard); p95 > budget (watch → blocking on owner decision) |
| Related functional tests | None (hosted) |
| Evidence artifact | JSON + Markdown report; workbook aggregates `hostedPerformanceReady` |

## 3. Budgets — current vs proposed

### 3a. Bundle (PERF-02) — per-route proposed values are Phase-0-derived

The diagnostics file lists every route. **Proposed per-route budgets must be derived from Phase-0 baselines**, not guessed. The rule for setting a per-route budget:

```
proposed_budget_route = ceil((baseline_gz_kb × (1 + headroom)) / 10) × 10
global_backstop       = max(350, p90_of_all_routes × 1.1)   # never tighter than today's 350 unless owner decides
```

Recommended headroom: **15%** (allows small growth without noise; catches real regressions). The global backstop stays at ≥ 350 KB to avoid tightening the floor unexpectedly. **Final values are owner-approved after Phase-0** (OPEN-PERF-01). Routes likely to need their own (lower or higher) budgets based on the audit: `/login`, `/`, `/pricing`, `/features` (light public); `/workshop/projects/[id]/estimates/[nodeId]` (heaviest — estimate sheet chunks per sibling plan).

**Deep-dive tool:** `ANALYZE=true bun run build` (`@next/bundle-analyzer`, `next.config.ts:292`) for client/server bundle tree when a route is over budget.

### 3b. Route-transition (PERF-03) — reconciled source of truth

| Tier | Consumer | Scenarios | Current value | Proposed posture |
|---|---|---|---|---|
| Tier-A | CI smoke (`route-transition-performance.spec.ts`) | publicRoute nav | 15 000 ms | **Keep loose** (catch-catastrophic); optionally lower to 6 000 ms after Phase-0 proves CI variance |
| Tier-A | CI smoke | publicRouteTransition median | 15 000 ms | Keep; optionally 5 000 ms after baseline |
| Tier-A | CI smoke | slow3gPublicRoute nav | 30 000 ms | Keep; reflects Slow 3G ceiling |
| Tier-A | CI smoke | slow3gPublicRouteTransition median | 30 000 ms | Keep |
| Tier-A | CI smoke | protectedRedirect nav | 15 000 ms | Keep |
| Tier-A | CI smoke | bfcache restore | 1 500 ms | Keep (tight already) |
| Tier-A | CI smoke | authenticatedWorkshopTransition | 10 000 ms | Keep in Tier-A; **Tier-B owns the tight authed budget** |
| Tier-A | CI smoke | resourceCount/scriptCount/nextAssetCount | 250/120/160 | Keep as ceilings; tighten after Phase-0 if baseline shows headroom |
| Tier-B | Deep harness (`check-route-transition-readiness.ts`) | public median | 15 000 ms | **5 000 ms** proposed (regression-catching) |
| Tier-B | Deep | slow3g public median | 30 000 ms | **12 000 ms** proposed |
| Tier-B | Deep | authenticated median | 10 000 ms | **4 000 ms** proposed |
| Tier-B | Deep | target direct (cold) | 3 500 ms | Keep (tight already) |
| Tier-B | Deep | target general | 1 000 ms | Keep (tight already) |
| Tier-B | Deep | target warm | 500 ms | Keep (tight already) |
| Tier-B | Deep | overlay duration max | 200 ms | Keep |
| Tier-B | Deep | sheet-content-visible | 1 000 ms | Keep |
| Tier-B | Deep | parent-fallback max | 0 | Keep |
| Tier-B | Deep | sheet-skeleton episodes max | 1 | Keep |
| Tier-B | Deep | overlay visibility rate max | 1 | Keep (≤ 1.0) |
| Tier-B | Deep | general improvement min | 0.3 | Keep (fallback vs baseline) |

**Tier-B proposed values are targets for owner approval after Phase-0** (OPEN-PERF-04). They are ~3× tighter than Tier-A for public/auth because Tier-B runs on a controlled localhost/preview with median-of-N, not on a noisy CI runner.

### 3c. Hosted (PERF-06) — unchanged from current

See `03_*.md` Section E for the full `HOSTED_ROUTE_BUDGETS` table. Posture change: pre-release advisory → blocking on owner decision (OPEN-PERF-03). Values unchanged unless owner directs otherwise after Phase-0.

## 4. Flake policy (PERF-07)

- **Bundle (E1):** deterministic. Strict mode fails on partial reads. No flake handling needed.
- **Tier-A CI smoke (E2):** Playwright default retry; loose budgets absorb CI variance. If a scenario flakes > once in 20 CI runs, it is quarantined into a `@quarantine` list with a tracking task, not silently loosened.
- **Tier-B deep (E3):** median of `RUNS=3` (≥ `ROUTE_TRANSITION_MIN_RUNS=3`). A run counts as a miss only if **median > budget AND max > budget** (single-run spikes alone do not fail). Improvement-rate fallback (≥ 30% better than baseline) accepts a general-scenario miss when a baseline file is provided, so a still-improving route is not blocked by an absolute number.
- **Hosted p95 (E4):** ≥ 20 runs nearest-rank; route-contract gate is hard; p95 budget is watch-grade unless owner promotes. Re-run on a p95 miss before acting.

## 5. Observability signals

| Signal | Source | Owner | Use |
|---|---|---|---|
| Bundle gz KB per route | `route-bundle-stats.json` | This pack (L1) | Regression detection |
| Route-transition median/overlay/skeleton | Playwright + `__routeTransitionTimeline` | This pack (L1/L2) | Regression detection |
| Hosted TTFB p95 + CF cache status + CF ray | `verify-cloudflare-hosted-performance.ts` | This pack (L3) | Pre-release readiness |
| Production CWV (LCP/INP/CLS) | Cloudflare Web Analytics (Tier-1, sibling plan `OPEN-PERF-01`) | Sibling plan | Field confirmation (not gate) |
| Workers Observability/Analytics | Sibling observability plan | Sibling plan | Runtime error/rate signals |

**This pack does not add production telemetry.** It consumes build-time and on-demand proof signals. Field CWV confirmation is the sibling RUM plan's responsibility; this pack's gates are the pre-deployment analog.

## 6. Failure / degraded behavior

- **Bundle gate failure (strict):** CI step fails → PR blocked → OPS-01 triage (regression vs budget-update vs flake).
- **Tier-A smoke failure:** CI fails → PR blocked. Because Tier-A is loose, a failure usually means a real break or a severely degraded runner; triage before retry.
- **Tier-B miss:** On-demand/pre-merge signal → not an automatic PR block unless the owner wires Tier-B as required. Improvement-rate fallback prevents blocking a still-improving route.
- **Hosted p95 miss:** Watch-grade → re-run → if persistent, owner decides block-vs-tune. Route-contract fail is a hard pre-release block.
- **Missing diagnostics artifact:** advisory SKIP; strict FAIL (`check-performance-budgets.mjs:22-31`). This catches a broken build that would otherwise undercount bundle size.

## 7. Performance regression risks introduced by the gates themselves

- **Risk:** Over-tightening Tier-A in CI causes flaky PRs and pushes implementers to remove UX (overlay/skeleton) to pass. **Mitigation:** Tier-A stays loose; Tier-B holds the tight budgets; OPS-01 triage; explicit constraint that gate tightening must not incentivize UX removal (`05_*.md`).
- **Risk:** Per-route bundle budgets set too tight from a noisy Phase-0 sample. **Mitigation:** 15% headroom rule; owner approval after Phase-0; global backstop floor at 350 KB.
- **Risk:** Hosted p95 location-sensitivity (historical `features`/pricing misses). **Mitigation:** p95 stays watch-grade unless owner promotes; re-run before acting; record CF ray/cache status for diagnosis.
