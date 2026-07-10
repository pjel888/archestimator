# 11 - Implementation Plan

This is the canonical execution artifact. Every `UNIT-*` is a compact, executable packet runnable from bounded context. Implementation follows the DAG in dependency order.

## DAG Overview

```text
UNIT-001 (event-type normalization map + filter/guard alignment)
  ├──> UNIT-002 (bulk-delete restore + row-restore stub resolution)
  ├──> UNIT-003 (AI package-builder event-type alignment)
  └──> UNIT-004 (idempotency + INSERT-shape consistency)
         ├──> UNIT-006 (dead-filter cleanup + UI regression hardening)
         └──> UNIT-009 (variant/component propagation facts)
UNIT-002 ──> UNIT-005 (gap test coverage)
UNIT-005 ──> UNIT-006 (shared test-file serialization)
UNIT-006 ──> UNIT-010 (accessibility hardening)
UNIT-004 ──> UNIT-011 (query/index/rendering performance)
UNIT-004 ──> UNIT-012 (isolation, lifecycle, durable writes)
UNIT-003/005/006/009/010/011/012 ──> UNIT-008 (integration + release handoff)
```

`UNIT-001` is the exact next unit. `SLICE-001` contains all currently READY units
and is dependency-closed; execution still follows the edges above. `UNIT-011`
is PLANNED until the durable Beta-program migration-generation receipt validates,
and downstream `UNIT-008` is therefore PLANNED. `UNIT-007` is SUPERSEDED because
Publisher owns the overlapping mutation/UI surface.

## UNIT-001: Event-Type Normalization Map

```text
Unit ID and goal: UNIT-001 — Create a read-side normalization function that maps all writable event types to the canonical UI vocabulary, fixing the naming split that makes 23+ event types invisible to filters and generic in copy.
User/system outcome: Every estimate mutation produces an event that renders with a readable title and is filterable in the Activity History modal.
Linked requirement/decision/risk IDs: REQ-001, REQ-002, REQ-007, DEC-AUTO-001, DEC-AUTO-002, RISK-001
Non-goals: Do not change write sites. Do not add new event types. Do not touch dormant named-version types.
Exact paths and current symbols:
  - src/lib/activity/event-type-normalization.ts:normalizeEventType (new canonical normalization owner)
  - src/lib/estimates/actions.ts:normalizeHistoryEvent (call the canonical normalizer)
  - src/lib/repositories/project-activity-feed-repository.ts (call the canonical normalizer in the estimate-row reader)
  - src/components/workshop/estimate-sheet/activity-history.tsx:40-60 (ACTIVITY_FILTER_EVENT_TYPES)
  - src/components/workshop/estimate-sheet/activity-history.tsx:220-221 (RESTORABLE_*_DELETE_EVENT_TYPES)
  - src/lib/activity/activity-copy-dictionary.ts:3-28 (ESTIMATE_EVENT_ACTIONS)
  - src/lib/activity/activity-composer.ts:268-317 (estimateTitle switch)
  - src/lib/repositories/project-activity-feed-repository.ts:159-165 (estimateBucketEventTypes)
  - tests/vitest/activity-event-type-normalization.test.ts (new; created here)
  - tests/vitest/activity-filter-exhaustiveness.test.ts (new; created here)
Dependencies and preconditions: None — this is the first unit.
Owned scope and responsible role: One executor owns the normalization module,
the two new contract tests, and all UI vocabulary files. No parallel writes to
these paths.
Approach and invariants:
  1. Create src/lib/activity/event-type-normalization.ts with a canonical map:
     { "estimate_node_created": "node_created", "estimate_tab_created": "tab_created", "row_inserted": "row_added", "estimate_row_inserted": "row_added", "rows_deleted": "rows_bulk_deleted", "estimate_node_deleted": "node_deleted_with_children", "estimate_nodes_deleted": "node_deleted_with_children", ... }
  2. Export normalizeEventType(rawType: string): string that returns the canonical name or the raw type if no mapping exists.
  3. Apply normalization in normalizeHistoryEvent (actions.ts:955) and in the project-activity-feed-repository estimate-row reader.
  4. Update RESTORABLE_ROW_DELETE_EVENT_TYPES and RESTORABLE_NODE_DELETE_EVENT_TYPES to use canonical names (they already do — just ensure normalization runs before the guard check).
  5. For `nodes_restored`, `row_component_moved`, `rows_moved`, and
     `sheet_adjustment_updated`, add the exact composer cases, dictionary entries,
     and user-relevant filter options in this unit; their non-generic copy and
     filter assertions are part of TEST-001/002 here, not deferred.
Expected postconditions: All events render with non-generic copy. All filter options return results.
Test/proof IDs: TEST-001, TEST-002, TEST-003
  - TEST-001: vocabulary integration test (write → read → compose → assert non-generic title)
  - TEST-002: filter exhaustiveness test (each filter option returns ≥1 result)
  - TEST-003: normalization map completeness test (every write-layer event type has a mapping)
Commands: bunx vitest run tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts tests/vitest/activity-composer.test.ts && bun run type-check
Expected signal: All new tests pass. Existing activity tests still pass.
Evidence class/path: automated-test; .ai/99_scratch/activity-history/unit-001-normalization.md
Failure response: If a mapping is ambiguous (two write names map to the same canonical name in a way that loses information), add disambiguating context to the composer payload lookup.
Replan trigger: If normalization at the read boundary proves insufficient (e.g., the project feed reader bypasses normalizeHistoryEvent), extend to all read boundaries.
Checkpoint/resume state: The normalization module is the checkpoint artifact. If interrupted after creating it, resume by wiring it into each read boundary.
Parallel safety: This unit owns: event-type-normalization.ts (new), actions.ts
(read section), activity-history.tsx (filter + restore constants),
activity-copy-dictionary.ts, activity-composer.ts,
project-activity-feed-repository.ts, activity-event-type-normalization.test.ts,
and activity-filter-exhaustiveness.test.ts. No other unit may write these files
until UNIT-001 is VERIFIED.
```

