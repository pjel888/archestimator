# Unit 007 — `UPLOAD_JOBS_QUEUE` Is Dead Infrastructure (HIGH)

**Finding:** F-07 · **Severity:** HIGH · **Priority:** P2 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-007` · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

The `archestimator-upload-jobs` Cloudflare Queue has a producer binding
(`UPLOAD_JOBS_QUEUE`), a consumer with a dead-letter queue (`max_retries: 3`), and
a full `queue()` handler in `worker.ts` — but `enqueueCloudflareScheduledUploadJobs`
(the only function that calls `queue.sendBatch`) is **never invoked anywhere**. The
`scheduled()` handler bypasses the queue entirely and calls
`runCloudflareScheduledUploadJobs` via direct HTTP fetch.

So the entire queue + DLQ config is dead, and the retry/idempotency semantics in
`upload-job-queue.ts` (`ackOutcome`, `retryOutcome`) never execute in production.

## Evidence

- `src/lib/cloudflare/upload-job-queue.ts:143` — `enqueueCloudflareScheduledUploadJobs`
  is the only `queue.sendBatch` caller.
- `grep -rn enqueueCloudflareScheduledUploadJobs src/ worker.ts` returns **only the
  definition** — zero callers.
- `worker.ts:240` — `scheduled()` calls `runCloudflareScheduledUploadJobs({ ... })`
  directly (direct HTTP fetch to the internal routes), not the enqueue function.
- `worker.ts:306` — `queue(batch, env, ctx)` handler exists but never receives.
- `wrangler.jsonc:82-109` — producer + consumer + DLQ all configured.

## Fix Direction

Owner decision (per `DEC-005`); both are safe. Pick one:

**Option A — wire the queue in (preferred if retry/DLQ semantics are wanted):**
- In `scheduled()`, replace the direct `runCloudflareScheduledUploadJobs` HTTP
  fan-out with `enqueueCloudflareScheduledUploadJobs(env, batch)`.
- Let the existing `queue()` handler do the per-job work (it already calls the same
  internal routes). The DLQ + `max_retries: 3` then actually apply.
- Keep `runCloudflareUploadJobQueueBatch` as the queue's worker body.

**Option B — delete the dead infrastructure:**
- Remove the `UPLOAD_JOBS_QUEUE` producer/consumer/DLQ from `wrangler.jsonc`.
- Remove the `queue()` handler and `enqueueCloudflareScheduledUploadJobs` /
  `runCloudflareUploadJobQueueBatch` from `worker.ts` / `upload-job-queue.ts`.
- Keep `runCloudflareScheduledUploadJobs` (the live direct-fetch path).

**Recommendation:** Option A if upload jobs are ever expected to need retry/DLQ
(the config's presence suggests intent); Option B if the direct-fetch path is
provably sufficient and the queue was aspirational. Confirm with owner.

This decision **gates** `/improve` plan `009-upload-queue-cross-batch-idempotency`
(see `00-PLAN.md` §11): if Option B, that plan is moot.

### Owned paths
- `worker.ts`
- `wrangler.jsonc`
- `src/lib/cloudflare/upload-job-queue.ts`
- `src/lib/cloudflare/scheduled-upload-jobs.ts` (read context)

### Prohibited
- Do not remove `runCloudflareScheduledUploadJobs` under Option A (the queue worker
  calls the same internal routes).
- Do not change the cron schedule.

## Acceptance Evidence

- `AC-001` (Option A): `scheduled()` enqueues; the `queue()` handler is the worker;
  a forced job produces a queue message (static proof + binding present).
- `AC-002` (Option B): `UPLOAD_JOBS_QUEUE` removed from `wrangler.jsonc`; no
  references remain; `scheduled()` still drives jobs via direct fetch.

## Recovery

Either option is independently revertible.
