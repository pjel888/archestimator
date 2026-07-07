# 04 — Requirements Specification

Priority: `P0` blocker / `P1` required / `P2` nice-to-have.
Status: `pending` until implementation (this is a planning pack).

Source-strength legend: `brief` = PROMPT.md; `repo evidence` = source file;
`official docs` = Cloudflare/Next docs; `provider proof` = hosted evidence;
`assumption` = inferred; `derived` = synthesized from multiple sources;
`owner-delegated` = planning decision.

---

## FR — Functional

### FR-001 (P0) — Single cron schedule source of truth
- **Statement:** Exactly three cron triggers (`0 3`, `15 3`, `30 3 * * *`) are
  documented identically across `wrangler.jsonc`, `scheduled-upload-jobs.ts`,
  `worker.ts`, `retention-schedule.md`, `AGENTS.md`, and `current-state.md`.
- **Rationale:** PROMPT.md flags "AGENTS.md still references two cron triggers".
- **Source:** brief + repo evidence (`wrangler.jsonc:59-65`, `AGENTS.md:40`).
- **AC:** (1) `AGENTS.md` binding summary lists three triggers. (2) A test or
  check asserts the set `{0 3, 15 3, 30 3}` equals the union of
  `CLOUDFLARE_SCHEDULED_UPLOAD_JOBS` crons + the retention cron.
- **Validation:** type-check + a focused vitest asserting the union.
- **Affected areas:** `AGENTS.md`, optional guard test.
- **Risks:** future re-drift if no guard test.

### FR-002 (P0) — Queue job taxonomy documented
- **Statement:** The two queue job types (`upload-cleanup`, `upload-scan`) and
  the message schema v1 (`CloudflareUploadJobQueueMessage`) are documented in
  the runbook with field-level meaning and versioning policy.
- **Source:** repo evidence (`upload-job-queue.ts:16-28`).
- **AC:** Runbook section "Queue job taxonomy" lists both jobs, message fields,
  and the `version:1` upgrade rule (new version → new consumer branch, no
  in-place rewrite).
- **Validation:** doc review.

### FR-003 (P0) — Idempotency contract explicit
- **Statement:** The idempotency key construction
  (`${jobName}:${cron}:${ISOminute}`), its **per-batch** dedup scope, and the
  cross-batch re-run behavior are documented and tested at the minute boundary.
- **Source:** repo evidence (`upload-job-queue.ts:119-122, 338`).
- **AC:** (1) Runbook states dedup is per-batch only. (2) A test asserts
  `03:00:59` and `03:01:00` produce different keys. (3) A test asserts two
  same-key messages in *different* batches both execute (i.e., NOT cross-deduped).
- **Validation:** focused vitest.
- **Risks:** RISK-002 (cross-batch duplicate work if cron retries enqueue).

### FR-004 (P0) — Retry/DLQ policy documented + DLQ boundary tested
- **Statement:** `max_retries=3`, `RETRY_DELAY_SECONDS=60`, DLQ
  `archestimator-upload-jobs-dlq`. The `deadLetterExpected` decision
  (`attempts >= MAX_RETRIES`) is tested from **both** sides.
- **Source:** repo evidence (`wrangler.jsonc:73-81`, `upload-job-queue.ts:12-13, 321`).
- **AC:** Runbook "Retry & DLQ policy" states the numbers + that DLQ is moved by
  Cloudflare infra (not app code). Test asserts `deadLetterExpected=false` when
  `attempts < MAX_RETRIES` on a failed job, and `=true` at the boundary.
- **Validation:** focused vitest.

### FR-005 (P0) — DLQ drain/replay runbook
- **Statement:** Operator runbook documents how to inspect, drain, and replay
  DLQ messages safely (read message, fix root cause, re-enqueue or discard),
  using only bound resources and behind evidence review.
- **Source:** brief ("failure recovery") + `official docs` (Cloudflare Queues
  DLQ/pull-consumer docs, retrieved 2026-07-07; RQ-1 resolved in `19`). The DLQ
  is a normal queue drained via dashboard "Debug Queues", a pull consumer (HTTP
  API), or a temporary consumer Worker — there is no `wrangler queues dlq` drain
  command.