## UNIT-002: Bulk-Delete Restore And Row-Restore Stub Resolution

```text
Unit ID and goal: UNIT-002 — Fix bulk-delete restore (ensure restore buttons appear for bulk row and node deletions) and resolve the D1 row-restore stub.
User/system outcome: Bulk-deleted rows and nodes are restorable from the Activity History modal. The row-restore dispatch reconstructs rows from the persisted `old_snapshot` and no longer throws a stub error.
Linked requirement/decision/risk IDs: REQ-002, REQ-003, DEC-AUTO-003, RISK-007
Non-goals: Do not implement named-version restore. Do not change node-restore D1 logic (it works).
Exact paths and current symbols:
  - src/lib/estimates/d1-action-client.ts:2404-2406 (restore_deleted_estimate_rows_with_history throw)
  - src/lib/estimates/d1-action-client.ts:2049-2065 (deleteRowsBulk — emits "rows_deleted")
  - src/hooks/use-estimate-row-mutations.ts:1044 (restoreDeletedRowsMutation)
  - tests/vitest/estimate-actions-d1-row-restore-history.test.ts (new focused direct-D1 proof)
Dependencies and preconditions: UNIT-001 (normalization must be in place so "rows_deleted" → "rows_bulk_deleted" before the restore guard evaluates).
Owned scope and responsible role: One executor. Owns d1-action-client.ts restore
section, use-estimate-row-mutations.ts restore section, and the new focused
direct-D1 row-restore test.
Approach and invariants:
  1. After UNIT-001 normalization, verify that bulk-delete events now match RESTORABLE_ROW_DELETE_EVENT_TYPES.
  2. Implement the D1 row-restore dispatch from the stored `old_snapshot`, using
     the node-restore authorization/transaction pattern. Refuse missing/malformed
     snapshots, row-ID collisions, wrong event types, cross-workspace requests,
     and batches above the explicit cap without partial writes.
  3. Make replay idempotent by correlation/event identity and return the persisted
     result rather than inserting duplicate rows/events.
  4. Add a test that creates a bulk-delete event and asserts the restore button appears.
  5. Add focused direct-D1 restore tests covering successful reconstruction and
     readback, injected atomic write failure with zero partial rows/events, row-ID
     collision, malformed/missing old_snapshot, cross-workspace denial without
     metadata leakage, explicit batch-cap refusal, and idempotent replay returning
     the persisted result without duplicate rows or events.
Expected postconditions: Bulk delete → restore button visible. Row-restore stub is resolved (not a misleading throw).
Test/proof IDs: TEST-004, TEST-005, TEST-006
Commands: bunx vitest run tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-actions-d1-row-restore-history.test.ts && bun run type-check
Evidence class/path: automated-test; .ai/99_scratch/activity-history/unit-002-row-restore.md
Failure response: If `old_snapshot` is incomplete, fail before any write and extend the deletion snapshot contract in the owning unit; never fall back to optimistic client reconstruction or partial restore.
Replan trigger: If a characterized legacy `old_snapshot` shape cannot be restored
without guessing data, keep that legacy event visibly unrestorable and extend the
snapshot compatibility contract; do not remove the durable restore outcome.
Checkpoint/resume state: Restore button visibility test is the checkpoint.
Parallel safety: Owns d1-action-client.ts (restore section only),
use-estimate-row-mutations.ts, and the new direct-D1 test. Does NOT touch the
normalization module (UNIT-001).
```

