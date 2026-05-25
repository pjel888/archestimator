# 09 Implementation Closeout

**Status:** Implemented, then reconciled to Activity-only UX on 2026-05-24.

## Supported App Surface

The active product contract after the implementation pivot is estimate sheet Activity plus row details Version History.

- The local sheet header exposes `Activity`.
- Sheet Activity opens a sheet-level activity dialog with an `Activity` tab only.
- The row 3-dot menu opens Row details with Version History.
- The row Expand icon opens the same row details inspector.
- The sheet `Versions` tab is absent.
- `Compare`, create named version, and restore-as-copy UI are absent.
- App actions do not expose `createEstimateSheetVersion` or `restoreEstimateSheetVersionAsCopy`.

The app should treat project estimate sheets/options and duplicate-sheet behavior as the user-facing alternative/versioning workflow for now. Per-sheet named versions may only return through a future proposal/export snapshot plan or an explicit cleanup/revival scope.

## Activity Implementation Applied

- Migration `supabase/migrations/20260524033151_estimate_sheet_version_control.sql` adds compact append-only `estimate_sheet_events`, `estimate_row_items.row_revision`, idempotent mutation/correlation handling, optimistic row-revision conflict protection, and history-aware RPC boundaries for estimate row and structural actions.
- Client/server integration routes estimate-sheet row mutations through history-aware RPCs with client-generated mutation/correlation ids, optimistic `expectedRowRevision`, canonical row reconciliation from server-returned snapshots, and rollback-safe row-revision cache patching.
- UI integration provides the current sheet Activity dialog and row details Version History inspector using the shared activity-card language.
- Follow-up migration `supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql` adds row/template `contingency_percentage` and carries contingency percentage/value through row snapshots, activity payloads, template insertion, charts, proposal export totals, and current estimate totals.

## Dormant Artifacts Applied

The implementation also applied migration-era named-version artifacts before the Activity-only pivot was reconciled:

- `estimate_sheet_versions` table.
- create named version RPCs.
- restore-as-copy RPCs.
- baseline version backfill rows for the two current demo estimates.
- compare-ready full-sheet snapshot fields.
- generated Supabase types for those tables/RPCs.

These artifacts are dormant DB compatibility residue. Keep them in place because they already exist on the linked remote project; dropping them would be destructive. Do not expose them in app UI/actions, broaden tests around them as supported UX, or use their screenshots as current visual references unless a future proposal/export snapshot plan explicitly revives them.

## Files Changed

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/lib/domain/estimate-tree.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/lib/estimates/types.ts`
- `src/lib/repositories/estimate-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/supabase/types.ts`
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql`
- `supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql`
- `tests/vitest/estimate-sheet-version-control-*.test.*`
- existing regression tests for row cost inputs, reorder actions, library inserts, and live route static assertions.

## Database Apply Evidence

- Local Supabase could not be used because Docker was unavailable:
  - `supabase status` failed with Docker daemon connection failure.
- Linked project `ebxxqidacheyapmmzavr` was updated directly:
  - `supabase db query --linked -f .omx/tmp/estimate_sheet_version_control_apply.sql`
  - migration wrapped in `begin; ... commit;`
  - `supabase migration repair --linked --status applied 20260524033151`
- Remote schema verification at the time showed:
  - `to_regclass('public.estimate_sheet_events') = estimate_sheet_events`
  - `to_regclass('public.estimate_sheet_versions') = estimate_sheet_versions`
  - `estimate_row_items.row_revision` exists
  - `restore_estimate_sheet_version_as_copy` exists as a dormant RPC artifact
- Remote migration list showed:
  - `20260524033151 | 20260524033151`
- Known migration-history note:
  - older local/remote migration timestamps still had historical drift unrelated to this slice, but this migration was present and repaired as applied on the linked project.

## Backfill / Storage Evidence

- `get_estimate_sheet_version_control_preflight()` returned:
  - `estimateCount = 2`
  - `rowCount = 91`
  - `requiresBatchedBackfill = false`
  - `averageSourceSnapshotBytes = 474`
  - `projectedBaselineSnapshotBytes = 204028` before backfill, `204274` after.
- `backfill_estimate_sheet_baseline_versions(50, null::uuid)` returned:
  - `processedCount = 2`
  - `insertedCount = 2`

Those backfilled version rows are dormant. They prove the remote migration path happened; they do not define the supported app UX.

## Live RPC Evidence

Historical live checks were run against the linked remote project:

- Correlation-id idempotency:
  - first `create_estimate_sheet_version(...)` with correlation id `00000000-0000-4000-8000-000000000524` created `eventId = 8d2675df-0492-41b6-9cf2-d9e02aa3bf00`, `versionLabel = V2`;
  - second call with the same correlation id returned `idempotent = true`;
  - matching event count stayed `1`;
  - matching version count stayed `1`.
