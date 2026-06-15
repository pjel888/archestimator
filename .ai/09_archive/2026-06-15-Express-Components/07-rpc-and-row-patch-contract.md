---
title: Express Components RPC And Row Patch Contract
type: docs
date: 2026-06-15
---

# Express Components RPC And Row Patch Contract

This is the implementation contract for insert, update, unlink, and promotion. It supersedes earlier wording that implied U3 requires an update-RPC migration or that JSON fields are always overwritten.

## Scope

Covered surfaces:

- `insert_estimate_row_item_with_history`
- `update_estimate_row_item_with_history`
- `replace_estimate_row_item_with_history`
- `unlink_estimate_row_item_from_library_with_history`
- `insert_estimate_subtree_into_estimate_with_history`
- estimate-template copy RPC in `20260612094734_estimate_tabs_foundation.sql`
- `create_cost_library_component`
- new `promote_express_row_to_library_component`
- `insertEstimateRowItemFromLibrary`
- `updateEstimateRowItem`
- `replaceEstimateRowItemWithLibrary`
- `getEstimateRowMetadata`
- `getValidatedEstimateRow`

## Field Key Map

| User concept | App/domain field | RPC patch key | DB column / JSON path | Notes |
| --- | --- | --- | --- | --- |
| Name | `material` | `material` | `material` | NOT NULL; express default must not equal the legacy blank label. |
| Description | `description` | `description` | `description` | NOT NULL; empty string allowed. |
| Supplier text | `supplier` | `supplier` | `supplier` | `supplier_id` remains separate. |
| Supplier id | `supplierId` | `supplierId` | `supplier_id` | Optional FK; first pass may leave null. |
| Unit | `unit` | `unit` | `unit` | Default `unit`. |
| Unit cost | `itemCost` in some UI code | `unitCost` | `unit_cost` | Canonical RPC key is `unitCost`. |
| Misc cost | `miscCost` | `miscCost` | `misc_cost` | Numeric. |
| Quantity | `quantity` | `quantity` | `quantity` | Numeric. |
| Contingency | `contingencyPercentage` | `contingencyPercentage` | `contingency_percentage` | Do not call this adjustment in contracts. |
| Discipline | `discipline` | `discipline` | `discipline` | Express default is `Unspecified`. |
| Designation | `designation` | `designation` | `designation` | Express default is empty string. |
| Category | `categoryNodeId` | `categoryNodeId` | `category_node_id` | Express default is null; charts/proposals use existing Uncategorized fallback. |
| Link state | `linkState` | `linkState` | `link_state` | Existing enum. |
| Source library id | `sourceLibraryItemId` | `sourceLibraryItemId` | `source_library_item_id` | Null for express until promotion. |
| Image/provenance | `sourceSnapshot` | `sourceSnapshot` | `source_snapshot.imageUrl`, category/supplier provenance | Must be complete when sent. |
| Express identity | `metadata.expressComponent` | `metadata` | `metadata.expressComponent` | Must be selected/mapped to client. |

## Update Contract

The live update RPC already accepts every express field above. U3 is app-layer work:

- widen `UpdateEstimateRowItemInput`
- widen optimistic patch generation and tree patching
- widen `UpdateEstimateRowItemResult` and result readers
- widen current-row validation reads only when server-side JSON merge is needed
- preserve `expected_row_revision`

No migration is required for routine express field updates.

## JSON Semantics

The RPC preserves a JSON column when the patch omits the key:

- omit `metadata` -> existing `metadata` remains
- omit `sourceSnapshot` -> existing `source_snapshot` remains

The RPC replaces a JSON column when the top-level key is sent. Therefore:

- name, description, supplier, unit, unitCost, miscCost, quantity, discipline, designation, and category edits must omit `metadata` and `sourceSnapshot`
- image set/clear, promotion relink, detach/provenance changes, and express metadata changes must server-merge against the current values before sending a complete JSON object
- the server-action merge path must read current `metadata` and `source_snapshot` in `getValidatedEstimateRow` or a dedicated loader
- `src/lib/ai/package-builder/apply.ts` is a write surface, not just read blast radius. Any row replacement payload touching express rows must either server-merge the existing `metadata.expressComponent` and source snapshot keys or explicitly skip/block express replacement. A wholesale `metadata` payload that drops express identity is a release blocker.

`replace_estimate_row_item_with_history` is not the same contract. It replaces `metadata` and `source_snapshot` from the payload, and omitted `sourceSnapshot` can persist as null. Therefore every express-aware replace path must choose one of two behaviors before release:

- server-merge/carry the current row's `metadata.expressComponent` and required `source_snapshot` keys before calling the replace RPC, using a widened `getValidatedEstimateRow` or dedicated loader that selects both JSON blobs; or
- block replace/move operations for express rows with explicit copy until a merge path exists.

The owner files are `replaceEstimateRowItemWithLibrary`, `getEstimateRowMetadata`, `replace_estimate_row_item_with_history`, and the current-row validation SELECT. U8 and Q50 own the round-trip reload proof.

## Insert Contract

`insert_estimate_row_item_with_history` already returns a row snapshot including `rowRevision` and is idempotent by `correlation_id`. The app action currently discards that data; implementation must return it.

Express insert payload:

