# 11 - Implementation Plan

This is the canonical execution artifact. Every `UNIT-*` is a compact, executable packet runnable from bounded context. Implementation follows the DAG in dependency order.

## DAG Overview

```text
UNIT-001 (event-type normalization map + filter/guard alignment)
  ├──> UNIT-002 (bulk-delete restore + row-restore stub resolution)
  ├──> UNIT-003 (AI package-builder event-type alignment)
  └──> UNIT-004 (idempotency + INSERT-shape consistency)
         ├──> UNIT-005 (gap test coverage)
         ├──> UNIT-006 (composer/filter additions + UI hardening)
         └──> UNIT-007 (shared-link interaction improvements — P2)
                └──> UNIT-008 (integration + hosted proof evaluation)
```

`UNIT-001` is the critical path. It unblocks `UNIT-002` through `UNIT-004` (which can run in parallel after it). `UNIT-005` through `UNIT-007` depend on `UNIT-004`. `UNIT-008` is the integration gate.

## UNIT-001: Event-Type Normalization Map

```text
Unit ID and goal: UNIT-001 — Create a read-side normalization function that maps all writable event types to the canonical UI vocabulary, fixing the naming split that makes 23+ event types invisible to filters and generic in copy.
User/system outcome: Every estimate mutation produces an event that renders with a readable title and is filterable in the Activity History modal.
Linked requirement/decision/risk IDs: REQ-001, REQ-002, DEC-AUTO-001, DEC-AUTO-002, RISK-001
Non-goals: Do not change write sites. Do not add new event types. Do not touch dormant named-version types.
Exact paths and current symbols:
  - src/lib/estimates/actions.ts:951-971 (normalizeHistoryEvent — add normalization here or in a new shared module)
  - src/components/workshop/estimate-sheet/activity-history.tsx:40-60 (ACTIVITY_FILTER_EVENT_TYPES)
  - src/components/workshop/estimate-sheet/activity-history.tsx:220-221 (RESTORABLE_*_DELETE_EVENT_TYPES)
  - src/lib/activity/activity-copy-dictionary.ts:3-28 (ESTIMATE_EVENT_ACTIONS)
  - src/lib/activity/activity-composer.ts:268-317 (estimateTitle switch)
  - src/lib/repositories/project-activity-feed-repository.ts:159-165 (estimateBucketEventTypes)
Dependencies and preconditions: None — this is the first unit.
Owned scope and responsible role: One executor owns the normalization module + all UI vocabulary files. No parallel writes to these files.
Approach and invariants:
  1. Create src/lib/activity/event-type-normalization.ts with a canonical map:
     { "estimate_node_created": "node_created", "estimate_tab_created": "tab_created", "row_inserted": "row_added", "estimate_row_inserted": "row_added", "rows_deleted": "rows_bulk_deleted", "estimate_node_deleted": "node_deleted_with_children", "estimate_nodes_deleted": "node_deleted_with_children", ... }
  2. Export normalizeEventType(rawType: string): string that returns the canonical name or the raw type if no mapping exists.
  3. Apply normalization in normalizeHistoryEvent (actions.ts:955) and in the project-activity-feed-repository estimate-row reader.
  4. Update RESTORABLE_ROW_DELETE_EVENT_TYPES and RESTORABLE_NODE_DELETE_EVENT_TYPES to use canonical names (they already do — just ensure normalization runs before the guard check).
  5. Add canonical entries for currently-unrepresented types: nodes_restored, row_component_moved, rows_moved, sheet_adjustment_updated.
Expected postconditions: All events render with non-generic copy. All filter options return results.
Test/proof IDs: TEST-001, TEST-002, TEST-003
  - TEST-001: vocabulary integration test (write → read → compose → assert non-generic title)
  - TEST-002: filter exhaustiveness test (each filter option returns ≥1 result)
  - TEST-003: normalization map completeness test (every write-layer event type has a mapping)
Commands: bun test tests/vitest/activity-event-type-normalization.test.ts (new), bun run typecheck
Expected signal: All new tests pass. Existing activity tests still pass.
Evidence class/path: automated-test
Failure response: If a mapping is ambiguous (two write names map to the same canonical name in a way that loses information), add disambiguating context to the composer payload lookup.
Replan trigger: If normalization at the read boundary proves insufficient (e.g., the project feed reader bypasses normalizeHistoryEvent), extend to all read boundaries.
Checkpoint/resume state: The normalization module is the checkpoint artifact. If interrupted after creating it, resume by wiring it into each read boundary.
Parallel safety: This unit owns: event-type-normalization.ts (new), actions.ts (read section), activity-history.tsx (filter + restore constants), activity-copy-dictionary.ts, activity-composer.ts, project-activity-feed-repository.ts. No other unit may write these files until UNIT-001 is VERIFIED.
```

