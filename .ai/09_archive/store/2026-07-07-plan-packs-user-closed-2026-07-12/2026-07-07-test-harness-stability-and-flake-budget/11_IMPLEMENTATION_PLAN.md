# 11 — Implementation Plan (authoritative execution guide)

> **Planning-only pack.** The tasks below prescribe implementation work for a
> future executor. Each has exact paths/symbols or an explicit
> DISCOVERY-REQUIRED label. Owner-gated tasks are marked. Phase 0 is unblocked.

## Phase ordering and ownership

| Phase | Objective | Owner-gated? | Unblocked? |
|---|---|---|---|
| 0 | Measurement harness + baseline | no | yes |
| 1 | Parallelism & timeout policy | partly (parallelism) | after Phase 0 |
| 2 | Quarantine policy + retry rules | partly (auto-quarantine) | after Phase 1 |
| 3 | Slow/flaky remediation | no | after Phase 0 (and ideally 1/2) |
| 4 | CI timing budget + re-enablement posture | yes (re-enable) | after Phase 1/3 |
| 5 | Evidence reporting + review cadence | no | after Phase 2/4 |

---

## Phase 0 — Discovery & measurement harness (read-only baseline)

**Objective:** establish measured baselines for wall-clock, per-file p95, and
file-level flake rate. **No fixes in this phase.** (DEC-1)

### Durable-goal contract (Phase 0)
- **Goal ID:** P0. **Objective:** measured baseline. **Scope:** read-only.
- **Required evidence:** `flakewatch-report.json` (N=10), per-file p95, fail-rate.
- **Completion audit:** JSON parses; counts match `03` ±5%; N≥10 documented.
- **Stop condition:** baseline exists. **Blocker:** none expected.

### T0.1 — Verify test inventory (FR-1)
- **Requirement IDs:** FR-1. **Complexity:** Small.
- **Objective:** confirm `03` §1 counts still hold.
- **Paths:** `tests/vitest`, `tests/unit`, `e2e`.
- **Validation:** `find tests/vitest -name '*.test.*' | wc -l` ≈ 634; unit 6; e2e 9.
- **Parallelization:** parallel-safe (read-only).

### T0.2 — Implement `scripts/flakewatch.mjs` (FR-2, FR-6, PERF-1)
- **Requirement IDs:** FR-2, FR-6, PERF-1. **Complexity:** Medium.
- **Objective:** a Bun script that runs `vitest run <glob> --maxWorkers=1
  --reporter=json` N times, aggregates per-file pass/fail + wall-clock, emits
  `flakewatch-report.json` (schema `07`/`19` §B) + human summary.
- **New file:** `scripts/flakewatch.mjs` (repo-relative).
- **Contract:** argv `--glob <g> --runs <N> --out <path>`; default N=10, cap
  `--max-runs 25`; aborts if `git status --porcelain` changes between runs
  (mid-scan edit detection, SEC-1/shared-worktree).
- **Safe spawning:** use Bun/Node `spawn` array form (no `sh -c`), per SEC-1.
- **No new deps** (SEC-5): use vitest's built-in JSON reporter.
- **Validation:** run on a small glob (`tests/unit` mapped into vitest or a
  5-file vitest subset) with N=3; confirm JSON parses; confirm abort-on-edit.
- **Parallelization:** sequential (it *is* the measurement).

### T0.3 — Implement `scripts/flakewatch-report.mjs` (FR-6)
- **Requirement IDs:** FR-6. **Complexity:** Small.
- **New file:** `scripts/flakewatch-report.mjs`.
- **Contract:** reads 1–2 `flakewatch-report.json`, prints summary or before/after
  diff; non-color cues `[OK]`/`[FLAKE]`/`[SLOW]`.
- **Validation:** diff two sample JSONs; confirm correct +/- deltas.
- **Parallelization:** parallel-safe after T0.2.

### T0.4 — Capture baselines (FR-2, PERF-1, PERF-2)
- **Requirement IDs:** FR-2, PERF-1, PERF-2. **Complexity:** Medium (time).
- **Objective:** run flakewatch on the full vitest glob, N=10; record wall-clock
  p50/p95/max, per-file p95 (top-20), file-level fail-rate. Confirm/refute
  ASSUMP-5 (the ~525s / >15s claims).
- **Paths:** runs `tests/vitest/**`.
- **Validation:** `flakewatch-report.json` stored as evidence in `19` §baseline.
- **Parallelization:** sequential (long run; ~525s × 10).

### T0.5 — Falsify ASSUMP-6 (Vitest 4 projects for perf isolation)
- **Requirement IDs:** FR-4. **Complexity:** Small. **Label:** DISCOVERY-REQUIRED.
- **Objective:** confirm Vitest 4 `projects` can give `tests/vitest/perf/*` its
  own `fileParallelism:false` + `testTimeout` while non-perf runs file-parallel.
- **Search scope:** `node_modules/vitest/dist/docs/` (local installed docs) +
  a 2-file spike config.
