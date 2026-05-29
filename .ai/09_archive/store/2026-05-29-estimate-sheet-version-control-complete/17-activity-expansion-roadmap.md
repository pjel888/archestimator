# 17 Activity Expansion Roadmap

**Date:** 2026-05-24
**Status:** Current status and future-gate strategy after the Activity-only pivot.
**Scope:** Completed local-safe Activity expansion, evidence closure, and remaining blocked/non-goal gates.

## Objective

Make estimate Activity trustworthy before expanding the feature surface. The 2026-05-25 pass completed the local-safe read/UX/measurement/browser-smoke gates; future work should focus only on runtime database proof, scalar latency benchmarking, or explicitly approved export/cleanup slices.

## Current Truth

### Implemented And Supported

- Sheet header opens `Activity`.
- Row-originated controls open `Row item details`, with Details, Component, and Activity tabs for the selected row.
- Row insert/update/replace/delete use history RPCs.
- Reorder, template insert, estimate metadata updates, and node delete use history-aware wrapper RPCs.
- Node create and node rename now route through history-aware RPCs in migration `20260524132800_estimate_node_activity_history.sql` and `src/lib/estimates/actions.ts`.
- Sheet, row, and node Activity support cursor pagination.
- Node Activity supports direct-node and Group Node descendant reads.
- Sheet/node Activity support event-type filters, browser-local date filters, and bounded database-backed search.
- Audit cards render privacy-safe profile display names when visible, with fallback actor labels.
- Repeated `correlation_id` values render as page-local related-event groups.
- Read-only retention metrics are implemented through `get_estimate_activity_retention_metrics`.
- Named version, compare, and restore-as-copy UI/actions are absent and dormant.

### Verified Defects / Gaps

1. Node create/rename live DB proof is still open.
   - Code and forward migration now provide `create_estimate_node_with_history` and `rename_estimate_node_with_history`.
   - Local runtime proof remains blocked until a local Supabase/throwaway DB harness is available.
2. Event reads now have expanded cursor pagination and filters.
   - `fetchEstimateSheetVersionControl` accepts `sheetCursor`, `rowCursor`, `nodeCursor`, `scope`, `nodeId`, `includeDescendants`, `eventTypes`, `dateFrom`, `dateTo`, and `search`.
   - Sheet Activity, row scopes, Row item details Activity, and node Activity expose compact Load more controls.
   - Remaining proof: high-volume load testing if production event counts approach the documented thresholds.
3. Actor attribution displays safe labels.
   - Actor labels resolve through visible `profiles.display_name` when available.
   - Missing display names resolve through safe profile-email labels when possible.
   - Missing profiles fall back to `Unknown user`.
   - Null actors render as `System/backfill`.
4. Bulk/correlated events are grouped page-locally.
   - Events sharing `correlation_id` render as related-event groups in the current page.
   - Future high-volume work may add bounded correlation lookahead if page splits become confusing.
5. Measurement gates are partially closed.
   - Payload/snapshot measurements and retention metrics are recorded.
   - Scalar edit latency benchmark remains open because it requires a mutation harness.
6. Activity export is not planned.
   - Decision needed: defer to proposal/change-order scope or add a read-only export/report later.
7. Retention monitoring is implemented as read-only metrics.
   - No retention pruning is implemented or approved.

## Evidence Closure Slice

This slice is complete as documentation/testing evidence. Keep it as the record for how chart/export/template/read-contract gaps were closed.

Status after 2026-05-24 evidence pass:

- Added `18-current-activity-contract.md` as the single-page current contract.
- Added post-pivot `.omx` PRD/test-spec handoff files:
  - `.omx/plans/prd-estimate-activity-evidence-closure.md`;
  - `.omx/plans/test-spec-estimate-activity-evidence-closure.md`.
- Marked stale pre-pivot `.omx/plans/prd-estimate-sheet-version-control.md` and `.omx/plans/test-spec-estimate-sheet-version-control.md` as superseded.
- Added focused static tests for chart isolation, proposal export label boundaries, current read DTO bounds, generated-type RPC-name drift, and stronger template wrapper event return evidence.
- Verification passed:
  - `bunx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/project-charts-aggregation.test.ts tests/vitest/proposal-export-route.test.ts --maxWorkers=1`
  - result: 6 files passed, 49 tests passed.
  - `git diff --check` passed.

