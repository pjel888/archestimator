# 18 Current Activity Contract

**Date:** 2026-05-25
**Status:** Active single-page contract after the Activity-only pivot and local-safe expansion pass.
**Scope:** Current UX, data source, API boundary, dormant artifacts, known gaps, and verification rules for estimate sheet Activity.

## Current Feature

Estimate sheet history v1 is Activity-only.

Supported surfaces:

- sheet header opens `Activity`;
- sheet header opens `Node Activity` for the selected estimate tree node;
- row 3-dot action and row Expand open row details with `Version History`;
- events are rendered as audit cards in the shared inspector language;
- Activity can paginate and filter by event type, search text, and browser-local date range;
- row scalar saves preserve spreadsheet behavior and history-aware row revisions.

Unsupported current surfaces:

- no sheet `Versions` tab;
- no create named sheet version UI/action;
- no compare UI/action;
- no restore-as-copy UI/action;
- no issued proposal/export snapshot records.

## Source Of Truth

The active user-facing audit source is `public.estimate_sheet_events`.

Rules:

- Events are append-only.
- Canonical audit writes belong in server-owned SQL RPC transactions.
- UI code must not insert event rows directly.
- Post-mutation best-effort event inserts are not acceptable.
- `correlation_id` is the retry/idempotency key for user actions.
- `row_revision` is the same-row conflict guard for row item edits.

Currently history-aware:

- row insert;
- row scalar update, including quantity, contingency percentage, and Misc Cost;
- row source replacement;
- row delete;
- tree reorder;
- template insertion;
- estimate detail updates;
- node create;
- node rename;
- node cascade delete.

Known not complete:

- node create/rename runtime DB proof remains blocked until local Supabase or an approved throwaway DB is available;
- scalar edit latency benchmark remains blocked until a local/throwaway mutation harness exists;
- destructive cleanup of the linked-remote `V2`/`QA checkpoint` dormant residue is out of scope unless separately approved;
- Activity export/report remains deferred to a separate read-only report or proposal/change-order slice.

## Dormant DB Artifacts

These exist because migrations were applied before the Activity-only reconciliation:

- `public.estimate_sheet_versions`;
- named-version create/restore RPCs;
- baseline/backfilled version rows;
- generated Supabase types for those dormant functions/tables.

Policy:

- keep them in place unless a destructive-cleanup scope explicitly removes them;
- do not expose them in app UI/actions;
- do not use dormant rows as proposal/export truth;
- do not expand tests around them as supported product behavior;
- future proposal/export snapshot work must define label precedence before reviving them.

## Proposal Export Label Rule

Proposal preview/export currently renders the mutable current estimate.

`versionLabel` read from `estimate.metadata` is current-estimate metadata only. It is not proof of:

- an `estimate_sheet_versions` row;
- an issued proposal version;
- an immutable export snapshot.

Export code must not read dormant `estimate_sheet_versions` unless a future proposal/export snapshot plan explicitly revives that layer.

## Read API Contract

Current `fetchEstimateSheetVersionControl` input:

- `projectId`;
- `estimateId`;
- optional `rowId`;
- optional `nodeId`;
- optional `includeDescendants`;
- optional `eventTypes`;
- optional `dateFrom`;
- optional `dateTo`;
- optional `search`;
- optional `eventLimit` bounded to the current implementation limit.
- optional `sheetCursor: { createdAt: string; id: string } | null`;
- optional `rowCursor: { createdAt: string; id: string } | null`;
- optional `nodeCursor: { createdAt: string; id: string } | null`;
- optional `scope: "sheet" | "row" | "node" | "both"`.

Current output:

- `events`: recent sheet-scoped history events;
- `rowEvents`: row-scoped history events when `rowId` is provided;
- `nodeEvents`: node-scoped history events when `nodeId` is provided;
- `nextCursor`: next sheet Activity cursor or `null`;
- `rowNextCursor`: next row Version History cursor or `null`;
- `nodeNextCursor`: next node Activity cursor or `null`;
- no estimate/sheet identity fields;
- no version rows or dormant named-version data.

Estimate/sheet identity comes from the route/page/repository context, not from `fetchEstimateSheetVersionControl`.

Implemented cursor rules:

