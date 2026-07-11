# 09 - Requirements And Traceability

Requirements derived from the audit findings. Each requirement traces to source evidence, implementation units, and acceptance criteria.

## Requirements

### REQ-001: Event-type vocabulary alignment (P0)

**Outcome:** Every event type written to `estimate_sheet_events` must render with a human-readable title/summary in the activity composer and be filterable in the Activity History modal.

**Current behavior:** 23+ of ~31 writable event types use names that don't match any composer case, dictionary key, or filter option. They render as generic "recorded estimate activity." and are unfilterable.

**Evidence:**
- Write layer: `d1-action-client.ts:1140,1172,1192,1214,1279,1296,1324,1351,1372,1428,1493,1597,1682,2040,2060,2001,2391`
- Read layer (no rename): `actions.ts:955`
- UI vocabularies: `activity-history.tsx:40-60`, `activity-copy-dictionary.ts:3-28`, `activity-composer.ts:268-317`
- AI builder variants: `apply.ts:1139,1193,1267,1354,1459,1645,2620`

**Units:** UNIT-001, UNIT-006
**Criteria:** AC-001, AC-002, AC-003
**Tests:** TEST-001, TEST-002, TEST-003, TEST-012

### REQ-002: Bulk-delete event type and restore guard alignment (P0)

**Outcome:** Bulk-deleted rows and nodes must show restore buttons in the Activity History modal.

**Current behavior:** Writer emits `rows_deleted` / `estimate_nodes_deleted`, but restore guards expect `rows_bulk_deleted` / `nodes_bulk_deleted_with_children`. Restore buttons never appear for bulk deletions.

**Evidence:** `activity-history.tsx:220-221`, `d1-action-client.ts:1493,2060`

**Units:** UNIT-001, UNIT-002
**Criteria:** AC-004, AC-005
**Tests:** TEST-004, TEST-005

### REQ-003: D1 row restore implementation (P1)

**Outcome:** `restore_deleted_estimate_rows_with_history` must durably restore the
deleted D1 rows from the persisted `old_snapshot`; removing the dispatch or UI
path is not an acceptable substitute.

**Current behavior:** Hard-coded throw at `d1-action-client.ts:2404-2406`.

**Evidence:** `d1-action-client.ts:2404-2406`, `use-estimate-row-mutations.ts:1044`

**Units:** UNIT-002
**Criteria:** AC-006
**Tests:** TEST-006

### REQ-004: Idempotency and INSERT-shape consistency (P1)

**Outcome:** All write paths into `estimate_sheet_events` use consistent INSERT shapes (19 columns) and the shared `prepareHistoryEventInsert` idempotency helper while preserving characterized transaction and correlation semantics.

**Current behavior:** `reusable-sources/actions.ts:748` writes 17 columns (omits `target_row_id`, `total_delta`). `apply.ts` uses a local `insertEstimateEvent` that doesn't stringify JSON the same way.

**Evidence:** `reusable-sources/actions.ts:748-751`, `apply.ts:939-1004`, `d1-action-client.ts:437-505`

**Units:** UNIT-004
**Criteria:** AC-007, AC-008
**Tests:** TEST-007

### REQ-005: Shared-link event-type alignment (P1)

**Outcome:** AI package-builder event types use the same vocabulary as manual mutations after normalization.

**Current behavior:** Variant spellings (`estimate_row_inserted`, `estimate_row_updated`, `estimate_row_deleted`, `estimate_template_inserted`, `project_estimate_package_applied`).

**Evidence:** `apply.ts:1139,1193,1267,1354,1459,1645,2620`

**Units:** UNIT-003
**Criteria:** AC-009
**Tests:** TEST-008

### REQ-006: Test coverage for restore paths (P1)

**Outcome:** The activity-history node-restore button → handler → tree-swap path is covered by an integration test. D1 restore error branches are covered.

**Current behavior:** Only mock-level tests exist; error branches untested.

**Evidence:** See `08_TEST_COVERAGE_AND_GAPS.md`.

**Units:** UNIT-005
**Criteria:** AC-010, AC-011, AC-012
**Tests:** TEST-009, TEST-010, TEST-011

### REQ-007: Composer and filter additions for missing event types (P1)

**Outcome:** Raw `estimate_nodes_restored` normalizes to the canonical
`nodes_restored` UI event, and `nodes_restored`, `row_component_moved`,
`rows_moved`, `sheet_adjustment_updated`, and
`project_estimate_package_applied` have composer entries, dictionary mappings,
and, where user-relevant, filter options.

**Current behavior:** These event types have no UI representation.

**Evidence:** `activity-composer.ts:268-317`, `activity-copy-dictionary.ts:3-28`, `activity-history.tsx:40-60`

**Units:** UNIT-001
**Criteria:** AC-013
**Tests:** TEST-001, TEST-002

### REQ-008: Shared-link interaction mutation (DEFERRED TO PUBLISHER)

**Outcome:** This pack does not implement public interaction mutation. The
Publisher pack owns owner reply, comment mutation, and decision reset. Activity
only consumes immutable append-only events and tombstones from that contract.

