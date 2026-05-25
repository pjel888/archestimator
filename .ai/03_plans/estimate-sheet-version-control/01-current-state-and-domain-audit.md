# 01 Current State and Domain Audit

> Historical context notice: this document was written before implementation and before the Activity-only pivot. Use `18-current-activity-contract.md` for the current supported UX/API contract.

## Current Route and Read Path

The target route is `/workshop/projects/[projectId]/estimates/[nodeId]`. The current live route loads project-scoped `estimate_nodes` and `estimate_row_items` and passes them into `EstimateSheetTree` and `EstimateSheetContent`; `.ai/06_specs/live-project-estimate-bootstrap.md:23-41` records that row CRUD and inline edits already persist through project-scoped server actions with optimistic local/cache rollback.

`getProjectEstimateTreeByEstimate()` reads `estimate_nodes` and `estimate_row_items` from Supabase, then `buildEstimateTree()` projects rows under Area nodes. Current code evidence:

- `src/lib/repositories/workspace-repository.ts:198` maps `estimate_row_items` rows into UI rows, including `misc_cost`, `category_node_id`, `supplier_id`, `source_snapshot`, component version fields, and pricing metadata.
- `src/lib/repositories/workspace-repository.ts:242` groups row items by `node_id` and builds the visible estimate tree.
- `src/lib/repositories/workspace-repository.ts:311` fetches the live nodes and rows for a project-scoped estimate.

## Current Row Mutation Path

`EstimateSheetContent` is the client orchestration point. It gets `insertRow`, `replaceRow`, `deleteRow`, and `updateRow` from `useEstimateRowMutations()` at `src/components/workshop/EstimateSheetContent.tsx:1188`.

Current row lifecycle:

- Add row: `insertLibraryItem()` inserts only into Area nodes, clones the library/manual template into local tree state, creates editable row state, and calls `insertEstimateRowItemFromLibrary()` with rollback (`src/components/workshop/EstimateSheetContent.tsx:1350`, `src/lib/estimates/actions.ts:990`).
- Blank row: `insertBlankRow()` delegates to `insertLibraryItem()` with the placeholder template (`src/components/workshop/EstimateSheetContent.tsx:1441`).
- Replace row source: `replaceRowItem()` preserves current editable quantity and misc values, swaps source/material/library metadata optimistically, then calls `replaceEstimateRowItemWithLibrary()` (`src/components/workshop/EstimateSheetContent.tsx:1483`, `src/lib/estimates/actions.ts:1079`).
- Update row values: `updateRowItem()` commits quantity/misc-cost edits (`src/components/workshop/EstimateSheetContent.tsx:1335`); `useEstimateRowMutations()` patches the TanStack `areaTree` cache with per-row operation ids (`src/hooks/use-estimate-row-mutations.ts:136`); the server action updates `quantity`, `misc_cost`, and forces `link_state = linked-overridden` (`src/lib/estimates/actions.ts:1051`).
- Delete row: `deleteRowItem()` removes local tree/editable state and calls `deleteEstimateRowItem()`; the server deletes by scoped row id and estimate id (`src/components/workshop/EstimateSheetContent.tsx:1512`, `src/lib/estimates/actions.ts:1110`).

## Current Row and Header UI Shape

`EstimateRowItemsTable()` is a local function inside `EstimateSheetContent.tsx` (`src/components/workshop/EstimateSheetContent.tsx:584`). Its row grid is `grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_92px_108px_30px]` (`src/components/workshop/EstimateSheetContent.tsx:629`).

The last 30px action column contains plain `Button` icons for Drag, Expand, and Delete (`src/components/workshop/EstimateSheetContent.tsx:767-795`). There is no row-level `ContextMenu`, `ActionMenuGroup`, or dropdown surface today. The context/action menu pattern exists in `EstimateSheetTree.tsx` for tree node actions, not row items.

The row Expand button is currently only an icon button with an `aria-label`; it has no `onClick`, no row-details state, and no existing drawer/modal/panel to extend (`src/components/workshop/EstimateSheetContent.tsx:777-785`). Row history therefore requires building a new row details/history surface, not just adding a tab to an existing one.

`EstimateSheetHeader()` is also a local function inside `EstimateSheetContent.tsx` (`src/components/workshop/EstimateSheetContent.tsx:1131`). It is not exported as a reusable component. Adding a sheet-level version/history affordance means changing local props/state inside `EstimateSheetContent.tsx` or deliberately extracting this header as a separate component.

## Existing Version Label and Sheet Code Behavior

