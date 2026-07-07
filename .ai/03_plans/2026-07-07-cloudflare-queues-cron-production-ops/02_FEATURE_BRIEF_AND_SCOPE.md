# 02 — Feature Brief and Scope

**Source brief:** `PROMPT.md` (in this folder).
**Brief type:** production-operations hardening + documentation consistency.

## Brief (verbatim intent)

> Create a production operations plan for Cloudflare Queues, DLQ handling, cron
> triggers, upload jobs, retention jobs, and scheduled maintenance.
>
> Evidence to start from: `wrangler.jsonc` declares queue bindings, a DLQ, and
> three cron triggers; `AGENTS.md` still references two cron triggers
> (documentation drift); queue/cron handling lives in
> `src/lib/cloudflare/upload-job-queue.ts`,
> `src/lib/cloudflare/scheduled-upload-jobs.ts`, and `worker.ts`; current
> duplicate/backpressure behavior and proof scripts appear partly dry-run /
> operator-observation driven.
>
> Define queue job taxonomy, idempotency keys, retry/DLQ policy, cron schedule
> source of truth, backlog checks, operator runbook, hosted proof, alert
> thresholds, and failure recovery. Use only queues/crons bound in
> `wrangler.jsonc`. Keep all destructive cleanup behind dry-run and evidence
> review.

## In scope

| Area | Boundaries |
|---|---|
| Queue producer (`UPLOAD_JOBS_QUEUE` → `archestimator-upload-jobs`) | enqueue path, message schema, idempotency key construction |
| Queue consumer (`queue()` in `worker.ts` → `runCloudflareUploadJobQueueBatch`) | ack/retry/DLQ decision logic, per-batch dedup |
| DLQ (`archestimator-upload-jobs-dlq`) | policy, visibility, replay/drain, operator action |
| Cron triggers (3 in `wrangler.jsonc`) | schedule source of truth, dispatch routing, dry-run/live gating |
| Internal job routes | `/api/internal/upload-cleanup`, `/api/internal/upload-scan` (auth, dryRun, LIMIT) |
| Retention pass | `runRetentionPassInD1` on `30 3 * * *`, `DEFAULT_RETENTION_RULES`, `data_retention_events` |
| Dry-run / live controls | `UPLOAD_JOBS_ENABLED`, `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN`, per-route `?dryRun=1` |
| Secrets | `CRON_SECRET`, `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET` + fallback semantics |
| Provider proof | existing `cf:queues-cron-proof`, `cf:jobs-proof`, `cf:release-gates`, `cf:check-provider` scripts and their evidence files |
| Operator runbook | backlog checks, DLQ drain, alert thresholds, rollback/fix-forward |
| Documentation consistency | `AGENTS.md`, `retention-schedule.md`, `current-state.md` cron drift |

## Non-goals (explicit)

- New queues, new bindings, new cron triggers, or paid add-ons (D1 paid, R2
  paid, Smart Placement, Analytics paid) — out of scope, owner-gated.
- `OPEN-DEC-004` final TTL sign-off (counsel) — external decision, isolated as a
  blocker, not resolved here.
- DSAR erasure propagation — separate P1.8 follow-up.
- New UI surfaces — this is an ops/runtime/docs plan; UX/a11y is N/A (see `05`).
- Legacy Supabase (`ebxxqidacheyapmmzavr`) mutations — migration archaeology only.
- Changes to OpenNext cache DOs (`BucketCachePurge`, `DOQueueHandler`,
  `DOShardedTagCache`) — unrelated to the upload-jobs queue.

## Success metrics (planning-level)

- A single, consistent cron schedule statement across all 5 surfaces.
- Every queue job type has a documented idempotency contract and DLQ policy.
- A future executor can run the named proof scripts and follow the runbook
  without rediscovery.
- `productionJobsMessagingReady` has a concrete path from `false` → `true`.
- No destructive cleanup can execute without an explicit dry-run/evidence step.

## Failure metrics (what "not ready" looks like)

- Cron/queue drift persists across docs.
- DLQ messages have no documented drain/replay path.
- Retention runs against un-indexed `created_at` scans at scale.
- Hosted/provider proof claimed from local-only simulation.
