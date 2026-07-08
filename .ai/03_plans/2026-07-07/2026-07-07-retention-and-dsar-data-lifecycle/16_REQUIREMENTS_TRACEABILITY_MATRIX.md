# 16 — Requirements Traceability Matrix

Every requirement maps to source evidence, implementation task(s), acceptance criteria, validation, test coverage, and rollout check. No requirement is untraced.

| Requirement ID | Source | User Outcome | Implementation Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-INV-001 | brief + doc | Complete data inventory | Phase 0 | T-0.1 | `07_` §1 | inventory cross-checked vs migrations | doc review | n/a | planned (done in pack) |
| REQ-RET-001 | repo | Single TTL source | Phase 1 | T-1.2 | `retention-core.ts` | one constant; no drift | `rg` literal check | n/a | planned |
| REQ-RET-002 | doc + owner | Draft TTLs marked | Phase 1 | T-1.2 | `retention-core.ts` | draft marker present | doc review | `OPEN-DEC-004` gate | planned |
| REQ-RET-003 | repo | 14 classes enforced | Phase 1 | T-1.1, T-1.2 | `retention-core.ts`, DB-05 | registry length === union | unit test | cron 30-day | planned |
| REQ-RET-004 | doc | Non-purge actions wired | Phase 1 | T-1.3 | `retention-core.ts` | UPDATE not DELETE for actions | repo test | n/a | planned |
| REQ-RET-005 | doc + owner | Legal hold | Phase 2 | T-2.4, DB-04 | migration, engine | hold prevents purge | repo test | `OPEN-DEC-006` gate | blocked-external (policy) |
| REQ-DSAR-001 | repo + doc | Admin triage | Phase 2 | T-2.1, T-2.2, T-2.3 | `privacy-request-repository.ts`, admin route/UI | transitions enforced + audited | unit + role-matrix | dashboard | planned |
| REQ-DSAR-002 | brief + repo | DSAR export | Phase 3 | T-3.1, T-3.2 | `dsar-export-builder.ts`, admin route | package complete; rate-limited | builder + integration + rate-limit | export enable | planned (format `OPEN-DEC-008`) |
| REQ-DSAR-003 | doc | DSAR erasure | Phase 4 | T-4.1–T-4.6 | orchestrator, migrations, R2, Better Auth | propagation complete; idempotent; receipt | orchestrator + R2 + idempotency + denial | `OPEN-DEC-007` gate | planned (erasure default off) |
| REQ-DSAR-004 | repo | Intake (existing) | Phase 0 | T-0.2 | existing | existing tests green | existing | n/a | planned (verify) |
| REQ-CRON-001 | repo | Env-gated dry-run | Phase 1 | T-1.4 | `worker.ts`, `retention-repository.ts` | dry-run no DELETE | cron test | dry-run staging | planned |
| REQ-CRON-002 | repo | Per-run audit + idempotency | Phase 1 | T-1.2, T-1.4 | `retention-core.ts` | cron_run_id populated | repo test | 30-day | planned |
| REQ-CRON-003 | doc | 30-day hosted observation | Phase 5 | T-5.1, T-5.3 | hosted Worker | ≥30 distinct days; error-skip ≤ threshold | hosted query | compliance gate | planned (hosted proof) |
| REQ-R2-001 | doc | DSAR R2 tombstone+purge | Phase 4 | T-4.1, T-4.4, T-4.5 | `upload_assets`, orchestrator, purge sweep | tombstone + 30d purge + receipt | R2 receipt test | dashboard | planned |
| REQ-R2-002 | repo | Receipt format | Phase 4 | T-4.4 | R2 `provider-proof/dsar/` | schema documented; written | receipt test | n/a | planned |
| REQ-LOG-001 | official + doc | Workers Obs retention documented | Phase 1 + `13_` | T-1.2 (acceptance row) | `18_`, `data_retention_events` | acceptance row; doc | doc + hosted readback | readback | planned |
| REQ-LOG-002 | doc | Email log retention documented | Phase 1 | T-1.2 | `18_`, `data_retention_events` | acceptance row; doc | doc + hosted readback | readback | planned |
| REQ-LOG-003 | repo | Structured-log redaction | Phase 5/6 | (in T-6.1) | `worker.ts`, orchestrator | no fixture PII in logs | log-grep test | n/a | planned |
| REQ-EVID-001 | brief + repo | Unified audit trail | Phase 1 + DSAR | T-1.1, T-2.1, T-3.2, T-4.4 | `data_retention_events` | every action → audit row | repo tests | dashboard | planned |
| REQ-EVID-002 | brief | Runbook + dashboard | Phase 5/6 | T-5.2, T-6.3 | `13_`, dashboard | queries runnable; runbook covers incidents | doc review | ops | planned |
| REQ-LEGAL-001 | doc | `OPEN-DEC-004` isolated | n/a | n/a | `15_` | draft values; no policy claim | doc review | sign-off | blocked-external |
| REQ-LEGAL-002 | doc | `OPEN-DEC-002` isolated | Phase 2 | T-2.x (disabled) | `15_` | email path designed, disabled | doc review | sign-off | blocked-external |
| REQ-LEGAL-003 | owner | `OPEN-DEC-006/007/008` | n/a | n/a | `15_` | options + recommendations recorded | doc review | sign-off | blocked-external |
| REQ-TEST-001 | brief + directive | Full test coverage | Phase 6 | T-6.1, T-6.2 | `12_`, `19_` | matrix complete; no REQ untraced | test run | release gate | planned |

## Supporting tasks (bidirectional trace note)

The matrix above maps REQ → primary implementation tasks. These tasks are *supporting/derived* (not requirement-bearing on their own) and trace to the REQs they serve:

| Task | Serves REQ | Role |
|---|---|---|
| T-1.5 (`cf:d1-retention-proof` evaluator) | REQ-CRON-001, PERF-01 | evidence harness |
| T-4.2 (Better Auth revocation DISCOVERY) | REQ-DSAR-003 | falsifiable discovery step |
| T-4.3 (`dsar-propagation-map.ts`) | REQ-DSAR-003 | declarative map consumed by T-4.4 |
| T-6.4 (docs closeout) | REQ-LEGAL-001/002/003, REQ-EVID-002 | status bumps + runbook publication |

Every task in `11_` maps to ≥1 requirement (directly in the matrix or as a supporting task above).

## Performance-sensitive requirements (additional perf mapping)

| Requirement | Baseline metric | Target metric | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| REQ-RET-003/REQ-CRON-001 (cron) | local seeded p95 | < 30s @ 10× | `cf:d1-retention-proof` + hosted `data_retention_events` | +50% p95 or +30% queries | `RETENTION_DRY_RUN=1` |
| REQ-DSAR-002 (export) | local fixture | < 3s typical / < 30s large | builder test | +50% | disable export |
| REQ-DSAR-003 (erasure) | local fixture | < 10s | orchestrator test | +50% | disable erasure |

No requirement is untraced. Every implementation task in `11_` maps back to ≥1 requirement.