The estimate route already computes a version label from `estimate.metadata`: `readEstimateVersionLabel()` checks `versionNumber`, `version_number`, `version`, `revisionNumber`, and `revision_number`, then defaults to `V1` (`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:14-24`). That value is published to the metadata strip and passed into proposal export preview metadata (`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:36-50`).

The proposal export API repeats the same pattern through `readVersionLabel()` and uses it in the generated workbook model (`src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:15-25`, `:63-73`).

`estimates.sheet_code` is already the estimate sheet identifier, with edit/regenerate flows in `updateEstimateDetails()` and `regenerateEstimateSheetCode()` (`src/lib/estimates/actions.ts:782`, `:804`). Named version numbers must not reuse or blur this sheet-code meaning.

## Existing Snapshot and Restore Ingredients

`getSourceSnapshot()` already serializes source context for inserted/replaced rows, including category, category node/path, component version, price option, lifecycle state, supplier, supplier id, tags, taxonomy version, unit cost, misc cost, and currency (`src/lib/estimates/actions.ts:223-247`).

`getEstimateRowMetadata()` already serializes row metadata for component/category/supplier identity (`src/lib/estimates/actions.ts:249-260`).

`duplicateEstimateSheet()` is the exact restore-as-copy pattern to mirror: it creates a new estimate, inserts copied nodes with remapped parent ids, then inserts rows with fresh ids and remapped node ids while preserving `category_node_id`, `designation`, `discipline`, `link_state`, `metadata`, `source_snapshot`, supplier fields, unit, and costs (`src/lib/estimates/actions.ts:670-779`).

## Current Sheet/Tree Mutation Paths Beyond Rows

Version history must also account for sheet/tree actions:

- `reorderEstimateTreeNodes()` validates and calls the `reorder_estimate_nodes` RPC (`src/lib/estimates/actions.ts:552-625`).
- `insertEstimateTemplateIntoEstimate()` calls the existing `insert_estimate_template_into_estimate` RPC and then revalidates paths (`src/lib/estimates/actions.ts:961-987`).
- `updateEstimateDetails()` updates estimate name and/or `sheet_code` (`src/lib/estimates/actions.ts:782-801`).
- `regenerateEstimateSheetCode()` generates and writes a new `sheet_code` (`src/lib/estimates/actions.ts:804-819`).
- `deleteEstimateNode()` uses `planEstimateTreeDelete()` before deleting a node, so deleting a Group can cascade to child nodes and their rows (`src/lib/estimates/actions.ts:929-959`).

## Current Schema

The core `public.estimate_row_items` table was created in `supabase/migrations/20260518090000_archestimator_core_schema.sql:96`. It has UUID identity, `estimate_id`, `node_id`, `sort_order`, source snapshot/link fields, cost fields, metadata, timestamps, and unique `(node_id, sort_order)`.

RLS is already enabled for estimate rows (`supabase/migrations/20260518090000_archestimator_core_schema.sql:199`) and workspace member management policy exists at `supabase/migrations/20260518090000_archestimator_core_schema.sql:256`.

Later migrations added taxonomy/supplier columns and indexes (`supabase/migrations/20260522064018_component_library_taxonomy_source.sql:35`) and a constraint trigger enforcing that row items attach only to Area nodes (`supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql:152`).

## Existing Versioning Concepts

`.ai/06_specs/project-estimate-versioning-system.md:47-123` already separates autosave history, named estimate versions, issued proposal snapshots, library versioning, and project-level timelines. This plan should narrow that broad spec into the active estimate sheet implementation.

The closest implemented pattern is component-library versioning:

- `supabase/migrations/20260523120957_component_library_item_versioning.sql:1` describes append-only component creation, pricing options, lifecycle states, and history.
- `supabase/migrations/20260523120957_component_library_item_versioning.sql:26` creates full component version rows.
- `supabase/migrations/20260523120957_component_library_item_versioning.sql:62` and `:75` create price/state history tables.
- `tests/vitest/component-library-versioning-schema.test.ts:19` verifies schema, RPCs, backfill, repository/actions/types/UI wiring.

## Important Current Contracts To Preserve

- Spreadsheet-like editing: no visible row-level save-pill layout shift; quantity/Misc Cost commits remain optimistic and rollback-scoped.
- Replacement is an update of the same row id, not delete/reinsert.
- Existing estimate rows preserve copied component snapshots; component library changes do not silently mutate them.
- Area nodes are the only row owners.
- Current project charts read directly from `estimate_row_items` through `loadRowFacts()` (`src/lib/repositories/project-charts-repository.ts:125-132`); historical version tables must not become chart inputs.
- Proposal export is currently generated from the estimate model, but stable issued export records are deferred (`.ai/03_plans/industry-standard-excel-proposal-export/02-export-domain-model-and-consolidation.md:415-433`).