- Row-revision conflict:
  - deliberate stale `expected_row_revision = 0` raised `estimate_sheet_row_revision_conflict`;
  - target row remained `row_revision = 1`;
  - conflict correlation id created `0` events.
- Restore-as-copy isolation:
  - transactional restore probe created a copy inside the transaction, with one `sheet_restored_as_copy` event and source estimate still present;
  - transaction was rolled back;
  - post-rollback check for sheet code `QA-ROLLBACK-0524` returned `0` persisted copies.

This linked-remote destructive/concurrency testing was a historical exception caused by missing local Docker. Do not repeat forced failure, rollback, destructive restore, or concurrency tests on the linked remote project. Future destructive/concurrency validation belongs on local Supabase or an approved throwaway test database.

## Visual / Route Smoke

The earlier smoke artifacts under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/` include pre-pivot `Versions`, `Compare`, and restore screenshots. Treat those screenshots as historical only.

Fresh current-route evidence is represented by tests and source assertions that:

- the sheet header opens `Activity`;
- the sheet activity dialog exposes no `Versions` tab;
- no `Create version`, `Compare`, or restore button is rendered in the current sheet activity surface;
- row details/Version History is still available from row actions.

## Test / Build Evidence

Historical implementation closeout recorded:

- focused version-control tests passed;
- `bun run type-check` passed;
- `bun run validate` passed;
- `bun run build` passed;
- `git diff --check` passed.

Second-pass reconciliation evidence should supersede this section with fresh doc-only validation. For the current documentation pass, run `git diff --check`.

## Post-Reconciliation Coverage Map

- Confirmed current UX tests: sheet Activity opens without a `Versions` tab, `Create version`, `Compare`, or restore button.
- Confirmed action exports: `createEstimateSheetVersion` and `restoreEstimateSheetVersionAsCopy` are absent from app actions.
- Confirmed wrapper routing: row insert/update/replace/delete, reorder, template insertion, estimate metadata updates, and node delete use history-aware RPCs.
- Partially confirmed template events: server action calls `insert_estimate_template_into_estimate_with_history`, and schema tests assert `template_inserted` plus the wrapper return `eventId`; live/event-row proof remains open.
- Confirmed chart isolation guard: project charts read current `estimate_row_items`; focused static coverage now asserts no `estimate_sheet_events` / `estimate_sheet_versions` dependency in the chart repository.
- Closed in code, pending live DB proof: `renameEstimateNode` now routes through `rename_estimate_node_with_history` and `node_renamed`.
- Closed in code, pending live DB proof: `createEstimateNode` now routes through `create_estimate_node_with_history` and `node_created`.
- Closed in code, pending high-volume route proof: sheet Activity and row Version History now support cursor-based Load more.
- Closed actor display: audit cards render visible profile display names when available, with `User <short-id>` and `System/backfill` fallbacks.
- Closed local-safe browsing UX: node Activity, direct/descendant node-scoped reads, event-type filters, browser-local date filters, bounded search, node cursor pagination, and page-local `correlation_id` grouping are implemented.

## 2026-05-24 Evidence Closure Addendum

Follow-up documentation and focused tests closed several non-runtime evidence gaps:

- Added `18-current-activity-contract.md` as the single-page current contract.
- Added Activity-only `.omx` handoff files and marked the pre-pivot `.omx` PRD/test-spec as superseded.
- Added focused static tests for chart isolation, proposal export label boundaries, current read DTO bounds, generated-type RPC-name drift, and stronger template wrapper event-return evidence.
- Verification passed: 6 focused Vitest files, 49 tests; `git diff --check`.
- Local DB harness remains blocked: Supabase CLI exists (`2.98.2`), but `supabase status` cannot connect to Docker and `docker` is unavailable on PATH.

This addendum does not close node activity runtime proof, pagination, actor display, correlation grouping, payload measurements, scalar latency benchmark, or linked-remote QA artifact disposition.

## 2026-05-24 Node Activity Addendum

Follow-up implementation closed the verified source-code gap for node create/rename history:

- Added forward migration `supabase/migrations/20260524132800_estimate_node_activity_history.sql`.
- Added `create_estimate_node_with_history` and `rename_estimate_node_with_history`.
- Routed `createEstimateNode` through the create history RPC and removed the split direct-insert/reorder/manual-delete path.
- Routed `renameEstimateNode` through the rename history RPC while preserving the `{ nodeId, name }` return contract.
- Updated generated Supabase types and focused tests.
- Verification passed: focused Vitest, `bun run type-check`, `bun run validate`, `bun run build`, and `git diff --check`.

Live DB proof remains blocked until local Supabase or an approved throwaway database is available.

## 2026-05-24 Activity Browsing Addendum

Follow-up implementation closed the first-page-only browsing gap:

- Added Activity browsing handoff files:
  - `.omx/context/estimate-activity-browsing-completion-20260524T155629Z.md`;
  - `.omx/plans/prd-estimate-activity-browsing-completion.md`;
  - `.omx/plans/test-spec-estimate-activity-browsing-completion.md`.
- Updated `fetchEstimateSheetVersionControl` to accept `sheetCursor`, `rowCursor`, and `scope`.
- Added validated `(created_at, id)` keyset cursor behavior with `limit + 1` reads and database-precision timestamp preservation.
- Filtered dormant `sheet_version_created` and `sheet_restored_as_copy` rows out of the Activity v1 read path.
- Avoided unused sheet Activity reads for row-only history requests.
- Returned `nextCursor` and `rowNextCursor`.
- Added compact `Load more activity` and `Load more row history` controls.
- Ignored stale Load more responses after the inspector closes or switches scope.
- Added explicit actor labels on audit cards.
- Verification passed:
  - `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`;
  - `bun run type-check`.

This addendum does not close live DB proof, payload measurements, scalar latency benchmarking, node-scoped filters/search, profile-resolved actor labels, correlation grouping, or linked-remote QA artifact disposition.

## 2026-05-25 Local-Safe Completion Addendum

Follow-up implementation closed the remaining local-safe Activity expansion gates:

- `fetchEstimateSheetVersionControl` now supports `nodeId`, `includeDescendants`, `eventTypes`, `dateFrom`, `dateTo`, `search`, `nodeCursor`, and `scope: "node"`.
- Sheet Activity, row Version History, and node Activity all use bounded cursor pagination.
- Sheet/node Activity expose compact filters for event type, search, and browser-local date range.
- Server actions enrich events with privacy-safe actor labels from visible `profiles.display_name`, falling back to `User <short-id>` or `System/backfill`.
- Activity lists group repeated `correlation_id` values into page-local related-event groups.
- Added read-only retention monitoring RPC `get_estimate_activity_retention_metrics` in migration `20260525013900_estimate_activity_retention_metrics.sql`.
- Updated generated Supabase types and focused tests, including a regression for browser-local Activity date bounds.
- Applied the non-destructive metrics RPC migration to linked Supabase project `ebxxqidacheyapmmzavr` and verified it against project `22222222-2222-4222-8222-222222222222`.

Remote read-only measurement evidence from 2026-05-25:

- event count `20`;
- P95 row context `520.6` bytes;
- P95 old snapshot `1430.2` bytes;
- P95 new snapshot `1549.05` bytes;
- P95 largest event component `1549.05` bytes;
- max largest event component `1626` bytes;
- version count `3`;
- max dormant version snapshot `24078` bytes;
- P95 dormant version snapshot `23694.5` bytes;
- retention RPC result: workspace event bytes `75283`, workspace version bytes `308096`, max estimate event count `16`, estimates over threshold `0`, workspace storage threshold `false`.

Verification passed:

- `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`;
- `bun run type-check`;
- `bun run validate`;
- `bun run build`;
- `git diff --check`;
- protected-route browser smoke for sheet Activity, row Version History, and node Activity using a temporary dev-auth local server on `127.0.0.1:3020`.

Fresh screenshots were captured under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/`.