- **Stop condition:** a yes/no answer with a citation + a working 2-file spike
  (committed only if implementation proceeds in Phase 1).
- **Parallelization:** parallel-safe (read + spike).

**Phase 0 exit gate:** `flakewatch-report.json` exists, parses, N≥10,
ASSUMP-5/6 resolved. Rollback: n/a (read-only).

---

## Phase 1 — Parallelism & timeout policy (critical path)

**Objective:** implement the parallelism + timeout-tier policy from `06`, or
document why it stays conservative.

### T1.1 — Apply timeout tiers (FR-4, DEC-6)
- **Requirement IDs:** FR-4. **Complexity:** Medium.
- **Paths:** `vitest.config.ts` (`test.testTimeout`), per-file `test.setTimeout`
  in perf files (already present in some).
- **Symbols:** `defineConfig({ test: { testTimeout } })`.
- **Implementation:** default `testTimeout: 10_000`; heavy suites get
  `testTimeout: 30_000` via a project or per-describe override; perf keeps
  60_000–120_000 per-file. Exact tier boundaries **from Phase 0 p95**, not size.
- **Hazard:** changing global timeout can flip slow-but-passing tests to timeout
  failures. **Mitigation:** Phase 0 p95 + 3× headroom; run full suite to confirm.
- **Validation:** full `test:dom` green; no new timeouts vs Phase 0 baseline.
- **Parallelization:** sequential (config change).

### T1.2 — Parallelism change (owner-gated) (FR-4, DEC-2)
- **Requirement IDs:** FR-4. **Complexity:** Medium-Large. **Owner-gated.**
- **Paths:** `vitest.config.ts` (`fileParallelism`, `projects`, `poolOptions`),
  `package.json` (`test:dom` must keep `--maxWorkers` consistent).
- **Symbols:** `fileParallelism`, `projects`, `pool`.
- **Implementation (if approved):** split into project:default (file-parallel)
  + project:perf (serial). Update `test:dom` accordingly. If owner declines,
  keep `fileParallelism:false`; document in `06`/`15` and skip to Phase 1 exit.
- **Exit gate (perf parity):** rerun `tests/vitest/perf/*` before/after; the
  render-count assertions (`=== 0` / `=== 1`) must be unchanged on a sample.
  **Rollback:** revert to `fileParallelism:false`.
- **Validation:** perf parity rerun + full `validate` green.
- **Parallelization:** sequential.

**Phase 1 exit gate:** timeout tiers in; parallelism decided + (if applied)
perf-parity proven. Rollback: revert config.

---

## Phase 2 — Quarantine policy + retry rules

### T2.1 — Document quarantine policy + retry table (FR-5, REL-1, REL-2)
- **Requirement IDs:** FR-5, REL-1, REL-2. **Complexity:** Small (docs).
- **Paths:** this plan's `06`/`13` already carry the policy; on implementation,
  promote to `tests/QUARANTINE.md` (new) or `.ai/qa/`.
- **Validation:** doc review.

### T2.2 — Create quarantine ledger + schema (FR-5)
- **Requirement IDs:** FR-5. **Complexity:** Small.
- **New file:** `tests/QUARANTINE-LEDGER.{yml,md}` (committed; schema `06`).
- **Seed:** any genuine flakes Phase 0 found; if none, empty ledger with schema.
- **Validation:** file exists; schema documented.

### T2.3 — Ledger validator (SEC-2, REL-1)
- **Requirement IDs:** FR-5, REL-1, SEC-2. **Complexity:** Small.
- **New file:** `scripts/validate-quarantine-ledger.mjs`.
- **Contract:** parse ledger; reject any entry missing `replacement`, `retest_by`
  (≤14 days), `owner`, `status`. Exit 1 on violation.
- **Validation:** unit test with a bad entry → exit 1; good entry → exit 0.
- **Parallelization:** parallel-safe.

### T2.4 — Retry policy application (REL-2)
- **Requirement IDs:** REL-2. **Complexity:** Small (owner-gated for config).
- **Paths:** `playwright.config.ts` (`retries`) — **stay 0 by recommendation**;
  document. Vitest: no change (no built-in retry). CI: documented in Phase 4.
- **Validation:** config read-back; doc.

**Phase 2 exit gate:** ledger + validator exist; retry table documented.

---

## Phase 3 — Slow/flaky remediation (incremental, measured)

**Objective:** reduce wall-clock + flake rate on the Phase 0 candidates, each
with a before/after flakewatch measurement (TEST-1). **No coverage loss** (REL-3).

### T3.1 — Global cleanup `afterEach` (FR-3)
- **Paths:** `tests/vitest/setup.ts` (add `afterEach`), or a per-project setup.
- **Symbols:** `afterEach`, `vi.restoreAllMocks`, `vi.resetModules` (opt-in).
- **Implementation:** `afterEach(() => { vi.restoreAllMocks(); })` globally;
  `vi.resetModules()` only where Phase 0/3 confirms it's safe (RISK-7).
- **Validation:** N-run fail-rate before/after (flakewatch) does not increase;
  full suite green.
