# 03 — Source and Codebase Audit

Evidence-gathered map of the queue/cron/retention runtime. Every entry is a
repo-relative path with line numbers and a responsibility note. "Evidence" =
direct file read; "Inference" = derived (labeled).

## A. Configuration & bindings

| Path | Lines | Symbol / field | Responsibility | Notes |
|---|---|---|---|---|
| `wrangler.jsonc` | 59–65 | `triggers.crons` | Cron schedule **source of truth** | 3 triggers: `0 3`, `15 3`, `30 3` (all daily UTC) |
| `wrangler.jsonc` | 66–82 | `queues.producers` / `queues.consumers` | Queue + DLQ **source of truth** | producer `UPLOAD_JOBS_QUEUE`→`archestimator-upload-jobs`; consumer `max_batch_size:5`, `max_batch_timeout:30`, `max_retries:3`, DLQ `archestimator-upload-jobs-dlq` |
| `wrangler.jsonc` | 83–97 | `observability` | Logs/traces sampling | logs head_sampling_rate 0.1, traces 0.05, `persist:true` |
| `wrangler.jsonc` | 98–104 | `vars` | Upload op budgets | `ARCH_UPLOAD_HOSTED_*` memory/body/duration/concurrency/storage-latency |
| `AGENTS.md` | 40 | cron summary | **STALE** | says "Two cron triggers (`0 3 * * *`, `15 3 * * *`)" — drift vs 3 actual |

## B. Worker entrypoint

| Path | Lines | Symbol | Responsibility |
|---|---|---|---|
| `worker.ts` | 60–95 | `default.fetch` | OpenNext passthrough + fast-path routers (canonical host, auth-state, health, share-token, proof, collab, public-page cache) |
| `worker.ts` | 97–116 | `default.scheduled` | Cron dispatch: (a) always `runCloudflareScheduledUploadJobs`; (b) on `30 3 * * *` also `runRetentionPassInD1` |
| `worker.ts` | 118–128 | `default.queue` | Queue dispatch → `runCloudflareUploadJobQueueBatch` |
| `worker.ts` | 34–35 | DO exports | Re-exports `CollaborationRoom` + OpenNext cache DOs |

**Key inference (labeled):** Both cron-triggered `waitUntil` promises (upload
jobs + retention) run in parallel on `30 3 * * *` and are awaited only by `ctx`.
There is no sequencing guarantee between them. The retention pass touches D1
directly; upload jobs touch D1/R2 via internal routes. They do not share a
transaction. See risk RISK-004.

## C. Queue runtime library

| Path | Lines | Symbol | Responsibility |
|---|---|---|---|
| `src/lib/cloudflare/upload-job-queue.ts` | 9–14 | constants | binding/queue/DLQ names, `MAX_RETRIES=3`, `RETRY_DELAY_SECONDS=60`, proof prefix |
| | 16–28 | `CloudflareUploadJobQueueMessage` | **Message schema v1**: `{version:1, jobName:"upload-cleanup"\|"upload-scan", cron, enqueuedAt, idempotencyKey, source:"cloudflare-cron", providerProof?}` |
| | 119–122 | `buildIdempotencyKey` | **Idempotency key** = `${jobName}:${cron}:${minute}` where minute = `ISO.slice(0,16)`. Minute-granularity. |
| | 124–141 | `buildCloudflareUploadJobQueueMessages` | Filter `CLOUDFLARE_SCHEDULED_UPLOAD_JOBS` by cron → messages |
| | 143–176 | `enqueueCloudflareScheduledUploadJobs` | `queue.sendBatch(...)`; skip on missing binding / unmatched cron |
| | 178–187 | `isUploadJobQueueMessage` | Runtime message validator (version + jobName enum + types + source) |
| | 189–191 | `matchingJobExists` | Rejects messages whose jobName+cron aren't in the registry |
| | 193–196 | `safeProviderProofId` | Regex `/^[a-zA-Z0-9-]{16,80}$/` gate on proof id |
| | 220–280 | `writeProviderProofReceipt` | Writes `provider-proof/jobs/<id>.json` to R2 with sanitized outcome + queue latency |
| | 282–327 | `ackOutcome` / `retryOutcome` | Decision helpers; retry sets `deadLetterExpected = attempts >= MAX_RETRIES` |
| | 329–410 | `runCloudflareUploadJobQueueBatch` | **Consumer loop**: per-batch `seenIdempotencyKeys` Set → dedup; ack invalid/duplicate/unmatched/missing-secret; retry job-failed/exception |