## UNIT-003: AI Package-Builder Event-Type Alignment

```text
Unit ID and goal: UNIT-003 — Ensure AI package-builder events normalize to the same vocabulary as manual mutations.
User/system outcome: AI-applied estimate changes show readable activity titles and are filterable.
Linked requirement/decision/risk IDs: REQ-005
Non-goals: Do not change the AI package-builder's core logic.
Exact paths and current symbols:
  - src/lib/ai/package-builder/apply.ts:939-1004 (insertEstimateEvent)
  - src/lib/ai/package-builder/apply.ts:1139,1193,1267,1354,1459,1645,2620 (event types)
Dependencies and preconditions: UNIT-001 (normalization map must include AI builder variants).
Owned scope and responsible role: One executor. Owns apply.ts event-type section.
Approach and invariants:
  1. Add all AI builder variant spellings to the normalization map in UNIT-001.
  2. Verify by creating an AI-applied event and checking it renders with non-generic copy.
  3. Keep persisted AI writer spellings unchanged in this pack; the normalization map owns their aliases. Any writer rename requires a separately leased data-migration plan with old-history compatibility proof.
Expected postconditions: AI builder events render correctly.
Test/proof IDs: TEST-008
Commands: bunx vitest run tests/vitest/ai-package-builder-apply.test.ts tests/vitest/activity-event-type-normalization.test.ts
Evidence class/path: automated-test; .ai/99_scratch/activity-history/unit-003-ai-package-builder.md
Failure response: If a variant spelling isn't in the map, add it.
Checkpoint/resume state: Normalization map entries for all apply.ts event types.
Parallel safety: Owns apply.ts event-type constants only. Does NOT touch d1-action-client.ts.
```

## UNIT-004: Idempotency And INSERT-Shape Consistency

