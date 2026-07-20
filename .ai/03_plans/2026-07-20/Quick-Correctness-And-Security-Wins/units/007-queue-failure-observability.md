# UNIT-007 — Record cron-run event on upload-job queue batch failure

## Goal

Add a `.catch` to the Worker `queue()` handler so a batch-level failure in the
upload-job queue records a `recordCronRunEvent` error row — mirroring the
`scheduled()` handler next to it. Today such failures are invisible to admin
observability.

## Status

`READY` · depends on: (none) · requirement: `OPS-001` · risks: (none)

## Why this matters

The `queue()` handler at `worker.ts:306-320` calls
`ctx.waitUntil(runCloudflareUploadJobQueueBatch(...).then(summary => console.log(...)))`
with no `.catch`. `runCloudflareUploadJobQueueBatch` is designed not to throw
(per-message try/catch in `upload-job-queue.ts:359-397`), but a defensive
`.catch` is cheap insurance. If it ever does throw (a Cloudflare batch API
error, an exception outside the per-message try/catch), the error goes to the
runtime's unhandled-rejection path and `recordCronRunEvent` never fires.
Operators won't see upload-job queue failures in the same place they see cron
failures.

## Current state

File: `worker.ts`, the `queue` handler (~line 306):

```ts
queue(batch: CloudflareUploadJobQueueBatchLike, env: CloudflareWorkerEnv, ctx: ExecutionContextLike) {
  if (batch.queue === CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME) {
    ctx.waitUntil(runClientPortalNotificationQueueBatch({ batch, env }).then((summary) => console.log("Client Portal notification queue batch completed", JSON.stringify(summary))));
    return;
  }
  ctx.waitUntil(
    runCloudflareUploadJobQueueBatch({
      batch,
      env,
      fetcher: (request) => openNextWorker.fetch(request, env, ctx),
    }).then((summary) => {
      console.log("Cloudflare upload job queue batch completed", JSON.stringify(summary));
    }),
  );
},
```

The `scheduled()` handler in the same file (~lines 239-266) has the correct
pattern: it `.catch`es and records an error `recordCronRunEvent`. Read it as
the exemplar — mirror its error-row shape.

`recordCronRunEvent` is imported at the top of `worker.ts` from
`@/lib/admin/observability-repository`. Its signature accepts a `cronName`,
`status`, `errorClass`, timestamps, and a summary. (Read the import site for
the exact shape.)

## Owned paths / resources

- `worker.ts` — the only file to edit.

## Implementation boundary

1. Confirm the `queue` handler matches the excerpt above (reread before edit).
2. Read the `scheduled()` handler's `.catch` block in the same file and copy its
   `recordCronRunEvent({ cronName, status: "error", errorClass, ... })` shape.
3. Add a `.catch` to the upload-job-queue `ctx.waitUntil(...)` chain. Use a
   `cronName` that distinguishes queue batches from scheduled runs, e.g.
   `"upload-jobs-queue"` (the `queue` handler is not a cron, but the
   observability table is shared; a distinct name keeps the dashboards
   separable).

   Target shape:

   ```ts
   ctx.waitUntil(
     runCloudflareUploadJobQueueBatch({
       batch,
       env,
       fetcher: (request) => openNextWorker.fetch(request, env, ctx),
     })
       .then((summary) => {
         console.log("Cloudflare upload job queue batch completed", JSON.stringify(summary));
       })
       .catch((error) => {
         console.error("Cloudflare upload job queue batch failed", error);
         recordCronRunEvent({
           /* mirror scheduled()'s error-row shape, with cronName: "upload-jobs-queue" */
         }).catch(() => undefined);
       }),
   );
   ```

4. Optionally add the same `.catch` to the Client Portal notification queue
   branch above it — same reasoning, same shape, `cronName:
   "client-portal-notifications-queue"`. This is low-risk and keeps the two
   branches symmetric; include it if the `scheduled()` pattern clearly applies.

5. Do **not** change `runCloudflareUploadJobQueueBatch` itself — the per-message
   try/catch stays. This is purely the outer `ctx.waitUntil` safety net.

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |

## Scope

**In scope:** `worker.ts` only.

**Out of scope:**
- `src/lib/cloudflare/upload-job-queue.ts` — the batch runner is unchanged.
- `src/lib/admin/observability-repository.ts` — `recordCronRunEvent` signature
  unchanged.
- The `scheduled()` handler — already correct; it is the exemplar.
- Tests (gate is `NOT_REQUIRED`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The upload-job-queue `ctx.waitUntil(...)` chain has a `.catch`
- [ ] The `.catch` calls `recordCronRunEvent` with `status: "error"` and a
      distinct `cronName`
- [ ] The `recordCronRunEvent` call itself has a `.catch(() => undefined)` so an
      observability failure doesn't mask the original error
- [ ] The shape mirrors the existing `scheduled()` error row
- [ ] No files outside `worker.ts` are modified

## Acceptance evidence

- Read the edited `queue` handler and confirm the `.catch` is present and shaped
  like `scheduled()`'s.
- `git diff worker.ts` shows only the `.catch` blocks added.

## STOP conditions

- `recordCronRunEvent`'s signature does not accept an arbitrary `cronName`
  string (e.g. it validates against the cron schedule list). If so, extend the
  accepted set or add a `queueName` field — surface the choice rather than
  forcing a fit.
- The `scheduled()` handler's `.catch` uses fields not available in `queue()`
  (e.g. a `cron` string from the trigger). Adapt the field set to the queue
  context.

## Recovery

The edit is one `.catch` block (optionally two). The only failure mode is
mismatched `recordCronRunEvent` arguments — read the function signature and the
`scheduled()` exemplar, then match.

## Maintenance notes

- The `cronName: "upload-jobs-queue"` convention lets dashboards filter
  queue-batch failures separately from scheduled-cron failures. If a future
  observability refactor renames the field, update both the queue and scheduled
  handlers together.
- This `.catch` is defense-in-depth; the real fix for any recurring queue-batch
  failure lives in `runCloudflareUploadJobQueueBatch`. A reviewer should confirm
  the per-message try/catch is intact.
