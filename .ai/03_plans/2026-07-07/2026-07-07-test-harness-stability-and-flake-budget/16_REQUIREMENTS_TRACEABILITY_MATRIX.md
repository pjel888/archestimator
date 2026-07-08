# 16 — Requirements Traceability Matrix

Every requirement traces through source → task → acceptance → test → rollout.
No requirement is untraced. PROMPT required-pack items are mapped explicitly at
the top so the stop condition is auditable.

## PROMPT required-pack item → requirement → evidence

| PROMPT item | Requirement | Plan section | Evidence |
|---|---|---|---|
| current test inventory | FR-1 | `03` §1 | `find … \| wc -l` ≈634/6/9 |
| slowest/flakiest candidates | FR-2, PERF-1 | `03` §4-5, `19` §A | Phase 0 flakewatch JSON |
| fixture cleanup | FR-3 | `03` §6, `11` T3.1/T3.2 | N-run fail-rate before/after |
| parallelism strategy | FR-4, DEC-2 | `06` §parallelism, `11` Phase 1 | perf parity rerun |
| quarantine policy | FR-5, REL-1, DEC-3 | `06` §quarantine, `11` Phase 2 | ledger + validator |
| CI timing budgets | OPS-1 | `13` §timing-budget-table | (prescriptive, measured on re-enable) |
| retry rules | REL-2 | `06` §retry, `13` | retry table |
| evidence reporting | FR-6, TEST-1 | `11` T0.2/T0.3/T5.1 | flakewatch JSON + report |
| owner thresholds | OPS-3 | `13` §owner-thresholds | table |

**Stop condition check:** "a future executor can improve test reliability with
clear before/after metrics and no hidden coverage loss" → covered by FR-2/FR-6
(before/after metrics) + FR-5/REL-3 (no hidden coverage loss via ledger +
coverage-count invariant). ✅

## Full traceability

| Requirement ID | Source | Outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-1 | PROMPT | machine-verifiable inventory | 0 | T0.1 | `tests/**` | counts ±5% | `find` reproducible | n/a | traced |
| FR-2 | PROMPT | measured slow/flaky ranking | 0 | T0.2,T0.4 | `scripts/flakewatch.mjs` | JSON parses, N≥10 | flakewatch | n/a | traced |
| FR-3 | `03` §6 | no cross-test contamination | 3 | T3.1,T3.2 | `setup.ts`, 2 files | fail-rate ≤ baseline | N-run | weekly | traced |
| FR-4 | PROMPT | safe parallelism | 1 | T1.1,T1.2 | `vitest.config.ts` | perf parity | parity rerun | per-release | traced (owner-gated) |
| FR-5 | PROMPT | quarantine policy + ledger | 2 | T2.1-T2.3 | ledger, validator | schema valid | validator unit | weekly audit | traced |
| FR-6 | PROMPT | evidence command | 0,5 | T0.3,T5.1 | `flakewatch-report.mjs` | emits JSON/diff | report unit | n/a | traced |
| PERF-1 | PROMPT | flake rate ≤ budget | 0,3 | T0.4,T3.3 | flakewatch | rate ≤2% (rec) | N=10 scan | per-release | traced (number owner-gated) |
| PERF-2 | PROMPT | wall-clock budget | 0,3 | T0.4,T3.3 | flakewatch | baseline − delta | timing JSON | per-release | traced |
| REL-1 | stop condition | quarantine reversible | 2 | T2.2 | ledger | retest_by ≤14d | validator | cadence | traced |
| REL-2 | PROMPT | retry rules | 2 | T2.4 | `playwright.config.ts` | table complete | read-back | n/a | traced |
| REL-3 | PROMPT (hard) | no coverage loss | 3 | T3.3 | all touched | count ≥ baseline | coverage count | per-release | traced |
| OPS-1 | PROMPT | CI timing budget | 4 | T4.1 | `13`, ci.yml | table complete | review | on re-enable | traced |
| OPS-2 | `03` §3 | CI re-enable owner-gated | 4 | T4.2 | `.github/workflows/` | owner decision | n/a | owner | traced (blocked) |
| OPS-3 | PROMPT | owner thresholds | 5 | T5.2 | `13` | table complete | review | cadence | traced |
| TEST-1 | PROMPT | before/after per change | 1,3 | T1.*,T3.* | flakewatch | `19` row per change | flakewatch | per-release | traced |
| DOC-1 | quality bar | rationale out of comment | 5 | T5.1 | `vitest.config.ts` comment | pointer present | review | n/a | traced |

## Performance-sensitive requirements → baseline/target/measurement

| Requirement | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-1 | unknown (Phase 0) | ≤2% (rec) | flakewatch N=10 | > budget | quarantine + Phase 3 |
| PERF-2 | ~525s (Phase 0 confirm) | baseline − delta | flakewatch wall-clock | +10% | revert change |
| FR-4 (perf parity) | Phase 0 perf assertions | unchanged | perf subset rerun | any `===0`/`===1` change | revert to serial |