Tracking anchor:

- This document is the active tracking artifact for node-level history, pagination, actor display, correlation grouping, measurements, and export-label drift until a GitHub issue or project task is explicitly created.
- Do not claim live node Activity completeness until `create_estimate_node_with_history` and `rename_estimate_node_with_history` are proven against local Supabase or an approved throwaway database.

Acceptance evidence:

- Add or confirm a focused chart repository/static test proving project charts read current `estimate_row_items` and do not join `estimate_sheet_events` / `estimate_sheet_versions`.
- Add or confirm a focused action/schema test proving template insertion routes through `insert_estimate_template_into_estimate_with_history` and can surface `template_inserted`.
- Record whether linked-remote QA artifacts are accepted permanent dormant residue or require explicit cleanup.
- Record proposal export label semantics: current proposal export is mutable-current-estimate output; `versionLabel` is not named snapshot evidence.

Suggested verification:

```bash
bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/project-charts-aggregation.test.ts --maxWorkers=1
git diff --check
```

## Fixed Readiness Rubric

Use this rubric for future readiness scores so pass-to-pass numbers are comparable:

| Dimension | Weight | Ready Means |
| --- | ---: | --- |
| Source-of-truth correctness | 25 | All user-visible activity is written synchronously by server-owned RPCs; no major mutation bypasses history. |
| Evidence completeness | 25 | Required tests, chart/template proof, payload measurements, and scalar latency benchmark are recorded. |
| UX completeness | 20 | Activity can paginate, show actors, preserve row editing behavior, and avoid dormant named-version UI. |
| Operational safety | 15 | Destructive/concurrency tests avoid the linked remote project; retention monitoring exists before pruning. |
| Future-scope boundaries | 15 | Proposal/export labels, Activity export, Realtime, undo/redo, and dormant artifacts have explicit rules. |

Current status: local-safe Activity expansion is implemented and evidence-backed. Release claims are still limited by unavailable local/throwaway DB runtime proof and scalar latency benchmarking.

## Measurement Closure Slice

Payload measurements are now recorded. Do not claim runtime/mutation readiness until scalar latency and DB atomicity proof are recorded on local Supabase or an approved throwaway database.

Harness status after 2026-05-24 evidence pass:

- Supabase CLI is installed at `2.98.2`; latest notice reported `2.101.0`.
- `supabase status` could not inspect local services because Docker is unavailable: `Cannot connect to the Docker daemon at unix:///Users/philiplewis/.docker/run/docker.sock`.
- `docker info` failed because `docker` is not installed on PATH.
- No destructive or concurrency tests were run on linked remote `ebxxqidacheyapmmzavr`.
- Payload measurements are recorded through the approved read-only remote path. Scalar latency remains open until local Supabase or a throwaway mutation harness exists.

Recorded 2026-05-25 read-only measurements on linked project `ebxxqidacheyapmmzavr`:

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

Recorded retention RPC verification for project `22222222-2222-4222-8222-222222222222`:

| Metric | Value |
| --- | ---: |
| Workspace event bytes | 75283 |
| Workspace version bytes | 308096 |
| Largest event payload component | 1626 |
| Max estimate event count | 16 |
| Estimates over 10000 events | 0 |
| Workspace storage over 250 MB | false |

Required SQL measurement recipes:

```sql
select
  percentile_cont(0.95) within group (order by pg_column_size(row_context)) as p95_row_context_bytes,
  percentile_cont(0.95) within group (order by coalesce(pg_column_size(old_snapshot), 0)) as p95_old_snapshot_bytes,
  percentile_cont(0.95) within group (order by coalesce(pg_column_size(new_snapshot), 0)) as p95_new_snapshot_bytes,
  percentile_cont(0.95) within group (
    order by pg_column_size(row_context) + coalesce(pg_column_size(old_snapshot), 0) + coalesce(pg_column_size(new_snapshot), 0) + coalesce(pg_column_size(payload), 0)
  ) as p95_event_payload_bytes,
  max(pg_column_size(row_context) + coalesce(pg_column_size(old_snapshot), 0) + coalesce(pg_column_size(new_snapshot), 0) + coalesce(pg_column_size(payload), 0)) as max_event_payload_bytes
from public.estimate_sheet_events;

select
  percentile_cont(0.95) within group (order by pg_column_size(snapshot)) as p95_snapshot_bytes,
  max(pg_column_size(snapshot)) as max_snapshot_bytes
from public.estimate_sheet_versions;
```

