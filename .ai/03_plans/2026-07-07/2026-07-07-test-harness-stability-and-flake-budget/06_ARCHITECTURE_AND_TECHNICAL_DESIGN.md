# 06 — Architecture And Technical Design

## Current-state architecture

```
                     bun run validate
                           │
        ┌──────────────────┼───────────────────┐
        ▼                  ▼                   ▼
   type-check           lint chain         test runners
   (tsc)            (eslint + design)           │
                                       ┌─────────┴──────────┐
                                       ▼                    ▼
                                bun test tests/unit    vitest run --maxWorkers=1
                                (6 files)              (fileParallelism:false)
                                                       (~634 files, jsdom)
                                                       │
                                                       └─ includes tests/vitest/perf/*
                                                          (serial — load-bearing)

  Playwright (separate): test:e2e / test:e2e:perf — most specs env-gated to skip.
  CI: DISABLED (.github/workflows/ empty; pipeline in workflows-disabled/).
```

**Key property:** the vitest run is a single long-lived worker
(`fileParallelism:false`). This is load-bearing for the perf suite's
render-count/timing assertions (`vitest.config.ts:9-17`). It is also the reason
a global cleanup gap (`03` §6) is a contamination risk: state persists across
~634 files in one worker.

## Target-state architecture

```
                     bun run validate   (+ optional: bun run flakewatch)
                           │
        ┌──────────────────┼───────────────────┐
        ▼                  ▼                   ▼
   type-check           lint chain         test runners
                                       ┌─────────┴──────────────────────┐
                                       ▼                                ▼
                                bun test tests/unit           vitest (projects)
                                (6 files, unchanged)            │
                                                    ┌───────────┴────────────┐
                                                    ▼                        ▼
                                          project: default          project: perf
                                          (non-perf, ~625 files)     (9 files)
                                          pool: forks                fileParallelism:false
                                          fileParallelism:           (UNCHANGED — load-bearing)
                                            owner-gated (false→true)
                                          testTimeout: tiered

  Flakewatch (new): scripts/flakewatch.* — N-run scan + per-file timing JSON.
  Quarantine ledger (new): machine-verifiable, time-bounded, replacement-required.
  Playwright: retries policy documented (owner-gated change to config).
  CI: timing-budget table ready; re-enablement owner-gated.
```

## Architectural decisions

### Parallelism model (DEC-2)

- **Perf project stays serial.** `tests/vitest/perf/*` keeps
  `fileParallelism:false` and its assertions' meaning is preserved.
- **Non-perf project may go file-parallel** (owner-gated). Vitest 4 `projects`
  allow per-project `fileParallelism`/`testTimeout`. ASSUMP-6 (Phase 1 T1.1)
  must confirm Vitest 4 supports this cleanly with the existing jsdom env.
- **`--maxWorkers=1` in `test:dom` and `fileParallelism:false` must move
  together** — Phase 1 task updates both atomically. Hazard recorded in `14`
  RISK-2.
- **Conservative default if owner declines:** keep `fileParallelism:false`
  globally; the wall-clock improvement then comes from Phase 3 per-file fixes,
  not parallelism. The plan is valuable either way.

### Timeout tiers (DEC-6, new)

Replace the single `testTimeout:30_000` with a tiered policy:
- **Default:** 10_000ms (most unit/jsdom tests finish in ms).
- **Heavy component suites:** 30_000ms (the current global — still needed for
  the named >15s tests).
- **Perf/benchmark:** 60_000–120_000ms (already overridden per-file in
  `perf/estimate-sheet-render-baseline` and `route-transition-peak-load-profile`).