- bounded `limit + 1` query behavior;
- validated UUID cursor ids and parseable timestamps before raw Supabase `.or()` filters are built;
- cursor timestamps preserve the original validated database precision string;
- dormant `sheet_version_created` and `sheet_restored_as_copy` rows are excluded from Activity v1 reads;
- row-only reads do not fetch the unused sheet Activity lane;
- node-only reads do not fetch unused sheet/row lanes;
- direct node reads filter by `estimate_node_id`;
- Group Node descendant reads include matching descendant `estimate_node_id` values and row ids under descendant Area nodes;
- event-type filters reject dormant named-version event types;
- search is bounded to 80 characters and rejects unsupported raw-filter characters before event rows are queried;
- compact Load more UI for sheet Activity, row Version History, and node Activity.

Remaining read-path caution:

- the descendant filter uses current node/row foreign keys; deleted/cascade events with nulled foreign keys rely on retained event payload context and may need a future SQL read RPC if exact historical descendant matching is required after node deletion;
- search is database-backed through PostgREST filters over event type, exact UUID ids when applicable, and selected JSON text keys such as material/supplier/category/name; it is not a broad JSON cast or weighted full-text index.

## Event Card Contract

Audit cards should communicate:

- timestamp;
- event label;
- summary;
- changed fields;
- cost delta when meaningful;
- actor label from visible `profiles.display_name` when available, otherwise `User <short-id>` or `System/backfill`;
- page-local grouped/correlated context for repeated `correlation_id` values.

Unknown/system/backfill actors must render as explicit labels, not blanks.

## Contingency Percentage History

Contingency percentage is a row scalar field.

Rules:

- It participates in `update_estimate_row_item_with_history`.
- It is clamped to 0-100 before persistence.
- It appears in row snapshots as `contingencyPercentage`.
- `contingencyValue = (quantity * unit_cost) * contingency_percentage / 100`.
- Row total is `quantity * unit_cost + contingencyValue + misc_cost`.
- Row history should describe contingency changes as scalar field edits, not source replacements.

## Measurement Gates

Recorded 2026-05-25 read-only remote measurement on linked project `ebxxqidacheyapmmzavr`:

- event count: `20`;
- P95 row context: `520.6` bytes;
- P95 old snapshot: `1430.2` bytes;
- P95 new snapshot: `1549.05` bytes;
- P95 largest event component: `1549.05` bytes;
- max largest event component: `1626` bytes;
- version count: `3`;
- max dormant version snapshot: `24078` bytes;
- P95 dormant version snapshot: `23694.5` bytes.

Read-only retention metrics RPC verification for project `22222222-2222-4222-8222-222222222222`:

- workspace event bytes: `75283`;
- workspace version bytes: `308096`;
- largest event payload component: `1626`;
- max estimate event count: `16`;
- estimates over event threshold: `0`;
- workspace storage over threshold: `false`.

Open measurement gate:

- scalar edit latency baseline and post-history median.

Targets live in `17-activity-expansion-roadmap.md`.

## Local DB Harness Rule

Runtime atomicity tests must run on local Supabase or an approved throwaway DB.

Do not repeat forced rollback, destructive restore, or concurrency probes on linked remote `ebxxqidacheyapmmzavr`.

Read-only remote measurement and non-destructive read-only metrics RPC apply were completed on 2026-05-25. Destructive cleanup of QA artifacts still needs its own destructive-cleanup scope.

## Typed RPC Boundary

`src/lib/estimates/actions.ts` currently uses a hardcoded `RpcFunctionName` union and `asEstimateHistoryRpcClient` cast to call history RPCs.

Until this is replaced with generated typed RPC calls, keep a focused guard that every hardcoded RPC name exists in `src/lib/supabase/types.ts`. If a future migration changes function signatures, regenerate types and update the guard before claiming completion.

## Verification Rules

Minimum focused verification for this feature family:

```bash
bunx vitest run \
  tests/vitest/estimate-sheet-version-control-ui.test.tsx \
  tests/vitest/estimate-sheet-version-control-actions.test.ts \
  tests/vitest/estimate-sheet-version-control-schema.test.ts \
  tests/vitest/estimate-node-reorder-action.test.ts \
  tests/vitest/project-charts-aggregation.test.ts \
  --maxWorkers=1
git diff --check
```

Add `bun run type-check` and `bun run validate` when TypeScript/runtime behavior changes.

Current visual/browser evidence lives under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/` and covers the protected estimate route, sheet Activity, row Version History, node Activity, Activity filters, and absence of named-version `Versions` / `Compare` controls.

## Next Implementation Priority

1. Local Supabase or approved throwaway DB runtime proof for node create/rename, template insertion event reads, and RPC atomicity.
2. Scalar edit latency benchmark against the current blur-save path.
3. Optional future Activity export/report slice.
4. Optional future exact historical descendant matching/search RPC if high-volume usage proves PostgREST filters insufficient.
