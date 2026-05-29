# 07 Open Questions and Decision Log

> Historical context notice: this document contains the pre-pivot named-version, compare, and restore-as-copy architecture. Read it as historical context only. The supported current UX is sheet `Activity` plus row details `Version History`; named-version UI/RPC exposure requires a future proposal/export snapshot plan or explicit destructive-cleanup scope.

## Decisions Made In This Plan

### 2026-05-24 - Use Event Log Plus Named Snapshots

Decision: Use append-only `estimate_sheet_events` for activity history and `estimate_sheet_versions` for named full-sheet snapshots.

Reason: Row-level history needs readable before/after events, while version compare/restore needs a stable full-sheet snapshot. One table cannot serve both cleanly without becoming vague or too expensive.

### 2026-05-24 - Restore As Copy For V1

Decision: Restore should create a copied estimate from the selected version, not overwrite the current estimate in place.

Reason: In-place restore is destructive and would require stronger conflict UX. Restore-as-copy aligns with current duplicate-sheet behavior and is safer for pre-MVP.

### 2026-05-24 - Server Is Canonical For History Ordering

Decision: History events are written only after server-side validation/persistence succeeds.

Reason: The client already uses optimistic row patches and per-row operation ids. Persisting optimistic events from the client would create false or misordered history under rapid edits/failures.

### 2026-05-24 - Named Versions Are Not Issued Proposal Snapshots

Decision: Named estimate versions are editable-history milestones, not legal/commercial issued proposal records.

Reason: The proposal/export plan explicitly defers stable stored export records. Version control should prepare the boundary without activating the full proposal package system.

### 2026-05-24 - One Event Per Committed Edit

Decision: Scalar row edits should create one event per committed blur/save, not per keystroke.

Reason: The current estimate sheet already commits quantity and Misc Cost changes on blur. Matching that contract keeps event volume manageable and avoids changing the spreadsheet editing feel.

### 2026-05-24 - Use `V1`/`V2` Export Labels With Editable Version Titles

Decision: Store `version_number` as the durable internal sequence, expose compatibility labels such as `V1` and `V2` through `estimate.metadata.versionLabel`, and let users add a separate descriptive title such as `Tile substitution`.

Reason: Existing proposal preview/export readers already derive version labels from `estimate.metadata` and currently default to `V1`. `Rev 01` would also collide conceptually with the existing `sheet_code`/legacy `revision_label` path. Keep `sheet_code` as the estimate sheet identifier, and keep `V1`/`V2` as the version sequence.

### 2026-05-24 - Mandatory RPC Atomicity For Row Plus History Writes

Decision: Any mutation that changes current estimate rows and writes history must run through one SQL RPC/transaction. If the event write fails, the row mutation fails too.

Reason: Split success would create either false current state or false history. The implemented component-library versioning feature already uses RPC transactions for the same atomicity requirement.

### 2026-05-24 - Measured Append-Only Events For V1

Decision: `estimate_sheet_events` is append-only with no retention deletion/suppression policy in the first implementation, but only inside explicit storage guardrails.

Reason: MVP history correctness matters more than storage cleanup. However, broad rollout should stop for an archive/compaction decision if one workspace exceeds 250 MB combined event/version storage or one estimate exceeds 10,000 events. Event payloads must be changed-fields-first so scalar edits do not duplicate full row source snapshots.

### 2026-05-24 - Store Named Version Pointer In `estimates.metadata`

Decision: Named version creation should update `estimates.metadata.versionNumber`, `estimates.metadata.versionLabel`, and `estimates.metadata.latestEstimateSheetVersionId`.

Reason: The estimate route and proposal export route already read version labels from `estimate.metadata`. Without this pointer, the new version table and existing export label would drift.

### 2026-05-24 - Flat Snapshot Is The Restore Source Of Truth

Decision: Store named-version snapshots as flat `estimate`, `nodes`, and `rows` arrays with all restorable row fields. Use tree projection only for compare/display calculations.

Reason: Restore-as-copy must remap UUIDs exactly like `duplicateEstimateSheet()`. A rendered tree projection is not enough to restore row `metadata`, `source_snapshot`, `discipline`, `designation`, or `link_state`.

### 2026-05-24 - Row History Uses Details Panel, Not A New Row Menu

Decision: V1 row history wires the currently inert row Expand icon and opens a newly implemented row details/history panel. Do not assume or introduce a row-level `ActionMenuGroup` context menu in this feature slice.

Reason: Current estimate rows use plain icon buttons in a 30px action column, and the Expand icon has no handler or details panel today. Converting that column to a dropdown is a separate UX change.

### 2026-05-24 - Correlation IDs Also Provide Retry Idempotency