**Critical behavior — idempotency scope (evidence):** The `seenIdempotencyKeys`
Set at line 338 is **per-batch**. Two messages with the same key in *different*
batches (e.g., a retry delivered in a later batch, or a duplicate cron
enqueue) are **not** deduped across batches — each re-runs the job. Only
same-batch duplicates are acked as `"duplicate"`. See `15` decision D-IDEMP and
RISK-002.

## D. Cron dispatch library

| Path | Lines | Symbol | Responsibility |
|---|---|---|---|
| `src/lib/cloudflare/scheduled-upload-jobs.ts` | 1–2 | cron constants | `CLOUDFLARE_UPLOAD_CLEANUP_CRON="0 3 * * *"`, `CLOUDFLARE_UPLOAD_SCAN_CRON="15 3 * * *"` |
| | 7–22 | `ScheduledUploadJob`, `CloudflareScheduledUploadJobEnv` | job shape; env: `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN`, `UPLOAD_JOBS_ENABLED`, `CRON_SECRET`, route-specific secrets |
| | 40–53 | `CLOUDFLARE_SCHEDULED_UPLOAD_JOBS` | **Job registry** (2 jobs: cleanup, scan) |
| | 59–61 | `readJobSecret` | route-specific secret → fallback `CRON_SECRET` |
| | 63–65 | `shouldDryRun` | **dryRun = true unless `UPLOAD_JOBS_ENABLED=1` AND `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`** (safe-default) |
| | 67–69 | `readOrigin` | `CLOUDFLARE_UPLOAD_JOBS_ORIGIN` → `https://archestimator.internal` default |
| | 71–85 | `buildJobRequest` | POST to `/api/internal/<job>?limit=100[&dryRun=1]` with `Authorization: Bearer <secret>` + cron headers |
| | 91–131 | `runCloudflareScheduledUploadJobs` | For each matched job: read secret (skip if missing), fetcher(request), record status/ok |

## E. Internal job route handlers

| Path | Symbol | Auth | dryRun gate | LIMIT | Touches |
|---|---|---|---|---|---|
| `src/app/api/internal/upload-cleanup/route.ts` | upload-cleanup | `Bearer` ∈ {`CRON_SECRET`, `UPLOAD_CLEANUP_JOB_SECRET`} | `?dryRun=1`; live requires `UPLOAD_JOBS_ENABLED=1` | default 100, cap 1000 | D1 `upload_assets`/`upload_sessions` (read), `upload_events` (write); R2 `removeObjects` |
| `src/app/api/internal/upload-scan/route.ts` | upload-scan | `Bearer` ∈ {`CRON_SECRET`, `UPLOAD_SCAN_JOB_SECRET`} | `?dryRun=1`; live requires `UPLOAD_JOBS_ENABLED=1` | default 100, cap 500 | D1 `upload_assets` (read+update scan cols), `upload_events` (write); R2 `downloadObject`; ClamAV scanner |

**No shared auth helper exists.** Each route (and the proof routers) re-implements
inline `readXxxSecrets()` + `isAuthorized()` with identical logic. See `06` ARCH
recommendation to extract, and RISK-006.

**Idempotency of route handlers:** cleanup is safe to re-run (re-run finds R2
objects gone). Scan has a D1 idempotency guard: `UPDATE ... WHERE id=? AND
surface=? AND status=? AND checksum=?`; throws if `meta.changes < 1` (row
changed underneath). No route marks rows as "cleaned" — DB rows persist.

