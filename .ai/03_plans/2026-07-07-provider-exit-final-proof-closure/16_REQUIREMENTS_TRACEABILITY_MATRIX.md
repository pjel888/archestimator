# 16 — Requirements Traceability Matrix

Every requirement maps to source evidence, an implementation task, an
acceptance criterion, a validation method, and test coverage. No requirement
is untraced.

| Requirement ID | Source | User/system outcome | Impl phase | Task IDs | Code/doc areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-PE-01 | PROMPT "proof checklist" | 12-gate closure checklist | planning | (doc) | `03_…` §3.7, `07_…` §7.5 | AC-FR-01a/b/c | `12_…` G2/G3 | gate table complete | implemented |
| FR-PE-02 | PROMPT "export/retention decision" | 3-decision framework + rollback | P1 | T-1.1,T-1.3 | `07_…` §7.4, `13_…` §13.5 | AC-FR-02a/b/c | `12_…` AQ-3 | gate 7 PASS | implemented (rule); outcome BLOCKED-EXTERNAL |
| FR-PE-03 | PROMPT "smoke checks" | read-only smoke command list | P2 | T-2.1,T-2.3 | `13_…` §13.3 | AC-FR-03a/b/c | `12_…` G-smoke, AQ-6 | gate 10 PASS | implemented (procedure); run BLOCKED-EXTERNAL |
| FR-PE-04 | PROMPT "data-loss rules" | data-loss acceptance rule | P1 | T-1.1 | `07_…` §7.4 | AC-FR-02c | `12_…` AQ-3 | DEC-PE-03 enforced | implemented |
| FR-PE-05 | PROMPT "operator evidence format" | sanitized 6-section schema | planning | (doc) | `07_…` §7.6 | AC-FR-05a/b | `12_…` G2 | schema matches generator | implemented |
| FR-PE-06 | PROMPT "rollback/no-rollback record" | decision record table | planning | (doc) | `13_…` §13.5 | AC-FR-02b | `12_…` review | table complete | implemented |
| FR-PE-07 | PROMPT "no-mutation verification path" | safe read-only path | planning | (doc) | `13_…` §13.4 | AC-FR-07a/b | `12_…` G1-G5 | path in-bounds | implemented |
| ARCH-PE-01 | PROMPT "distinguish evidence classes" | taxonomy applied per gate | planning | (doc) | `03_…` §3.7 | Class column complete | `12_…` review | every gate classified | implemented |
| ARCH-PE-02 | directive §8A provider overlay | generator trust boundary | planning | (doc) | `03_…` §3.7, `18_…` | gap note present | `12_…` AQ-5 | documented | implemented |
| SEC-PE-01 | PROMPT "keep secrets out" | sanitized record boundary | planning | (doc) | `08_…` §8.3 | boundary verbatim | `12_…` G5, AQ-1 | review gate | implemented |
| SEC-PE-02 | directive §7 credential taxonomy | material distinctions | planning | (doc) | `08_…` §8.4 | taxonomy table | `12_…` AQ-9 | distinctions present | implemented |
| SEC-PE-03 | AGENTS.md, PROMPT Constraints | provider boundary | planning | (doc) | `08_…` §8.5, `13_…` §13.4 | path in-bounds | `12_…` AQ-5 | no mutation | implemented |
| DATA-PE-01 | PROMPT | decision precedes closure claim | P1 | T-1.1 | `07_…` §7.4 | gate 7 PASS first | `17_…` pass-condition | gate 7 | rule implemented; outcome blocked |
| DATA-PE-02 | AGENTS.md cost posture | D1 backup as cheap recovery | planning | (doc) | `13_…` §13.5 | table cites restore-rehearsal | `12_…` review | posture documented | implemented |
| REL-PE-01 | PROMPT "post-exit smoke" | smoke sequenced + recorded | P2 | T-2.1,T-2.3 | `13_…` §13.3 | AC-FR-03c | `12_…` AQ-6, AQ-10 | gate 10 PASS | implemented; run blocked |
| REL-PE-02 | PROMPT Constraints | no-mutation until decision | planning | (doc) | DEC-PE-02, `13_…` §13.4 | procedure read-only | `12_…` AQ-5 | enforced | implemented |
| TEST-PE-01 | directive | pack regeneration is verifier | P5 | T-5.1,T-5.2 | `12_…` G3 | providerExitReady=true | `12_…` G3 | gate PASS | implemented; outcome blocked |
| TEST-PE-02 | directive | generator tests stay green | n/a | — | `tests/vitest/provider-exit-pack-script.test.ts` | tests pass | `12_…` matrix | no generator change | n/a |
| DOC-PE-01 | directive §9 | README entrypoint | planning | (doc) | `README.md` | sections complete | `17_…` audit | README ready | implemented |
| DOC-PE-02 | directive | current-state update deferred | P6 | T-6.2 | `13_…` §13.8 | recommendation logged | `12_…` review | future task | documented |

## Performance-sensitive requirements

None. No requirement has a performance budget because closure has no runtime
performance surface (justified in `09_…` §9.5). If a future task couples
closure to a code change, that task must add baseline/target/evaluator.

## Cross-check summary

- Requirements: 20 (FR-01..07, ARCH-01..02, SEC-01..03, DATA-01..02,
  REL-01..02, TEST-01..02, DOC-01..02).
- All traced to source + task + AC + validation.
- Open/blocked: FR-02 outcome, FR-03 run, DATA-01 outcome, REL-01 run,
  TEST-01 outcome — all externally blocked (OPEN-PE-01..04), not internally
  resolvable.
- Internally-resolvable closure procedure: implementation-ready.
