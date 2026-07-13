# 09 — Performance, Reliability, and Observability

## §1. Performance evaluator contract (PERFORMANCE-GOAL)

### Evaluator PERF-01 — Retention cron pass
- **Baseline metric**: per-class `rows_affected` + total cron run duration (ms), today (local dry-run on a seeded D1).
- **Target metric**:
  - Cron run p95 < 30s for the full 14-class pass at 10× current volume.
  - D1 query count ≤ ~70/run (14 classes × ~5 queries: select + apply + audit + optional index reads).
  - Zero `skipped: error` rows over 30 hosted days (alert at >0).
- **Measurement command** (to be created in implementation): `bun run cf:d1-retention-proof` — a script that runs the pass against a local seeded D1, records per-class duration + query count + rows affected, and emits a JSON evidence artifact.
- **Dataset/fixture size**: seeded D1 with 5,000 rows per audit class (simulates ~10× current beta volume).
- **Runs/flake**: 5 runs; report p50/p95; flag if any run errors.
- **Regression threshold**: duration p95 +50% vs baseline, OR any new error class, OR query count +30%.
- **Related functional tests**: `tests/vitest/compliance-retention-repository.test.ts` (existing, extend), new cron-env-gate test.
- **Evidence artifact**: `cf:d1-retention-proof` JSON output checked into the impl PR; hosted `data_retention_events` query for 30-day gate.

### Evaluator PERF-02 — DSAR export build
- **Baseline**: time to build a package for a fixture user with 100 audit rows + 10 uploads.
- **Target**: p95 < 3s for a typical user; p95 < 30s for a large user (cap at proposal-export's `maxDuration=60`).
- **Measurement**: repository/builder test with a large fixture; record wall time.
- **Regression threshold**: +50% vs baseline.
- **Notes**: very large exports may need a Queue handoff (Phase 3 decision point).

### Evaluator PERF-03 — DSAR erasure propagation
- **Baseline**: time to propagate for a fixture user with the full map.
- **Target**: p95 < 10s (in-process); R2 tombstone is metadata-only (fast); R2 purge is deferred to cron.
- **Regression threshold**: +50% or any partial-failure.

## §2. Performance budgets

| Surface | Budget | Justification |
|---|---|---|
| Admin queue GET (p95) | < 500ms | paginated, indexed |
| Admin transition (p95) | < 1s | single UPDATE + audit |
| Export build (p95) | < 3s typical, < 30s large | mirrors proposal-export |
| Erasure propagate (p95) | < 10s | R2 purge deferred |
| Cron pass (p95) | < 30s at 10× volume | batched, daily |
| Client JS added | < 20 KB | reuse existing primitives |
| RSC payload added | minimal | admin routes only |

No Core Web Vitals impact (admin routes, not public/landing).

## §3. Reliability and failure modes

| Failure mode | Detection | Recovery |
|---|---|---|
| D1 error mid-retention-pass | per-rule catch → audit `skipped: error` | next cron run catches up |
| D1 error mid-erasure | correlation ID; status not `completed` | idempotent re-run |
| R2 delete fails (purge sweep) | status `purge_retry`; audit | next sweep retries; DLQ-style after N attempts |
| Better Auth revocation fails | `revoke_failed` audit | admin retries; erasure not marked complete |
| Cron not triggered (platform) | dashboard: no run in > 36h | operator runbook: manual trigger or wait |
| Rate-limit table full | intake returns 429 | existing cleanup of expired rows (`cleanupExpiredRateLimitEvents`) |
| Export package too large | size cap hit | truncate with warning + audit; or Queue handoff |

## §4. Observability

| Signal | Source | Schema/field | Redaction | Owner | Threshold/Alert |
|---|---|---|---|---|---|
| Retention run result | `data_retention_events` | class_name, action, rows_affected, notes | aggregate only | ops | error-skip > 0 → alert |
| Cron duration | `worker.ts` structured log + `data_retention_events.ran_at` | ms | none | ops | p95 > 45s → warning |
| DSAR triage/export/erasure | `data_retention_events` (new classes) | action, rows_affected, metadata | no PII | ops + security | erasure → security review |
| R2 purge backlog | `upload_assets.dsar_purge_after` query | count | none | ops | backlog > 500 → critical |
| Intake rate-limit hits | `security_rate_limit_events` | scope, count | hashed | ops | spike → abuse review |
| Structured errors | `console.error({retention_pass_failed, ...})` | error_name | no PII | ops | any → alert |

Dashboards/queries are defined in `13_`.

## §5. Rollout flags
- `RETENTION_DRY_RUN` (env, default `1`): retention pass dry-run.
- `RETENTION_ENABLED` (env, default `0`): master enable for apply mode.
- `DSAR_EXPORT_ENABLED` (env, default `1` once Phase 3 lands): enable export action.
- `DSAR_ERASURE_ENABLED` (env, default `0`): enable erasure until `OPEN-DEC-007` resolves.
- Feature flags allow staged rollout: dry-run → apply (retention) → triage → export → erasure.

## §6. Backward compatibility
- All new columns nullable → no break.
- New retention rules are additive (more classes enforced) → no break.
- DSAR admin routes are new → no existing consumer breaks.
- `data_retention_events` CHECK expansion (DB-05) requires a table rebuild; daily D1 backup is the safety net.

## §7. Rollback triggers (see `13_` for steps)
- Cron error-spike: set `RETENTION_DRY_RUN=1`.
- DSAR erasure wrongful-execution: R2 objects within 30d recoverable; D1 anonymization irreversible → invoke breach runbook.
- Export leak: revoke signed URLs (TTL), rotate admin sessions.
- Migration failure: DROP columns (nullable) or restore from daily D1 backup.

## §8. Post-release verification
- 30-day hosted cron observation (REQ-CRON-003).
- DSAR dry-run drill: operator runs a fake erasure in staging → verify propagation + receipt.
- Quarterly access review: who has platform-admin → DSAR access.
