# PACK-MANIFEST — Artifact Registry

| Artifact | Role | Topic owner | Freshness | Traces to |
|---|---|---|---|---|
| `README.md` | entrypoint | lead | 2026-07-19 | REQ-001..004 |
| `00-PLAN.md` | canonical-execution | lead | 2026-07-19 | REQ-001..004, DEC-AUTO-001..005, AUTH-001..003, RISK-001..004 |
| `UNIT-CATALOG.md` | unit-catalog | lead | 2026-07-19 | UNIT-001..UNIT-011, REQ-002..REQ-003 |
| `PACK-MANIFEST.md` | manifest | lead | 2026-07-19 | (this file) |
| `LOOP_LEDGER.md` | recovery | lead | 2026-07-19 | audit events, decisions, evidence |
| `plan-pack.json` | machine-truth | lead | 2026-07-19 | all stable IDs |
| `artifacts/commercial-truth-model.md` | truth-model | lead | 2026-07-19 | REQ-001 |
| `artifacts/source-to-output-truth-graph.md` | truth-graph | lead | 2026-07-19 | REQ-001, F-01..F-12 |
| `artifacts/calculation-consumer-matrix.csv` | consumer-matrix | lead | 2026-07-19 | REQ-001, CC-01..CC-32 |
| `artifacts/data-invariant-matrix.csv` | invariant-matrix | lead | 2026-07-19 | REQ-001, I-01..I-16 |
| `artifacts/d1-lifecycle-matrix.csv` | lifecycle-matrix | lead | 2026-07-19 | REQ-003, DL-01..DL-40 |
| `artifacts/template-variant-lineage.md` | lineage | lead | 2026-07-19 | REQ-001, I-05, I-06 |
| `artifacts/publication-version-truth.md` | publication-truth | lead | 2026-07-19 | REQ-001, I-09, I-16 |
| `artifacts/golden-cases.json` | golden-spec | lead | 2026-07-19 | REQ-001, G01..G20 |
| `artifacts/golden-oracle/oracle.mjs` | golden-oracle | lead | 2026-07-19 | REQ-001 |
| `artifacts/golden-results.json` | golden-evidence | lead | 2026-07-19 | REQ-001, EVID-001 |
| `artifacts/xlsx-inspection/inspect.mjs` | xlsx-inspector | lead | 2026-07-19 | REQ-001, F-08 |
| `artifacts/xlsx-inspection/audit-fixture.xlsx` | xlsx-artifact | lead | 2026-07-19 | F-08, EVID-003 |
| `artifacts/xlsx-inspection/result.json` | xlsx-evidence | lead | 2026-07-19 | F-08, EVID-003 |
| `artifacts/findings.json` | findings-register | lead | 2026-07-19 | REQ-002, F-01..F-12, EVID-002 |
| `artifacts/rejected-refuted-findings.json` | rejected-register | lead | 2026-07-19 | REQ-002, R-01..R-10 |
| `artifacts/existing-pack-overlap.json` | overlap-matrix | lead | 2026-07-19 | REQ-002 |
| `artifacts/adversarial-challenge.md` | challenge-pass | lead | 2026-07-19 | REQ-002, F-01/F-02/F-04/F-09 |
| `artifacts/commands-run.log` | evidence-log | lead | 2026-07-19 | REQ-001..004, EVID-001..004 |
| `evidence/parity-test-output.txt` | raw-evidence | lead | 2026-07-19 | F-01, EVID-AUD-001 |

## Requirement / evidence traceability

| Requirement | Units | Evidence |
|---|---|---|
| REQ-001 canonical contract proven | (artifact-only) | EVID-001 (golden matrix 20/20), EVID-003 (XLSX inspection), commercial-truth-model.md |
| REQ-002 divergences filed with one owner | UNIT-001..UNIT-011 | EVID-002 (findings.json + adversarial-challenge.md + overlap matrix) |
| REQ-003 partial-write / recovery gaps filed | UNIT-002 | EVID-003 (d1-lifecycle-matrix.csv + F-09) |
| REQ-004 validator pass + one next unit | (artifact-only) | EVID-004 (validator pass on plan-pack.json) |

## Freshness policy

Artifacts are baseline-pinned to `b2a934919ce499c0404e5b9f9a5644f22757c78a`.
Any change to the audited source surfaces (`src/lib/estimates/*`,
`src/lib/proposal-export/*`, `src/lib/publication/*`, `src/lib/share/*`,
`src/lib/client-portal/*`, `src/lib/component-library/*`,
`src/lib/project-charts/*`, `src/lib/ai/package-builder/*`,
`src/lib/repositories/estimate-health-repository.ts`, migrations touching
commercial tables) invalidates the affected evidence. Re-run the golden
oracle and re-execute the parity test before relying on any finding.