## UNIT-002: Bulk-Delete Restore And Row-Restore Stub Resolution

```text
Unit ID and goal: UNIT-002 — Fix bulk-delete restore (ensure restore buttons appear for bulk row and node deletions) and resolve the D1 row-restore stub.
User/system outcome: Bulk-deleted rows and nodes are restorable from the Activity History modal. The row-restore stub is either implemented or honestly removed.
Linked requirement/decision/risk IDs: REQ-002, REQ-003, DEC-AUTO-003, RISK-007
Non-goals: Do not implement named-version restore. Do not change node-restore D1 logic (it works).
Exact paths and current symbols:
  - src/lib/estimates/d1-action-client.ts:2404-2406 (restore_deleted_estimate_rows_with_history throw)
  - src/lib/estimates/d1-action-client.ts:2049-2065 (deleteRowsBulk — emits "rows_deleted")
  - src/hooks/use-estimate-row-mutations.ts:1044 (restoreDeletedRowsMutation)
Dependencies and preconditions: UNIT-001 (normalization must be in place so "rows_deleted" → "rows_bulk_deleted" before the restore guard evaluates).
Owned scope and responsible role: One executor. Owns d1-action-client.ts restore section, use-estimate-row-mutations.ts.
Approach and invariants:
  1. After UNIT-001 normalization, verify that bulk-delete events now match RESTORABLE_ROW_DELETE_EVENT_TYPES.
  2. For the D1 row-restore stub (DEC-AUTO-003 = remove): remove the throw, update the dispatch entry to return a clear "not supported" error, and reconcile the UI to use the existing restoreDeletedRowsMutation path (toast undo) for the Activity History modal button. If the optimistic path is insufficient for history-modal restore, implement a minimal D1 row restore mirroring node restore.
  3. Add a test that creates a bulk-delete event and asserts the restore button appears.
Expected postconditions: Bulk delete → restore button visible. Row-restore stub is resolved (not a misleading throw).
Test/proof IDs: TEST-004, TEST-005, TEST-006
Commands: bun test tests/vitest/estimate-sheet-activity-history-ui.test.tsx, bun run typecheck
Evidence class/path: automated-test
Failure response: If the optimistic restore path cannot reconstruct from old_snapshot, implement D1 row restore.
Replan trigger: If removing the stub breaks a downstream consumer.
Checkpoint/resume state: Restore button visibility test is the checkpoint.
Parallel safety: Owns d1-action-client.ts (restore section only) and use-estimate-row-mutations.ts. Does NOT touch the normalization module (UNIT-001).
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
  3. Optionally: change the AI builder to emit canonical names directly (reduces normalization map size), but this is not required.
Expected postconditions: AI builder events render correctly.
Test/proof IDs: TEST-008
Commands: bun test (AI package-builder activity tests)
Evidence class/path: automated-test
Failure response: If a variant spelling isn't in the map, add it.
Checkpoint/resume state: Normalization map entries for all apply.ts event types.
Parallel safety: Owns apply.ts event-type constants only. Does NOT touch d1-action-client.ts.
```

## UNIT-004: Idempotency And INSERT-Shape Consistency

