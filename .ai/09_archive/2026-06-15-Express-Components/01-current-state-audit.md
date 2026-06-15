---
title: Express Components Current State Audit
type: docs
date: 2026-06-15
---

# Express Components Current State Audit

## Add Row Flow

The current `Add row` affordance creates an unlinked manual placeholder row through the same path as library insertion.

- `src/components/workshop/estimate-sheet/rows/drop-zones.tsx:36` renders `QuietAddRowButton`; its click calls `onAddBlankRow(nodeId)`.
- `src/components/workshop/EstimateSheetContent.tsx:1960` implements `insertBlankRow` by calling `insertLibraryItem(targetNodeId, createBlankEstimateRowTemplate())`.
- `src/components/workshop/EstimateSheetContent.tsx:220` builds the placeholder template with material `Drag or add a component here`, app-derived `source: "project"`, unit `unit`, zero cost, and tag `manual-row-placeholder`. The live row table has no `category` column; the persisted grouping fields are `discipline`, `designation`, and `category_node_id`.
- `src/components/workshop/EstimateSheetContent.tsx:1700` optimistically clones and appends the row, then calls `insertRow` with the original template payload.
- `src/hooks/use-estimate-row-mutations.ts:156` persists insertion through `insertEstimateRowItemFromLibrary`.
- `src/lib/estimates/actions.ts:2493` validates the target node, calculates sort order, writes `sourceSnapshot`, `sourceLibraryItemId`, row fields, and `linkState` into the `insert_estimate_row_item_with_history` RPC.
- Current authorization gap to fix before express writes ship: `assertCanEditEstimate` exists and is used by sibling estimate actions, but the row insert/update/replace actions that express will use do not call it today. The SECURITY DEFINER row RPCs resolve workspace membership and bypass table-write RLS, so viewer blocking must be added at the action layer or inside the RPC before R14/AE10 can be true.

The existing tests encode this behavior:

- `tests/vitest/estimate-sheet-library-insert.test.tsx:247` asserts clicking the Add row button sends an unlinked manual row template.
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx:220` asserts keyboard activation creates the blank component slot.
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx:230` asserts persisted blank rows render as placeholders without thumbnail fallbacks.

## Material Cell Shape

The material cell is currently display-first. It supports drop/replace, clear, project-specific conversion, details, and component drag, but it does not edit name, description, unit, or unit cost inline.

- `src/components/workshop/estimate-sheet/rows/cells.tsx:179` renders the placeholder blank slot when `isBlankEstimateRowItem(item)` is true.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:201` computes the project-specific badge/action.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:217` renders the action rail for project-specific, delete, details, and drag.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:276` renders the `Project-specific` badge after detach.
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:212` renders `EstimateMaterialCell` in the material column.
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:240`, `:272`, and `:332` edit quantity, adjustment, and misc cost only.

The row table memoization and virtualization depend on stable item identities:

- `src/components/workshop/estimate-sheet/rows/row-table.tsx:61` compares row table props by array and per-row editable state.
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:88` fixes the grid columns.
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:182` renders each row as a CSS grid.

## Update Contract

The current update path is too narrow for express component authoring.

- `src/hooks/use-estimate-row-mutations.ts:49` allows only `quantity`, `contingencyPercentage`, and `miscCost`.
- `src/hooks/use-estimate-row-mutations.ts:70` builds optimistic patches for those same numeric fields.
- `src/hooks/use-estimate-row-mutations.ts:220` queues numeric row updates per row.
- `src/lib/estimates/actions.ts:80` defines the server action input with only numeric row fields.
- `src/lib/estimates/actions.ts:2561` forwards only numeric row fields into `update_estimate_row_item_with_history`.
- The latest `update_estimate_row_item_with_history` body already supports `sourceSnapshot` and `metadata` in the underlying row patch, so the RPC can carry richer row edits if the app action widens the contract safely.

Express editing needs an app-layer typed patch that can update `material`, `description`, `supplier`, `unit`, `unitCost`/`unit_cost`, `miscCost`, `discipline`, `designation`, `categoryNodeId`, `supplierId`, optional `sourceSnapshot.imageUrl`, and express metadata while preserving the current revision and history contract. The live update RPC already accepts these keys; the current narrowing is in the server-action input, mutation hook, optimistic patch, result reader, and row mapping.

The row replace path is different from the routine update path. `replaceEstimateRowItemWithLibrary` builds new metadata from the replacement library item, and the replace RPC wholesale overwrites `metadata` and `source_snapshot`. That is a current clobber surface for express identity and must be handled by U8, not assumed safe because the client object spread preserves visible fields.

## Project-Specific Icon Bug Surface

The current project-specific action appears only when `canMakeProjectSpecific` returns true.

- `src/components/workshop/estimate-sheet/rows/cells.tsx:75` treats `linkState === "detached"` as project-specific.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:79` hides the action for blank or already detached rows.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:81` shows the action only if `sourceLibraryItemId` is present or `linkState` is linked/source-changed.
- `src/hooks/use-estimate-row-mutations.ts:171` optimistically detaches by patching the query tree with `source: "project"`, `sourceLibraryItemId: null`, and `linkState: "detached"`.
- `src/components/workshop/EstimateSheetContent.tsx:2068` opens a confirmation dialog only after `canMakeProjectSpecific(rowItem)` passes.

The reported "icon only appears on the second instance" bug is not yet reproduced against a real DB-backed project. The old candidate failure modes are hypotheses, not root cause:

- The first inserted component lacks `sourceLibraryItemId` or a linked `linkState` in the client payload, so the action gate fails.
- The optimistic insert uses a cloned row locally but passes the un-cloned `libraryItem` to the action, creating a payload/reconciled-row mismatch.
- A project-source copied row keeps an original row id or unlinked source state before insertion, confusing row keys or link-state checks.
- The query key updated by the detach mutation differs from the visible tree query key for tabbed estimates.

The first U5 deliverable is a failing reproduction or a written non-reproduction record. It must capture both duplicate instances' `source_library_item_id`, `link_state`, client `sourceLibraryItemId`, client `linkState`, insertion entrypoint, and visible action state. If DB-backed duplicates already pass, U5 becomes normalization hardening for malformed fixtures/seed rows and not a claimed production bug fix. The regression target remains: two instances of the same library component both show the make-project-specific action before detach, and the first becomes detached immediately after confirmation without needing a second instance.

## Components Tab State

The Components route loads workspace library components, not project-local rows.

- `src/components/workshop/library/LibraryComponentsRoute.tsx:9` loads `getCurrentWorkspaceComponentRowsLibrary()`.
- `src/components/workshop/LibraryPageClient.tsx:86` stores the component rows library in the `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` TanStack cache.
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1062` receives `libraryFolders` and `libraryItems`.
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1146` builds the folder tree from `library_folders`.
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:189` adds the synthetic `All Components` root.
- `src/lib/component-library/library-folder-reorder.ts:10` limits real folder kinds to `taxonomy` and `custom`.

