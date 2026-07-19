# UNIT-005 — 5-Minute Cron Always Writes `cron_run_events` Row + Empty Sweeps · PERF-CRON-001

**Finding:** PERF-CRON-001 · **Priority:** P2 · **Wave:** 1 (W1-4 / QW-7) · **Effort:** S · **Risk:** Low
**Roadmap item:** W1-4 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The `*/5 * * * *` drain cron no longer writes a `cron_run_events` row when no
work was done, and the `30 3 * * *` retention cron collapses its two
`recordCronRunEvent` calls into one composite row. `cron_run_events` write
volume drops ~80% with no loss of operational signal (the error path still
writes).

## Affected surface

- `worker.ts:205-237` — the `*/5` drain handler; `:216-223` (ok path) and
  `:226-233` (error path) both call `recordCronRunEvent` unconditionally
- `worker.ts:269-303` — the `30 3 * * *` retention branch writes **two**
  `recordCronRunEvent` rows per invocation (upload-jobs + retention)
- `src/lib/admin/observability-repository.ts:240-279` — `recordCronRunEvent`
  INSERTs if `db` resolves

## Dependencies

- None for the code change.
- No AUTH_BOUNDARY items.

## Implementation intent

From PERF-CRON-001 "Recommendation" (do (1) + (2); (3) is optional follow-up):

1. **Gate the INSERT on meaningful work.** In `worker.ts`, only call
   `recordCronRunEvent` when `summaryJson !== null` OR each task returns a
   "did-work" boolean. Skip the INSERT entirely on no-op sweeps.
2. **Collapse the two retention writes into one.** For the `30 3 * * *` branch,
   call `recordCronRunEvent` once with a composite summary covering both
   upload-jobs and retention, instead of two separate rows.
3. **(Optional follow-up, defer unless ops asks)** introduce an hourly
   aggregate rollup table summarizing 12 5-min runs into one row, with granular
   rows purged after 7 days.

Constraints (from finding): preserve ability to detect cron failures — the
**error path must still write**. Retain enough granularity for ops debugging
(the composite row in step 2 must include both task summaries).

## Expected evidence

Verification command from PERF-CRON-001 "Verification":

```
# D1 row count diff on cron_run_events over 24 h with no work vs baseline
wrangler d1 execute ARCH_DB --remote --command \
  "SELECT COUNT(*) FROM cron_run_events WHERE created_at > strftime('%s','now')-86400"
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing the
`recordCronRunEvent` call guarded by a did-work flag, and the retention branch
calling it once with a composite payload, is the decisive non-test signal).
The 24-hour row-count diff is hosted-gated follow-up.

## Completion signal

- `worker.ts:216-223` (ok path) only calls `recordCronRunEvent` when at least
  one task reported work; `:226-233` (error path) still always writes.
- The `30 3 * * *` branch issues exactly one `recordCronRunEvent` call with a
  composite payload.

## Recovery path

Not required (Risk: Low). Revert the gate — behavior reverts to always-write;
no data migration involved.