Targets:

- P95 scalar events <= 2 KB.
- P95 replacement/delete events <= 8 KB.
- Any event payload above 32 KB requires review.
- Representative 200-row snapshot <= 2 MB.
- Snapshot above 5 MB requires design review before remote apply.
- Scalar edit median latency must not regress more than 25% from the pre-history blur-save baseline unless explicitly accepted.

## Node Activity Implementation Slice

Status after 2026-05-24 implementation pass:

- Added forward migration `20260524132800_estimate_node_activity_history.sql`.
- Added `create_estimate_node_with_history` and `rename_estimate_node_with_history`.
- Routed `createEstimateNode` through the create history RPC and removed the split direct-insert/reorder/manual-delete path.
- Routed `renameEstimateNode` through the rename history RPC while preserving `{ nodeId, name }`.
- Updated generated Supabase types and focused tests.
- Verification passed:
  - focused Activity/node Vitest files;
  - `bun run type-check`;
  - `bun run validate`;
  - `bun run build`;
  - `git diff --check`.
- Runtime DB proof remains blocked by unavailable Docker/local Supabase.

Preconditions:

- Run impact analysis for `createEstimateNode`, `renameEstimateNode`, `reorderEstimateTreeNodes`, `deleteEstimateNode`, `EstimateSheetContent`, and `fetchEstimateSheetVersionControl`.
- Use local Supabase or an approved throwaway test database for destructive/concurrency tests.
- Do not run forced rollback/concurrency probes on linked remote `ebxxqidacheyapmmzavr`.

Required behavior:

- `createEstimateNode` emits one `node_created` event with node id, node name, kind, parent id, and sort order.
- `renameEstimateNode` emits one `node_renamed` event with old/new names.
- `reorderEstimateTreeNodes` keeps `tree_reordered` event coverage.
- `deleteEstimateNode` keeps `node_deleted_with_children` with deleted row/node counts and useful context.
- All node events use server-owned RPC transactions. No post-RPC best-effort event insert is allowed.

Tests:

- `renameEstimateNode` calls the history RPC and does not write via plain table update.
- `createEstimateNode` writes `node_created` and preserves rollback if ordering/event write fails.
- Existing rename state-first UI behavior still returns `{ nodeId, name }` and does not revalidate the active route.
- Existing reorder/delete/template tests still pass.

## Activity Browsing Slice

Status after 2026-05-25 browsing/filter pass:

