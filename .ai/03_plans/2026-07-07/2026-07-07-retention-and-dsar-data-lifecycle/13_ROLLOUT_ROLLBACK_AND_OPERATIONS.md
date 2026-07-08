# 13 — Rollout, Rollback, and Operations

## §1. Feature flags / staged rollout

| Flag | Default | Effect | When to flip |
|---|---|---|---|
| `RETENTION_DRY_RUN` | `1` | retention pass dry-run (no DELETE/UPDATE) | after 3 clean hosted dry-run days → `0` |
| `RETENTION_ENABLED` | `0` | master enable for apply | at the same time as dry-run off |
| `RETENTION_LEGAL_HOLD_ENABLED` | `0` | honor `legal_hold` column | after `OPEN-DEC-006` |
| `DSAR_EXPORT_ENABLED` | `1` (after Phase 3) | enable export action | after Phase 3 lands |
| `DSAR_ERASURE_ENABLED` | `0` | enable erasure | after `OPEN-DEC-007` + drill |

Rollout rings:
1. **Local/Miniflare**: full pass against seeded D1.
2. **Hosted dry-run**: `RETENTION_DRY_RUN=1` → observe 3 days of acceptance/dry-run audit rows.
3. **Hosted apply (retention)**: flip flags → observe 30 days.
4. **Admin triage**: enable (no destructive risk).
5. **Export**: enable.
6. **Erasure**: enable only after `OPEN-DEC-007` + staging drill.

## §2. Rollout performance gates (PERFORMANCE-GOAL)

| Metric | Baseline | Target | Observability source | Gate | Regression | Rollback trigger |
|---|---|---|---|---|---|---|
| Cron run p95 (retention) | local seeded | < 30s @ 10× volume | `data_retention_events.ran_at` + worker log | blocks apply enable | +50% p95 | `RETENTION_DRY_RUN=1` |
| D1 query count/run | local count | ≤ ~70 | `cf:d1-retention-proof` | blocks apply enable | +30% | dry-run |
| Error-skip count (30d) | 0 | 0 (alert >0) | hosted `data_retention_events` | blocks compliance claim | any new error class | investigate + dry-run |
| DSAR export build p95 | local fixture | < 3s typical, < 30s large | builder test | blocks export enable | +50% | disable export |
| Erasure propagate p95 | local fixture | < 10s | orchestrator test | blocks erasure enable | +50% | disable erasure |
| R2 purge backlog | 0 | < 500 | `upload_assets.dsar_purge_after` query | dashboard | > 500 critical | investigate |
| Intake rate-limit spike | baseline | no abuse spike | `security_rate_limit_events` | abuse review | spike | throttle/tune |

Hosted/provider metrics require the hosted Worker; local tests cannot prove them.

## §3. Rollback procedures

| Incident | Trigger | Steps |
|---|---|---|
| Retention error-spike | error-skip > threshold | 1. Set hosted `RETENTION_DRY_RUN=1`. 2. Query `data_retention_events` for the error class. 3. Fix forward; re-enable apply after 3 clean days. |
| Wrongful erasure | detected within 30d | 1. R2 objects still present (tombstone metadata) → recover via `upload_assets` metadata. 2. D1 anonymization is irreversible → invoke breach runbook. 3. `privacy_requests` + audit = forensic trail. |
| Export leak | signed-URL misuse | 1. URL TTL auto-expires (15 min). 2. Rotate admin sessions. 3. Audit who built the export. |
| Migration failure | APPLY error | 1. Nullable columns → DROP (fix-forward). 2. `data_retention_events` rebuild → restore from daily D1 backup (destructive, last resort). |
| Cron not running | no run > 36h | 1. Check Wrangler/Worker health. 2. Manual trigger or wait. 3. Dashboard alert. |
| DSAR queue flood | intake spike | existing rate limits; tune if needed. |

## §4. Runbook (operator)

### R-01 — Retention cron failed (error-skip > 0)
1. Query: `SELECT class_name, action, rows_affected, notes, ran_at FROM data_retention_events WHERE notes LIKE 'error:%' ORDER BY ran_at DESC LIMIT 50;`
2. Identify the class + error name.
3. If D1 transient → next run recovers; monitor.
4. If persistent (schema/SQL bug) → `RETENTION_DRY_RUN=1`, fix forward, re-enable after 3 clean days.

### R-02 — DSAR erasure partial failure
1. Query: `SELECT * FROM data_retention_events WHERE class_name='privacy_request_erasure' AND cron_run_id='<correlationId>';`
2. Identify which target errored.
3. Re-run `runDsarErasure` (idempotent) after fix.
4. Do NOT manually set `status='completed'`; let the orchestrator do it.

### R-03 — R2 purge backlog growing
1. Query: `SELECT COUNT(*) FROM upload_assets WHERE dsar_purge_after IS NOT NULL AND dsar_purge_after < datetime('now');`
2. Check R2 delete errors in logs.
3. Manually trigger purge or wait for next sweep.

### R-04 — Legal-hold conflict (post-`OPEN-DEC-006`)
1. A row under legal hold must not be purged → verify `skipped_legal_hold` audit.
2. Coordinate with counsel before unsetting `legal_hold`.

### R-05 — Wrongful-erasure incident
1. Within 30d: recover R2 objects from tombstone metadata.
2. D1 anonymization irreversible → breach runbook (separate roadmap item).
3. Notify Philip + counsel.

## §5. Dashboard queries (REQ-EVID-002)
- Last run per class: `SELECT class_name, MAX(ran_at) last_run, SUM(rows_affected) total_rows FROM data_retention_events WHERE action IN ('purged','anonymized','soft_deleted') GROUP BY class_name;`
- Error-skip 30d: `SELECT class_name, COUNT(*) FROM data_retention_events WHERE notes LIKE 'error:%' AND ran_at > datetime('now','-30 days') GROUP BY class_name;`
- DSAR queue: `SELECT status, COUNT(*) FROM privacy_requests GROUP BY status;`
- R2 purge backlog: `SELECT COUNT(*) FROM upload_assets WHERE dsar_purge_after < datetime('now');`

## §6. Observability config
- Workers Observability: persisted logs/traces (existing in `wrangler.jsonc`); retention platform-managed (~3–30d). Documented in `18_`.
- Email logs: platform-managed (90d per schedule).
- No new alert sinks required; reuse Workers Observability + the dashboard queries.

## §7. Post-release verification
- 30-day hosted cron gate (REQ-CRON-003).
- DSAR staging drill: operator runs a fake erasure in staging → verify propagation + receipt + 30d purge.
- Quarterly platform-admin access review (who has DSAR access).
- Annual retention schedule review (or on new data class / processor / jurisdiction).

## §8. External proof required before compliance claim
- 30 days of hosted `data_retention_events` rows.
- R2 DSAR-erasure receipt in `ARCH_UPLOADS_R2`.
- Workers Observability + Email retention config readback.
- `OPEN-DEC-004` counsel sign-off on TTLs.
- `OPEN-DEC-007` sign-off on DSAR SLA + identity verification.
None of these are provable from local-only checks.
