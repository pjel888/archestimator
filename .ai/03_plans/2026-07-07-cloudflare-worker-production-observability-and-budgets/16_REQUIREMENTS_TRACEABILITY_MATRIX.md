# 16 — Requirements Traceability Matrix

Maps every requirement → source → outcome → task → code → acceptance → test → rollout.
`REQ-*`/`AC-*`/`T-*` IDs cross-reference `04_…`, `11_…`, `12_…`.

| Req ID | Source (strength) | User/system outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | brief + repo evidence | every response has `x-request-id`; correlated logs | 1,2 | T-1.1, T-1.2, T-2.1, T-2.2 | `request-id.ts`(new), `server-timing.ts`, `worker.ts`, `worker-route-optimizations.ts` | AC-FR-01a..d | `request-id.test.ts`, `worker-dispatch.test.ts` | curl header on prod | planned |
| FR-02 | official docs + repo evidence | cron/queue correlation ids in logs | 2,4 | T-2.3, T-4.1, T-4.2 | `worker.ts`, `scheduled-upload-jobs.ts`, `upload-job-queue.ts` | AC-FR-02a..c | `worker-cron-queue.test.ts` | `wrangler tail` events | planned |
| FR-03 | brief + repo evidence | worker unhandled errors logged w/ id + safe response | 2 | T-2.1, T-2.3 | `worker.ts` | AC-FR-03a,b | `worker-dispatch.test.ts` | induce error in staging | planned |
| FR-04 | brief + repo evidence | `Server-Timing` (gated, allowlisted) | 8 | T-8.1, T-8.2 | `server-timing-header.ts`(new), `worker.ts` | AC-FR-04a..c | `server-timing.test.ts` | curl with flag on | planned |
| FR-05 | repo evidence | all error logs carry taxonomy + id | 3 | T-3.1, T-3.2, T-3.3 | `route-error.ts`, `with-action-errors.ts`, `instrumentation.ts` | AC-FR-05a,b | extend `route-error.test.ts`, `with-action-errors.test.ts` | grep proof | planned |
| REL-01 | official docs | budgets defined w/ evaluator+ceiling+threshold+rollback | 5,6,7,8 | T-5.x, T-6.1, T-7.x, T-8.x | `retention-core.ts`, `collaboration-room.ts`, `wrangler.jsonc`, `metrics.ts` | AC-REL-01a,b | static review of `09_…`; guard unit tests | dashboard watch | planned |
| REL-02 | brief + repo evidence | retention bounded by time+rows; per-rule progress | 5 | T-5.1, T-5.2 | `retention-core.ts`, `worker.ts` | AC-REL-02a..c | `retention-budget.test.ts` | retention.rule events in logs | planned |
| REL-03 | repo evidence | DO fan-out capped; no double-encode | 6 | T-6.1 | `collaboration-room.ts` | AC-REL-03a,b | `collaboration-room-broadcast.test.ts` | DO broadcast_truncated metric | planned |
| OBS-01 | official docs | AE KPIs (3-5), PII-free | 7,8 | T-7.2, T-8.3, T-8.4 | `wrangler.jsonc`, `metrics.ts`(new), `worker.ts` | AC-OBS-01a..c | `metrics.test.ts` | AE dataset readback (manual) | planned |
| OBS-02 | official docs | sampling tuned pre-launch; walk-down schedule | 7 | T-7.1 | `wrangler.jsonc` | AC-OBS-02a,b | static config review | dashboard | planned |
| OBS-03 | official docs | dashboard/alert queries documented | 10 | T-10.8 | `13_…`, runbook | AC-OBS-03a,b | static review | operator uses queries | planned |
| SEC-01 | brief | redaction on every emit path | 9 | T-9.1, T-8.1, T-8.3 | audit + `metrics.ts` + `server-timing-header.ts` | AC-SEC-01a..c | `redact.test.ts` corpus, `metrics.test.ts`, `server-timing.test.ts`, grep artifact | audit artifact in `19_…` | planned |
| SEC-02 | brief | evidence scripts redact | 9 | T-9.2 | `src/app/api/internal/*-proof/**`, `*proof-router.ts` | AC-SEC-02a,b | static review | manual | planned |
| TEST-01 | repo evidence | unit/integration coverage for new code | 10 | T-10.1..10.7 | `tests/vitest/*` | test matrix green | all new tests | CI green | planned |
| DOC-01 | brief | observability runbook | 10 | T-10.8 | runbook + state entry | runbook complete | static review | operator uses it | planned |

## Performance-sensitive requirements → evaluator mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-01 (id resolution) | n/a | <0.1 ms | unit bench | p99 > 0.5 ms | revert T-1.1 |
| Phase 2 (dispatch overhead) | current | <1 ms added | dev integration | >1 ms added | revert T-2.1 |
| REL-02 (retention) | unbounded | stops at budget | unit fixture | fails to stop | revert T-5.1 |
| REL-03 (DO broadcast) | O(N) re-encode | ≤cap, single length | unit 300 sockets | >10 ms broadcast | revert T-6.1 |
| OBS-01 (metrics emit) | n/a | <0.2 ms | unit bench | p99 > 0.5 ms | disable AE emit |
| RISK-07 (export CPU) | current | 0 exceededCpu | Workers Logs (hosted) | any exceededCpu | fix-forward / Queue |

No requirement is untraced. Every task maps to ≥1 requirement.
