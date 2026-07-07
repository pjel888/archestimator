# 13 — Rollout, Rollback, and Operations

## Rollout strategy

This plan is mostly **docs + tests + one additive migration**. Rollout is low-risk.

| Step | Action | Gate |
|---|---|---|
| 1 | Land T-001 (AGENTS.md fix), T-002 (cron guard test), T-003/004/005 (tests) | `bun run test:dom` green |
| 2 | Land T-006 (migration 0039) on preview D1; EXPLAIN proof | range scan shown |
| 3 | Apply 0039 to remote `ARCH_DB` (standing authz); readback `PRAGMA index_list` | 4 indexes present |
| 4 | Deploy Worker (no code change required unless T-010/T-011 taken) | `cf:check-deploy-dry-run` + deploy |
| 5 | Land T-007 runbook | doc review |
| 6 | (owner-gated) T-008 hosted proof | `productionJobsMessagingReady=true` |
| 7 | (time-boxed) T-009 30-day observation | 30 consecutive audit days |

No feature flags needed (no behavioral change). No staged rollout rings (not
user-facing). DB-INDEX is the only infra change and it's additive/reversible.

## Rollback

| Change | Rollback |
|---|---|
| AGENTS.md fix | `git revert` the line |
| Tests | delete the new test files |
| Migration 0039 (indexes) | `DROP INDEX IF EXISTS idx_*_retention_created;` (migration 0040 or manual SQL on remote — reversible, no data loss) |
| Runbook | delete the doc |
| T-010 retention dry-run gate (if taken) | revert env check / redeploy |
| T-011 shared auth helper (if taken) | revert routes to inline copy / redeploy |

**Rollback triggers:**
- DB-INDEX causes write regression on audit/upload tables (rows-written spike)
  → drop the indexes.
- Retention over-deletes after a TTL change (OPEN-DEC-004) →
  `cf:d1-restore-rehearsal`-assisted Time Travel restore on `ARCH_DB`
  (daily backups exist); fix the rule; redeploy.
- Queue consumer regression after a code change → revert deploy; Cloudflare
  Queues will retry/redeliver (at-least-once; idempotency protects).

## Rollout performance gates

| Metric | Source | Baseline | Target | Gate | Owner |
|---|---|---|---|---|---|
| Retention SELECT rows-read | `EXPLAIN`/D1 analytics | full scan | range scan (post-index) | blocks remote apply claim | executor |
| Retention pass wall time | result timestamps | TBD at preview | < baseline at 10x rows | flag if doubles | executor |
| DLQ count | queue dashboard | 0 | 0 | sustained >0 → drain + investigate | operator |
| `productionJobsMessagingReady` | `cf:jobs-proof` | false | true (post T-008) | blocks "production-proven" claim | owner |
| Cron fired today | `data_retention_events`/`upload_events` | daily row | daily row | absence by 04:00 UTC → investigate | operator |

Observability source for each is named; Cloudflare Analytics metrics (queue
message age p95) are hosted-evidence-dependent.

## Operations runbook (summary; canonical at `.ai/10_state/runbooks/queues-cron-retention-operations.md` per T-007)

### Cron routing
| Cron (UTC) | Runs |
|---|---|
| `0 3 * * *` | upload-cleanup (POST `/api/internal/upload-cleanup?limit=100`); upload-jobs dispatcher is a no-op for retention-relevant work |
| `15 3 * * *` | upload-scan (POST `/api/internal/upload-scan?limit=100`) |
| `30 3 * * *` | retention pass (`runRetentionPassInD1`); upload-jobs dispatcher self-filters to no-op (no job matches) |

### Daily enable (dry-run → live)
- Default: dry-run. To run live: set `UPLOAD_JOBS_ENABLED=1` AND
  `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0` (Worker secrets via `cf:sync-worker-secrets`).
- Retention runs live by default at the call site. Optional `RETENTION_DRY_RUN` (T-010).

