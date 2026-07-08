# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | Cron schedule re-drifts across docs | someone edits one surface | Medium | Medium | Medium | all 5 doc surfaces | T-002 guard test | guard test in CI | fix + test | manual sync | lead | low (with test) | open (mitigated by T-002) |
| RISK-002 | Cross-batch duplicate job execution | cron retry / manual re-enqueue same minute | Low | Low (idempotent downstream) | Low | queue consumer | backlog/receipt audit | document contract (FR-003) | rely on downstream idempotency | durable idempotency store (D-IDEMP) | lead | low | open (accepted) |
| RISK-003 | DLQ silently fills | route persistently 503/401 | Medium | High (work stops) | High | queue, upload cleanup/scan | DLQ count alert (REL-001) | secret rotation discipline | drain + fix root cause | replay after fix | operator | medium (until alert live) | open |
| RISK-004 | Parallel cron waitUntil race on `30 3` | both upload-jobs + retention touch overlapping state | Low | Low (disjoint tables) | Low | worker.ts | audit review | disjoint state (retention tables ≠ upload tables) | none needed | n/a | lead | low | open (accepted) |
| RISK-005 | Secret rotation gap (old removed before new live) | operator removes too early | Low | High (jobs 401) | High | routes | 401 alert | overlap procedure (SEC-001) | re-add old / redeploy | n/a | operator | medium (until runbook live) | open |
| RISK-006 | Inline auth copies drift (security hole) | one route updated, others not | Low | High (auth bypass) | High | route handlers | code review | optional shared helper (ARCH-002) | extract helper | revert to inline | lead | medium (until ARCH-002) | open |
| RISK-007 | Free-tier observability sampling hides failures | logs sampled 0.1, traces 0.05 | Medium | Medium | Medium | all | use deterministic D1 audit signals, not logs | REL-001 prioritizes audit rows | supplement with proof scripts | enable paid analytics (owner-gated) | operator | medium | open (accepted on free tier) |
| RISK-008 | Retention full scan at scale (no `created_at` index) | data volume grows | Medium | Medium (slow pass, row-read quota) | Medium | D1 retention | EXPLAIN / pass wall time | DB-INDEX (T-006) | add indexes | run off-peak only (already 03:30 UTC) | executor | low (post-index) | open (mitigated by T-006) |
| RISK-009 | Retention over-deletion (wrong TTL/rule) | OPEN-DEC-004 sets bad TTL or rule bug | Low | Critical (data loss) | Critical | D1 audit/security tables | audit row review, dry-run first | dryRun option + counsel gate (OPEN-DEC-004) | Time Travel restore via `cf:d1-restore-rehearsal` | restore from daily backup | owner | medium (live by default) | open |
| RISK-010 | `productionJobsMessagingReady` false blocks "production-proven" claim | hosted proof not run | High (current) | Medium | Medium | queue/cron readiness | `cf:jobs-proof` | T-008 sequence | run proof | owner-gated run | owner | high until T-008 | open |
| RISK-011 | Worker handler logic untested (only source-grep) | refactor breaks scheduled()/queue() | Low | High (jobs stop) | High | worker.ts | T-004 test | add invocation test | fix + redeploy | n/a | executor | medium (until T-004) | open |
| RISK-012 | OPEN-DEC-004 counsel delay blocks retention finalization | counsel review slips | High (current) | Medium | Medium | retention TTLs | decision log | isolate as blocker | ship dry-run-only until signed | defer live retention | owner | high | open |
| RISK-013 | DLQ replay double-executes non-idempotent future job | new job type added without idempotency | Low | High | High | future jobs | code review at job-add time | FR-003 contract + runbook | require idempotency review | revert job | lead | low (process) | open (process guard) |

No unmitigated Critical risk remains in the *planning* itself. RISK-009
(Critical impact) is mitigated by dry-run-first + counsel gate + restore path;
its residual is medium until the restore is rehearsed on `ARCH_DB`.
