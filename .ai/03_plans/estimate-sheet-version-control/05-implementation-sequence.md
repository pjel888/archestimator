# 05 Implementation Sequence

> Historical context notice: this document contains the pre-pivot named-version, compare, and restore-as-copy architecture. Read it as historical context only. The supported current UX is sheet `Activity` plus row details `Version History`; named-version UI/RPC exposure requires a future proposal/export snapshot plan or explicit destructive-cleanup scope.

## Phase 0: Approval, Index Freshness, and Scope Lock

Effort: 0.5 day.

1. Review this plan pack and record which open questions remain.
2. Review and accept `13-ui-design-pass.md` before UI implementation. Do not start `$visual-ralph` or `$ralph` implementation until the row inspector, sheet inspector, compare-current-only scope, and restore confirmation defaults are accepted.
3. Verify the GitNexus index is still current. The second planning pass refreshed it on 2026-05-24, but implementation should rerun `npx gitnexus analyze` if code changed afterward.
4. Re-run impact analysis on the exact symbols before editing.
5. Confirm no unrelated dirty files overlap the implementation set.
6. Decide whether v1 UI is hidden behind a feature flag or schema/readiness gate. Default: server actions and reads are implemented first; UI stays hidden until tables/RPCs exist and read calls succeed.
7. Record baseline latency for current scalar row blur saves before replacing them with RPC-backed history writes.
8. Run data-volume preflight: estimate count, row count, representative `pg_column_size(source_snapshot)`, projected baseline snapshot bytes, and expected event/version storage.
9. Decide and record whether baseline backfill can run inline through the helper or must run batched. Default: batched if estimates > 100, rows > 20,000, or projected baseline snapshots > 200 MB.

## Progressive Delivery Passes

### Pass A: Schema, RPC Contract, and Tests

Effort: 1-2 days.

1. Create a migration with `supabase migration new estimate_sheet_version_control`.
2. Add `estimate_sheet_events` and `estimate_sheet_versions`.
3. Add `estimate_row_items.row_revision` and the trigger/RPC-owned increment path for same-row concurrency.
4. Add the concrete indexes from `03-data-model-versioning-plan.md`, including correlation lookup.
5. Add RLS, grants, workspace reference enforcement, and no broad event update/delete grants.
6. Add mandatory SQL RPCs for row insert, row replace, scalar row update, row delete, create named version, and restore-as-copy.
7. Add RPC or transaction coverage for `reorderEstimateTreeNodes()`, `updateEstimateDetails()`, `regenerateEstimateSheetCode()`, and `deleteEstimateNode()` cascades.
8. Implement history-aware wrapper RPCs for existing `reorder_estimate_nodes` and `insert_estimate_template_into_estimate`; do not modify those production signatures in v1.
9. Add `acting_user_id uuid default null`, `expected_row_revision` where applicable, and `correlation_id uuid default gen_random_uuid()` to history-aware RPCs; resolve `coalesce(auth.uid(), acting_user_id)` inside SQL.
10. Update RPC grants for new/changed signatures.
11. Use `for update` row/estimate locks before idempotency checks, revision checks, old snapshots, or next version numbers.
12. Add idempotent baseline backfill function/script entrypoint, including zero-row estimates, but do not run unbounded full backfill inside the schema migration.
13. Run `set constraints all immediate;` before enabling/completing RLS-dependent migration steps.
14. Regenerate Supabase types.
15. Add static migration contract tests mirroring the component-library versioning file-content style.
16. Add local Supabase live RPC transaction test harness for rollback, idempotency, row revision conflicts, and RLS proof; static tests alone cannot prove atomic rollback.

Pass A is a hard prerequisite. Do not build UI against mock local history state.

### Pass B: Snapshot, Diff, and Atomic Event Writes

Effort: 1-2 days.