Project sources already exist in the Templates tree, not the Components tree:

- `src/components/workshop/component-library/tree/TemplatesTree.tsx:404` builds template and project-source sections.
- `src/components/workshop/component-library/tree/TemplatesTree.tsx:423` appends the project-source tree when project sources are present.
- `src/components/workshop/component-library/tree/TemplatesTree.tsx:479` dedupes checked project-source targets.
- `src/components/workshop/component-library/tree/TemplatesTree.tsx:524` returns checked project-source row items.

The workspace Components tab currently has no project context. Adding a virtual Project folder is net-new plumbing, not just a guarded render. The plan must choose either a project query/context path through `app/workshop/library/components/page.tsx` and `LibraryComponentsRoute`, or an estimate-side component-library surface that already has `projectId`. In both cases, project rows must not be stored in `library_folders` unless the product decides project-local reusable components are a separate persisted catalog.

## Live Supabase State

Read-only provider checks against Archestimator project `ebxxqidacheyapmmzavr` confirmed:

- `estimate_row_items`, `cost_library_items`, `cost_library_item_price_options`, and `library_folders` all have RLS enabled.
- `estimate_row_items` policies use `can_access_estimate(estimate_id)` for reads and `can_edit_estimate(estimate_id)` for writes.
- `cost_library_items` policies use workspace membership for reads and workspace editor/admin checks for writes.
- `library_folders` policies are workspace-scoped.
- `estimate_row_items` already contains `source_library_item_id`, `source_snapshot`, `material`, `description`, `supplier`, `unit`, `unit_cost`, `misc_cost`, `link_state`, `metadata`, and `row_revision`.
- It also contains `discipline`, `designation`, `category_node_id`, `supplier_id`, and `contingency_percentage`. `source` is derived by app mapping and is not a column.
- The live insert RPC returns the persisted row snapshot, including `rowRevision`, and is idempotent by `correlation_id`; the current app action discards that result.
- The live update RPC preserves `metadata` and `source_snapshot` when the patch omits those keys; it replaces a JSON value only when that top-level key is sent.
- Live data includes 29 legacy source-less `unlinked` rows and two source-less rows with another link state. Compatibility is concrete, not hypothetical.
- `evidence/live-supabase-evidence.md` captures the 29 unlinked source-less row shapes. Only three match the legacy blank placeholder shape; edited source-less rows exist and must not silently leak into Project projection as real project-local components.

The live schema supports express-row authoring without a new table if express components remain estimate-row scoped.
