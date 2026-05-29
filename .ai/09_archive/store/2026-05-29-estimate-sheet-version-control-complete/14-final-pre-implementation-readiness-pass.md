# 14 Final Pre-Implementation Readiness Pass

> Historical context notice: this was the final pre-implementation pass for the pre-pivot named-version architecture. Use `18-current-activity-contract.md` and `17-activity-expansion-roadmap.md` for current Activity-only execution.

**Date:** 2026-05-24
**Scope:** Planning-pack correction only. No application code, Supabase migration, generated types, tests, or UI implementation were created in this pass.

## Inputs Considered

This pass incorporates the final readiness critique about:

- event volume and storage growth;
- same-row concurrent editing;
- unresolved RPC wrapper strategy;
- network retry/idempotency;
- oversized source snapshots in event payloads;
- risky all-in-one baseline backfill;
- live database test harness ambiguity;
- client optimism versus server canonical state;
- row inspector Summary tab data source;
- multiple inspector state conflict.

## Decisions Locked

### Wrapper RPCs For Existing Atomic RPCs

V1 should add wrapper RPCs:

- `reorder_estimate_nodes_with_history`;
- `insert_estimate_template_into_estimate_with_history`.

Server actions should migrate to those wrappers. The existing RPC names/signatures stay available for rollback compatibility until callers and tests prove the wrapper path is stable. History must not be appended after the existing RPC returns.

### Row Revision For Same-Row Conflicts

Add `estimate_row_items.row_revision integer not null default 1`.

History-aware update, replace, and delete RPCs must accept `expected_row_revision`. If the expected revision is stale, the RPC raises a typed conflict, writes no success event, and returns through the existing optimistic rollback/refetch path.

This rejects silent last-write-wins for v1.

### Correlation ID As Retry Idempotency Key

For user-initiated row mutations, the client/hook should generate a stable UUID mutation id and pass it through the server action as `correlation_id`.

Inside the RPC, after locking the estimate row, any existing event for `(estimate_id, correlation_id)` means the action already committed. The RPC should return a duplicate/no-op or current canonical state without writing a second mutation/event.

For bulk actions, the same id groups all child events.

### Changed-Fields-First Event Payloads

Scalar events must not duplicate full `source_snapshot` JSON.

Event payloads should use:

- compact `row_context`;
- `changed_fields`;
- changed-field `old_snapshot` / `new_snapshot`;
- compact source summaries only when source/material/supplier/category actually changed.

Full restorable row snapshots, including `source_snapshot`, stay in named-version snapshots and restore-as-copy payloads.

### Storage Guardrails

Planning targets:

- P95 scalar event payload <= 2 KB;
- P95 replacement/delete event payload <= 8 KB;
- any event payload > 32 KB requires implementation review;
- full row `source_snapshot` target <= 16 KB and hard review above 32 KB;
- representative 200-row named-version snapshot <= 2 MB;
- named-version snapshot above 5 MB blocks remote apply pending design review;
- archive/compaction planning is required before broad rollout if one workspace exceeds 250 MB combined event/version storage or one estimate exceeds 10,000 events.

### Backfill Must Be Re-Entrant

Do not build full snapshots for every existing estimate inside the all-or-nothing schema migration.

The schema migration should create the schema and an idempotent backfill entrypoint. Backfill runs separately with preflight counts, batching thresholds, timeouts, and a post-run byte report.

Default batched thresholds:

- estimates > 100;
- total rows > 20,000;
- projected baseline snapshot storage > 200 MB.

If any threshold is crossed, use batched backfill. Default batch size is 50 estimates or 10,000 rows, with `lock_timeout = '5s'` and `statement_timeout = '120s'`.

### Live DB Test Harness

Atomicity, locking, RLS, idempotency, and row revision conflicts must be proved against local Supabase or an approved test database. Static migration string tests are not enough.

Preferred harness:

- local Supabase;
- focused Vitest integration file;
- service-role/admin credentials only for fixture setup and forced-failure hooks;
- linked remote project excluded from destructive rollback/concurrency tests.

### UI State Corrections

The row/sheet inspector design remains valid with two clarifications:

- only one inspector is open at a time; opening row details replaces sheet history and vice versa;
- row Summary tab reads current row facts from the area-tree cache first, then refetches/canonicalizes on open if stale or missing.

On row revision conflict, the UI should rollback/refetch and display canonical row state rather than preserving stale optimistic values.

## Updated Readiness

Planning readiness after this pass: **implementation-planning ready, not blind-implementation ready**.

Suggested score: **78/100**.

Why not higher:

- no migration exists yet;
- no live RPC test harness exists yet;
- no latency baseline has been measured yet;
- product acceptance is still needed for the readiness gate and UI design pass;
- exact GitNexus/code-review-graph impact must be rerun before code edits.

Why it is now materially stronger:

- RPC wrapper strategy is chosen;
- same-row conflict behavior is explicit;
- retry idempotency is explicit;
- event payload size and retention thresholds are explicit;
- backfill is operationally bounded;
- UI state gaps are resolved.

## Implementation Entry Recommendation

Implementation should begin with **Pass A only**:

1. rerun exact impact analysis;
2. draft the schema/RPC migration;
3. add static migration contract tests;
4. add local Supabase live RPC test harness;
5. prove row revision conflict, idempotent retry, forced event failure rollback, and wrapper RPC behavior;
6. stop for evidence before server-action conversion or UI work.

Do not start read-only UI, compare, or restore-as-copy UI until Pass A proves the schema/RPC/test foundation.