- non-placeholder `material`
- `sourceLibraryItemId = null`
- `linkState = "unlinked"`
- `unit = "unit"` unless the UI selected another
- `quantity = 1`
- `unitCost = 0`
- `miscCost = 0`
- `discipline = "Unspecified"`
- `designation = ""`
- `categoryNodeId = null`
- `metadata.expressComponent.kind = "express"`
- `metadata.expressComponent.id` as UUIDv4 row-lifetime identity
- `metadata.tags` does not include `manual-row-placeholder`
- project-source/template/reusable-source copy must create a fresh `metadata.expressComponent.id`; current copy RPCs do not do this yet

History migration:

- classify `row_blank_added` only when material equals the legacy blank label and/or `metadata.tags` contains `manual-row-placeholder`
- express rows use `row_added` unless a new composer-backed event is deliberately added
- existing historical events are forward-compatible and not retroactively rewritten

Sort order:

- Day-0 must not compute final `sort_order` outside the database lock without a retry plan. Preferred: the insert RPC allocates the next sibling `sort_order` while holding the node/parent lock. Acceptable fallback: on deferred `(node_id, sort_order)` collision, the app action retries the full insert with the same `correlation_id`, no duplicate draft row, and fresh sibling order.

## Copy/Rekey Contract

Project-source and template copy currently rekey row ids but preserve row metadata verbatim. Express copy work must update both:

- `insert_estimate_subtree_into_estimate_with_history` in the project-source subtree copy path.
- The estimate-template copy RPC body in `20260612094734_estimate_tabs_foundation.sql`.

Preferred implementation: inside the copy RPC, when `metadata.expressComponent.kind = "express"`, merge a fresh UUIDv4 into `metadata.expressComponent.id` while preserving `kind`, `createdFrom`/provenance, and other express metadata. Use `jsonb_set` or equivalent JSON construction in SQL, not a post-copy client mutation that can race with reload/history.

Required proof:

- Q14 proves copied express rows get fresh row ids and fresh express ids.
- Q51 copies the same express source into two targets and proves no express id collision.
- U8 names both copy RPCs as mutator surfaces; no plan section may describe rekey-on-copy as already implemented until those tests pass.

## Unlink Contract

`unlink_estimate_row_item_from_library_with_history` expects a linked row. The caller inserts or starts from a linked row, then calls unlink; the RPC clears `source_library_item_id`, sets `link_state = "detached"`, and records detach metadata. Do not clear the source id before calling unlink.

## Promotion Contract

Fast-follow promotion uses a new `promote_express_row_to_library_component` RPC. The app must not ship create-then-relink as two independent transactions.

Inputs:

- workspace id
- project id
- estimate id
- row id
- expected row revision
- target library folder id
- promotion correlation id
- acting user id

Preconditions and authorization:

- caller can edit the estimate
- caller has the same workspace-library write role required by existing folder/item writes for the target workspace. For this plan, choose parity with current library-write behavior: `is_workspace_editor(folder_workspace_id)` or the exact policy-equivalent check, even though that helper is member-inclusive in this project. Do not invent a stricter editor/admin predicate while also claiming policy parity. If product wants promotion stricter than direct library creation, supersede this plan with a new decision and update permission copy/tests.
- row is express and not already promoted, or the same correlation id is retrying
- material/name is non-empty
- target folder exists, belongs to the same target workspace, and is writable by the caller under the exact library-folder policy
- exactly one default price option is created
- a promotion correlation id is persisted on the created library item or metadata with a unique workspace-scoped lookup so retry can return the prior item before insert

SECURITY DEFINER migration requirements:

- set `search_path` explicitly
- `REVOKE ALL ON FUNCTION promote_express_row_to_library_component(...) FROM PUBLIC`
- grant execute only to the authenticated/API role pattern used by existing mutation RPCs
- perform all estimate, workspace, and folder authorization inside the function, not just in the caller
- return no row labels or folder data when authorization fails

Effects in one transaction:

- lock the source row
- create `cost_library_items`
- create default `cost_library_item_price_options` with every NOT NULL field populated, including `item_id`, `workspace_id`, `label`, `currency`, unit/cost fields, active/default flags, and provenance/source fields required by the current schema
- write provenance, promotion ids, and promotion correlation id to metadata or a dedicated column/index chosen by the migration
- write source snapshot
- set `source_library_item_id`
- set `link_state = "linked-clean"` unless post-promotion edit policy chooses otherwise
- emit history
- return `{ libraryItemId, activePriceOptionId, row }`

Retry with the same promotion correlation id returns the prior created library item and row rather than creating another.

Cache fan-out after success:

- update or invalidate the active estimate-sheet row query for the estimate/tab from the returned row
- invalidate `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` so both the lite in-estimate panel query and full component-library rows/editor datasets refresh
- invalidate active library route datasets that render folders/items for the target workspace
- refresh the Project folder projection if the promoted row should leave the Express group or show linked/promoted state

## Migration Ledger

| Unit | Migration? | Reason |
| --- | --- | --- |
| U1 express read path | No | SELECT/mapper/type/app work. |
| U2 insert return/draft | No for return/draft; yes for history classification | The RPC already returns row data; classification is SQL. |
| U3 update widening | No | Live update RPC already accepts keys. |
| U4 editor | No | UI/action work, unless image upload is added. |
| U6 projection | No new table | Query/action/UI work. |
| U7 promotion | Yes | New atomic promotion RPC. |
| Storage upload | Yes if added | Requires bucket/RLS policy work; not in first pass. |