- **Parallelization:** sequential (global setup).

### T3.2 — Eliminate real-timer waits (FR-3)
- **Paths:** `tests/vitest/estimate-cursor-identity.test.ts:90`
  (`setTimeout(resolve, 30)`), `tests/vitest/recipient-proposals-page.test.tsx:171`
  (`setTimeout(resolve, 75)`).
- **Implementation:** replace with `vi.useFakeTimers()` + `advanceTimersByTime`
  or a deterministic `waitFor` predicate.
- **Validation:** both files green over N=10; no real-timer dependency remains.
- **Parallelization:** parallel-safe (two disjoint files).

### T3.3 — Heavy-`waitFor` suite remediation (FR-2→fix, PERF-2)
- **Paths (candidates, ranked by Phase 0 p95/fail-rate):**
  `estimate-sheet-library-insert.test.tsx`, `estimate-tree-context-menu.test.tsx`,
  `component-library-ui.test.tsx`, `component-library-manager.test.tsx`,
  `workshop-library-consolidation-ui.test.tsx`, `projects-page-group-mode.test.tsx`.
- **Implementation:** per-file: tighten `waitFor` predicates (assert on the
  actual condition, not a timeout), reduce redundant `act`/`waitFor` nesting,
  isolate module state. Each file is an independently-landable task.
- **Validation:** per-file flakewatch before/after; full suite green; **assertion
  count unchanged or increased** (REL-3).
- **Parallelization:** parallel-safe across files (disjoint); serialize within a
  file. Coordinate concurrent agents via the ledger (AGENTS.md §6).

### T3.4 — Perf-suite isolation script (optional, if Phase 1 declined)
- **Requirement IDs:** FR-4 (fallback). **Complexity:** Small.
- **New script:** `package.json` `perf:vitest` = `vitest run tests/vitest/perf
  --maxWorkers=1` so the perf suite is runnable in isolation (fixes F-9).
- **Validation:** script runs the 9 perf files only.

**Phase 3 exit gate:** flakewatch before/after shows measurable improvement
(wall-clock or fail-rate) with **coverage count ≥ baseline**. Rollback: revert
per-file changes.

---

## Phase 4 — CI timing budget + re-enablement posture (owner-gated)

### T4.1 — CI timing budget table (OPS-1)
- **Paths:** `13` carries the table; on implementation, document in
  `.github/workflows/ci.yml` comments when re-enabled.
- **Budget (prescriptive):** see `13` §timing-budget-table.

### T4.2 — CI re-enablement (OPS-2, owner-gated)
- **Requirement IDs:** OPS-2, SEC-4. **Complexity:** Medium. **Owner-gated.**
- **Paths:** move `.github/workflows-disabled/ci.yml` → `.github/workflows/ci.yml`
  (with `permissions:` least-privilege, pinned actions already present).
- **Implementation:** add per-job timing budgets/split groups; wire the test
  timing budget. Do **not** auto-rerun-to-green.
- **Validation:** CI run; job timings within budget.
- **Rollback:** move back to `-disabled`.

**Phase 4 exit gate (if executed):** CI green within timing budget. If owner
defers, Phase 4 delivers the table only.

---

## Phase 5 — Evidence reporting + review cadence

### T5.1 — Wire flakewatch into a convenience script + docs (FR-6, DOC-1)
- **Paths:** `package.json` (`flakewatch`, `flakewatch:report` scripts); augment
  `vitest.config.ts:9-17` comment to point at `06`/`15`.
- **Validation:** `bun run flakewatch --runs 10` works.

### T5.2 — Owner-review cadence (REL-1, REL-3, OPS-3)
- **Paths:** `13` owner-thresholds table; a recurring review note (weekly until
  launch, then per-release) auditing the quarantine ledger + flake rate.
- **Validation:** cadence documented; first review recorded.

**Phase 5 exit gate:** reporting wired; cadence set. Final owner review
determines whether to archive the pack.

---

## Cross-cutting task metadata

- **New files (exact repo-relative paths):** `scripts/flakewatch.mjs`,
  `scripts/flakewatch-report.mjs`, `scripts/validate-quarantine-ledger.mjs`,
  `tests/QUARANTINE-LEDGER.{yml,md}`, `tests/QUARANTINE.md` (optional).
- **Existing files modified (exact):** `vitest.config.ts`, `package.json`,
  `tests/vitest/setup.ts`, `tests/vitest/estimate-cursor-identity.test.ts`,
  `tests/vitest/recipient-proposals-page.test.tsx`, (Phase 3 candidate files),
  `playwright.config.ts` (policy only, owner-gated), `.github/workflows/ci.yml`
  (owner-gated re-enablement).
- **Server/client boundary impact:** none (dev tooling only).
- **Cache/revalidation impact:** none.
- **Bundle/RSC/API payload impact:** none.
- **Database query-count/index impact:** none.
- **Cloudflare resource-boundary impact:** none.
- **Performance measurement + rollback gate:** flakewatch before/after (Phase 1/3).
