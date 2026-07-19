# UNIT-009 — `reconcileActivityOutbox` Has Up To 500 × 3 D1 Statements Per Pass · PERF-D1-002

**Finding:** PERF-D1-002 · **Priority:** P2 · **Wave:** 1 (W1-9 / HL-6) · **Effort:** M · **Risk:** Low
**Roadmap item:** W1-9 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The daily `reconcileActivityOutbox` pass issues 2 D1 statements total (one
batched SELECT to filter, one batched UPDATE per branch) instead of up to
1,500 (3 per row × up to 500 rows). Daily retention cron wall-time drops
proportionally.

(Note: PERF-CRON-003 in the register corrected a misread — this runs once/day
from `worker.ts:273` inside the `30 3 * * *` branch, NOT 288×/day. The
per-invocation cost is still material.)

## Affected surface

- `src/lib/activity/activity-outbox.ts:105-157`
  - `:111` `Math.min(options.limit ?? 100, 500)` cap
  - `:125-154` loop does per-row `SELECT` (`:127-132`) + `UPDATE delivered`
    (`:136-140`) OR `UPDATE failed` retry (`:146-151`)
- Called from `worker.ts:273`

## Dependencies

- None for the code change.
- No AUTH_BOUNDARY items.

## Implementation intent

From PERF-D1-002 "Recommendation" (do all three; they are one coherent
batch refactor):

1. **Batch the verification SELECT.** Issue one query:
   ```sql
   SELECT id, event_id, workspace_id FROM activity_event_outbox
   WHERE id IN (placeholders) AND status IN ('pending','failed')
   ```
2. **Batch the existence check.** Issue one query:
   ```sql
   SELECT id FROM estimate_sheet_events WHERE (id, workspace_id) IN (...)
   ```
3. **Issue two atomic `batch([...])` calls** — one for delivered updates, one
   for failed updates — each using `WHERE id IN (placeholders)`.

Constraints (from finding): preserve idempotency; preserve `nextRetryAt`
backoff math; preserve `assertWorkspaceId` invariant. The branch decision
(delivered vs failed-retry) per row is unchanged — only the per-row statement
count collapses.

## Expected evidence

Verification command from PERF-D1-002 "Verification":

```
# Instrument statement count via temporary log; EXPLAIN QUERY PLAN for the
# batched SELECT against idx_activity_event_outbox_status
wrangler d1 execute ARCH_DB --local --command \
  "EXPLAIN QUERY PLAN SELECT id, event_id, workspace_id FROM activity_event_outbox WHERE id IN ('a','b') AND status IN ('pending','failed')"
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing the
per-row SELECT/UPDATE loop replaced by two batched queries + two batched
UPDATEs is the decisive non-test signal). The statement-count instrumentation
and EXPLAIN are hosted-gated follow-ups.

## Completion signal

`activity-outbox.ts:125-154` no longer loops per row issuing SELECT+UPDATE.
The pass issues one batched verification SELECT, one batched existence check,
and at most two batched UPDATE calls (delivered / failed). Statement count per
pass drops from up to 1,500 to ≤ ~5.

## Recovery path

Not required (Risk: Low). Revert to the per-row loop — behavior is identical,
just N× the statements. Idempotency and backoff math are preserved either way,
so a revert is safe if the batched UPDATE surfaces an edge case.