Decision: User-initiated row mutations should pass a stable UUID `correlation_id` from the client/hook through the server action into the RPC. Server-side generation remains acceptable only for internally initiated actions or actions that cannot be browser-retried.

Reason: RPC atomicity prevents split success, but it does not prevent duplicate writes when a transaction commits and the network response is lost. Checking existing `(estimate_id, correlation_id)` under the estimate lock lets retries return a no-op/current-state result instead of creating duplicate events.

### 2026-05-24 - Use Row Revision For Same-Row Concurrency

Decision: Add `estimate_row_items.row_revision` and require `expected_row_revision` for history-aware update, replace, and delete RPCs. A stale revision raises a typed conflict and does not write a success event.

Reason: Row locks serialize transactions but do not prevent silent last-write-wins. `updated_at` already exists, but an explicit revision counter is a clearer compare-and-swap contract for the spreadsheet UI.

### 2026-05-24 - Use Wrapper RPCs For Existing Atomic RPCs

Decision: V1 should add `reorder_estimate_nodes_with_history` and `insert_estimate_template_into_estimate_with_history`, then migrate server actions to those wrappers. Keep existing RPC signatures available for rollback compatibility.

Reason: The current RPCs are already production paths. Wrappers preserve blast-radius control while still keeping reorder/template mutation plus event writes in one SQL transaction.

### 2026-05-24 - Separate Schema Migration From Baseline Backfill

Decision: The schema migration should create tables, indexes, RLS, grants, RPCs, and an idempotent backfill entrypoint. Baseline snapshot backfill should run as a separate re-entrant data step with preflight counts, batching thresholds, timeouts, and a post-run byte report.

Reason: Building full snapshots for all existing estimates inside one all-or-nothing migration is operationally risky and hard to recover if a large project times out.

### 2026-05-24 - Explicit Actor Propagation To History RPCs

Decision: History server actions must call `requireCurrentUserContext()` and pass `currentUser.userId` to RPCs as `acting_user_id`; SQL resolves `coalesce(auth.uid(), acting_user_id)`.

Reason: The app's server-action auth path can differ from Supabase `auth.uid()` availability, especially in dev-auth/admin-DB flows. Event attribution and workspace checks cannot rely on `auth.uid()` alone.

### 2026-05-24 - Static Schema Tests Are Not Atomicity Proof

Decision: Static migration contract tests remain required, but live RPC transaction tests are required before claiming atomicity, locking, RLS, or concurrency behavior complete.

Reason: The component-library schema test pattern reads SQL files and asserts strings. It cannot prove rollback or concurrent database behavior.

## Open Questions

1. Should row history include hierarchy/node moves after `reorderEstimateTreeNodes()`? Recommended default: sheet-level `tree_reordered` event yes, row-level event only if the row's owning Area changes.
2. Should baseline backfill create one named version per existing estimate automatically? Recommended default: yes, `Initial baseline`, but not fake detailed row events.
3. Should `sheet_code` change when restoring as copy? Recommended default: use the same next-available sheet-code generator as duplicate estimate.
4. Should a version snapshot include proposal export metadata fields now? Recommended default: include estimate/project metadata needed for future export, but do not create proposal records.
5. What should the archive/compaction design be after a workspace crosses 250 MB combined event/version storage or an estimate crosses 10,000 events? Recommended default: defer the archive mechanism, but do not broaden rollout past those thresholds without a new plan.
6. If an RPC returns a typed validation failure, should the UI show a history-specific error or reuse the existing row-save failure toast/state? Recommended default: reuse existing row-save failure UI in v1 because history write failure means the row save failed.
7. Should node delete cascades write one bulk event or one node event plus N row events? Recommended default: one bulk `node_deleted_with_children` event for sheet history plus row-level events only when row history needs deleted-row discoverability.
8. Should undo/redo use the event log later? Recommended default: defer; v1 events should be readable audit history, not a reversible command stack.

## Rejected Alternatives

### Only Store Full Snapshot On Every Edit

Rejected because it is expensive, noisy, and awkward for row-level history. Full snapshots belong to named versions and maybe periodic autosave checkpoints later.

### Only Store Diff Events, No Full Versions

Rejected because restore/compare would require replaying history and would be brittle after row deletes, schema evolution, or future hierarchy changes.

### Mutate Current Estimate In Place On Restore

Rejected for v1 because it is destructive and conflicts with the current pre-MVP safety posture.

### Reuse Component Library Version Tables

Rejected because component versioning tracks reusable source items, while estimate-sheet versioning tracks project-specific working estimate state.

### Split Row Mutation Success From History Event Failure

Rejected because users would either see a saved row without a trustworthy audit trail or a history event for a change that did not actually persist. V1 must rollback the whole operation on history/event failure.