1. Add a canonical estimate snapshot builder.
2. Add row snapshot helper for before/after event payloads.
3. Add diff helper returning the compare DTO from `02-product-and-ux-plan.md`.
4. Update `insertEstimateRowItemFromLibrary()` to call the row-insert RPC and write `row_added` or `row_blank_added`.
5. Update `replaceEstimateRowItemWithLibrary()` to call the row-replace RPC and write `row_replaced` with old/new source snapshots.
6. Update `updateEstimateRowItem()` to call the scalar-update RPC with `expected_row_revision` and `correlation_id`, and write only changed scalar-field events.
7. Update `deleteEstimateRowItem()` to call the row-delete RPC that snapshots, inserts `row_deleted`, then deletes in one transaction.
8. Update `reorderEstimateTreeNodes()` to write `tree_reordered`.
9. Update `deleteEstimateNode()` to write either one bulk `node_deleted_with_children` event or one node event plus child row events under the same `correlation_id`.
10. Update `updateEstimateDetails()` and `regenerateEstimateSheetCode()` to write sheet-level metadata events.
11. Update `insertEstimateTemplateIntoEstimate()` and `reorderEstimateTreeNodes()` to call the history-aware wrapper RPCs; do not add a separate post-RPC event insert.
12. Require every history server action to call `requireCurrentUserContext()` and pass `currentUser.userId` as `acting_user_id`.
13. Keep `revalidatePath()` calls in server actions after RPC success; do not attempt cache invalidation inside SQL.
14. Add stable client mutation UUIDs where browser retry can duplicate a request; use server-generated correlation ids only for non-retryable internal actions.
15. Preserve current optimistic rollback behavior; successful RPC results are the only source of persisted event truth.
16. On row revision conflict, rollback/refetch current row state and do not show a successful history event.
17. Add tests for failed event persistence causing the whole row mutation to fail.
18. Re-measure scalar row update latency after RPC conversion. Target: no more than 25% slower than the baseline median for a simple quantity/misc blur save, or document the regression and defer scalar edit event writes behind a narrower rollout gate.

### Pass C: Read-Only History UI

Effort: 1 day.

1. Add history read repository/server action for recent sheet events, row events, and named versions.
2. Add sheet-level version/history entry to `EstimateSheetHeader`.
3. Add read-only compact version/history panel using the shared inspector pattern from `13-ui-design-pass.md`.
4. Treat `EstimateSheetHeader` as a local function inside `EstimateSheetContent.tsx`; add local props/state or deliberately extract it before reuse.
5. Wire the currently inert Expand icon to open a newly implemented row details/history panel using the shared inspector shell.
6. Build Summary, Source, and History tabs in that new panel; do not assume a row details surface already exists.
7. Do not assume row `ActionMenuGroup`/`ContextActionMenuContent` exists.
8. Keep the current 30px action column unless a separate visual pass approves an expanded column.
9. Add cursor pagination for sheet and row event reads.
10. Add UI tests that history actions are keyboard reachable, do not create row layout shift, and do not interfere with Enter/blur edit commits.

### Pass D: Named Versions and Compare

Effort: 1 day.

1. Add `createEstimateSheetVersion()` server action/RPC wrapper.
2. Generate the next `version_number` server-side under estimate lock.
3. Store full snapshot and summary.
4. Update `estimates.metadata.versionNumber`, `estimates.metadata.versionLabel`, and `estimates.metadata.latestEstimateSheetVersionId`.
5. Update proposal preview/export version-label readers to prefer `metadata.versionLabel` when present.
6. Return normalized version metadata.
7. Add create named version form.
8. Add compare summary view using the explicit DTO contract.
9. Verify project charts still read only current rows.

### Pass E: Restore As Copy

Effort: 1-2 days.

1. Add restore-as-copy action from `estimate_sheet_versions.snapshot`.
2. Reuse the exact `duplicateEstimateSheet()` pattern: create new estimate, insert nodes parent-first with remapped parent ids, then insert rows with remapped node ids.
3. Insert `sheet_restored_as_copy` event on the new estimate.
4. Redirect or return the new estimate/node id.
5. Add restore confirmation and verify the original estimate remains unchanged.
6. Do not implement in-place restore in v1.

### Pass F: Integration and Closeout

Effort: 0.5-1 day.

1. Verify proposal preview/export still renders current estimate and does not imply issued snapshot immutability.
2. Verify template insertion logs correctly and does not mutate template source data.
3. Verify component-library price/version changes remain separate from estimate row history until a user explicitly replaces/refreshes a row.
4. Run focused tests.
5. Run `bun run validate`.
6. Run `bun run build`.
7. Run `git diff --check`.
8. Run Supabase advisors or MCP fallback if database changes are applied.
9. If remote Supabase apply is requested, apply to linked project `ebxxqidacheyapmmzavr`, repair migration history if needed, and verify live table/policy/function state.
10. Update `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and relevant specs after implementation.