```text
Unit ID and goal: UNIT-004 — Standardize all INSERT sites into estimate_sheet_events to use 19 columns and the shared idempotency helper.
User/system outcome: Consistent data shape across all activity events. No NULL fields where data is available.
Linked requirement/decision/risk IDs: REQ-004
Non-goals: Do not change event-type names (UNIT-001 owns that). Do not change read paths.
Exact paths and current symbols:
  - src/lib/reusable-sources/actions.ts:748 (17-column INSERT)
  - src/lib/estimates/express-promotion-actions.ts:455 (19-column, separate idempotency)
  - src/lib/ai/package-builder/apply.ts:939-1004 (local insertEstimateEvent)
  - tests/vitest/reusable-sources-actions.test.ts
  - tests/vitest/express-promotion-action.test.ts
  - tests/vitest/ai-package-builder-apply.test.ts
  - tests/vitest/activity-event-insert-shape.test.ts (new cross-writer contract)
Dependencies and preconditions: UNIT-001 (normalization must not conflict with INSERT changes).
Owned scope and responsible role: One executor. Owns reusable-sources/actions.ts, express-promotion-actions.ts, apply.ts INSERT sections.
Approach and invariants:
  1. Add target_row_id and total_delta to the reusable-sources INSERT.
  2. Route reusable-sources and express-promotion INSERTs through `prepareHistoryEventInsert` while preserving their existing transaction boundaries and correlation/idempotency keys.
  3. Align apply.ts insertEstimateEvent JSON serialization with prepareHistoryEventInsert.
  4. Verify the dataStore binding in fetchEstimateSheetVersionControl (RISK-002).
Expected postconditions: All INSERT sites write 19 columns. JSON serialization is consistent.
Test/proof IDs: TEST-007
Commands: bunx vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/express-promotion-action.test.ts tests/vitest/ai-package-builder-apply.test.ts tests/vitest/activity-event-insert-shape.test.ts && bun run type-check
Evidence class/path: automated-test; .ai/99_scratch/activity-history/unit-004-insert-shape.md
Failure response: If the helper cannot preserve characterized transaction or idempotency behavior, extend the helper under this unit and keep the gate red until the focused regression passes; do not ship a divergent raw INSERT shape.
Checkpoint/resume state: All INSERT sites write 19 columns.
Parallel safety: Owns the INSERT sections of reusable-sources/actions.ts, express-promotion-actions.ts, apply.ts. Does NOT touch d1-action-client.ts core handlers or the normalization module.
```

## UNIT-005: Gap Test Coverage

```text
Unit ID and goal: UNIT-005 — Fill critical test gaps for restore paths, error branches, read-only gating, and event-type vocabulary.
User/system outcome: Restore-from-history is integration-tested. Error branches are covered. The naming split cannot recur silently.
Linked requirement/decision/risk IDs: REQ-006, RISK-001
Non-goals: Do not change production code. This unit is tests-only; a production
failure is returned to the unit that owns the affected source path.
Exact paths and current symbols:
  - tests/vitest/estimate-sheet-activity-history-ui.test.tsx (extend ActivityHistoryModal coverage)
  - tests/vitest/estimate-sheet-version-control-ui.test.tsx (extend)
  - tests/vitest/estimate-actions-d1-reorder-history.test.ts (extend)
  - tests/vitest/activity-event-type-normalization.test.ts (extend; created by UNIT-001)
  - tests/vitest/activity-filter-exhaustiveness.test.ts (extend; created by UNIT-001)
  - src/components/workshop/estimate-sheet/activity-history.tsx:ActivityHistoryModal,ACTIVITY_FILTER_EVENT_TYPES (read-only under this unit)
  - src/lib/activity/activity-composer.ts:composeEstimateActivity (read-only under this unit)
  - src/lib/activity/activity-copy-dictionary.ts:ESTIMATE_EVENT_ACTIONS (read-only under this unit)
Dependencies and preconditions: UNIT-001, UNIT-002 (tests assert the fixed behavior).
Owned scope and responsible role: One test-engineer owns only extensions to the
five named test files; creation of the two normalization tests remains UNIT-001.
Approach and invariants:
  1. Event-type vocabulary integration test: write events through mutation handlers, read back, assert canonical names.
  2. Filter exhaustiveness test: for each ACTIVITY_FILTER_EVENT_TYPES entry, create an event and assert the filter returns it.
  3. Node-restore integration test: render EstimateSheetContent, click restore, assert tree swap + feed reload.
  4. Restore error-branch tests: collision, empty snapshot, wrong event type, batch oversize.
  5. Read-only gating test: assert restore buttons absent when canEditEstimate is false.
  6. Contract test: assert every write-layer event type has a normalization map entry.
Expected postconditions: All critical gaps covered. Existing tests still pass.
Test/proof IDs: TEST-009, TEST-010, TEST-011
Commands: bunx vitest run tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts
Evidence class/path: automated-test; .ai/99_scratch/activity-history/unit-005-gap-tests.md
Failure response: If a test reveals a production bug, record the failing fixture
and route it to the existing owning unit; UNIT-005 never acquires a production-file lease.
Checkpoint/resume state: The five named test files contain the additional gap
fixtures and pass.
Parallel safety: Owns only the declared test-file extensions. It has no
production-source lease; every production fix returns to the declared owner.
```