## F. Retention engine

| Path | Lines | Symbol | Responsibility |
|---|---|---|---|
| `src/lib/compliance/retention-core.ts` | 28–43 | `RetentionClassName` (14 classes) | Enum of data classes |
| | 79–143 | `DEFAULT_RETENTION_RULES` | **7 of 14 classes implemented** (account_security_events, account_audit_legacy_sha256, collaboration_audit_events, shared_link_events, estimate_sheet_events, privacy_requests_completed, privacy_requests_rejected). `ai_*`, `logs_*`, `uploads_orphaned`, `sessions_expired` are documented but **not in the active registry**. |
| | 145–178 | `recordRetentionEventInD1` | INSERT into `data_retention_events` (9 cols); no-op if db null |
| | 180–268 | `runRetentionPassInD1` | For each rule: SELECT ids LIMIT 500/100 → if dryRun report only → else DELETE + record event; per-rule try/catch |

**Retention call site:** `worker.ts:109–115` calls
`runRetentionPassInD1(env.ARCH_DB, undefined, {cronRunId})` — **always live** (no
dryRun passed at the call site), no Bearer auth (in-process).

## G. Migrations

| Migration | Tables / impact |
|---|---|
| `migrations/0034_data_retention_events.sql` | Creates `data_retention_events` (id, class_name CHECK enum×14, action CHECK enum×5, rows_affected, cutoff_timestamp, ran_at, cron_run_id, notes, metadata_json); indexes `(class_name, ran_at DESC)`, `(action, ran_at DESC)` |
| `0004` / `0035` | `account_security_events` (created_at col; composite indexes only — **no standalone created_at index**) |
| `0007` | `collaboration_audit_events` (created_at; composite only) |
| `0014` | `shared_link_events` (created_at; composite only) |
| `0025` | `estimate_sheet_events` (created_at; composite only) |
| `0033` | `privacy_requests` (created_at; status/kind leading) |
| **Latest active:** `0038_component_draft_resource_limits.sql` | unrelated |

**Index gap (evidence):** All 5 retention-target tables index `created_at` only
as a *trailing* column of a composite index. Retention purges `WHERE created_at
< ?` (no leading-column equality) will not use those indexes efficiently at
scale. See RISK-008 and DB blueprint DB-INDEX.

## H. Proof & readiness scripts (`package.json` cf:*)

