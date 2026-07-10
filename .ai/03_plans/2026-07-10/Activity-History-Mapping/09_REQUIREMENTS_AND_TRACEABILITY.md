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

**Units:** UNIT-001
**Criteria:** AC-001, AC-002, AC-003
**Tests:** TEST-001, TEST-002, TEST-003

### REQ-002: Bulk-delete event type and restore guard alignment (P0)

**Outcome:** Bulk-deleted rows and nodes must show restore buttons in the Activity History modal.

**Current behavior:** Writer emits `rows_deleted` / `estimate_nodes_deleted`, but restore guards expect `rows_bulk_deleted` / `nodes_bulk_deleted_with_children`. Restore buttons never appear for bulk deletions.

**Evidence:** `activity-history.tsx:220-221`, `d1-action-client.ts:1493,2060`

**Units:** UNIT-001, UNIT-002
**Criteria:** AC-004, AC-005
**Tests:** TEST-004, TEST-005

### REQ-003: D1 row restore implementation (P1)

**Outcome:** `restore_deleted_estimate_rows_with_history` must either be implemented or removed from the dispatch table and the UI path reconciled.

**Current behavior:** Hard-coded throw at `d1-action-client.ts:2404-2406`.

**Evidence:** `d1-action-client.ts:2404-2406`, `use-estimate-row-mutations.ts:1044`

**Units:** UNIT-002
**Criteria:** AC-006
**Tests:** TEST-006

### REQ-004: Idempotency and INSERT-shape consistency (P1)

**Outcome:** All write paths into `estimate_sheet_events` use consistent INSERT shapes (19 columns) and the shared idempotency helper where practical.

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

**Outcome:** `estimate_nodes_restored`, `row_component_moved`, `rows_moved`, `sheet_adjustment_updated`, `project_estimate_package_applied` have composer entries, dictionary mappings, and (where applicable) filter options.

**Current behavior:** These event types have no UI representation.

**Evidence:** `activity-composer.ts:268-317`, `activity-copy-dictionary.ts:3-28`, `activity-history.tsx:40-60`

**Units:** UNIT-006
**Criteria:** AC-013
**Tests:** TEST-012

### REQ-008: Shared-link interaction completeness (P2)

**Outcome:** Owner can reply to client comments on the public surface. Comments can be edited/deleted. Decisions can be reset by owner.

**Current behavior:** None of these features exist.

**Evidence:** See `07_SHARED_LINK_AND_CLIENT_COLLABORATION.md` §8.

**Units:** UNIT-007
**Criteria:** AC-014, AC-015, AC-016
**Tests:** TEST-013, TEST-014, TEST-015

### REQ-009: Concurrent-agent safety (process requirement)

**Outcome:** Implementation units execute without file-scope conflicts when multiple agents work in the shared worktree.

**Current behavior:** Multiple agents may be working in the repo simultaneously.

**Units:** All units (see `12_COORDINATION_AND_MULTI_AGENT.md`)
**Criteria:** AC-017
**Tests:** N/A (process)

## Acceptance Criteria

| ID | Requirement | Observable criterion | Evidence class |
|---|---|---|---|
| AC-001 | REQ-001 | A row insertion, node creation, tab creation, and tab deletion each produce an event whose composed title is NOT the generic fallback | automated-test |
| AC-002 | REQ-001 | Each entry in `ACTIVITY_FILTER_EVENT_TYPES` returns at least one result when its event type is created | automated-test |
| AC-003 | REQ-001 | The read-side normalization map covers all writable event types from `d1-action-client.ts` and `apply.ts` | automated-test |
| AC-004 | REQ-002 | After bulk row deletion, the Activity History modal shows a Restore button | automated-test |
| AC-005 | REQ-002 | After bulk node deletion, the Activity History modal shows a Restore button | automated-test |
| AC-006 | REQ-003 | `restore_deleted_estimate_rows_with_history` either completes successfully or is removed with the UI path reconciled | automated-test |
| AC-007 | REQ-004 | All INSERT sites into `estimate_sheet_events` write 19 columns | automated-test |
| AC-008 | REQ-004 | The reusable-sources INSERT includes `target_row_id` and `total_delta` | automated-test |
| AC-009 | REQ-005 | AI package-builder events normalize to the same vocabulary as manual mutations | automated-test |
| AC-010 | REQ-006 | Integration test renders EstimateSheetContent, clicks node restore, asserts tree swap and feed reload | automated-test |
| AC-011 | REQ-006 | D1 restore collision, empty-snapshot, wrong-event-type, and batch-oversize branches are tested | automated-test |
| AC-012 | REQ-006 | Read-only user gating of restore buttons is tested | automated-test |
| AC-013 | REQ-007 | `estimate_nodes_restored`, `row_component_moved`, `rows_moved`, `sheet_adjustment_updated` render with non-generic copy | automated-test |
| AC-014 | REQ-008 | Owner can post a reply comment visible on `/share/[token]` | automated-test |
| AC-015 | REQ-008 | Comment author can delete their own comment | automated-test |
| AC-016 | REQ-008 | Owner can reset a recipient's decision to allow re-decision | automated-test |
| AC-017 | REQ-009 | No file-scope conflicts during implementation | process |

## Traceability Matrix

| Req | Source IDs | Unit IDs | AC IDs | Test IDs | Evidence class |
|---|---|---|---|---|---|
| REQ-001 | SRC-001, SRC-002 | UNIT-001 | AC-001, AC-002, AC-003 | TEST-001..003 | automated-test |
| REQ-002 | SRC-001 | UNIT-001, UNIT-002 | AC-004, AC-005 | TEST-004, TEST-005 | automated-test |
| REQ-003 | SRC-001 | UNIT-002 | AC-006 | TEST-006 | automated-test |
| REQ-004 | SRC-001, SRC-003 | UNIT-004 | AC-007, AC-008 | TEST-007 | automated-test |
| REQ-005 | SRC-004 | UNIT-003 | AC-009 | TEST-008 | automated-test |
| REQ-006 | SRC-005 | UNIT-005 | AC-010, AC-011, AC-012 | TEST-009..011 | automated-test |
| REQ-007 | SRC-002 | UNIT-006 | AC-013 | TEST-012 | automated-test |
| REQ-008 | SRC-006 | UNIT-007 | AC-014, AC-015, AC-016 | TEST-013..015 | automated-test |
| REQ-009 | SRC-007 | ALL | AC-017 | — | process |