- **AC:** Runbook "DLQ operations" uses the real mechanisms (dashboard / pull
  consumer / temp consumer Worker) for list/inspect/replay/discard, with the
  caveat that destructive discard needs owner sign-off and a pull consumer is a
  new network surface requiring its own auth (D-DLQDRAIN, `08`).
- **Validation:** doc review + dry-run of the read-only peek command.

### FR-006 (P1) — Backlog checks
- **Statement:** Runbook documents how to check upload-scan / upload-cleanup
  backlogs (pending rows in `upload_assets` by `scan_status`/`status`) and the
  queue message age/backlog, with thresholds that trigger operator action.
- **Source:** brief ("backlog checks") + repo evidence (route LIMIT, scan
  `scan_status IN (pending, failed_transient)`).
- **AC:** Runbook gives SQL/proof-script commands + numeric thresholds (e.g.
  scan backlog > N rows for > M days → investigate).
- **Validation:** SQL run against preview D1 (read-only).

### FR-007 (P0) — Dry-run default preserved
- **Statement:** Upload jobs default to dry-run unless
  `UPLOAD_JOBS_ENABLED=1` AND `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`; retention
  has an operator-controlled dry-run path.
- **Source:** repo evidence (`scheduled-upload-jobs.ts:63-65`,
  `retention-core.ts:212-223`).
- **AC:** (1) Existing tests guard the dry-run default. (2) Runbook states the
  live-enable sequence and that retention currently runs live (call site passes
  no dryRun). (3) A planning option exists to gate retention behind a
  `RETENTION_DRY_RUN` env (decision D-RETDRY).
- **Validation:** focused vitest + doc review.

### FR-008 (P1) — Hosted provider proof path to productionJobsMessagingReady=true
- **Statement:** A concrete, ordered path exists to move
  `productionJobsMessagingReady` from false→true: run `cf:jobs-proof` against
  hosted, capture sanitized receipt in R2 `provider-proof/jobs/`, run
  `cf:queues-cron-proof` to merge it, run `cf:release-gates`.
- **Source:** repo evidence (`generate-cloudflare-queues-cron-proof.ts:388-407`,
  `verify-cloudflare-jobs-proof.ts`).
- **AC:** Runbook "Hosted proof" lists the exact command sequence, the secret
  requirement (`CRON_SECRET` present), and the evidence file targets.
- **Validation:** hosted/provider proof (explicitly *remaining required*; local
  simulation cannot prove this — see README).