**Current behavior:** None of these features exist.

**Evidence:** See `07_SHARED_LINK_AND_CLIENT_COLLABORATION.md` §8.

**Units:** none (`UNIT-007` is superseded)
**Criteria:** AC-014, AC-015, AC-016
**Tests:** TEST-013, TEST-014, TEST-015

### REQ-009: Concurrent-agent safety (process requirement)

**Outcome:** Implementation units execute without file-scope conflicts when multiple agents work in the shared worktree.

**Current behavior:** Multiple agents may be working in the repo simultaneously.

**Units:** UNIT-001..006 and UNIT-008..012; superseded UNIT-007 performs no work (see `12_COORDINATION_AND_MULTI_AGENT.md`)
**Criteria:** AC-017
**Tests:** TEST-022 (static ownership/diff collision scan)

### REQ-010: Variant and component propagation facts (P1)

**Outcome:** Variant selection and project-component fan-out produce typed,
reconstructable activity facts. A bounded propagation event names every affected
authorized row and before/after fact, and the UI explains the fan-out count.

**Evidence:** `13_VARIANT_AND_COMPONENT_ACTIVITY.md`.
**Units:** UNIT-009
**Criteria:** AC-018, AC-019
**Tests:** TEST-016

### REQ-011: Activity-surface accessibility (P1)

**Outcome:** ActivityHistoryModal entry/return focus and tree keyboard navigation,
ProjectActivityClient ledger semantics, and SharedLinkActivityFeed live announcements,
reflow, contrast, and target sizes satisfy the focused accessibility contract in
`14_ACCESSIBILITY_AUDIT.md`. Public comment/decision accessibility remains a
Publisher-owned delta and receipt.

**Units:** UNIT-010
**Criteria:** AC-020
**Tests:** TEST-017

### REQ-012: Bounded activity reads and rendering (P1)

**Outcome:** Row/node scoped reads are indexed, feed counts and publication reads
are bounded, repeated pages do not create unbounded DOM, and idempotent writes do
not use a racy SELECT-then-INSERT path.

**Units:** UNIT-011
**Criteria:** AC-021
**Tests:** TEST-018

### REQ-013: Actor lifecycle and retention integration (P1)

**Outcome:** Deleted/anonymized actors retain a non-PII label; activity retention,
legal hold, anonymization, purge, export/erasure interaction, and retry semantics
are registered in the existing compliance machinery.

**Units:** UNIT-012
**Criteria:** AC-022
**Tests:** TEST-019

### REQ-014: Mandatory workspace isolation (P0)

**Outcome:** Every activity read/write API requires workspace scope and all
cross-workspace probes fail without leaking IDs, counts, actors, or event facts.

**Units:** UNIT-012
**Criteria:** AC-023
**Tests:** TEST-020

### REQ-015: Durable event writes and reconciliation (P0)

**Outcome:** Domain mutations and required activity facts commit in one D1 batch
or through a durable outbox; retries are idempotent and a scheduled reconciliation
detects and repairs crash-window gaps without fabricating events.

**Units:** UNIT-012
**Criteria:** AC-024
**Tests:** TEST-021

### REQ-016: Audit-log export (DEFERRED)

CSV/JSON/PDF export remains future work. Any later export must preserve workspace
authorization, use an owner-safe data shape distinct from the public PII-minimized
feed, and receive its own execution unit and retention proof.

**Criteria:** AC-025 (N/A for this slice)

### REQ-017: Project-activity repository consolidation (DEFERRED)

The dual `project-activity-repository.ts` and
`project-activity-feed-repository.ts` implementations remain current source.
Consolidation requires a separately scoped future implementation unit with
caller, authorization, pagination, degradation, and compatibility proof; no
current READY unit may perform it. `UNIT-008` is only the tracking verifier that
keeps this deferral explicit and rejects an undeclared consolidation diff.

**Criteria:** AC-026 (N/A for implementation in this slice)

## Acceptance Criteria