```text
Unit ID and goal: UNIT-004 — Standardize all INSERT sites into estimate_sheet_events to use 19 columns and the shared idempotency helper where practical.
User/system outcome: Consistent data shape across all activity events. No NULL fields where data is available.
Linked requirement/decision/risk IDs: REQ-004
Non-goals: Do not change event-type names (UNIT-001 owns that). Do not change read paths.
Exact paths and current symbols:
  - src/lib/reusable-sources/actions.ts:748 (17-column INSERT)
  - src/lib/estimates/express-promotion-actions.ts:455 (19-column, separate idempotency)
  - src/lib/ai/package-builder/apply.ts:939-1004 (local insertEstimateEvent)
Dependencies and preconditions: UNIT-001 (normalization must not conflict with INSERT changes).
Owned scope and responsible role: One executor. Owns reusable-sources/actions.ts, express-promotion-actions.ts, apply.ts INSERT sections.
Approach and invariants:
  1. Add target_row_id and total_delta to the reusable-sources INSERT.
  2. Route reusable-sources and express-promotion INSERTs through prepareHistoryEventInsert where practical (or document why the raw INSERT is preferred).
  3. Align apply.ts insertEstimateEvent JSON serialization with prepareHistoryEventInsert.
  4. Verify the dataStore binding in fetchEstimateSheetVersionControl (RISK-002).
Expected postconditions: All INSERT sites write 19 columns. JSON serialization is consistent.
Test/proof IDs: TEST-007
Commands: bun test, bun run typecheck
Evidence class/path: automated-test
Failure response: If routing through prepareHistoryEventInsert changes idempotency behavior, keep the raw INSERT but align columns.
Checkpoint/resume state: All INSERT sites write 19 columns.
Parallel safety: Owns the INSERT sections of reusable-sources/actions.ts, express-promotion-actions.ts, apply.ts. Does NOT touch d1-action-client.ts core handlers or the normalization module.
```

## UNIT-005: Gap Test Coverage

```text
Unit ID and goal: UNIT-005 — Fill critical test gaps for restore paths, error branches, read-only gating, and event-type vocabulary.
User/system outcome: Restore-from-history is integration-tested. Error branches are covered. The naming split cannot recur silently.
Linked requirement/decision/risk IDs: REQ-006, RISK-001
Non-goals: Do not change production code (tests only, unless a test reveals a bug that requires a fix).
Exact paths and current symbols:
  - tests/vitest/estimate-sheet-activity-history-ui.test.tsx (extend)
  - tests/vitest/estimate-sheet-version-control-ui.test.tsx (extend)
  - tests/vitest/estimate-actions-d1-reorder-history.test.ts (extend)
  - New: tests/vitest/activity-event-type-normalization.test.ts
  - New: tests/vitest/activity-filter-exhaustiveness.test.ts
Dependencies and preconditions: UNIT-001, UNIT-002 (tests assert the fixed behavior).
Owned scope and responsible role: One test-engineer. Owns all new/extended test files.
Approach and invariants:
  1. Event-type vocabulary integration test: write events through mutation handlers, read back, assert canonical names.
  2. Filter exhaustiveness test: for each ACTIVITY_FILTER_EVENT_TYPES entry, create an event and assert the filter returns it.
  3. Node-restore integration test: render EstimateSheetContent, click restore, assert tree swap + feed reload.
  4. Restore error-branch tests: collision, empty snapshot, wrong event type, batch oversize.
  5. Read-only gating test: assert restore buttons absent when canEditEstimate is false.
  6. Contract test: assert every write-layer event type has a normalization map entry.
Expected postconditions: All critical gaps covered. Existing tests still pass.
Test/proof IDs: TEST-009, TEST-010, TEST-011
Commands: bun test
Evidence class/path: automated-test
Failure response: If a test reveals a production bug, create a targeted fix unit or extend the owning unit.
Checkpoint/resume state: New test files committed and passing.
Parallel safety: Owns new test files + extensions to existing test files. Does NOT touch production source (except minimal fixes if tests reveal bugs, coordinated with the owning unit).
```

## UNIT-006: Composer/Filter Additions And UI Hardening

