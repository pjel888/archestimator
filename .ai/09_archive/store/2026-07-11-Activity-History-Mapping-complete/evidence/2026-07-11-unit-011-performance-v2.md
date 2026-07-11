# UNIT-011 Performance Evidence, Refresh 2

Recorded: 2026-07-11

## Delivered Contract

- `migrations/0060_activity_history_indexes.sql` adds the row and node cursor
  indexes. Its SHA-256 is
  `e247ae6587f2b73942fe2b9a2538a8b7d1ecb147954013d7ef84239efd8bdf0c`.
- Initial activity reads defer exact counts until a caller requests them.
- Activity correlation grouping is one pass, and sheet, row, node, and public
  activity clients cap accumulated items at 200.

## Verification

`bunx wrangler d1 migrations apply ARCH_DB --local --persist-to .ai/99_scratch/activity-history/unit-011-d1`
applied migrations through `0065_activity_history_lifecycle.sql` successfully.

`EXPLAIN QUERY PLAN` against that fresh local D1 returned:

```text
SEARCH estimate_sheet_events USING COVERING INDEX idx_estimate_sheet_events_estimate_target_row_created (estimate_id=? AND target_row_id=?)
SEARCH estimate_sheet_events USING COVERING INDEX idx_estimate_sheet_events_estimate_node_created (estimate_id=? AND estimate_node_id=?)
```

`bunx vitest run tests/vitest/perf/activity-history-evaluator.test.ts`
passed 7 tests. The evaluator covers 100, 500, 5,000, and 50,000 event
fixtures, a 50,000-event p95 grouping budget below 500 ms, an RSS delta below
128 MiB, deferred exact counts, and the 200-item accumulated-DOM cap.

## Recovery

The index migration is additive. A faulty index may be corrected forward in a
new leased migration; existing `0060` history is immutable and is not edited.
