# Plan 009: Add durable cross-batch idempotency to the upload-job queue

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/cloudflare/upload-job-queue.ts src/lib/cloudflare/client-portal-notification-queue.ts`
> If either changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

The upload-job queue deduplicates jobs only **within a single delivered batch**:
`src/lib/cloudflare/upload-job-queue.ts:338` declares
`const seenIdempotencyKeys = new Set<string>();` *inside*
`runCloudflareUploadJobQueueBatch`. If a worker crashes after a cleanup/scan job
partially executes but before `message.ack()` lands, Cloudflare redelivers the
message in a later batch where the Set has been reset — and the job re-runs.
`upload-scan` is naturally idempotent (re-scanning is safe), but `upload-cleanup`
removes R2 objects and D1 rows; a re-run can double-process or race with new
uploads landing in the same window.

The sibling Client Portal notification queue (`client-portal-notification-queue.ts:108-139`)
**does** implement cross-attempt idempotency via a D1 lease-token + state-machine
claim. This plan ports that pattern to the upload-job queue so retried messages
no-op on a prior terminal receipt.

## Current state

`src/lib/cloudflare/upload-job-queue.ts` (verified key facts):
- Line 119-122: `buildIdempotencyKey` = `${jobName}:${cron}:${minute}` (minute-granular, from enqueue timestamp). A retried message carries the same key.
- Line 338: `const seenIdempotencyKeys = new Set<string>();` is function-local — per-batch only.
- Line 359-377: on `matchingExecution.ok === false`, the message is `retryOutcome(...)`-ed; the retry re-enters `runCloudflareScheduledUploadJobs`, re-invoking `/api/internal/upload-cleanup` and `/api/internal/upload-scan`.

The notification queue's durable pattern (`client-portal-notification-queue.ts:108-139`,
verified shape): a D1 `UPDATE ... SET state='processing' WHERE ((state='pending' ...) OR (state='processing' AND lease_expires_at <= ?))`,
returning `"duplicate"` when the claim yields zero changed rows.

There's also a `recordCronRunEvent` helper referenced in recon (cron run events
persisted to D1) — check whether it can be reused as the dedupe table, or
whether a new small table is cleaner.

`migrations/` is the active migration dir (83 migrations). A new migration is
in scope for Philip's standing authorization (AGENTS.md → Stack boundaries).

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `bun install`                    | exit 0              |
| Typecheck | `bun run type-check`             | exit 0              |
| Tests     | `bun run verify`                 | all pass            |
| Validate  | `bun run validate:plan-pack` (if the migration touches plan-pack contracts) | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `migrations/<next-number>_upload_job_idempotency.sql` — new table (or column
  on an existing cron-runs table) recording per-key terminal receipts.
- `src/lib/cloudflare/upload-job-queue.ts` — claim the idempotency key in D1 at
  the start of message handling; `ackOutcome(message, body, "duplicate")` if a
  terminal receipt already exists.

**Out of scope**:
- The notification queue — it already has durable idempotency.
- The cleanup/scan job internals (`cleanup-job.ts`, `scan-job.ts`) — they keep
  their own per-target idempotency; this plan adds the *outer* dedupe so a
  retried message never reaches them twice for the same key.
- `/api/internal/upload-cleanup` and `/api/internal/upload-scan` routes —
  unchanged.

## Git workflow

- Branch: `advisor/009-upload-queue-durable-dedupe`.
- Commit message: `fix(uploads): durable cross-batch idempotency for upload-job queue`.
- Migration filename: next sequential number after the current highest
  (`ls migrations/*.sql | sort | tail -1` to find it; e.g. `0084_upload_job_idempotency.sql`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Decide the storage shape

Read `src/lib/cloudflare/client-portal-notification-queue.ts:108-139` (the
exemplar) and search for `recordCronRunEvent` to see if an existing cron-runs
table can hold the idempotency receipt.

Two options:
- **(A) Reuse an existing cron-runs table** if one already records
  `(idempotency_key, status)` with a UNIQUE constraint on the key. Cheapest.
- **(B) New table** `upload_job_runs(idempotency_key TEXT PRIMARY KEY, job_name TEXT, status TEXT, completed_at TEXT)`.

Prefer (A) if the existing table fits; otherwise (B). Record your choice in the
worktree notes before writing the migration.

### Step 2: Write the migration

If (B), the migration:

```sql
-- <next-number>_upload_job_idempotency.sql
CREATE TABLE IF NOT EXISTS upload_job_runs (
  idempotency_key TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

If (A), write the appropriate `ALTER TABLE` / index. Either way, the migration
must be forward-only and idempotent (`IF NOT EXISTS`), matching the recent
migration convention (0083+).

Place the file in `migrations/` with the next sequential number.

**Verify**: the migration file exists and is valid SQL (`bun run type-check`
won't catch SQL, but read it carefully; if there's a migration validator script
like `bun run cf:inventory`, run it).

### Step 3: Add the claim in `upload-job-queue.ts`

In `runCloudflareUploadJobQueueBatch` (around line 338-377), BEFORE invoking the
underlying job for a message, claim the idempotency key in D1:

```ts
// Pseudocode — match the actual D1 access pattern used elsewhere in this file:
const claimResult = await database
  .prepare(
    "INSERT INTO upload_job_runs (idempotency_key, job_name, status, completed_at) VALUES (?, ?, 'processing', datetime('now')) ON CONFLICT(idempotency_key) DO NOTHING RETURNING idempotency_key"
  )
  .bind(idempotencyKey, jobName)
  .first<{ idempotency_key: string }>();

if (!claimResult) {
  // A prior batch already claimed/ran this key — no-op the message.
  return ackOutcome(message, body, "duplicate");
}

// ... run the job ...

// On terminal success, UPDATE the row to status='completed'.
// On retryable failure, either DELETE the claim (so a retry can re-claim) or
// mark status='failed_retryable' and let the next attempt re-claim via the
// "processing AND lease_expires_at <= ?" branch (mirror the notification queue).
```

Match the actual D1 helpers used in this file (it likely uses
`getCloudflareD1Database()` + `.prepare().bind()` directly, or one of the
`runD1Batch`/`firstD1Row` helpers). Use whatever the surrounding code uses.

Keep the existing in-batch `seenIdempotencyKeys` Set — it still deduplicates
within a batch (a legitimate fast path); the D1 claim adds the cross-batch
guarantee on top.

**Verify**: `bun run type-check` → exit 0.

### Step 4: Run the gate

**Verify**: `bun run verify` → exit 0.

Existing queue tests (`grep -rln "upload-job-queue\|runCloudflareUploadJobQueueBatch\|buildIdempotencyKey" tests/`)
may need updating: any test that asserts a retried message re-runs the job must
now assert it no-ops as `"duplicate"`. Update those assertions to match the new
contract.

## Test plan

- Update affected queue tests (above).
- If the user authorized new tests (TEST_TASK), add:
  - A test asserting that a second delivery of the same `(jobName, cron, minute)`
    key returns `"duplicate"` without invoking the underlying job endpoint.
  - A test asserting the claim is released on retryable failure so a genuine
    retry can succeed.
  Model on the existing notification-queue idempotency test
  (`grep -rln "client-portal-notification-queue" tests/`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] New migration file exists in `migrations/` with `IF NOT EXISTS`
- [ ] `runCloudflareUploadJobQueueBatch` claims the idempotency key in D1 before
      running the job, and acks as `"duplicate"` on a prior claim
- [ ] `grep -n "const seenIdempotencyKeys = new Set" src/lib/cloudflare/upload-job-queue.ts`
      still shows the in-batch Set (kept as a fast path)
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- An existing cron-runs table exists but its shape can't hold the idempotency
  receipt without a breaking schema change — fall back to option (B) (new table)
  and report the decision.
- The D1 access pattern in `upload-job-queue.ts` is sufficiently different from
  the notification queue that the claim can't be expressed as a single
  atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING` — report the structure.
- A queue test asserts retried messages re-run jobs as a **deliberate**
  behavior (not just an accident of the missing dedupe) — report it; that
  contract may need a maintainer decision.

## Maintenance notes

- The minute-granular idempotency key means legitimate cron enqueues never
  collide (a job runs at most once per minute per jobName). The durable dedupe
  is purely a retry-safety net.
- `upload-cleanup` keeps its own coordinator-level idempotency
  (`cleanup-job.ts:319-508`, ON CONFLICT updates + reference-predicate re-checks)
  — this plan's outer dedupe is belt-and-suspenders, not a replacement.
- Reviewer: confirm (a) the claim is released on retryable failure (so a real
  retry isn't permanently blocked), (b) terminal success marks the row
  `completed`, (c) the in-batch Set is retained (fast path), (d) the migration
  is forward-only and idempotent.