```text
Unit ID and goal: UNIT-006 — Add composer entries, dictionary mappings, and filter options for currently-unrepresented event types. Remove dead UI options. Clean up stubs.
User/system outcome: All activity events have rich, human-readable representations. No dead filter options.
Linked requirement/decision/risk IDs: REQ-007, RISK-005
Non-goals: Do not redesign the UI. Do not consolidate repositories (P2 only).
Exact paths and current symbols:
  - src/lib/activity/activity-composer.ts:268-317 (add cases for nodes_restored, row_component_moved, rows_moved, sheet_adjustment_updated)
  - src/lib/activity/activity-copy-dictionary.ts:3-28 (add mappings)
  - src/components/workshop/estimate-sheet/activity-history.tsx:40-60 (add filter options for new types, remove dead options like row_blank_added if confirmed no writer)
  - src/components/admin/AdminAuditTable.tsx (note stub status — do not wire without owner decision)
Dependencies and preconditions: UNIT-001 (normalization in place), UNIT-004.
Owned scope and responsible role: One executor. Owns composer, dictionary, filter list.
Approach and invariants:
  1. Add composer cases for each newly-normalized event type.
  2. Add dictionary entries.
  3. Add filter options where user-relevant.
  4. Remove or annotate dead filter options (row_blank_added if no writer exists).
  5. Annotate AdminAuditTable stub clearly.
Expected postconditions: All events have non-generic copy. No dead filter options.
Test/proof IDs: TEST-012
Commands: bun test, bun run typecheck
Evidence class/path: automated-test
Checkpoint/resume state: Composer/dictionary/filter updates committed.
Parallel safety: Owns activity-composer.ts, activity-copy-dictionary.ts, activity-history.tsx filter section. Does NOT touch d1-action-client.ts or normalization module.
```

## UNIT-007: Shared-Link Interaction Improvements (P2)

```text
Unit ID and goal: UNIT-007 — Add owner-reply to client comments, comment edit/delete, and decision reset (P2, post-MVP).
User/system outcome: Owners can reply to client comments inline on the share page. Comment authors can edit/delete. Owners can reset decisions.
Linked requirement/decision/risk IDs: REQ-008, DEC-AUTO-005
Non-goals: Do not implement threaded comments (flat reply only for MVP). Do not add real-time updates.
Exact paths and current symbols:
  - src/app/api/share/[token]/comment/route.ts (add POST edit/delete)
  - src/lib/publication/actions.ts (add owner-reply action, decision-reset action)
  - src/lib/publication/public-repository.ts:942-1013 (insertSharedLinkComment — extend for owner replies)
  - src/components/share/SharePageComments.tsx (add reply UI)
Dependencies and preconditions: UNIT-004. This unit is P2 and may be deferred.
Owned scope and responsible role: One executor. Owns share comment/decision routes and components.
Approach and invariants:
  1. Owner reply: add a server action that inserts a shared_link_comments row with author_type=owner, recipient_id=null, is_internal=false. Surface in the public comment list.
  2. Comment edit/delete: add UPDATE/DELETE routes with authorization (author or owner only). Rate-limited.
  3. Decision reset: add a server action that deletes the shared_link_responses row (owner-only). Allow recipient to re-decide.
  4. Compute signature_intent_hash on decision submit (D11 requirement).
Expected postconditions: Owners can reply, edit/delete, and reset decisions.
Test/proof IDs: TEST-013, TEST-014, TEST-015
Commands: bun test, bun run typecheck
Evidence class/path: automated-test
Checkpoint/resume state: Each sub-feature committed independently.
Parallel safety: Owns share comment/decision routes and SharePageComments component. Does NOT touch estimate activity paths.
```

## UNIT-008: Integration And Hosted Proof Evaluation

```text
Unit ID and goal: UNIT-008 — Run integrated verification across all units and evaluate hosted proof requirements for shared-link activity changes.
User/system outcome: All units work together. Hosted proof gaps are identified with continuation packets.
Linked requirement/decision/risk IDs: ALL
Non-goals: Do not deploy to production without explicit owner approval.
Exact paths and current symbols: All touched paths across UNIT-001..007.
Dependencies and preconditions: UNIT-001..007 complete.
Owned scope and responsible role: One verifier (maker/checker separation).
Approach and invariants:
  1. Run bun run validate (broad).
  2. Run bun run validate:plan-pack.
  3. Run e2e for shared-link receiver flow.
  4. Evaluate hosted D1 proof needs for shared-link activity changes.
  5. Create continuation packets for any AUTH boundaries.
Expected postconditions: All tests pass. Status tuple updated. Evidence artifacts current.
Test/proof IDs: ALL
Commands: bun run validate, bun run validate:plan-pack, bun test e2e/
Evidence class/path: automated-test + integration
Checkpoint/resume state: Final readiness review.
Parallel safety: Read-only verifier. Does not edit production code.
```