The historical linked-remote QA artifact is accepted as dormant residue:

- dormant version id `6afbccb2-33bc-47de-9f19-a2e4ac7b87e8`;
- title `QA checkpoint`;
- version label `V2`;
- matching dormant event id `8d2675df-0492-41b6-9cf2-d9e02aa3bf00`.

Destructive deletion of that residue remains out of scope unless a separate destructive-cleanup task approves exact-id deletion.

## Deferred / Known Gaps

- Local Supabase live tests remain blocked until Docker is available.
- The opt-in local live DB Vitest file remains skipped unless `RUN_SUPABASE_INTEGRATION=1`.
- Supabase Realtime, retention pruning, undo/redo, arbitrary saved-version-to-saved-version compare, and exportable change logs remain deferred.
- Scalar edit latency was covered by existing validation and route smoke, but no separate baseline/post-change stopwatch benchmark was recorded.
- Runtime live DB proof for node create/rename, template event readback, forced rollback, and concurrency belongs on local Supabase or an approved throwaway DB.
- Browser/E2E smoke remains deferred until protected-route data setup is reliable.
- The linked project contains one accepted dormant QA-created named sheet version (`V2`, title `QA checkpoint`) used to prove duplicate retry idempotency.

## Canonical Docs Updated

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/03_plans/estimate-sheet-version-control/09-implementation-closeout.md`
- `.ai/03_plans/estimate-sheet-version-control/15-dormant-artifact-policy.md`
- `.ai/03_plans/estimate-sheet-version-control/16-second-pass-reconciliation-audit.md`
- `.ai/03_plans/estimate-sheet-version-control/17-activity-expansion-roadmap.md`
- `.ai/03_plans/estimate-sheet-version-control/18-current-activity-contract.md`
- `.ai/03_plans/estimate-sheet-version-control/19-local-safe-completion-audit.md`
