# 16 — Requirements Traceability Matrix

Every requirement traces to source, implementation task, acceptance criterion, validation, test,
and rollout check. No requirement is untraced.

| Req ID | Source | User/system outcome | Phase / Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| FR-01 | brief + repo | enumerated alert scenarios | P1 / P1-T1 | `alert-scenarios.ts` (new) | AC-FR-01a/b | `alert-scenarios.test.ts` | GATE-01 catalog present | planned |
| FR-02 | brief | each scenario has ≥1 free channel | P1 / P1-T3..T9 | `alert-scenarios.ts`, email helper | AC-FR-02a/b/c | per verify-script self-test | GATE-02 channels live | planned |
| FR-03 | brief (stop cond) | artifact receipt replaces flag | P1 / P1-T2 | `alert-proof-schema.ts` (new), readiness script | AC-FR-03a/b/c/d | `alert-proof-schema.test.ts`, readiness test | GATE-01 | planned |
| FR-04 | brief + repo | per-scenario verify scripts | P1 / P1-T3..T9 | `scripts/verify-*-alert-delivery.ts` | AC-FR-04a/b/c | script self-tests, TEST-03 | GATE-02 (critical scenarios provider-backed) | planned |
| FR-05 | brief | queryable incident record | P4 / P4-T1,T2,T3 | migration `0040`, `incident-record.ts` (new) | AC-FR-05a/b/c/d | `incident-record.test.ts` | hosted migration readback | planned |
| DATA-01 | derived | incident tables | P4 / P4-T1 | `migrations/0040` | AC-DATA-01a/b/c | local migrate + EXPLAIN | hosted D1 migrate | planned |
| DATA-02 | brief + repo | 7 classes enforced | P3 / P3-T2 | `retention-core.ts` | AC-DATA-02a/b/c/d/e | `compliance-retention-repository.test.ts` (extend) | dry-run hosted | planned |
| DATA-03 | official + repo | corrected logs TTL | P3 / P3-T1 | `retention-schedule.md` | AC-DATA-03a/b/c | static doc review | schedule corrected | planned |
| DATA-04 | brief | evidence retention policy | P3 / P3-T3 | `.gitignore`, readiness prune | AC-DATA-04a/b/c | redaction-scan test | artifacts pruned | planned |
| OPS-01 | brief | triage ownership matrix | P2 / P2-T2 | readiness script | AC-OPS-01a/b | readiness test (owners required) | GATE-01 owners non-empty | planned |
| OPS-02 | brief + repo | structured alert events | P2 / P2-T1 | `alert-events.ts` (new), `operational-telemetry.ts` | AC-OPS-02a/b | `alert-events.test.ts`, redaction scan | events queryable | planned |
| OPS-03 | brief | first-24h/72h reviews | P6 / P6-T2 | runbook, readiness | AC-OPS-03a/b | GATE-03 static review | review receipts | planned |
| SEC-01 | brief | redaction inventory (no fix here) | P5 (doc) | `08_…` inventory | AC-SEC-01a/b/c | static review | sibling SEC-01 consumes | planned |
| SEC-02 | brief (C-1) | artifacts redacted + scanned | P5 / P5-T2 | proof scripts, `alert-proof-redaction-scan.test.ts` | AC-SEC-02a/b/c | redaction-scan test | GATE-01 scan clean | planned |
| GATE-01 | brief (stop cond) | verifier artifact-driven, fails loud | P5 / P5-T1 | readiness script | AC-GATE-01a/b | readiness test | launch gate | planned |
| GATE-02 | brief (C-2) | provider-backed for critical scenarios | P5 / P5-T1 | readiness script | AC-GATE-02a/b | readiness test (rejects local-automated) | launch gate | planned |
| GATE-03 | brief | first-24h/72h gates | P6 / P6-T2 | runbook | AC-OPS-03a/b | static review | post-launch mandatory | planned |
| TEST-01 | repo | unit tests for new code | P1-P5 | test files (matrix `12_…`) | tests green | vitest | merge gate | planned |
| TEST-02 | brief | verifier + redaction-scan tests | P5 / P5-T1,T2 | readiness + scan tests | fail-on-missing/stale/unredacted | vitest | merge gate | planned |
| TEST-03 | derived | catalog/registry agreement | P1 / P1-T10 | `alert-proof-registry.test.ts` | ids match | vitest | CI | planned |
| DOC-01 | brief | runbook | P6 / P6-T1 | `13_…` | runbook complete | static review | ops | planned |

## Source-strength summary

- `brief`: FR-01/02/03/04/05, OPS-01/03, SEC-01/02, GATE-01/02/03, DOC-01, DATA-04 (PROMPT bullets).
- `repo`: FR-04 (verify-upload model), OPS-02 (swallowed failure), DATA-02 (7-of-14 rules).
- `official`: DATA-03 (Cloudflare free-tier log retention ~3d).
- `derived`: DATA-01 (no incident table), TEST-03.

## Performance-sensitive requirements mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| OPS-02 alert latency | none | per `09_…` table | verify-script receipts (`sentAt`/`ackObservedAt`) | per-scenario | fall back to secondary channel |
| DATA-02 retention cost | 7 rules, unbounded | +2 actionable rules, bounded | retention-repository test + hosted `data_retention_events` | >10k rows or >120s/tick | `ARCH_RETENTION_DRY_RUN=1` |

## No requirement untraced / no task without a requirement

- Every P*-T* task maps to ≥1 req above.
- Every req maps to ≥1 task + test + rollout check.
