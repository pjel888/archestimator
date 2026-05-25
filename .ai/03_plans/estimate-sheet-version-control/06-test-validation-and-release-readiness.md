# 06 Test Validation and Release Readiness

> Historical context notice: this document contains the pre-pivot named-version, compare, and restore-as-copy architecture. Read it as historical context only. The supported current UX is sheet `Activity` plus row details `Version History`; named-version UI/RPC exposure requires a future proposal/export snapshot plan or explicit destructive-cleanup scope.

## Static Migration Contract Tests

Add a schema test similar to `tests/vitest/component-library-versioning-schema.test.ts`.

These tests are file-content contract checks. They are useful guardrails, but they do not execute SQL and cannot prove locking, rollback, RLS, or concurrency behavior.

Assertions:

- migration creates `estimate_sheet_events`;
- migration creates `estimate_sheet_versions`;
- migration creates row-history and version indexes;
- RLS is enabled;
- authenticated grants are explicit;
- no broad delete/update grants exist for append-only event rows;
- baseline backfill exists;
- baseline backfill is idempotent through `where not exists`;
- schema migration does not perform unbounded full-estimate snapshot backfill inline;
- row-history index is partial and workspace-scoped;
- correlation index supports grouped events and idempotency checks;
- `estimate_row_items.row_revision` exists with an increment path for current-row concurrency checks;
- RPC definitions use `security definer`, target locks with `for update`, explicit `raise exception` validation, and `set constraints all immediate`;
- history-aware RPC definitions use `acting_user_id uuid default null`;
- history-aware row update/replace/delete RPCs accept `expected_row_revision integer`;
- history-aware RPCs check duplicate `(estimate_id, correlation_id)` under lock before mutating;
- SQL resolves `coalesce(auth.uid(), acting_user_id)`;
- workspace membership checks use the resolved actor id;
- new/changed RPC execute grants match exact signatures;
- `reorder_estimate_nodes_with_history` and `insert_estimate_template_into_estimate_with_history` wrapper RPCs exist, and history-enabled server actions call those wrappers;
- event rows do not receive broad update/delete grants;
- `event_source` allowed values are constrained;
- event read indexes support cursor pagination by `(created_at, id)`;
- generated Supabase types include the new tables.

## Live RPC Transaction Tests

These tests require local Supabase or an approved test database. They are required before claiming the atomicity contract is complete.

Preferred harness:

- use local Supabase, not the linked remote project, for destructive rollback/concurrency tests;
- run `supabase start` and `supabase db reset` before the integration slice;
- run a focused Vitest file such as `tests/vitest/estimate-sheet-versioning-rpc.test.ts` with env from `supabase status -o env`;
- use Supabase service-role/admin credentials only for fixture setup and forced-failure hooks, not for normal RPC authorization assertions;
- keep these tests outside the default DOM suite until local Supabase availability is reliable in CI.

The linked remote project must not be used for forced failure, rollback, or destructive concurrency tests.

Assertions:

- forced event insert failure rolls back scalar row update;
- forced event insert failure rolls back row replacement;
- forced event insert failure rolls back `reorder_estimate_nodes` or its history wrapper;
- forced event insert failure rolls back template insertion or its history wrapper;
- same-row concurrent scalar edits with the same starting `row_revision` produce one success and one typed conflict, not silent last-write-wins;
- duplicate retry with the same `correlation_id` does not create a second mutation/event;
- RLS/workspace checks reject a user outside the workspace;
- `acting_user_id` fallback works when `auth.uid()` is null in a server-action/dev-auth path.

## Server/Repository Tests

Required coverage:

- insert row writes exactly one successful event;
- blank/manual row insert is distinguishable from library row insert;
- replace row records old and new source/material/supplier/category/price snapshots;
- quantity edit records quantity before/after and does not duplicate events on stale client response;
- misc cost edit records misc cost before/after;
- failed mutation does not write a success event;
- forced history/event write failure rolls back the row mutation;
- row mutation RPC does not catch a failed history insert and return success;
- delete row preserves row context in event snapshots;
- delete row snapshots and writes `row_deleted` before the hard delete in the same transaction;
- create named version stores full snapshot and correct total;
- named version number generation is lock-protected and unique under concurrent calls;
- named version creation updates `estimates.metadata.versionNumber`, `versionLabel`, and `latestEstimateSheetVersionId`;
- restore-as-copy creates a new estimate and does not mutate the original.
- restore-as-copy remaps node ids and row ids using the same parent-first pattern as `duplicateEstimateSheet()`;
- scalar update conflict from stale `expected_row_revision` rolls back optimistic UI state and refetches canonical row state;
- `reorderEstimateTreeNodes()` records `tree_reordered`;
- `updateEstimateDetails()` and `regenerateEstimateSheetCode()` record sheet metadata events;
- `deleteEstimateNode()` records cascade context for deleted child nodes/rows;
- `reorderEstimateTreeNodes()` and `insertEstimateTemplateIntoEstimate()` use history-aware wrapper RPCs and do not append history after the existing RPC returns;
- history server actions pass `currentUser.userId` as `acting_user_id`;
- server actions call `revalidatePath()` only after successful RPC completion.

Add test fixture/factory helpers for:

