# 15 — Decisions, Assumptions, and Alternatives

Load-bearing decisions (with rationale + rejected alternatives), assumptions
(with validation status), and the blocked-decisions table referenced by `README`.

## Load-bearing decisions

### DEC-1 — Measure before fixing
**Problem:** The reliability posture is implicit; speed/flake claims would be
unfalsifiable without a baseline.
**Options considered:**
- (A) Establish a measured baseline (Phase 0) before any remediation. ✅
- (B) Ad-hoc per-test speedups with no baseline.
**Why A:** Option B is the exact anti-pattern the PROMPT warns against ("clear
before/after metrics"). Without measurement you cannot prove a change helped or
prove coverage was preserved. This is the one-sentence summary of the pack.
**Consequences:** Phase 0 is a hard prerequisite; no fix lands before it.

### DEC-2 — Perf suite stays serial; file-parallelism only for non-perf groups
**Problem:** `fileParallelism:false` is global and "load-bearing" for perf-suite
serial semantics (`vitest.config.ts:11-17`). Removing it changes what every
perf render-count/timing assertion means.
**Options considered:**
- (A) Keep `fileParallelism:false` for the perf project; allow file-parallelism
  only for non-perf test groups via Vitest 4 `projects` (`--project`), once
  confirmed. ✅
- (B) Remove `fileParallelism:false` globally and parallelize everything.
- (C) Leave everything serial forever.
**Why A:** B silently breaks perf assertions (RISK-2). C leaves the ~525s
wall-clock unaddressed. A targets the wall-clock without touching perf semantics.
**Owner-gated:** changing global parallelism is OPEN-2 (owner confirms the perf
suite is isolated before non-perf groups go parallel).
**Conditions that would change this:** if Phase 0 shows the perf suite is a tiny
fraction of wall-clock, C (stay serial) may be acceptable and simpler.

### DEC-3 — Quarantine is manual by default; auto-quarantine is an owner opt-in
**Problem:** Automatic quarantine on N failures could hide coverage loss behind
automation — directly violating the "no hidden coverage loss" stop condition.
**Options considered:**
- (A) Manual quarantine: a human/agent adds a ledger entry with owner + re-test
  date + replacement evidence. Auto-quarantine available behind an owner flag. ✅
- (B) Automatic quarantine on N failures.
**Why A:** B erodes coverage invisibly over time (RISK-3). A makes every removal
a visible, owned, dated decision with a re-green plan.

### DEC-4 — Flake definition
**Problem:** "Flake" must be unambiguous to measure it.
**Decision:** A flake is a test that fails in a clean run and passes on immediate
retry **with no code or fixture change**. Capture requires N≥5 clean runs.
A deterministic failure is a bug, not a flake.
**Rejected alternative:** "any test that fails sometimes" — too loose; conflate
environmental failures (missing env) with flakes.

### DEC-5 — Removing coverage for speed requires a recorded replacement
**Problem:** The PROMPT forbids removing coverage for speed without replacement
proof.
**Decision:** Any deletion/`.skip` for speed must record a replacement (faster
test, contract assertion, or e2e proof) in the quarantine ledger (FR-5). The
no-coverage-loss gate (REL-3, enforced by the coverage-count invariant in `12`)
enforces this mechanically.
**Source:** PROMPT constraints.

## Assumptions (validation status)

| ID | Assumption | Status | Evidence / falsification |
|---|---|---|---|
| ASSUMP-1 | Vitest is the DOM/component runner; bun-test is a separate unit runner | validated | `package.json` `test` vs `test:dom` |
| ASSUMP-2 | `fileParallelism:false` protects perf-suite serial semantics | validated | `vitest.config.ts:9-17` |
| ASSAMP-3 | No flake-quarantine skips exist; all skips are env/auth gates | validated | `19` §A skip classification |
| ASSUMP-4 | CI is disabled, contradicting the brief's "CI runs…" | validated (conflict) | empty `.github/workflows/`; recorded in `02` |
| ASSUMP-5 | The ~525s figure and ">15s individual tests" are still accurate | **to-falsify** | Phase 0 baseline run |
| ASSUMP-6 | Vitest 4 project filtering (`--project`) can isolate the perf suite | **to-falsify** | Phase 1 task T1.1 discovery |

## Blocked decisions (owner-gated)

| Decision | Owner | Why external | Options | Recommendation | Impact if deferred |
|---|---|---|---|---|---|
| OPEN-1: max acceptable flake rate | Philip | product/reliability call | ≤1% strict / ≤2% default / ≤5% lenient | ≤2% default (per-branch, 10-run) | Phase 2 ships with recommended default; final number pending |
| OPEN-2: allow non-perf file-parallelism | Philip | changes perf-suite serial guarantee | keep serial / isolate perf + parallelize rest / full parallel | isolate + parallelize rest, gated on Phase 1 T1.1 | Phase 1 ships conservative (serial) by default |
| OPEN-3: re-enable CI | Philip | operations decision; build-minute cost | keep disabled / re-enable with budget / re-enable split-group | re-enable split-group with timing budget (Phase 4) | measurement/baseline phases proceed; CI-edit steps blocked |
| OPEN-4: quarantine auto vs manual | Philip | changes merge-time feedback | manual / auto behind flag | manual default, auto opt-in (DEC-3) | Phase 2 ships manual default |

Every blocked decision has a recommended default, so the plan is implementable
in a conservative posture without the owner; the owner only needs to act to
*loosen* (parallelize, re-enable CI, raise the flake budget).