## UNIT-006: Dead-Filter Cleanup And UI Regression Hardening

```text
Unit ID and goal: UNIT-006 — Remove the proven-dead filter option and protect UNIT-001 vocabulary/copy behavior against regression.
User/system outcome: No dead filter options remain, and UNIT-001 representations stay readable and filterable.
Linked requirement/decision/risk IDs: REQ-001, RISK-003
Non-goals: Do not redesign the UI. Do not consolidate repositories (P2 only).
Exact paths and current symbols:
  - src/components/workshop/estimate-sheet/activity-history.tsx:ACTIVITY_FILTER_EVENT_TYPES,ActivityHistoryModal
  - tests/vitest/activity-composer.test.ts (extend regression assertions only)
  - tests/vitest/activity-copy-regression.test.ts (extend)
  - tests/vitest/estimate-sheet-activity-history-ui.test.tsx (extend)
  - tests/vitest/activity-event-type-normalization.test.ts (read-only regression input)
  - tests/vitest/activity-filter-exhaustiveness.test.ts (extend)
  - `src/components/admin/AdminAuditTable.tsx` is outside this pack and is not edited.
Dependencies and preconditions: UNIT-001 (normalization in place), UNIT-004,
and VERIFIED UNIT-005 so the two shared test-file leases are released.
Owned scope and responsible role: One executor owns only the
`ACTIVITY_FILTER_EVENT_TYPES` dead-option deletion and the named test extensions.
Composer/dictionary additions remain completed UNIT-001 output and are read-only.
Approach and invariants:
  1. Remove `row_blank_added` from `ACTIVITY_FILTER_EVENT_TYPES`; the current writer inventory has no producer.
  2. Retain its legacy composer/read compatibility. Any later producer must restore vocabulary and filter proof in the same change.
  3. Extend regression assertions for the four UNIT-001 event representations without changing their composer/dictionary implementation.
  4. Leave the unrelated admin audit stub unchanged.
Expected postconditions: `row_blank_added` is absent from the filter; the four
UNIT-001 event types still have non-generic copy and filter coverage.
Test/proof IDs: TEST-012 (AC-002 dead-filter and regression protection)
Commands: bunx vitest run tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts && bun run type-check
Evidence class/path: automated-test; .ai/99_scratch/activity-history/unit-006-copy-filter.md
Checkpoint/resume state: Dead-filter deletion and regression extensions complete.
Parallel safety: Starts only after UNIT-005 is VERIFIED and its shared test-file
leases are released. Owns only activity-history.tsx filter deletion plus named
test extensions. Does not edit composer, dictionary, d1-action-client, or normalizer.
```

## UNIT-007: Superseded Public-Mutation Lane

`UNIT-007` is `SUPERSEDED`. Publisher-And-Shared-Pages exclusively owns public
comment/decision routes, publication actions/repository changes, and shared-page
interaction UI. Activity consumes its append-only event/tombstone contract and
does not delete decisions or comments.

