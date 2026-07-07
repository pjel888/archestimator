# 09 — Performance, Reliability, and Observability

## Performance relevance

This plan's runtime footprint is small: it adds (a) a few proof scripts (operator-run, not
per-request), (b) D1 writes only on incident declare/close (rare), (c) extra retention rules (daily
cron, bounded), and (d) structured log events (already-cheap). The dominant performance/reliability
concerns are: **alert latency** (does the signal reach a human fast enough?), **retention-pass
cost** (does the daily cron stay within the free-tier D1 budget?), and **observability quota
headroom** (does this plan push Workers Logs/Analytics Engine over free ceilings?).

## Alert-latency budget (evaluator contract)

| Scenario | Signal source | Detection latency target | Delivery latency target | Evaluator | Fixture | Runs | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|---|---|---|
| S-01 Uptime | external probe | ≤5 min | ≤10 min | uptime-probe receipt timestamps | 1 synthetic down | 10 | p95 > 15 min | switch to dashboard-manual observation |
| S-02 Error-rate | GraphQL poll | ≤ poll interval (default 5 min) | ≤10 min | `verify-error-rate-alert-delivery.ts` end-to-end | seeded `synthetic_test_error` (`emit-test-log.mjs`) | 5 | ack > 15 min | lower threshold / shorten interval |
| S-03 Upload backpressure | existing webhook | immediate (event-driven) | ≤30 s | `verify-upload-alert-delivery.ts` (existing) | 1 synthetic | 5 | ack > 60 s | n/a (existing) |
| S-04 Queue DLQ | poll | ≤ poll interval | ≤10 min | `verify-queue-dlq-alert-delivery.ts` | 1 seeded DLQ msg | 3 | ack > 15 min | manual dashboard |
| S-05 Cron failure | cron summary log | ≤ next poll after cron | ≤15 min | `verify-cron-failure-alert-delivery.ts` | forced `ok:false` | 3 | ack > 30 min | wrangler tail manual |
| S-06 Incident escalation | human declare | immediate | ≤5 min | `verify-incident-escalation-alert-delivery.ts` | 1 synthetic declare | 3 | ack > 10 min | phone fallback |
| S-07 Retention failure | cron summary / `data_retention_events` | ≤ next poll | ≤15 min | `verify-retention-alert-delivery.ts` | forced `budget_reached` abnormal | 3 | ack > 30 min | manual |

**Note:** targets are operational, not user-facing latency. The evaluator is the verify-script
end-to-end runtime receipt (`sentAt`→`ackObservedAt`). Flake policy: a single failed run retries
once; two consecutive failures block GATE-02 for that scenario.

## Retention-pass cost budget

- **Current:** 7 rules, unbounded per-tick (sibling REL-02 adds `maxDurationMs`/`maxRowsDeletedPerTick`).
- **After this plan:** +2 actionable rules (`uploads_orphaned`, `sessions_expired`) + 3 no-op AI
  rules + 2 acknowledgement-only rows.
- **Free-tier ceiling:** D1 rows-written 100k/day; cron wall-clock 15 min (Workers CPU).
- **Expected added rows-written per pass:** `uploads_orphaned` + `sessions_expired` deletes +
  `data_retention_events` audit rows; bounded by cleanup-job pre-pass (rows already gone) —
  expected low. At 1000x volume: still <1% of the 100k ceiling assuming cleanup job runs first.
- **Regression threshold:** a single retention pass writing >10k rows or >120s triggers a
  `budget_reached` log + a GATE-01 readiness warning.
- **Evaluator:** `tests/vitest/compliance-retention-repository.test.ts` extended for the new rules
  (fixture triggers `budget_reached`); dry-run on a fixture DB.

## Observability quota headroom (free tier)

| Resource | Free ceiling | This plan's added load | Headroom |
|---|---|---|---|
| Workers Logs events/day | ~200k (shared logs+traces since 2026-03-01) | +6 event kinds (`operational_alert_*`, `incident_*`); rare (alert/incident frequency) | negligible; sibling OBS-02 raises log sampling to 1.0 pre-launch which is the dominant consumer |
| Workers Logs retention | ~3d free | n/a (platform-managed) | DATA-03 documents the ceiling |
| Analytics Engine points/day | 100k (if sibling OBS-01 adds binding) | this plan does not emit AE points | unaffected |
| D1 rows-written/day | 100k | retention deletes + audit; bounded | <1% at 1000x |
| Email sends | provider-limited | operational alerts only (rare) | within transactional volume |

**No paid add-on is required** for this plan's load. The dominant quota consumer remains the
sibling pack's log-sampling raise (OBS-02), which is independent.

## Reliability and failure modes

| Failure mode | Detection | Recovery |
|---|---|---|
| Alert-delivery channel down (webhook 5xx, email circuit open) | `operational_alert_failed` event + receipt `failed` | secondary channel (email↔webhook); manual dashboard; runbook escalation |
| External poller host down (S-02) | stale receipt (>72h) → GATE-01 fails | owner restarts poller; `OPEN-ALERT-01` names a redundant host option |
| GraphQL read token expired/revoked | poll `failed` w/ 401 | rotate token; runbook step |
| Retention rule bug | `retention_pass_failed` + unit test | code revert (fix-forward); dry-run catches pre-prod |
| Incident table unavailable (D1 outage) | admin action returns typed error | defer declare to post-restore; runbook |
| Migration `0040` collision | apply fails | coordinate in `LOOP_LEDGER`; renumber to `0041` |
| Receipt store corrupt/lost | GATE-01 missing-artifact | re-run verify scripts |

## Dashboards, metrics, alerts (this plan's contribution)

- **Metrics:** this plan emits structured *log events* (OPS-02), not AE metrics (those are the
  sibling pack's). The events are queryable in Workers Observability by `event=operational_alert_*`.
- **Dashboards:** the runbook (`13_…`) documents Query Builder / GraphQL queries for:
  `operational_alert_failed` rate, open-incident age, retention-pass `ok:false` count, DLQ depth.
  (These complement, not duplicate, the sibling pack's OBS-03 query set.)
- **Alerts:** the alert scenarios *are* the alerts (S-01..S-07). This is the closed loop.

## Feature flags / rollout rings

- `UPLOAD_OPERATIONS_ALERTS_ENABLED` (existing) — extended to log outcome.
- New env (operational, not user-facing): `ARCH_OPERATIONAL_ALERTS_EMAIL_ENABLED`,
  `ARCH_INCIDENT_WRITE_ENABLED` (admin gate), `ALERT_PROOF_MAX_AGE_HOURS=72`,
  `ARCH_ERROR_RATE_POLL_INTERVAL_SECONDS=300`, `ARCH_ERROR_RATE_THRESHOLD=0.05`.
- Rollout rings: (1) local + preview (proof scripts run, receipts local-automated); (2) hosted
  staging (provider-backed receipts for non-critical scenarios); (3) production launch (GATE-02
  provider-backed for the 4 critical scenarios + GATE-03 first-24h/72h reviews).

## Post-release verification

- First-24h review (OPS-03): alert receipts present for any real signal; incident log empty or all
  `resolved`; error-rate within budget; last retention pass `ok:true`.
- First-72h review: same + a synthetic drill (declare a sev3 test incident, confirm escalation
  delivered and closed).
