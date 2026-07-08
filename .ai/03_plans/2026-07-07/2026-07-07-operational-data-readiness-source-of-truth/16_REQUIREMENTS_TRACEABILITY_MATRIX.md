# 16 — Requirements Traceability Matrix

Maps every requirement through the full lifecycle. No requirement is untraced. Every task maps to ≥1 requirement.

| Requirement ID | Source | User outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-1 canonical home | brief + §3.4 | agent reads truth fast | P0,P3 | T-03 | `docs/OPERATIONAL_TRUTH.md` (new) | AC-FR-1a..e | DOC review; detector home-assertion | merge gate: home exists, Fast Facts answer 3 Qs | specified |
| FR-2 snapshot | brief | no hand-maintained numbers | P1 | T-01 | `scripts/generate-operational-truth-snapshot.ts`, `operational-truth.snapshot.json` | AC-FR-2a..e | `tests/unit/operational-truth-snapshot.test.ts` | merge gate: snapshot matches substrate | specified |
| FR-3 detector | brief | drift fails closed | P2,P4 | T-02,T-04 | `scripts/check-operational-truth-drift.mjs` | AC-FR-3a..e | `tests/unit/operational-truth-drift.test.ts` | merge gate: detector exit 0 on main; mutation suite green | specified |
| FR-4 update protocol | brief | drift doesn't recur | P3,P7 | T-03,T-11 | home `## Update protocol`; `13_ROLLOUT` table | AC-FR-4a,b | DOC review | merge gate: protocol section present | specified |
| FR-5 handoff rules | brief | agents consult home first | P5,P7 | T-05,T-11 | `AGENTS.md` bullet; home `## Agent handoff rules` | AC-FR-5a,b | `validate:agents` | merge gate: validate:agents green | specified |
| FR-6 recurring audit | brief | drift caught on cadence | P6 | T-10 | CI workflow / husky | AC-FR-6a,b | CI smoke (drift blocks PR) | rollout: first drift-PR blocked | specified |
| FR-7 dev-config caveat | §3.2 | no false truth from wrangler.next-dev | P3 | T-03 | home caveat line | AC-FR-7a | DOC review | merge gate: caveat present | specified |
| ARCH-1 home=snapshot-fed | derived | single flow | P1,P3 | T-01,T-03 | generator+home | architecture review | — | — | specified |
| DATA-1 snapshot not hand-edited | derived | snapshot integrity | P1,P2 | T-01,T-02 | generator marker; detector freshness assert | AC-DATA-1a | drift test AQ-stale-snapshot | merge gate: freshness assert | specified |
| SEC-1 no secrets | repo (`AGENTS.md`) | no leak | P1,P4 | T-01,T-04 | generator allowlist; secret-scan | AC-SEC-1a | snapshot test secret case | merge gate: secret-scan clean | specified |
| PERF-1 <2s | derived | pre-commit-friendly | P8 | T-13 | scripts | AC-PERF-1a | manual timing | rollout: timing recorded | specified |
| REL-1 fail-closed | derived | no silent pass | P2,P4 | T-02,T-04 | detector try/catch | AC-REL-1a | drift test malformed case | merge gate: malformed→exit 2 | specified |
| OPS-1 CI wiring | derived | automated gate | P6 | T-10 | workflow/husky | OPS-1 decision | CI smoke | rollout: gate active | specified (OPEN-2) |
| TEST-1 adversarial suite | derived | detector proven | P4 | T-04 | test file | AQ-1..8 | the suite itself | merge gate: suite green | specified |
| DOC-1 home=entrypoint | derived | discoverable | P3,P5,P7 | T-03,T-05,T-12 | pointers in AGENTS/README/sibling | AC-DOC-1a | DOC review | merge gate: pointers present | specified |

## Performance-sensitive requirements (none at runtime)

No requirement has a runtime performance baseline/target because the feature has no runtime path. PERF-1 is dev-tool latency only (evaluator in `12`).

## Coverage check

- Every requirement (FR-1..7, ARCH-1, DATA-1, SEC-1, PERF-1, REL-1, OPS-1, TEST-1, DOC-1) → has phase(s), task(s), code area(s), AC, test, rollout check. ✅
- Every task (T-01..T-13) → maps to ≥1 requirement (above). ✅
- No requirement deferred/out-of-scope without rationale. ✅ (Out-of-scope items are listed in `04`, not here.)