## UNIT-009: Variant And Component Propagation Facts

```text
Goal: Make variant selection and project-component fan-out reconstructable.
Requirements: REQ-010, REQ-009; decisions: DEC-AUTO-008; tests: TEST-016.
Dependencies: UNIT-001 and UNIT-004.
Exact paths/symbols:
  - src/components/workshop/estimate-sheet/rows/row-table.tsx:selectMaterialVariant
  - src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:useEstimateRowHandlers
  - src/lib/estimates/d1-action-client.ts:pickSharedProjectComponentPatch,propagateProjectComponentRowPatch,patchRowItem
  - src/components/workshop/estimate-sheet/activity-history-model.ts:ActivityFilterState
  - src/components/workshop/estimate-sheet/activity-history.tsx:AuditEventCard
  - tests/vitest/activity-variant-propagation.test.ts
Contract: detect typed prior/new variant identity; record bounded affected-row
before/after facts under one correlation ID; chunk above the explicit cap; show
propagated count and authorized rows. Library-only component edits that do not
mutate an estimate are not fabricated as estimate events.
Proof: run `bunx vitest run tests/vitest/activity-variant-propagation.test.ts` for
project/library fixtures, 1/N/over-cap propagation, mixed-authorization denial,
retry/idempotency, and revision readback. Persist the redacted receipt at
`.ai/99_scratch/activity-history/unit-009-variant-propagation.json`.
Failure: missing facts make that revision range unavailable; never infer values.
Resume: persisted event-shape contract plus characterization tests.
Parallel safety: serialize d1-action-client.ts with UNIT-002/004/012.
```

## UNIT-010: Accessibility Hardening

```text
Goal: Close REQ-011 across the Activity-owned ActivityHistoryModal,
ProjectActivityClient, and SharedLinkActivityFeed surfaces without redesign.
Dependencies: UNIT-006. Test: TEST-017.
Exact paths/symbols:
  - src/components/workshop/estimate-sheet/activity-history.tsx:ActivityHistoryModal
  - src/components/workshop/estimate-sheet/use-estimate-history-panel.ts:useEstimateHistoryPanel
  - src/components/workshop/project-activity/ProjectActivityClient.tsx:ProjectActivityClient
  - src/components/share/SharedLinkActivityFeed.tsx:SharedLinkActivityFeed
  - tests/vitest/activity-accessibility.test.tsx
  - e2e/activity-history-accessibility.spec.ts
Contract: explicit first-focus and return; roving tree tabindex with Up/Down;
programmatic ledger headers; discrete live regions; 4.5:1 text contrast, reflow,
and minimum target/font rules. Publisher-And-Shared-Pages exclusively owns
SharePageComments and public decision UI; its incorporated-delta receipt must
carry their accessibility findings and proof, and Activity performs no edit there.
Proof: run `bunx vitest run tests/vitest/activity-accessibility.test.tsx`, then
`bunx playwright test e2e/activity-history-accessibility.spec.ts --project=chromium`
for the native-dialog focus-return and 320/375/768/1280 reflow claims. Persist the
redacted receipt at `.ai/99_scratch/activity-history/unit-010-accessibility.json`.
Resume: one passing fixture per audited surface; stop on the earliest failed row.
Parallel safety: serialize shared activity-history.tsx work after UNIT-006.
```

## UNIT-011: Query, Index, And Rendering Performance

