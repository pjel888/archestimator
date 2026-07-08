# 04 — Requirements Specification

Stable ID scheme: `FR` functional, `PERF` performance, `REL` reliability,
`OPS` operations, `TEST` testing, `DOC` documentation. Each requirement maps to
tasks in `11` and evidence in `12`/`16`. Acceptance criteria are objective.

The PROMPT's required-pack items map to requirements as: inventory→FR-1,
slowest/flakiest→FR-2/PERF-1, fixture cleanup→FR-3, parallelism→FR-4/PERF-2,
quarantine→FR-5/REL-1, CI timing→OPS-1/OPS-2, retry→REL-2, evidence
reporting→FR-6/TEST-1, owner thresholds→OPS-3/REL-3.

## FR — Functional requirements

### FR-1 — Current test inventory documented and machine-verifiable
- **Statement:** A machine-verifiable inventory of all test files (vitest,
  bun-test, e2e), grouped by runner, with counts, exists in the plan and is
  reproducible by a single command.
- **Rationale:** Cannot stabilize what is not inventoried.
- **Source:** PROMPT "current test inventory"; `03` §1.
- **Priority:** P0. **Dependencies:** none.
- **Acceptance criteria:** (a) `03` §1 table matches `find tests … | wc -l`
  within ±5%; (b) a re-run command reproduces the counts.
- **Validation:** `find tests/vitest -name '*.test.*' | wc -l` ≈ 634.
- **Affected code:** `03`, `11` T0.1. **Risks:** inventory drift (RISK-5).

### FR-2 — Slowest and flakiest candidates characterized by measurement
- **Statement:** Phase 0 produces a measured ranking of (a) per-file wall-clock
  p95 and (b) file-level fail-rate over N≥5 runs, identifying the top candidates
  for Phase 3 remediation.
- **Rationale:** The PROMPT requires slowest/flakiest candidates; size is only a
  proxy. Decision DEC-1: measure before fixing.
- **Source:** PROMPT; `03` §4-5; `19` §A.
- **Priority:** P0. **Dependencies:** FR-1.
- **Acceptance criteria:** (a) JSON artifact with per-file p95 + fail-rate;
  (b) ranking names ≥10 files; (c) N≥5 documented.
- **Validation:** Phase 0 `flakewatch` artifact exists and parses.
- **Affected code:** new `scripts/flakewatch.*` (T0.2), `tests/vitest` (read).
- **Risks:** measurement noise (RISK-6).

### FR-3 — Fixture cleanup posture hardened (no cross-test contamination)
- **Statement:** A global `afterEach` (or per-project equivalent) restores mocks
  and modules so serial execution cannot leak state across files; the two
  real-timer `setTimeout` waits are eliminated or replaced with deterministic
  waits.
- **Rationale:** `fileParallelism:false` runs in one long-lived worker;
  `setup.ts` has no global cleanup (`03` §6). Latent contamination vector.
- **Source:** `03` §5.2, §6.
- **Priority:** P1. **Dependencies:** FR-2 (confirm via before/after fail-rate).
- **Acceptance criteria:** (a) global `afterEach` with `vi.restoreAllMocks()` +
  `vi.resetModules()` opt-in (or evidence it is unsafe and a narrower rule);
  (b) `estimate-cursor-identity.test.ts:90` and `recipient-proposals-page.test.tsx:171`
  no longer use real timers; (c) N-run fail-rate does not increase.
- **Validation:** Phase 3 before/after fail-rate; targeted reruns of both files.
- **Affected code:** `tests/vitest/setup.ts`, the two named files.
- **Risks:** over-resetting modules breaks tests that rely on import-time setup
  (RISK-7) → mitigate with per-file opt-in.

### FR-4 — Parallelism strategy written and safe for the perf suite
- **Statement:** A parallelism policy is documented and (if owner-approved)
  implemented such that non-perf test groups may run file-parallel while the
  perf suite stays serial, with the `--maxWorkers=1` script and
  `fileParallelism:false` kept consistent.
- **Rationale:** PROMPT "parallelism strategy"; DEC-2; `03` §2.1/§2.3.
- **Source:** PROMPT; `vitest.config.ts:9-17`.
- **Priority:** P1 (owner-gated for the implementation). **Dependencies:** FR-2,
  ASSUMP-6 falsified in T1.1.
- **Acceptance criteria:** (a) `06` §parallelism documents the model;
  (b) perf-suite assertions' meaning is unchanged (before/after render-count
  parity on a sample); (c) `test:dom` and `fileParallelism` stay consistent.
- **Validation:** Phase 1 perf-suite parity rerun.
- **Affected code:** `vitest.config.ts`, `package.json` (`test:dom`).
- **Risks:** RISK-2 (perf semantics shift).

### FR-5 — Quarantine policy with a ledger
- **Statement:** A quarantine policy defines what qualifies, how a test is
  quarantined, the ledger schema, the mandatory re-test date, and the
  replacement-proof requirement; manual by default, auto opt-in.
- **Rationale:** PROMPT "quarantine policy"; DEC-3; stop condition forbids
  hidden coverage loss.
- **Source:** PROMPT; `03` §5.4.
- **Priority:** P0. **Dependencies:** FR-2.
- **Acceptance criteria:** (a) `06` §quarantine policy + ledger schema;
  (b) every genuine flake found in Phase 0 has a ledger entry; (c) each entry
  has a replacement proof or explicit owner defer.
- **Validation:** ledger file exists; entries validate against schema.
- **Affected code:** new `.ai/.../quarantine-ledger` or repo path (T2.x).
- **Risks:** RISK-3 (quarantine erosion).