### FR-009 (P1) — Retention rule registry completeness decision
- **Statement:** Decide (owner) whether the 7 unimplemented retention classes
  (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`,
  `logs_worker_observability`, `logs_email_delivery`, `uploads_orphaned`,
  `sessions_expired`) should be (a) implemented in `DEFAULT_RETENTION_RULES`,
  (b) documented as platform-managed/no-op, or (c) deferred.
- **Source:** repo evidence (registry has 7/14) + `retention-schedule.md`.
- **AC:** Decision recorded in `15` with rationale; runbook reflects the
  chosen posture per class.
- **Validation:** doc review. (Owner-delegated decision; isolated as OPEN-DEC-007.)

---

## ARCH — Architecture

### ARCH-001 (P1) — Cron dispatch routing clarity
- **Statement:** Document that `scheduled()` runs `runCloudflareScheduledUploadJobs`
  for *every* cron (it self-filters by cron→job map, so `30 3` is a no-op for
  upload jobs) and retention *only* on `30 3`. Make the no-op-on-unmatched-cron
  behavior explicit so operators don't misread logs.
- **Source:** repo evidence (`worker.ts:97-116`, `scheduled-upload-jobs.ts:100-112`).
- **AC:** Runbook "Cron routing" table + log-shape explanation.

### ARCH-002 (P2) — Shared job-auth helper (optional refactor)
- **Statement:** Extract the duplicated inline `readXxxSecrets`/`isAuthorized`
  into a shared helper. **Optional** — documented as a follow-up, not required
  for ops readiness.
- **Source:** repo evidence (3+ inline copies).
- **AC:** If implemented, a single helper + tests; routes updated.
- **Risks:** RISK-006 (drift between copies).

### ARCH-003 (P1) — Parallel cron waitUntil sequencing documented
- **Statement:** Document that on `30 3 * * *` both upload-jobs and retention
  `waitUntil` promises run concurrently with no shared transaction; state the
  risk and the mitigation (both are idempotent/re-runnable).
- **Source:** repo evidence (`worker.ts:97-115`).
- **AC:** Runbook note; risk RISK-004 referenced.

---

## DATA — Data / database

### DATA-001 (P0) — Retention `created_at` index decision + blueprint
- **Statement:** Decide whether to add standalone `created_at` indexes on the 5
  retention-target tables (purges use `WHERE created_at < ?` with no leading
  column). Provide a DB change blueprint.
- **Source:** repo evidence (composite-only indexes) + inference on scan cost.
- **AC:** DB blueprint DB-INDEX in `07`; decision D-INDEX in `15`; migration
  proposed with rollback.
- **Risks:** RISK-008.

### DATA-002 (P0) — `data_retention_events` audit integrity
- **Statement:** Retention deletes always record a `data_retention_events` row
  with `class_name`, `action`, `rows_affected`, `cutoff_timestamp`, `cron_run_id`.
- **Source:** repo evidence (`retention-core.ts:231-238`).
- **AC:** Existing test covers; runbook documents the audit query.

---

## API / Network

### API-001 (P0) — Internal route auth & dryRun shadow paths
- **Statement:** Both job routes' shadow paths (missing secret → 503; wrong
  secret → 401; jobs disabled → 503; dryRun → planner summary; live → mutate)
  are documented and the existing tests guard them.
- **Source:** repo evidence (route handlers).
- **AC:** Shadow-path matrix below complete; tests exist.

### API-002 (P1) — Origin header for internal fetch
- **Statement:** Document that cron→route fetch uses
  `CLOUDFLARE_UPLOAD_JOBS_ORIGIN` (default `https://archestimator.internal`)
  and that the route must accept this host (it routes by path, not host).
- **Source:** repo evidence (`scheduled-upload-jobs.ts:67-85`).
- **AC:** Runbook note.

---

## SEC — Security / privacy

### SEC-001 (P0) — Secret rotation runbook
- **Statement:** Runbook documents rotating `CRON_SECRET`,
  `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET` via
  `cf:sync-worker-secrets` with a no-downtime overlap (set new before removing
  old) and verifying both sides still authorize.
- **Source:** repo evidence (secret fallback) + `derived`.
- **AC:** Runbook "Secret rotation" section.
- **Risks:** RISK-005.

### SEC-002 (P0) — No secret leakage in proof artifacts
- **Statement:** All proof scripts and R2 receipts redact raw secrets; receipts
  store sanitized outcomes only.
- **Source:** repo evidence (`upload-job-queue.ts:220-280`, proof scripts).
- **AC:** Existing test `markdown no secret leak`; runbook reaffirms.

---

## REL / OPS — Reliability & operations

### REL-001 (P0) — Alert thresholds defined
- **Statement:** Define alert thresholds for: DLQ message count > 0 sustained,
  scan backlog growth, cleanup backlog age, retention run failure rate, queue
  message age p95, cron invocation failure.
- **Source:** brief ("alert thresholds"). Threshold numbers are `assumption` /
  `derived` — owner to confirm.
- **AC:** Runbook "Alert thresholds" table with metric, source, threshold,
  action. Where Cloudflare Analytics is the source, mark as hosted-evidence
  dependent.
- **Risks:** RISK-007 (free-tier observability limits).

### REL-002 (P0) — Failure recovery runbook
- **Statement:** Per-failure runbook: route returns 503/401, scanner outage,
  R2 partial delete, retention per-rule error, DLQ saturation, cron not firing.
- **Source:** brief ("failure recovery").
- **AC:** Runbook "Failure recovery" matrix.

### REL-003 (P1) — 30-day hosted observation gate
- **Statement:** Plan documents the 30-day hosted cron/D1 observation window
  (per `current-state.md` L244) as a release gate before declaring retention
  production-proven.
- **Source:** repo evidence (`current-state.md:244`).
- **AC:** README "External proof remaining" lists it; `13` gates it.

---

## TEST — Testing

### TEST-001 (P0) — Close identified test gaps
- **Statement:** Add focused tests for: (a) exception path in consumer
  (`reason:"exception"`), (b) DLQ boundary `attempts < MAX_RETRIES` →
  `deadLetterExpected=false`, (c) minute-boundary idempotency key, (d) worker
  `scheduled()`/`queue()` invocation (not just source-grep), (e) retention
  no-rows-skip + per-rule error branches, (f) `missing-secret`/`unmatched-cron`
  through the consumer.
- **Source:** `12` gap analysis.
- **AC:** Tests added; `bun run test:dom` green.

### TEST-002 (P1) — Worker handler integration test
- **Statement:** A vitest that imports `worker.ts` default export and invokes
  `scheduled()` (with a fake controller per cron) and `queue()` (with a fake
  batch), asserting `waitUntil` resolves and the right runners are called.
- **Source:** `12` gap.
- **AC:** Test passes.

---

## DOC — Documentation

### DOC-001 (P0) — Standalone operator runbook created
- **Statement:** A single `OPERATIONS_RUNBOOK.md` (in this pack, referenced
  from `13`) covers taxonomy, cron routing, dry-run, secrets, DLQ, backlog,
  alerts, recovery, hosted proof, secret rotation.
- **Source:** brief.
- **AC:** Document exists and is internally consistent.

### DOC-002 (P0) — Resolve AGENTS.md cron drift
- **Statement:** `AGENTS.md:40` corrected to three triggers.
- **Source:** brief.
- **AC:** `git diff` shows the one-line correction.

---

## Shadow-path matrices

### Queue consumer (`runCloudflareUploadJobQueueBatch`)

| Flow | Happy | Nil/missing body | Empty batch | Invalid message | No secret (route side) | Route error/timeout | Cross-batch dup | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Consumer | ack "executed" | n/a (msg has body) | summary 0 msgs | ack "invalid-message" | ack "missing-secret" (job skipped) | retry "job-failed"; at >=3 → DLQ-expected | re-executes (no cross-batch dedup) | per-batch dedup acks "duplicate" | batch summary | TEST-001 adds gaps |

### Cron dispatch (`runCloudflareScheduledUploadJobs`)

| Flow | Happy | Missing secret | Unmatched cron | Fetcher throws | dryRun default | live mode | Result | Test |
|---|---|---|---|---|---|---|---|---|
| Cron | executed (status recorded) | skipped missing_secret | skipped unmatched_cron | n/a (fetcher returns Response) | dryRun=true unless both flags set | dryRun=false when ENABLED=1 & DRY_RUN=0 | summary | existing + TEST-001 |

### Retention pass (`runRetentionPassInD1`)

| Flow | Happy | No rows past cutoff | db null | Per-rule SQL error | dryRun | live (worker call) | Result | Test |
|---|---|---|---|---|---|---|---|---|
| Retention | DELETE + audit | skipped "no rows" | returns [] | per-rule catch, skipped "error" | report only, no delete | DELETE + audit | results[] | TEST-001 adds gaps |

### Internal job routes

| Flow | Happy | No secret configured | Wrong secret | Jobs disabled | dryRun | live | Oversized batch | Result | Test |
|---|---|---|---|---|---|---|---|---|---|
| upload-cleanup | R2 delete + audit | 503 | 401 | 503 (non-dryRun) | planner summary | mutate | LIMIT cap | JSON | existing |
| upload-scan | scan + audit | 503 | 401 | 503 (non-dryRun) | summary | mutate | LIMIT cap | JSON | existing |
