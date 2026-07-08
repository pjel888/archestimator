# 01 — Executive Summary

## The problem, in one paragraph

Archestimator's test harness works but its reliability is **implicit and
unmeasured**. A full vitest run takes ~525s, runs strictly serially
(`fileParallelism:false`, declared "load-bearing" at `vitest.config.ts:11`), and
individual jsdom component tests can exceed 15s late in the run under GC
pressure (`vitest.config.ts:12-16`) — they pass in isolation. CI is **fully
disabled** (`ls .github/workflows/` is empty; the pipeline is parked in
`.github/workflows-disabled/ci.yml`). There is no flake detector, no quarantine
ledger, no measured flake rate, no retry policy, and no CI timing budget. For a
pre-launch product whose roadmap says "fast, trustworthy proof loops," this is a
launch-readiness gap: nobody can answer "how flaky are we?" or "did this change
make tests slower or just greener?"

## What this pack does

It converts the implicit posture into an **explicit, measurable, owner-gated
reliability contract** — without removing any coverage for speed and without
touching application code. Five phases:

1. **Measure first** (Phase 0): a `flakewatch` timing/scan runner + N-run flake
   scan establish the baseline. No fixes happen before the baseline exists.
2. **Parallelism & timeout policy** (Phase 1): tiered `testTimeout`, an opt-in
   file-parallel strategy that protects the perf-suite serial semantics, and a
   documented worker model.
3. **Quarantine + retry rules** (Phase 2): a quarantine ledger, a
   flake-vs-feature-gate classification, a retry table, and an owner-gated
   auto-quarantine opt-in.
4. **Slowest/flakiest remediation** (Phase 3): incremental, per-file fixes to
   the named candidates, each with before/after timing.
5. **CI timing budget + evidence reporting** (Phase 4–5): a job-timing budget
   table, a split-group strategy for re-enabled CI, an evidence-report command,
   and an owner-review cadence.

## Key findings (evidence in `03`, `09`, `19`)

| # | Finding | Evidence |
|---|---|---|
| F-1 | Two distinct test runners in `validate`: bun-test (`tests/unit`, 6 files) then vitest (`tests/vitest`, ~634 files, `--maxWorkers=1`) | `package.json` `test`/`test:dom`/`validate` |
| F-2 | `fileParallelism:false` is load-bearing for perf-suite serial semantics; the ~525s run + GC pressure is documented inline | `vitest.config.ts:9-17` |
| F-3 | CI is entirely disabled; local `bun run validate` is the only enforced gate | `.github/workflows/` empty; `.github/workflows-disabled/ci.yml` |
| F-4 | No flake-quarantine `.skip` patterns exist — all 14 skip/skipIf sites are env/auth/provider gates | `19` §A skip classification |
| F-5 | Tightest timing budgets: logger-perf p95 `<1ms` (1000 samples), drag-over-perf avg `<16ms` (1000-node/25-sample), keystroke avg `<16ms`/worst `<50ms`, parallelism `<300ms` | `19` §A perf budgets |
| F-6 | Prime flake candidates are the heavy-`waitFor` jsdom suites: `estimate-sheet-library-insert` (45), `estimate-tree-context-menu` (40), `component-library-ui` (37) | `19` §A waitFor inventory |
| F-7 | Two real-timer `setTimeout` waits are latent flake sources: `estimate-cursor-identity.test.ts:90` (30ms), `recipient-proposals-page.test.tsx:171` (75ms) | `19` §A setTimeout |
| F-8 | The disabled `ci.yml` runs `validate` + `build` + advisory perf-budget + Playwright e2e + e2e:perf — a re-enablement decision with build-minute cost | `.github/workflows-disabled/ci.yml` |
| F-9 | No script runs the `tests/vitest/perf/` suite in isolation; `perf:profile-peak-load` runs only the single peak-load file | `package.json` `perf:profile-peak-load` |

## Critical decisions (full rationale in `15`)

- **DEC-1:** Measure before fixing — Phase 0 baseline is a hard prerequisite for
  all remediation claims. *Alternative rejected:* ad-hoc per-test speedups with
  no baseline (unfalsifiable, the exact anti-pattern the PROMPT warns against).
- **DEC-2:** Keep `fileParallelism:false` for the perf-suite project; allow
  file-parallelism only for non-perf test groups via vitest *projects*
  (`--project`) once Vitest 4 project filtering is confirmed. Owner-gated.
- **DEC-3:** Quarantine is **manual by default**; auto-quarantine on N failures
  is an owner opt-in. *Alternative rejected:* automatic quarantine (hides
  coverage loss behind automation — violates the "no hidden coverage loss" stop
  condition).
- **DEC-4:** A "flake" is defined as: a test that fails in a clean run and
  passes on immediate retry with **no code or fixture change**. Capture requires
  N≥5 clean runs in Phase 0.
- **DEC-5:** Removing coverage for speed requires a *recorded replacement* in
  the quarantine ledger (faster test, contract assertion, or e2e proof). Direct
  from PROMPT constraints.

## Major risks (full register in `14`)

- **RISK-1 (high):** Re-enabling CI without a timing budget causes
  build-minute bloat / runaway jobs → mitigation: Phase 4 timing budget table +
  split groups; gate re-enablement on owner decision.
- **RISK-2 (high):** Parallelizing the perf suite silently changes what its
  render-count/timing assertions mean → mitigation: perf project stays serial;
  DEC-2.
- **RISK-3 (medium):** Quarantine becomes a coverage-erosion mechanism over time
  → mitigation: quarantine ledger has a mandatory re-test date + owner review
  cadence (Phase 5).
- **RISK-4 (medium):** The ~525s wall-clock discourages running the full suite
  locally → mitigation: Phase 1 + 3 target a measurable reduction; Phase 4
  split groups.

## Readiness

**`CONDITIONALLY READY`** (emulated verification cap). Every implementation task
has exact file paths/symbols. The four owner-gated decisions above are isolated
as blocked decisions with options + recommendations; non-blocked phases
(0, 1, 3) can start immediately. See `17` for the full verifier matrix.