- estimate with one Group, one Area, and one row sourced from Component Library;
- blank/manual row with no component source;
- deleted-row event snapshots with `target_row_id` later set null;
- named version with full snapshot and `created_from_event_id`.
- named-version row snapshot containing `source_snapshot`, row `metadata`, `discipline`, `designation`, and `link_state`;
- event payload containing compact `row_context`, changed-field `old_snapshot` / `new_snapshot`, and no full source snapshot for unchanged fields.

## UI Regression Tests

Extend or add focused Vitest tests:

- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`
  - spreadsheet-style quantity/misc-cost editing remains unchanged;
  - no visible save/history UI causes layout shift in row editing.
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
  - insert, replace, and delete still work with persisted server actions;
  - row history affordance appears only where expected.
- New history UI test
  - sheet version panel opens;
  - named version can be created;
  - row history shows a replacement from Tile A to Tile B;
  - row history is reachable through the newly wired Expand icon and new row details/history panel, not through an assumed row context menu;
  - row history wires the currently inert Expand icon and builds a new row details/history panel;
  - row history does not add a visible grid column or shift editable cell layout;
  - shared inspector returns focus to the opener after close;
  - Summary, Source, and History tabs expose keyboard-reachable tab semantics;
  - opening row details closes/replaces sheet history and opening sheet history closes/replaces row details;
  - row Summary tab renders current cache state first and refetches/canonicalizes when stale or missing;
  - row history actions do not interfere with Enter/blur edit commits;
  - row revision conflict rolls back optimistic values and does not show a successful history event;
  - compare summary shows added/replaced/edited/deleted counts;
  - restore-as-copy requires confirmation, preserves original estimate copy, and shows inline failure state if restore fails.

## Integration Tests

- Proposal preview/export still uses the current working estimate and does not claim issued immutability.
- Project charts still aggregate current `estimate_row_items`, not historical snapshots. Add a dedicated regression assertion that chart aggregation does not read or join `estimate_sheet_events` / `estimate_sheet_versions`.
- Proposal preview/export reads the current version label from `estimate.metadata.versionLabel` / `versionNumber` after named version creation.
- Template insertion logs a high-level event and inserts rows normally.
- Duplicate-sheet behavior remains unchanged.
- `ProjectEstimatesTable.tsx` version-history icon remains disabled unless explicitly wired to the same sheet-history surface.

## Concurrency and Performance Tests

- Same-row scalar edits from two simulated users should serialize through the row lock and produce two ordered events.
- Different-row edits may interleave, but event ordering must be stable by `(created_at, id)`.
- Bulk actions such as template insert and node delete cascade should share one `correlation_id` across child events.
- Browser/network retry simulation should reuse the same client mutation UUID and prove no duplicate event is written.
- Measure current scalar row blur save latency before RPC conversion and after RPC conversion. If median latency regresses by more than 25%, document the cause and defer broad scalar history rollout until optimized.
- Event payload size test: P95 scalar event stays under 2 KB, P95 replacement/delete event stays under 8 KB, and any event above 32 KB fails readiness pending review.
- Snapshot size test: representative 200-row snapshot should stay under 2 MB. Anything above 5 MB requires design review before remote apply.

## E2E / Browser Smoke Outline

Add Playwright or equivalent protected-route smoke only after the local data setup can reliably create/read a test project:

1. Add row from library.
2. Edit quantity and confirm row history gains one committed event.
3. Force a failed quantity save and verify no history event appears.
4. Create named version.
5. Replace Tile A with Tile B.
6. Compare named version to current and verify `totalThen`, `totalNow`, `totalDelta`, and replaced row summary.
7. Delete the row and verify deleted-row history remains readable from sheet history.
8. Restore the named version as a copy.
9. Verify the copied estimate has fresh row/node ids and the original estimate remains unchanged.
10. Reorder a tree node and verify a sheet-level `tree_reordered` event appears.
11. Rename the estimate or regenerate its sheet code and verify a sheet metadata event appears.

## Manual Smoke

Use protected local dev-auth route smoke when implementation starts:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_EMAIL=philipjonlewis@gmail.com \
bun run dev
```

Smoke path:

1. Open an existing Lewis Residence estimate.
2. Add a blank row.
3. Replace it with a library component.
4. Edit quantity and Misc Cost.
5. Create a named version.
6. Replace the source component, for example Tile A to Tile B.
7. Open row history and verify before/after source context.
8. Open sheet history and compare the named version to current.
9. Restore as copy and verify a new estimate opens.
10. Simulate or force one failed scalar edit and verify the UI rolls back without adding a history event.
11. Delete a row and verify sheet history still shows intelligible deleted-row context.

## Required Closeout Gates

For code implementation:

```bash
bun run validate
bun run build
git diff --check
```

For Supabase implementation:

- `supabase --version`
- discover relevant commands with `supabase db --help`;
- run advisors if available, or MCP advisor fallback;
- verify local migration list;
- if linked remote apply is requested, verify remote tables, policies, functions, and history counts after apply.

## Release Criteria

- Existing spreadsheet edit tests pass.
- Existing component-library insert/replace/delete tests pass.
- New schema/history/version tests pass.
- Row history is append-only and survives delete.
- Failed history/event persistence cannot produce a successful row mutation in v1.
- Named versions are full snapshots.
- Named versions reconcile with existing proposal export `versionLabel` metadata.
- Restore creates a copy and cannot overwrite the current sheet in v1.
- Restore-as-copy preserves row `source_snapshot`, row `metadata`, `discipline`, `designation`, and `link_state`.
- Proposal/export UI copy does not imply issued snapshot behavior unless that feature is separately implemented.