### FR-6 — Evidence reporting command
- **Statement:** A single command emits the timing + flake report (wall-clock,
  per-file p95, fail-rate, quarantine count) as JSON + human summary.
- **Rationale:** PROMPT "evidence reporting"; the executor must answer
  "faster or just greener?" with one command.
- **Source:** PROMPT.
- **Priority:** P0. **Dependencies:** FR-2.
- **Acceptance criteria:** (a) command exists; (b) JSON schema documented;
  (c) before/after diff supported.
- **Validation:** command runs and emits parseable JSON.
- **Affected code:** new `scripts/flakewatch-report.*` (T0.3/T5.1).

## PERF — Performance requirements

### PERF-1 — Measured flake rate within budget
- **Statement:** The file-level flake rate over N≥10 clean runs is measured and
  ≤ the owner-confirmed budget (recommended default ≤2%).
- **Rationale:** PROMPT "flake budget"; DEC-4 (definition of a flake).
- **Acceptance criteria:** (a) measured rate recorded; (b) ≤ budget or a Phase 3
  plan to reach it.
- **Validation:** Phase 0 N-run scan; Phase 3 before/after.

### PERF-2 — Wall-clock budget defined and measured
- **Statement:** A full-`validate` wall-clock budget is defined (baseline −
  delta) and measured; no regression without a recorded reason + replacement.
- **Rationale:** PROMPT "CI timing budgets"; `03` §2.1 (~525s).
- **Acceptance criteria:** (a) baseline + target recorded; (b) Phase 3 shows
  measurable reduction or a documented reason.

## REL — Reliability requirements

### REL-1 — Quarantine is reversible and time-bounded
- **Statement:** No quarantine is permanent; each entry has a re-test date ≤ 14
  days and an owner-review checkpoint.
- **Rationale:** RISK-3 mitigation; stop condition.
- **Acceptance criteria:** ledger entries have `retest_by` + `owner`.

### REL-2 — Retry rules documented and bounded
- **Statement:** Retry rules for vitest (no built-in retry → local rerun
  convention), playwright (`retries` currently 0), and CI are documented in a
  table with rationale.
- **Rationale:** PROMPT "retry rules"; `03` §2.2.
- **Acceptance criteria:** `06` §retry table complete; any change to
  playwright `retries` is owner-gated.

### REL-3 — No net coverage loss
- **Statement:** Coverage (assertion count + file count) after all phases is ≥
  before; any removal has a recorded replacement.
- **Rationale:** PROMPT constraint (hard). **Priority:** P0.
- **Acceptance criteria:** (a) before/after assertion/file counts; (b)
  quarantine ledger replacement column populated for every removal.

## OPS — Operations requirements

### OPS-1 — CI timing budget table (prescriptive, for re-enablement)
- **Statement:** A job-timing budget table exists for when CI is re-enabled,
  with per-job targets, a split-group strategy, and a total budget.
- **Rationale:** PROMPT "CI timing budgets"; `03` §3.
- **Acceptance criteria:** `13` §timing-budget-table complete.

### OPS-2 — CI re-enablement is owner-gated
- **Statement:** Re-enabling `.github/workflows/` CI is an explicit owner
  decision; the pack does not silently re-enable.
- **Rationale:** `03` §3 conflict; build-minute cost; AGENTS.md shared-worktree.
- **Acceptance criteria:** blocked decision recorded in `15`; Phase 4 gated.

### OPS-3 — Owner thresholds table
- **Statement:** A table of owner-gated thresholds (flake rate, wall-clock,
  p95, quarantine review cadence, retry count) with current value, recommended
  default, and decision owner.
- **Rationale:** PROMPT "owner thresholds".
- **Acceptance criteria:** `13` §owner-thresholds (or `15`) complete.

## TEST — Testing the harness itself

### TEST-1 — Harness changes validated by before/after measurement
- **Statement:** Every Phase 1/3 change is validated by a before/after timing +
  fail-rate measurement recorded in `19`.
- **Rationale:** PROMPT "clear before/after metrics".
- **Acceptance criteria:** `19` has a row per change with both columns.

## DOC — Documentation

### DOC-1 — Stability rationale migrated out of the inline comment
- **Statement:** The `vitest.config.ts:9-17` inline rationale is promoted to
  `06`/`15` and the comment is kept as a pointer (or kept + augmented) so the
  policy survives independent of one comment.
- **Acceptance criteria:** `06` §parallelism + `15` DEC-2 carry the rationale.

---

## Shadow-path matrices

### Shadow path: `validate` / `test:dom` execution

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Full `test:dom` run | all pass, ~525s, exit 0 | n/a | n/a (empty glob → vitest errors) | malformed test file → compile err | n/a (local) | n/a | **concurrent agent edits test file mid-run** → compile/behavior flake | local rerun convention | green report | Phase 0 baseline |
| Parallelized run (future) | faster wall-clock | n/a | n/a | n/a | n/a | n/a | **shared module state across parallel workers** → contamination | n/a | green + parity | T1.x perf parity |

### Shadow path: flake detection (`flakewatch`)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| N-run scan | JSON with fail-rates | missing test path → error | 0 tests → empty JSON | bad glob → error | n/a | n/a | **test file changed between runs** → invalid measurement (must abort) | scan itself is the retry probe | report | T0.2 |

### Shadow path: quarantine

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Quarantine a flake | ledger entry, test skipped-with-replacement | n/a | n/a | no replacement proof → reject | n/a | n/a | two agents quarantine same file → first-writer-wins | re-test at `retest_by` | coverage-neutral ledger | T2.x |

For each requirement, **what can go wrong / what the dev sees / what the system
records / how it's proven** is captured in the table rows above and in `12`.
