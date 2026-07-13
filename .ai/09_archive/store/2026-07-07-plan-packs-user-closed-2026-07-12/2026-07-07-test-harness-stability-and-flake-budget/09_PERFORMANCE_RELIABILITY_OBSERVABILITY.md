# 09 — Performance, Reliability, and Observability

## The flake budget (DEC-4, PERF-1)

### Definition (load-bearing)

A **flake** is a test that fails in a clean run and passes on immediate retry
with **no code or fixture change**. Capture requires N≥5 clean runs (Phase 0);
the budget is enforced at N≥10 for the formal rate.

### Budget

| Metric | Recommended default | Owner | Status |
|---|---|---|---|
| File-level flake rate (over 10 runs) | ≤ 2% | Philip | **owner-gated** (DEC-4) — recommended default pending confirmation |
| Max consecutive failures before escalation | 3 | Philip | if a file fails 3/10, it is a Phase 3 remediation candidate |
| Quarantine entries past `retest_by` | 0 | test-owner | audited at Phase 5 cadence |

The ≤2% default is a *recommendation*, not an asserted fact. Phase 0 measures
the **actual** rate; if it is already higher, Phase 3 drives it down with
before/after evidence. The budget is not "met" until measured.

### Why these numbers

- 2% over 10 runs ≈ allowing ~13 of ~649 files to flake once in a 10-run window.
  That is deliberately *not* zero: chasing 0% on a jsdom-heavy suite under GC
  pressure tends to produce either over-wide timeouts (masking real slowness) or
  test deletion (coverage loss). The owner may tighten to ≤1% after Phase 3.

## Timing budgets (PERF-2)

| Metric | Baseline | Target | Measurement | Regression threshold |
|---|---|---|---|---|
| Full `validate` wall-clock | unknown (measure Phase 0; `test:dom` ≈525s per `vitest.config.ts:14`) | baseline − measurable delta after Phase 3 | `time bun run validate`; flakewatch wall-clock p95 | +10% over baseline without recorded reason + replacement |
| `test:dom` wall-clock | ~525s | baseline − delta | flakewatch per-file p95 | +10% |
| Per-file p95 (top-10 slowest) | unknown | each has Phase 3 before/after | flakewatch JSON | n/a (characterization) |
| CI job total (when re-enabled) | n/a (disabled) | per `13` table | CI timing | per `13` |

**No fixed % wall-clock target is asserted before Phase 0.** DEC-1: measure first.

## Performance evaluator contract (PERF, the harness measuring itself)

This is the canonical "evaluator" the planning prompt requires for
performance-relevant work:

| Field | Value |
|---|---|
| Baseline metric | full `test:dom` wall-clock (p50/p95/max); per-file p95 |
| Target metric | baseline − delta; file-level fail-rate ≤ budget |
| Measurement command | `bun run scripts/flakewatch.mjs --glob 'tests/vitest/**/*.test.{ts,tsx}' --runs 10` |
| Harness | `scripts/flakewatch.mjs` + vitest JSON reporter |
| Dataset / fixture size | the existing ~634 vitest files (no synthetic fixtures) |
| Number of runs / flake policy | N=10 for rate; N=5 minimum; abort on mid-scan file change |
| Regression threshold | wall-clock +10%; fail-rate above budget |
| Related functional tests | `bun run validate` must stay green |
| Evidence artifact location | `flakewatch-report.json` + before/after pair in `19` |

**Passing ordinary tests is not enough** to claim timing improvement: the
flakewatch before/after delta is the declared evaluator.

## Reliability

### Failure modes

| Mode | Detection | Mitigation |
|---|---|---|
| Genuine flake | flakewatch N-run | quarantine + Phase 3 fix |
| Timeout-only failure (slow but deterministic) | per-file p95 in flakewatch | tier timeout (DEC-6) or Phase 3 fix; do **not** just widen the budget |
| Cross-file contamination (serial worker) | N-run fail-rate spikes after a change | global `afterEach` (FR-3) |
| Mid-scan concurrent edit | flakewatch git-dirty check per run | abort + re-run |
| Perf-suite meaning shift after parallelism | perf parity rerun (Phase 1 exit gate) | rollback to `fileParallelism:false` |
| Quarantine erosion | owner-review cadence (Phase 5) | ledger audit |

### Degraded modes

- If Phase 1 parallelism is declined by the owner, the plan still delivers value
  via Phase 0 (measurement) + Phase 3 (per-file fixes) + Phase 2 (policy). The
  pack is **not** dependent on parallelism.
- If a Phase 3 fix risks coverage, the fallback is quarantine-with-replacement,
  not deletion.

## Observability (harness-level)

- Flakewatch emits JSON (machine) + human summary (terminal) with non-color cues.
- Per-file p95 surfaces the slowest files without manual profiling.
- Quarantine ledger is the durable record of accepted flakiness.
- **No new app metrics/tracing** — this is dev tooling, not production telemetry
  (production RUM/CWV is owned by `2026-07-07-production-rum-and-cwv-telemetry`).

## Existing perf-budget coupling (de-confliction)

The repo already has `scripts/check-performance-budgets.mjs` — a **bundle**
budget reading `.next/diagnostics/route-bundle-stats.json`. That is owned by the
`bundle-and-route-performance-gate-hardening` sibling pack. This pack's budgets
are **test-timing** budgets; the two do not overlap. The parked CI runs the
bundle budget (advisory); Phase 4's timing budget is additive.