```text
Goal: Close REQ-012 with bounded reads and measured rendering.
Dependencies: UNIT-004. Test: TEST-018.
Status/precondition: PLANNED. Immediately before any migration edit, validate
`../Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json` as a durable current
generation receipt: current migration-tail digest, Activity owner package ID and
owner-manifest digest, exact allocation `migrations/0057_activity_history_indexes.sql`,
unclaimed status, allocation digest, and receipt digest must all match. Missing,
stale, consumed, tail-drifted, or hash-mismatched evidence blocks the unit and is
returned to the Program for reissue.
Exact paths/symbols:
  - migrations/0057_activity_history_indexes.sql
  - src/lib/repositories/project-activity-feed-repository.ts:readProjectActivityFeed,readExactCounts
  - src/lib/repositories/project-activity-repository.ts:listProjectActivityPage
  - src/components/workshop/project-activity/ProjectActivityClient.tsx:ProjectActivityClient
  - src/components/workshop/estimate-sheet/activity-history.tsx:ActivityHistoryModal
  - tests/vitest/perf/activity-history-evaluator.test.ts
Contract: composite estimate/row and estimate/node cursor indexes; first-page-only
exact counts unless explicitly requested; bounded publication reads; one-pass
correlation grouping; virtualized or capped accumulated pages; INSERT ON CONFLICT
idempotency. Preserve exact filters/count semantics.
Proof: run `bunx vitest run tests/vitest/perf/activity-history-evaluator.test.ts`;
capture EXPLAIN QUERY PLAN plus 100/500/5k/50k fixtures, query count,
p95/RSS/DOM-node budgets, duplicate-correlation race, migration replay, and
rollback/fix-forward at
`.ai/99_scratch/activity-history/unit-011-performance.json`.
Failure: a plan scan, unbounded DOM, or semantic count drift reopens this unit.
Parallel safety: only the Beta program issues/reissues the durable allocation;
shared UI waits for UNIT-006/010 ownership release.
```

## UNIT-012: Tenant Isolation, Lifecycle, And Durable Event Writes

```text
Goal: Close REQ-013, REQ-014, and REQ-015.
Dependencies: UNIT-004. Tests: TEST-019, TEST-020, TEST-021.
Exact paths/symbols:
  - src/lib/estimates/d1-action-client.ts:prepareHistoryEventInsert,insertHistoryEvent,patchRowItem
  - src/lib/repositories/project-activity-repository.ts:listProjectActivityPage
  - src/lib/repositories/project-activity-feed-repository.ts:readProjectActivityFeed
  - src/lib/activity/activity-outbox.ts (new)
  - src/lib/activity/activity-retention.ts (new)
  - src/lib/compliance/retention-core.ts:runRetentionPassInD1
  - src/lib/compliance/privacy-request-repository.ts:exportPrivacyRequestSupportData,erasePrivacyRequestSupportData
  - worker.ts:scheduled
  - tests/vitest/activity-lifecycle-repository.test.ts
  - tests/vitest/activity-tenant-isolation.test.ts
  - tests/vitest/activity-durable-write.test.ts
Contract: workspace_id is mandatory at every repository boundary; domain mutation
and required event commit in one D1 batch where possible, otherwise a durable
outbox is written in that batch and reconciled with capped exponential retry and
an operator repair receipt. Actor deletion uses a non-PII fallback. Register TTL,
legal hold, anonymization/purge, export/erase interaction, retry, and idempotency.
Proof: run `bunx vitest run tests/vitest/activity-lifecycle-repository.test.ts
tests/vitest/activity-tenant-isolation.test.ts
tests/vitest/activity-durable-write.test.ts`; cover cross-workspace denials, every
batch/outbox crash boundary, duplicate delivery, late reconciliation, actor
deletion, legal hold, retention retry, and redacted structured-error paths.
Persist the receipt at `.ai/99_scratch/activity-history/unit-012-lifecycle.json`.
Failure: no partial success may be presented as complete audit coverage.
Parallel safety: serialize D1 helpers with UNIT-002/004/009 and compliance registry
with any concurrent retention writer.
```

## UNIT-008: Integrated Verification And Release Handoff