| Script | File | Purpose |
|---|---|---|
| `cf:queues-cron-proof` | `scripts/generate-cloudflare-queues-cron-proof.ts` | Parses `wrangler.jsonc`, local-simulates enqueue/ack/retry/duplicate/poison, merges jobs-runtime-proof; writes JSON+MD to `2026-06-29-Cloudflare-Migration-Codex/evidence/` |
| `cf:jobs-proof` | `scripts/verify-cloudflare-jobs-proof.ts` | Hits hosted JobsProof endpoint; checks `queueSendReady`, `queueConsumerReceiptReady`, `cronProviderExecutionProven`, `productionJobsMessagingReady`, queue latency p95 |
| `cf:release-gates` | `scripts/check-cloudflare-release-gates.ts` | Aggregate local-runtime gate (incl. queues/cron/DLQ); keeps provider-backed proof separate |
| `cf:check-provider` | `scripts/check-cloudflare-provider-readiness.ts` | Provider gate incl. "queues/cron/DLQ proof" |
| `cf:check-provider-resources` | `scripts/check-cloudflare-provider-resources.ts` | D1/R2/Queues/DLQ/secret readback; `queuesReadbackReady` |
| `cf:check-deploy-dry-run` | `scripts/check-cloudflare-wrangler-deploy-dry-run.ts` | Wrangler no-upload dry-run; validates bindings/crons/queue config |
| `cf:d1-restore-rehearsal` | `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | Local SQLite restore rehearsal (export→restore→checksum→FK scan) |

**Existing evidence artifacts** (`.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/`):
`2026-06-30-cloudflare-queues-cron-proof.{json,md}`,
`2026-06-30`/`2026-07-01-cloudflare-jobs-runtime-proof.{json,md}`,
`2026-06-30-cloudflare-d1-restore-rehearsal.{json,md}`,
`2026-06-30`/`2026-07-01-cloudflare-release-gates.{json,md}`.

## I. Operator docs

| Path | Status | Note |
|---|---|---|
| `.ai/10_state/compliance/retention-schedule.md` | **DRAFT (live)** | Per-class TTL registry, `30 3 * * *`, action matrix, DSAR propagation (not implemented), counsel checklist. DRAFT pending OPEN-DEC-004. |
| `.ai/09_archive/.../E-010-retention-proof/retention-operator-procedure.md` | **archived/Supabase-era** | Pre-cutover SQL fallback; does NOT reflect current `worker.ts`/`data_retention_events` path |
| *(no standalone DLQ/queue runbook)* | **MISSING** | Closest live doc is retention-schedule.md |

## J. State history (`current-state.md`, `rg` evidence)

- L238–245: P1.8 retention locally hardened (5 tests) but blocked on
  `OPEN-DEC-004` final TTLs, DSAR propagation, and **30-day hosted cron/D1
  observation**.
- L3466–3470: Local Queues/Cron/DLQ proof exists; `localQueuesCronProofReady=true`,
  **`providerBacked=false`, `productionJobsMessagingReady=false`**. Queue
  binding `UPLOAD_JOBS_QUEUE`, DLQ present, `maxRetries=3`.
- L2912/2921: hosted provider-readiness reports queues/cron/DLQ proof passing
  (green) at the custom-domain gate.
- L3822: legacy `vercel.json` cron reference (historical; current SoT is
  `wrangler.jsonc`).

**Reconciliation (inference, labeled):** There is an apparent tension between
"local proof says `productionJobsMessagingReady=false`" (L3466) and "hosted
provider-readiness queues/cron/DLQ proof green" (L2912). Resolution: the local
`cf:queues-cron-proof` script requires a *merged* `jobs-runtime-proof` with
`productionJobsMessagingReady=true` to flip its own flag; the hosted
provider-readiness gate uses a broader readback. The plan treats the local flag
as the stricter gate and requires hosted evidence to reconcile the two
(see `13` and `19`).

## K. Test coverage map (summary; detail in `12`)

| File | Covers |
|---|---|
| `tests/vitest/cloudflare-upload-job-queue.test.ts` | enqueue, ack success, duplicate dedup (same-batch), retry at MAX_RETRIES, DLQ-expected (one-sided), provider-proof receipt |
| `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts` | cron→job map, dryRun default, secret fallback, missing-secret skip, unmatched-cron skip, worker.ts source-grep |
| `tests/vitest/compliance-retention-repository.test.ts` | rule bind-compat, dryRun no-delete, apply+audit, Worker-injected D1, no-db no-op |
| `tests/vitest/upload-cleanup-route.test.ts` / `upload-scan-route.test.ts` | route auth, dryRun, secret fallback, fail-closed |
| `tests/vitest/cloudflare-queues-cron-proof-script.test.ts` | proof-report builder (local simulation) |
| *(no worker.ts handler invocation test)* | **GAP** |
| *(no E2E queue/cron)* | **GAP** |

## Document impact matrix

| Document | Accurate? | Implementation would update it? |
|---|---|---|
| `AGENTS.md:40` | **No** (2 vs 3 crons) | Yes — cron count correction task |
| `retention-schedule.md` | Yes (DRAFT) | On OPEN-DEC-004 sign-off |
| `current-state.md` | Append-only; needs new entry on completion | Yes (append) |
| `README.md` (repo root, if it mentions crons) | TBD by executor | verify |
