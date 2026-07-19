# PACK-MANIFEST — Artifact Registry

## Artifact registry

| Artifact | Role | Topic owner | Freshness | Requirement traceability | Evidence traceability |
|---|---|---|---|---|---|
| `README.md` | index | lead | 2026-07-19 | all REQ-* | all EVID-* |
| `00-PLAN.md` | canonical-execution | lead | 2026-07-19 | REQ-001..008 | all EVID-* |
| `plan-pack.json` | canonical-execution (machine) | lead | 2026-07-19 | REQ-001..008 | all EVID-* |
| `04-FINDINGS-REGISTER.md` | findings register | lead | 2026-07-19 | REQ-001..008 | EVID-001..045 |
| `PACK-MANIFEST.md` | artifact registry | lead | 2026-07-19 | n/a | n/a |
| `LOOP_LEDGER.md` | audit ledger | lead | 2026-07-19 | n/a | commands-run.log |
| `units/UNIT-001-d1-recovery-posture.md` | unit | operator | 2026-07-19 | REQ-001 | EVID-014..018 |
| `units/UNIT-002-observability-alert-delivery.md` | unit | operator | 2026-07-19 | REQ-002 | EVID-039..043 |
| `units/UNIT-003-hosted-oauth-roundtrip.md` | unit | operator | 2026-07-19 | REQ-003 | EVID-028..033 |
| `units/UNIT-004-email-dns-topology.md` | unit | operator | 2026-07-19 | REQ-004 | EVID-034..038 |
| `units/UNIT-005-hosted-queue-do-r2-ops.md` | unit | operator | 2026-07-19 | REQ-005 | EVID-019..023, EVID-026..027 |
| `units/UNIT-006-release-gate-ritual.md` | unit | operator | 2026-07-19 | REQ-006, REQ-007 | EVID-001..012, EVID-044 |
| `units/UNIT-007-d1-parity-retention.md` | unit | operator | 2026-07-19 | REQ-008 | EVID-013..015 |
| `artifacts/provider-inventory.json` | inventory | lead | 2026-07-19 | REQ-005 | all EVID-* |
| `artifacts/evidence-layer-matrix.csv` | evidence-layer matrix | lead | 2026-07-19 | all REQ-* | EVID-001..045 |
| `artifacts/command-side-effect-inventory.csv` | command-side-effect inventory | lead | 2026-07-19 | n/a | commands-run.log |
| `artifacts/deployment-provenance.md` | deployment provenance | lead | 2026-07-19 | REQ-007 | EVID-001..004 |
| `artifacts/domain-route-matrix.csv` | domain-route matrix | lead | 2026-07-19 | REQ-003 | EVID-005..012 |
| `artifacts/d1-migration-parity.json` | migration parity | lead | 2026-07-19 | REQ-008 | EVID-013..015 |
| `artifacts/d1-backup-restore-readiness.md` | recovery readiness | lead | 2026-07-19 | REQ-001 | EVID-016..018 |
| `artifacts/r2-lifecycle-matrix.csv` | R2 lifecycle | lead | 2026-07-19 | REQ-005 | EVID-019..021 |
| `artifacts/queue-dlq-matrix.csv` | queue/DLQ | lead | 2026-07-19 | REQ-005 | EVID-022..023 |
| `artifacts/cron-job-matrix.csv` | cron jobs | lead | 2026-07-19 | REQ-005 | EVID-024..025 |
| `artifacts/durable-object-operations.md` | DO operations | lead | 2026-07-19 | REQ-005 | EVID-026..027 |
| `artifacts/auth-email-hosted-readiness.md` | auth + email readiness | lead | 2026-07-19 | REQ-003, REQ-004 | EVID-028..038 |
| `artifacts/observability-alert-evidence.md` | observability + alerts | lead | 2026-07-19 | REQ-002 | EVID-039..043 |
| `artifacts/recovery-scenario-matrix.csv` | recovery scenarios | lead | 2026-07-19 | REQ-006 | all EVID-* |
| `artifacts/release-gate.json` | release gate | lead | 2026-07-19 | REQ-006 | all EVID-* |
| `artifacts/findings.json` | findings machine-readable | lead | 2026-07-19 | REQ-001..008 | EVID-001..045 |
| `artifacts/rejected-refuted-findings.json` | rejected register | lead | 2026-07-19 | n/a | n/a |
| `artifacts/existing-pack-overlap.json` | overlap matrix | lead | 2026-07-19 | n/a (REQ-009 dropped at E-0010) | n/a |
| `artifacts/commands-run.log` | command log | lead | 2026-07-19 | n/a | commands-run.log |
| `evidence/hosted-probe-2026-07-19T06-39Z.md` | hosted probe | lead | 2026-07-19 | REQ-003, REQ-004 | EVID-001..012, EVID-036..038 |

## Coverage map (audit domain → artifact)

| Audit domain | Primary artifact | Unit |
|---|---|---|
| O-01 Deployment identity | `deployment-provenance.md` | UNIT-006 |
| O-02 Domain/TLS/cache/edge | `domain-route-matrix.csv` | UNIT-006 |
| O-03 D1 migration parity | `d1-migration-parity.json` | UNIT-007 |
| O-04 D1 backup/restore | `d1-backup-restore-readiness.md` | UNIT-001 |
| O-05 R2 lifecycle | `r2-lifecycle-matrix.csv` | UNIT-005 |
| O-06 Queues + DLQs | `queue-dlq-matrix.csv` | UNIT-005 |
| O-07 Cron + scheduled jobs | `cron-job-matrix.csv` | UNIT-002 / UNIT-007 |
| O-08 DO + realtime ops | `durable-object-operations.md` | UNIT-005 |
| O-09 Better Auth / OAuth / magic-link | `auth-email-hosted-readiness.md` | UNIT-003 |
| O-10 Cloudflare Email | `auth-email-hosted-readiness.md` | UNIT-004 |
| O-11 Observability + alerts | `observability-alert-evidence.md` | UNIT-002 |
| O-12 Controlled-beta release | `release-gate.json` + `recovery-scenario-matrix.csv` | UNIT-006 |

## Freshness policy

- All artifacts dated 2026-07-19.
- Evidence in `evidence/` is point-in-time and labeled with the probe
  timestamp.
- `release-gate.json` is the renewable artifact — updated at each cohort wave.

## Topic ownership

- **Lead**: pack structure, plan-pack.json, findings, matrices, evidence
  capture.
- **Operator (Philip)**: hosted verification actions defined by UNIT-001..007.
- No subagent owns any artifact; all subagent work was read-only investigation
  consumed by the lead.