Implemented via Vitest projects or per-file `test.setTimeout`. Phase 0
measurement informs the exact tier boundaries (don't guess from size).

### Quarantine policy (DEC-3)

**Definition of a flake (DEC-4):** a test that fails in a clean run and passes
on immediate retry with **no code or fixture change**. Requires N≥5 runs to
confirm.

**Quarantine ledger schema** (T2.2):
```
- id: Q-###
  file: tests/vitest/<path>
  test_name: <it name>
  detected: <date>
  detected_by: flakewatch | manual
  fail_rate: <x/N>
  replacement: <faster test | contract assertion | e2e proof | owner-defer reason>
  retest_by: <date, ≤14 days>
  owner: <role>
  status: quarantined | re-testing | resolved | reinstated
```

- **Manual by default.** A flake is quarantined only after a human/agent records
  the entry with a replacement.
- **Auto-quarantine opt-in:** if the owner enables it, flakewatch can mark a
  test `quarantined` after M consecutive failures, but still requires a ledger
  entry to be written within the same run.
- **Re-test discipline:** `retest_by` ≤ 14 days; Phase 5 owner-review cadence
  audits stale entries.

### Retry rules (REL-2)

| Surface | Current | Recommended | Rationale |
|---|---|---|---|
| Vitest (no built-in retry) | local manual rerun | keep manual; flakewatch automates the N-run probe | Vitest 4 has no test-level retry; "retry to green" hides flakes |
| Playwright `retries` | 0 | **stay 0 for flake detection**; optionally 1-2 for genuinely-async e2e after owner review | retries=0 keeps flakes visible; the e2e-fixture pack owns the smoke matrix |
| CI rerun | n/a (disabled) | on re-enable: no auto-rerun-to-green; a failed job is a signal | retry-to-green erodes the budget's meaning |
| Local rerun convention | `bunx vitest run <file> --maxWorkers=1` | keep; flakewatch wraps it for N runs | documented standard |

**Principle:** retries must never turn a flaky test green in the record; they
exist to *characterize* flakiness, not mask it.

### Fixture cleanup (FR-3)

- Add a global `afterEach` in a per-project setup that calls
  `vi.restoreAllMocks()` and (opt-in) `vi.resetModules()`.
- **Opt-in for `resetModules`:** some tests rely on import-time setup; a blanket
  reset may break them (RISK-7). Phase 3 determines the safe scope empirically
  (T3.x).
- Eliminate the two real-timer `setTimeout` waits
  (`estimate-cursor-identity.test.ts:90`, `recipient-proposals-page.test.tsx:171`)
  by replacing with `vi.useFakeTimers()` + `advanceTimers` or a deterministic
  `waitFor`.

### Evidence reporting (FR-6)

- `scripts/flakewatch.mjs` (Bun): runs `vitest run <glob> --maxWorkers=1` N
  times, captures pass/fail + per-file wall-clock (from vitest JSON reporter),
  emits `flakewatch-report.json` + a human summary.
- `scripts/flakewatch-report.mjs`: reads one or two JSON files, emits a
  before/after diff.
- JSON schema documented in `19` §B.
- Non-color status cues (`[FLAKE]`, `[OK]`, `[SLOW]`).

## Component boundaries

- **No new runtime modules.** The harness is build-time/dev-only tooling under
  `scripts/` + config in `vitest.config.ts`/`playwright.config.ts`.
- `scripts/flakewatch*.mjs` are leaf scripts (no app imports).
- Quarantine ledger is a data file, not code.

## Failure boundaries

- A flakewatch run that detects a test-file change mid-scan **aborts** (invalid
  measurement) rather than emitting a misleading report.
- A quarantine entry without a replacement is **rejected** by the ledger
  validator (T2.3).
- A parallelism change that fails perf-suite parity **rolls back** to
  `fileParallelism:false` (Phase 1 exit gate).

## Architectural alternatives considered (full in `15`)

- **Migrate flake detection to a hosted service** (e.g. retry bots) — rejected:
  cost + CI-disabled reality + local-first posture.
- **Drop the perf suite to allow full parallelism** — rejected: violates
  "no coverage loss" and removes load-bearing assertions.
- **Add vitest coverage gate as part of this pack** — deferred: coverage
  tooling is its own concern; this pack prevents coverage *loss*, doesn't add a
  coverage gate.