- Added `.omx/context/estimate-activity-browsing-completion-20260524T155629Z.md`.
- Added `.omx/plans/prd-estimate-activity-browsing-completion.md`.
- Added `.omx/plans/test-spec-estimate-activity-browsing-completion.md`.
- `fetchEstimateSheetVersionControl` now validates cursor ids/timestamps without truncating database timestamp precision, fetches `limit + 1`, returns `nextCursor` and `rowNextCursor`, and rejects invalid cursors before building raw PostgREST filters.
- The read path excludes dormant `sheet_version_created` and `sheet_restored_as_copy` events so historical named-version artifacts cannot surface in Activity v1.
- The read path supports `scope: "sheet" | "row" | "both"` so row-only history does not fetch unused sheet Activity.
- Sheet Activity appends more events through `Load more activity`.
- Row Version History appends more row-scoped events through `Load more row history`.
- Load more responses are ignored if the inspector closes or switches between sheet/row scope before the request resolves.
- Audit cards now render safe actor labels, `Unknown user`, or `System/backfill`.
- Focused verification passed:
  - `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
  - `bun run type-check`
- 2026-05-25 pass added node Activity, node cursor pagination, direct/descendant node scoped reads, event-type filters, browser-local date filters, bounded search, profile actor labels, and page-local correlation grouping.
- Focused verification passed:
  - `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`
  - `bun run type-check`
  - `bun run validate`
  - `bun run build`
  - `git diff --check`
  - protected-route browser smoke for sheet Activity, row Version History, and node Activity

Remaining caution: exact historical descendant matching after cascade deletion may require a future SQL read RPC because current node filtering starts from live node/row ids.

## Actor And Grouping Slice

Status:

- Profile/name resolution is implemented through visible profile display names with fallback labels.
- Correlation grouping is implemented page-locally.

Required remaining behavior:

- Add bounded correlation lookahead only if page splits make grouped operations hard to understand at scale.

## Proposal Export Label Rule

Until proposal/export snapshots are explicitly implemented:

- Proposal preview/export is a mutable current-estimate export.
- `versionLabel` from `estimate.metadata` is legacy/current-estimate metadata only.
- It must not be interpreted as an `estimate_sheet_versions` row, legal issued proposal version, or immutable snapshot.
- Any future proposal/export snapshot plan must define label precedence between `sheet_code`, mutable metadata, named versions, issued proposal ids, and exported workbook filenames before exposing dormant named-version rows.

## Activity Export Rule

Activity export is not part of the current implementation. If contractors need change logs for client change orders or internal audit, plan it as a separate read-only report/export slice after pagination, filtering, actor display, and measurement gates are closed.

Minimum future export requirements:

- exported range/filter criteria are visible in the output;
- row and node event summaries include actor, timestamp, event type, and changed fields;
- exported activity is clearly not an issued proposal snapshot unless proposal issuance is implemented;
- export reads the same Activity event source as the UI and does not revive dormant named-version rows by accident.

## Retention, Realtime, And Undo Deferred Strategy

Retention:

- Monitoring exists through `get_estimate_activity_retention_metrics`: workspace event/version bytes, max per-estimate event count, largest event payload component, and threshold flags.
- Do not delete audit rows in v1. Future compaction must define whether rollups, archived JSON exports, or partitioning preserve auditability.

Realtime:

- Supabase Realtime is deferred. Future realtime activity should subscribe to server-owned event inserts only after RLS and actor display are proven.
- Do not add Redis/listener infrastructure for canonical audit writes; optional fanout can follow for notifications or analytics.

Undo/redo:

- The v1 event log is audit history, not a reversible command stack.
- Future undo/redo needs command payloads, authorization checks, conflict handling, and clear distinction from historical facts before it can reuse any activity events.

E2E:

- Browser/E2E smoke remains deferred until protected-route data setup is reliable.
- When added, it should cover sheet Activity open, Row item details open, row Activity tab open, Load more, node rename/create activity, and no named-version UI.

## Remote QA Artifact Decision

The linked remote project contains a dormant QA-created `V2` named version titled `QA checkpoint` from the historical idempotency proof. It is accepted as permanent dormant residue for the current scope because cleanup is destructive and must be separately approved.

Exact residue inventory recorded 2026-05-25:

- version id `6afbccb2-33bc-47de-9f19-a2e4ac7b87e8`;
- event id `8d2675df-0492-41b6-9cf2-d9e02aa3bf00`;
- estimate id `33333333-3333-4333-8333-333333333333`;
- version label `V2`;
- title `QA checkpoint`.

Policy options for a future explicit cleanup task:

- accept as permanent dormant QA residue and document it in state;
- delete only the QA version/event by exact id after a destructive-cleanup approval;
- leave it untouched until proposal/export snapshot work decides how to migrate dormant rows.

## Non-Goals

- No named sheet version UI.
- No compare UI.
- No restore-as-copy UI.
- No Redis/listener/async queue for canonical audit writes.
- No Supabase Realtime activity feed in this slice.
- No undo/redo command stack.
- No event retention pruning until monitoring exists and thresholds are approached.
- No linked-remote destructive/concurrency tests.

## Closeout Gates

Before claiming future runtime/database completeness:

- focused action/schema/UI tests pass;
- payload measurements stay below guardrails;
- scalar latency benchmark is recorded or explicitly accepted as deferred;
- chart current-row regression is confirmed;
- template insertion event coverage is confirmed;
- linked-remote QA artifact decision is documented;
- `git diff --check` passes;
- `.ai/10_state/current-state.md` and this roadmap are updated with final evidence.
