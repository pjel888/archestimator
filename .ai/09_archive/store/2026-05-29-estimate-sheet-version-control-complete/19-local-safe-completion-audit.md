# 19 Local-Safe Completion Audit

**Date:** 2026-05-25
**Status:** Local-safe Activity expansion implemented and verified.
**Scope:** Final reconciliation pass for all non-destructive work currently actionable in `.ai/03_plans/estimate-sheet-version-control`.

## Verdict

The plan pack no longer has an unimplemented local-safe Activity backlog.

Implemented in this pass:

- node-scoped Activity reads for direct nodes and Group Node descendants;
- `nodeEvents` / `nodeNextCursor` API contract;
- node Activity inspector launched from the selected sheet node;
- event-type, browser-local date-range, and bounded search filters for Activity;
- profile-resolved actor labels with privacy-safe fallback;
- page-local `correlation_id` grouping;
- read-only retention metrics RPC;
- payload/snapshot measurement evidence;
- protected-route browser smoke for sheet Activity, row Version History, and node Activity;
- linked-remote QA artifact disposition as dormant residue.

Still not implemented because it is blocked, destructive, or explicitly deferred:

- local/throwaway live DB proof for node create/rename/template event reads, rollback, and concurrency;
- scalar edit latency benchmark, because it requires a safe mutation harness;
- destructive deletion of the linked-remote `V2` / `QA checkpoint` residue;
- Activity export/report;
- Supabase Realtime;
- retention pruning/archive compaction;
- undo/redo.

## Code Changes

- `src/lib/estimates/actions.ts`
  - Extended `fetchEstimateSheetVersionControl` with `nodeId`, `includeDescendants`, `eventTypes`, `dateFrom`, `dateTo`, `search`, `nodeCursor`, and `scope: "node"`.
  - Added `nodeEvents` / `nodeNextCursor` output.
  - Added visible-profile actor label enrichment with safe fallback.
  - Added `fetchEstimateActivityRetentionMetrics`.
- `src/components/workshop/EstimateSheetContent.tsx`
  - Added selected-node Activity inspector.
  - Added Activity filters, including browser-local date boundaries that match displayed event timestamps.
  - Added page-local correlation grouping.
  - Kept named-version, compare, and restore UI absent.
- `supabase/migrations/20260525013900_estimate_activity_retention_metrics.sql`
  - Added read-only `get_estimate_activity_retention_metrics`.
- `src/lib/supabase/types.ts`
  - Added generated function typing for retention metrics.
- Focused Vitest coverage was updated for the read contract, node Activity UI, filters, actor labels, grouping, and retention metrics.
- Browser screenshots were refreshed under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/`.

## Remote Evidence

Read-only measurement on linked project `ebxxqidacheyapmmzavr`:

| Measurement | Value |
| --- | ---: |
| Event count | 20 |
| P95 row context | 520.6 bytes |
| P95 old snapshot | 1430.2 bytes |
| P95 new snapshot | 1549.05 bytes |
| P95 largest event component | 1549.05 bytes |
| Max largest event component | 1626 bytes |
| Dormant version count | 3 |
| P95 dormant version snapshot | 23694.5 bytes |
| Max dormant version snapshot | 24078 bytes |

The retention metrics migration was applied to the same linked project and verified for project `22222222-2222-4222-8222-222222222222`:

| Metric | Value |
| --- | ---: |
| Workspace event bytes | 75283 |
| Workspace version bytes | 308096 |
| Largest event payload component | 1626 |
| Max estimate event count | 16 |
| Estimates over 10000 events | 0 |
| Workspace storage over 250 MB | false |

The linked remote still contains historical dormant QA residue:

- version id `6afbccb2-33bc-47de-9f19-a2e4ac7b87e8`;
- event id `8d2675df-0492-41b6-9cf2-d9e02aa3bf00`;
- version label `V2`;
- title `QA checkpoint`.

Disposition: accepted dormant residue. Do not delete without a separate destructive-cleanup task that names exact ids.

## Verification

Passed:

```bash
bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1
bun run type-check
bun run validate
bun run build
git diff --check
```

Browser smoke passed against a temporary dev-auth local server on `127.0.0.1:3020` for route `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777720`:

- sheet Activity opened with filters and no `Versions` tab or `Compare` button;
- row Version History opened for `IKEA Coffee Table` with the history tab selected and no `Versions` / `Compare` controls;
- node Activity opened with no `Versions` tab.

Captured artifacts:

- `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/estimate-route-loaded.png`;
- `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/sheet-activity-open.png`;
- `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/sheet-activity-date-filtered.png`;
- `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/row-version-history-open.png`;
- `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/node-activity-open.png`.

Still required before a production-runtime mutation/atomicity claim:

```bash
RUN_SUPABASE_INTEGRATION=1 bunx vitest run tests/vitest/estimate-sheet-version-control-db.test.ts --maxWorkers=1
```

Extend that opt-in suite with node create/rename, template event-read, rollback, and concurrency assertions, and run it only against local Supabase or an approved throwaway database, not the linked remote project.

## Current Stop Condition

Stop implementation from this plan pack when:

- focused tests, typecheck, validate, build, and browser smoke pass;
- docs list only blocked/deferred/non-goal work as remaining;
- `git diff --check` passes;
- code-review graph change detection has been reviewed.

At that point, there is no more local-safe implementation left in this plan folder.