| ID | Requirement | Observable criterion | Evidence class |
|---|---|---|---|
| AC-001 | REQ-001 | A row insertion, node creation, tab creation, and tab deletion each produce an event whose composed title is NOT the generic fallback | automated-test |
| AC-002 | REQ-001 | Each entry in `ACTIVITY_FILTER_EVENT_TYPES` returns at least one result when its event type is created | automated-test |
| AC-003 | REQ-001 | The read-side normalization map covers all writable event types from `d1-action-client.ts` and `apply.ts` | automated-test |
| AC-004 | REQ-002 | After bulk row deletion, the Activity History modal shows a Restore button | automated-test |
| AC-005 | REQ-002 | After bulk node deletion, the Activity History modal shows a Restore button | automated-test |
| AC-006 | REQ-003 | `restore_deleted_estimate_rows_with_history` reconstructs and atomically persists the authorized rows from `old_snapshot`; success, write-failure rollback, ID collision, malformed snapshot, cross-workspace denial, explicit batch cap, and idempotent replay all pass focused direct-D1 tests | automated-test |
| AC-007 | REQ-004 | All INSERT sites into `estimate_sheet_events` write 19 columns | automated-test |
| AC-008 | REQ-004 | The reusable-sources INSERT includes `target_row_id` and `total_delta` | automated-test |
| AC-009 | REQ-005 | AI package-builder events normalize to the same vocabulary as manual mutations | automated-test |
| AC-010 | REQ-006 | Integration test renders EstimateSheetContent, clicks node restore, asserts tree swap and feed reload | automated-test |
| AC-011 | REQ-006 | D1 restore collision, empty-snapshot, wrong-event-type, and batch-oversize branches are tested | automated-test |
| AC-012 | REQ-006 | Read-only user gating of restore buttons is tested | automated-test |
| AC-013 | REQ-007 | Raw `estimate_nodes_restored` normalizes to `nodes_restored`, and `nodes_restored`, `row_component_moved`, `rows_moved`, and `sheet_adjustment_updated` render with non-generic copy and user-relevant filter coverage | automated-test |
| AC-014 | REQ-008 | Owner can post a reply comment visible on `/share/[token]` | automated-test |
| AC-015 | REQ-008 | Comment author can delete their own comment | automated-test |
| AC-016 | REQ-008 | Owner can reset a recipient's decision to allow re-decision | automated-test |
| AC-017 | REQ-009 | `TEST-022` proves every changed path has one declared owner, no concurrently leased overlap, and no out-of-scope diff | static ownership/diff test |
| AC-018 | REQ-010 | Variant changes expose typed prior/new variant identity instead of only `source_snapshot_json` | automated-test |
| AC-019 | REQ-010 | Fan-out records bounded authorized affected-row before/after facts and renders the propagated count | automated-test |
| AC-020 | REQ-011 | The ActivityHistoryModal, ProjectActivityClient, and SharedLinkActivityFeed focus, keyboard, semantic, live-region, contrast, reflow, and touch-target matrix passes; Publisher receipt covers public comment/decision UI | DOM/a11y-test + Publisher receipt |
| AC-021 | REQ-012 | Query-plan/count/cardinality and 100/500/5k-event rendering evaluators stay within recorded budgets | benchmark/query-plan |
| AC-022 | REQ-013 | Deleted/anonymized actor and retention/legal-hold/export/erase fixtures preserve audit purpose without PII | automated-test + retention receipt |
| AC-023 | REQ-014 | Cross-workspace reads/writes return denial/not-found and expose no event metadata | automated denial test |
| AC-024 | REQ-015 | Crash between domain mutation and event delivery is prevented or durably reconciled; retries create one event | transaction/outbox test |
| AC-025 | REQ-016 | Deferred export has no executable claim in this slice | N/A |
| AC-026 | REQ-017 | Repository consolidation remains explicitly deferred and `UNIT-008` rejects any undeclared consolidation diff in this slice | N/A + static diff receipt |

## Traceability Matrix

| Req | Source IDs | Unit IDs | AC IDs | Test IDs | Evidence class |
|---|---|---|---|---|---|
| REQ-001 | SRC-001, SRC-002 | UNIT-001, UNIT-006 | AC-001, AC-002, AC-003 | TEST-001..003, TEST-012 | automated-test |
| REQ-002 | SRC-001 | UNIT-001, UNIT-002 | AC-004, AC-005 | TEST-004, TEST-005 | automated-test |
| REQ-003 | SRC-001 | UNIT-002 | AC-006 | TEST-006 | automated-test |
| REQ-004 | SRC-001, SRC-003 | UNIT-004 | AC-007, AC-008 | TEST-007 | automated-test |
| REQ-005 | SRC-004 | UNIT-003 | AC-009 | TEST-008 | automated-test |
| REQ-006 | SRC-005 | UNIT-005 | AC-010, AC-011, AC-012 | TEST-009..011 | automated-test |
| REQ-007 | SRC-002, SRC-004 | UNIT-001 | AC-013 | TEST-001, TEST-002 | automated-test |
| REQ-008 | SRC-006 | — (`UNIT-007` superseded; Publisher owns execution) | AC-014, AC-015, AC-016 | TEST-013..015 (SKIPPED here) | Publisher receipt |
| REQ-009 | SRC-007 | UNIT-001..006, UNIT-008..012 | AC-017 | TEST-022 | static ownership/diff test |
| REQ-010 | SRC-008 | UNIT-009 | AC-018, AC-019 | TEST-016 | automated-test |
| REQ-011 | SRC-009 | UNIT-010 | AC-020 | TEST-017 | DOM/a11y-test |
| REQ-012 | SRC-010 | UNIT-011 | AC-021 | TEST-018 | benchmark/query-plan |
| REQ-013 | SRC-011 | UNIT-012 | AC-022 | TEST-019 | retention receipt |
| REQ-014 | SRC-011 | UNIT-012 | AC-023 | TEST-020 | denial test |
| REQ-015 | SRC-001, SRC-011 | UNIT-012 | AC-024 | TEST-021 | transaction/outbox test |
| REQ-016 | SRC-011 | — | AC-025 | — | N/A |
| REQ-017 | SRC-003 | UNIT-008 (tracking verifier only) | AC-026 | — | N/A + static diff receipt |