```text
Goal: Verify UNIT-001..006 and UNIT-009..012 as one activity system.
Dependencies: UNIT-003, UNIT-005, UNIT-006, UNIT-009, UNIT-010, UNIT-011, UNIT-012.
Deferred-risk tracking: `REQ-017`/`RISK-005`/`AC-026` are tracking-only here;
reject any repository-consolidation diff and do not implement that future scope.
Owned scope: read-only product verifier. Writable outputs are exactly:
  - .ai/03_plans/2026-07-10/Activity-History-Mapping/plan-pack.json
  - .ai/03_plans/2026-07-10/Activity-History-Mapping/LOOP_LEDGER.md
  - .ai/99_scratch/activity-history/unit-008-verification.json
  - .ai/99_scratch/activity-history/unit-008-verification.md
  - .ai/99_scratch/activity-history/BETA-P1-10-MAINTAINABILITY-RECEIPT-v1.json
  - .ai/99_scratch/release-integrity/activity-history-contribution.json
Test command: bunx vitest run
  tests/vitest/activity-event-type-normalization.test.ts
  tests/vitest/activity-filter-exhaustiveness.test.ts
  tests/vitest/estimate-actions-d1-row-restore-history.test.ts
  tests/vitest/estimate-sheet-activity-history-ui.test.tsx
  tests/vitest/estimate-sheet-version-control-ui.test.tsx
  tests/vitest/estimate-actions-d1-reorder-history.test.ts
  tests/vitest/activity-composer.test.ts
  tests/vitest/activity-copy-regression.test.ts
  tests/vitest/ai-package-builder-apply.test.ts
  tests/vitest/reusable-sources-actions.test.ts
  tests/vitest/express-promotion-action.test.ts
  tests/vitest/activity-event-insert-shape.test.ts
  tests/vitest/activity-security.test.ts
  tests/vitest/activity-view-model.test.ts
  tests/vitest/project-activity-repository.test.ts
  tests/vitest/project-activity-page/action-classes.test.ts
  tests/vitest/project-activity-page/client.test.tsx
  tests/vitest/project-activity-page/repository-behavior.test.ts
  tests/vitest/project-activity-page/repository-contract.test.ts
  tests/vitest/project-activity-page/route-contract.test.ts
  tests/vitest/project-activity-page/url-state.test.ts
  tests/vitest/project-publication-activity.test.tsx
  tests/vitest/shared-link-activity-benchmark.test.ts
  tests/vitest/compliance-retention-repository.test.ts
  tests/vitest/compliance-privacy-request-repository.test.ts
  tests/vitest/compliance-privacy-request-route.test.ts
  tests/vitest/activity-variant-propagation.test.ts
  tests/vitest/activity-accessibility.test.tsx
  tests/vitest/perf/activity-history-evaluator.test.ts
  tests/vitest/activity-lifecycle-repository.test.ts
  tests/vitest/activity-tenant-isolation.test.ts
  tests/vitest/activity-durable-write.test.ts
  tests/vitest/activity-plan-ownership.test.ts
Non-test commands:
  - bun run type-check
  - bun run lint
  - bun run validate:error-handling
  - bunx wrangler d1 migrations apply ARCH_DB --local --persist-to .ai/99_scratch/activity-history/unit-008-d1
  - bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Activity-History-Mapping
  - git diff --check
Contract: TEST-022 compares the final scoped diff with the ownership table,
rejects an undeclared path or overlapping live lease, and records the
collision-free path/owner digest in EVID-007. Emit the two exact JSON contribution
receipts above with touched caller map, pre-change characterization,
extraction-or-retention decision, exact changed files, regression owner, exact
tests, independent verifier result, and fresh source/evidence hashes.
Pass: every TEST-001..012 and TEST-016..022 result exists and is green; all
accepted criteria and GATE-VERIFY-001 pass; REQ-008, REQ-016, and REQ-017 remain
explicit N/A/deferred; no temporary resource or lease remains. Any missing result, stale
hash, undeclared path, overlapping lease, or missing receipt field keeps UNIT-008
non-PASS. Production deploy is outside this pack. Resume from the first failed
criterion and rerun every evidence item invalidated by its repair.
```