### Secrets
- `CRON_SECRET` (fallback), `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET`.
- Rotation: add new value (overlap), verify route still 200, remove old value.
  Use `cf:sync-worker-secrets`. Never commit. Never log.

### Backlog checks (FR-006)
- Scan backlog: `SELECT scan_status, COUNT(*) FROM upload_assets WHERE surface='component-attachment' AND status='finalized' GROUP BY scan_status;`
- Cleanup backlog: `SELECT status, COUNT(*) FROM upload_assets WHERE status IN ('deleted') GROUP BY status;` + R2 existence check via proof script.
- DLQ count/age: dashboard "Debug Queues" (list messages on
  `archestimator-upload-jobs-dlq`) **or** Cloudflare Analytics (queue message
  age/backlog metrics). There is no `wrangler queues` DLQ drain command; the
  DLQ is a normal queue (see DLQ operations below).

### Retry & DLQ semantics (grounded in official Cloudflare Queues docs)
- `max_retries=3` (default); DLQ `archestimator-upload-jobs-dlq` receives
  messages that exceed the retry limit (without a DLQ they'd be discarded).
- The consumer uses **explicit per-message ack/retry** (not Cloudflare's
  default whole-batch retry), so one bad message does not force batch-wide
  redelivery.
- App `retry({delaySeconds:60})` **overrides** Cloudflare's default exponential
  backoff → flat 60s delay.
- `deadLetterExpected` is an app flag; the DLQ move is Cloudflare infra.

### DLQ operations (FR-005) — corrected to real mechanisms
The DLQ is a normal queue; there is **no** `wrangler queues dlq drain` command.
1. **Inspect:** dashboard "Debug Queues" (send/list/ack) **or** a pull consumer
   over the HTTP API (`POST /accounts/{account_id}/queues/{queue_id}/messages/pull`,
   `visibility_timeout` default 30s) **or** a temporary consumer Worker bound to
   `archestimator-upload-jobs-dlq`. (D-DLQDRAIN recommends the pull-consumer
   drill for safe replay; a pull consumer is a new network surface — scope its
   auth per `08` Attack Surface Inventory.)
2. Read each message body (`jobName`, `cron`, `idempotencyKey`).
3. Determine root cause (route 503/401? scanner down? consumer exception?).
4. Fix root cause (secret rotation / scanner health / code fix + redeploy).
5. **Replay:** re-enqueue the message body to `archestimator-upload-jobs`
   (verify idempotency holds — cleanup/scan are idempotent, so replay is safe).
6. **Discard (destructive):** owner sign-off required; ack the DLQ message
   without replay; record in an incident log / `data_retention_events` notes.

### Alert thresholds (REL-001) — see `09` table.

### Failure recovery matrix (REL-002)
| Symptom | Likely cause | Action |
|---|---|---|
| No `data_retention_events` today | cron didn't fire / D1 down | manual dry-run; check Cron Trigger; check D1 status |
| Route 503 | secret unset / jobs disabled | set secret / enable jobs |
| Route 401 | wrong secret | rotate / fix secret |
| DLQ growing | route persistently failing | inspect DLQ; fix route; drain |
| Scan backlog growing | scanner provider down | check ClamAV/scanner; rows stay `failed_transient` |
| Retention `error:*` note | rule SQL / table drift | inspect rule + table schema |
| `productionJobsMessagingReady=false` post-deploy | proof not re-run | `cf:jobs-proof` + `cf:queues-cron-proof` |

### Hosted proof sequence (FR-008) — see T-008.

### Secret rotation (SEC-001) — see Secrets above.

## Post-release verification

- 30-day observation (T-009): daily audit rows, stable backlogs, empty DLQ.
- Periodic: `cf:release-gates` + `cf:check-provider` green.
- On any retention TTL change (OPEN-DEC-004): re-run dry-run first, review
  selected rows, then live.
