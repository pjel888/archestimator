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
- `unlink_estimate_row_item_from_library_with_history`
- `create_cost_library_component`
- new `promote_express_row_to_library_component`
- `insertEstimateRowItemFromLibrary`
- `updateEstimateRowItem`

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
- project-source/template/reusable-source copy creates a fresh `metadata.expressComponent.id`; it does not preserve another row's express id

History migration:

- classify `row_blank_added` only when material equals the legacy blank label and/or `metadata.tags` contains `manual-row-placeholder`
- express rows use `row_added` unless a new composer-backed event is deliberately added
- existing historical events are forward-compatible and not retroactively rewritten

Sort order:

- Day-0 must not compute final `sort_order` outside the database lock without a retry plan. Preferred: the insert RPC allocates the next sibling `sort_order` while holding the node/parent lock. Acceptable fallback: on deferred `(node_id, sort_order)` collision, the app action retries the full insert with the same `correlation_id`, no duplicate draft row, and fresh sibling order.

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
- caller has the same workspace-library write role required by existing folder/item writes for the target workspace. Do not rely on a helper named `is_workspace_editor` if it grants plain member writes in this project; either use an existing strict admin/editor predicate or define the RPC's local role check to match the current library write policies exactly.
- row is express and not already promoted, or the same correlation id is retrying
- material/name is non-empty
- target folder exists, belongs to the same target workspace, and is writable by the caller under the exact library-folder policy
- exactly one default price option is created

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
- write provenance and promotion ids to metadata
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
