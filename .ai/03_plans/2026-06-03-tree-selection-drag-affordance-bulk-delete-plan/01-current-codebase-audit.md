# Current Codebase Audit

Audit date: 2026-06-03

This audit is based on local repository inspection only. It intentionally does not rely on memory or on the separate mass-deletion workstream.

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## Current Path Shape

The target path is already a folder:

`.ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan/`

The folder already contained planning files and `00-original-plan.md`. The package was incomplete because `10-final-planning-report-template.md` was missing and active documents were stale against current source.

## Required Repository Commands Run

| Command | Result |
|---|---|
| `pwd` | `/Users/philiplewis/archestimator` |
| `git status --short` | Clean before docs edits. |
| `find .ai/03_plans -maxdepth 2 -type f \| sort` | Confirmed target folder and separate mass-deletion folder content. |
| `find .ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan -maxdepth 2 -type f \| sort` | Confirmed folder package existed and lacked `10-final-planning-report-template.md`. |
| `find src -maxdepth 4 -type f \| sort` | Mapped runtime source surfaces. |
| `find supabase -maxdepth 4 -type f \| sort` | Mapped migrations and generated types. |
| `find tests -maxdepth 4 -type f \| sort` | Mapped Vitest/unit tests. |
| `find e2e -maxdepth 3 -type f \| sort` | Confirmed top-level Playwright convention `e2e/*.spec.ts`; no `tests/e2e/src` tree. |
| Feature `rg` searches across `src supabase tests e2e .ai` | Located tree rows, RCT, drag, checkbox, bulk, delete, lifecycle, FK/RLS/RPC, and tests. |

## Summary Findings

- `WorkshopTreeRow` already has slots for drag handles and selection controls. The future work is hardening and use, not greenfield creation.
- `src/components/workshop/tree-row-affordances.tsx` already exists with `TreeDragHandle`, `TreeSelectionCheckbox`, `TreeSelectionCountLabel`, and `TreeBulkActionBar`. The future work is to tighten event isolation, ARIA, toolbar semantics, naming/API consistency, and coverage.
- `EstimateSheetTree` and `LibraryFolderTree` already use React Complex Tree row-level drag/drop. True handle-only drag is not proven in current wiring; the safe plan is visible handle as affordance while keeping row-level RCT drag handlers.
- `ProjectEstimatesTable` already tracks `selectedEstimateIds` and row checkboxes, but lacks header select-visible, bulk toolbar, and delete wiring.
- `deleteProject` exists as a single redirecting form action and is not suitable for bulk workflows.
- Estimate node single delete exists through `deleteEstimateNode` and `delete_estimate_node_with_history`; there is no bulk node delete contract.
- Library folder single delete exists and lifts child folders plus unassigns items; bulk folder delete must preserve that behavior and protect the synthetic root.
- Component lifecycle archive exists through `changeCostLibraryComponentLifecycleState`; component hard delete is not implemented and must be gated by zero-reference proof.
- Migration evidence shows many dependencies cascade or set null. Generated types are not authoritative for cascade actions; migrations are the authoritative local source unless live DB introspection is performed.

## 1. Shared Tree Row System

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| Shared row shell | `src/components/workshop/workshop-tree.tsx` | `WorkshopTreeRowProps` | Supports `dragHandleSlot`, `selectionSlot`, `leadingSlot`, and `selectionMode`. | Regression tests and prop governance for interactive children. | Start with hardening existing slots; do not create a second row primitive. | Props are defined near lines 39-56. |
| Invalid markup guard | `src/components/workshop/workshop-tree.tsx` | `WorkshopTreeRow` | Forces `div` when slots exist via `effectiveAs = hasSlots ? "div" : as`. | Strip or avoid button-only props when forced to `div`; document keyboard responsibilities. | Recommended strategy is non-button row variant with explicit keyboard behavior. | Logic and comment are near lines 87-93. |
| Indentation layout | `src/components/workshop/workshop-tree.tsx` | `outerIndentPx`, `innerIndentPx` | Moves indentation to inner wrapper when slots are present. | Verify checkbox/handle alignment across tree depths. | Add visual/DOM tests for depth alignment and no layout shift. | Indent logic is near lines 94-119. |
| Generic tree | `src/components/workshop/workshop-tree.tsx` | `WorkshopTree`, `WorkshopTreeNode` | Renders `ul role="tree"` and nested `ul role="group"`. | Bulk state semantics must not be confused with `aria-selected`. | Keep route/current selection separate from checkbox checked state. | Tree roles are near lines 180-220. |
| Existing affordances | `src/components/workshop/tree-row-affordances.tsx` | `TreeDragHandle` | Visual grip using Phosphor dots; current handlers stop pointer/click propagation. | Decide decorative vs true handle; with current RCT wiring use decorative handle and do not make it a fake keyboard target. | Keep row-level RCT drag until true handle-only support is proven. | Component starts near line 25. |
| Existing checkbox | `src/components/workshop/tree-row-affordances.tsx` | `TreeSelectionCheckbox` | Native checkbox supports `checked`, `indeterminate`, `disabled`, and stops pointer/change propagation. | Add click/key propagation coverage; do not prevent native Space toggling. | Tests must prove checkbox click/key does not navigate, expand, context-target, or drag. | Component starts near line 59. |
| Existing bulk bar | `src/components/workshop/tree-row-affordances.tsx` | `TreeBulkActionBar` | Floating bar supports count, clear, and delete action. | Add `role="toolbar"`, archive variant, disabled/pending states, focus return, and per-surface labels. | Extend rather than duplicate. | Component starts near line 146. |

## 2. Estimate Tree

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| Route/RCT selection | `src/components/workshop/EstimateSheetTree.tsx` | `routeSelectedItems`, `focusedItem`, `viewState` | RCT `selectedItems` and `focusedItem` represent route/current focus, not bulk selection. | Independent `bulkSelectedNodeIds` state. | Never feed bulk IDs into RCT `selectedItems`. | State is assembled near lines 363-384. |
| Drag guard | `src/components/workshop/EstimateSheetTree.tsx` | `handleCanDrag` | Allows one item, blocks editing/saving and non-draggable nodes. | Visible grip and checkbox isolation. | RCT row-level drag remains active. | Guard starts near line 386. |
| Drop guard | `src/components/workshop/EstimateSheetTree.tsx` | `handleCanDropAt` | Uses app-side validation before optimistic reorder. | Tests that checkbox/handle additions do not change drop rules. | Preserve existing DnD tests and invalid-drop behavior. | Guard starts near line 395. |
| Reorder mutation | `src/components/workshop/EstimateSheetTree.tsx` | `handleDrop` | Optimistic reorder, server action, rollback, status text. | No bulk reorder in scope. | Drag affordance must not affect existing reorder mutation. | Handler starts near line 468. |
| Single node delete | `src/components/workshop/EstimateSheetTree.tsx` | `handleConfirmDeleteNode` | Single delete modal performs optimistic removal, calls `deleteEstimateNode`, computes fallback, rollback on failure. | Bulk delete preview, deduped selected roots, typed or explicit confirmation, bulk server action/RPC. | Reuse preview/fallback ideas; do not client-loop single delete actions. | Handler starts near line 727. |
| RCT integration | `src/components/workshop/EstimateSheetTree.tsx` | `ControlledTreeEnvironment` | Configures `canDragAndDrop`, `canReorderItems`, `canDropOnFolder`, `canDrag`, `canDropAt`, `onDrop`. | No proof true handle-only drag is compatible. | Implement visible handle as affordance first. | RCT block is near lines 874-889. |
| Row rendering | `src/components/workshop/EstimateSheetTree.tsx` | `renderItem` | Uses `WorkshopTreeRow` plus RCT interactive props and context menu groups for rename/delete. | Add `selectionSlot`, `dragHandleSlot`, bulk styling, and stop propagation tests. | Preserve right-click rename/delete and left-click navigation. | Row render is near lines 1055-1220. |

## 3. Library Folder Tree

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| RCT selection | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `selectedFolderId`, `focusedItem`, `viewState` | RCT selected item tracks active folder. | Independent `bulkSelectedFolderIds`. | Keep active folder visual separate from checkbox checked state. | State is near lines 369-379. |
| Drag guard | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `canDrag` | Allows one folder and excludes `ALL_COMPONENTS_FOLDER_ID`. | Visible handle and checkbox isolation. | Synthetic root is never selectable, draggable, or deletable. | Guard is near lines 381-388. |
| Drop/reorder | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `canDropAt`, `handleDrop` | Optimistic folder reorder via `reorderLibraryFolders`. | No behavior change from selection UI. | Preserve reorder tests and rollback. | Handlers are near lines 390-473. |
| Context actions | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `getActionGroups` | Add, rename, delete menu entries. | Bulk delete toolbar and modal. | Preserve right-click actions while adding checkbox selection. | Action groups start near line 424. |
| Row render | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | folder row render | Uses `WorkshopTreeRow`; no handle/checkbox slots. | Add slots and disabled/protected root state. | Same row architecture as estimate tree. | Row render is near lines 625-672. |
| Shared constants | `src/components/workshop/component-library-manager/library-folder-tree-shared.ts` | `ALL_COMPONENTS_FOLDER_ID`, `isAllComponentsFolderId` | Synthetic all-components root marker. | Bulk utility must filter this ID. | Use as protected-row validation. | Constant and helper are near lines 9 and 24-26. |

## 4. Generic Library Tree

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| Generic library tree | `src/components/workshop/component-library/tree/LibraryTree.tsx` | `LibraryTree` | Uses the shared workshop tree style for folder/item hierarchy. | Selection affordances must follow the same primitives. | Avoid a separate visual system. | File exists under `src/components/workshop/component-library/tree/`. |
| Folder row | `src/components/workshop/component-library/tree/LibraryFolderRow.tsx` | `LibraryFolderRow` | Uses `WorkshopTreeRow`; arrow click stops propagation. | Optional checkbox/handle if this surface enters bulk mode. | Preserve expand/collapse click isolation. | File exists under component library tree folder. |
| Item row | `src/components/workshop/component-library/tree/LibraryItemRow.tsx` | `LibraryItemRow` | Uses `WorkshopTreeRow as="div"` and supports drag/double-click/add action. | Selection state if item bulk operations are added. | Avoid nested interactive conflicts with plus buttons. | File exists under component library tree folder. |
| Tree data | `src/components/workshop/component-library/tree/buildLibraryTree.ts` | `buildLibraryTree` | Builds folders/items for the generic library tree. | Visible-id utility can reuse built tree IDs. | Keep data transformation separate from selection state. | File exists under component library tree folder. |

## 5. Project Estimates Table

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| Row selection state | `src/components/workshop/ProjectEstimatesTable.tsx` | `selectedEstimateIds` | Tracks selected estimate IDs. | Header select-visible checkbox, indeterminate state, bulk toolbar, delete action. | Build on current state instead of adding a second state owner. | State appears near line 621. |
| Row checkbox | `src/components/workshop/ProjectEstimatesTable.tsx` | row actions cell | Row checkbox exists. | Event isolation and disabled/pending behavior. | Checkbox click must not navigate row or trigger inline edit. | Row checkbox is near lines 214-220. |
| Delete button | `src/components/workshop/ProjectEstimatesTable.tsx` | row action trash button | Trash button disabled; title says delete action is not wired. | Server-side estimate sheet delete and bulk delete. | Future phase must implement backend first or alongside UI. | Disabled delete is near lines 221-228. |
| Header cell | `src/components/workshop/ProjectEstimatesTable.tsx` | `row_actions` column | Header is empty. | Header checkbox with visible/filtered semantics. | Select visible rows only. | Column definition is near lines 662-687. |
| Visible rows | `src/components/workshop/ProjectEstimatesTable.tsx` | `visibleRows` | Table computes visible rows from TanStack state. | Use as select-visible source. | Do not select entire database. | Table/visible rows are near lines 790-806. |

## 6. Projects Page and Cards

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| Projects page state | `src/components/workshop/projects-page-client.tsx` | `ProjectsPageClient` | Filters/sorts projects and renders cards; no `selectedProjectIds`. | Bulk card selection state, bulk toolbar, typed confirmation. | Add selection at page client owner. | State starts near lines 143-160. |
| Project card | `src/components/workshop/LiveProjectCard.tsx` | `LiveProjectCard` | Renders `article` with separate favorite/expand buttons and access badges. | Selection checkbox, disabled shared/pending states, active route distinction. | Safer target for checkbox than `ProjectCard` because it is not a full-card `Link`. | Props near lines 94-120; article starts near line 121. |
| Legacy/sample card | `src/components/workshop/ProjectCard.tsx` | `ProjectCard` | Card is a `Link`. | Do not add interactive checkbox inside the link. | If used, split link shell before adding controls. | Link starts near line 14. |
| Project modal/actions | `src/components/workshop/NewProjectModal.tsx`, `ProjectDetailsModal.tsx` | modal components | Existing create/details flows. | Bulk delete modal must follow shared modal/focus contract. | Reuse `Modal`, `Button`, `Toast`, but add focus return where needed. | Files exist in workshop components. |
| Single delete action | `src/lib/projects/actions.ts` | `deleteProject` | Redirecting form action deletes project row and removes sanitized image paths from `component-images`. | Bulk action with workspace validation, preview, transaction strategy, non-redirect return shape. | Do not call `deleteProject` in a client loop. | Action is near lines 124-144; storage path helpers near lines 63-77. |

## 7. Component Library Catalogue

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|---|
| Manager catalogue | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | `ComponentLibraryManager` | Renders library tree/catalogue; no manager-level catalogue selection state. | `selectedComponentIds`, archive/delete toolbar, confirmation modal. | State owner should be the manager. | Catalogue surface appears around line 298. |
| Existing card pattern | `src/components/workshop/component-library/ComponentCard.tsx` | component card selection props | Separate card already supports `bulkSelected` and `onToggleBulkSelected`. | Reuse pattern carefully in manager catalogue or consolidate. | Do not invent a third card selection model. | Selection props/rendering are near lines 62 and 115-128. |
| Lifecycle action | `src/lib/component-library/actions.ts` | `changeCostLibraryComponentLifecycleState` | Calls `set_cost_library_component_lifecycle_state`. | Bulk archive action and hard-delete zero-reference gate. | Archive is default safe bulk action. | Action is near lines 373-397. |
| Repository loading | `src/lib/repositories/component-library-repository.ts` | component loaders | Loads versions, price history, state history, cost entries, attachments, image paths. | Delete preview/reference checks. | Hard delete must check estimate row references and storage paths before removal. | Related loaders appear from roughly line 564 onward. |

## 8. Server Actions

| Area | Existing Action | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|
| Project delete | `src/lib/projects/actions.ts::deleteProject` | Single form action, deletes one project, redirects. | `deleteProjectsBulk` with non-redirect result. | Must validate workspace/project edit permissions for each ID and run server-side cleanup. | Action near lines 124-144. |
| Estimate reorder/delete | `src/lib/estimates/actions.ts::reorderEstimateTreeNodes`, `deleteEstimateNode` | Reorder and single-node delete use server actions/RPC/history. | `deleteEstimateNodesBulk` with deduped roots and history strategy. | Reuse existing validation and planner; do not client-loop. | Reorder near lines 1218-1297; delete near lines 1630-1662. |
| Estimate sheet delete | `src/lib/estimates/actions.ts` | No audited bulk/single estimate-sheet delete action found in current action file. | `deleteEstimateSheetsBulk`. | Needs server action/RPC contract, route fallback, revalidation. | `rg deleteEstimate` found node/row delete, not sheet delete. |
| Library folder delete | `src/lib/component-library/actions.ts::deleteLibraryFolder` | Deletes one folder by lifting children and unassigning items. | `deleteLibraryFoldersBulk` preserving lift/unassign semantics. | Bulk must sort descendants and protect synthetic root. | Action near lines 457-517. |
| Component lifecycle | `src/lib/component-library/actions.ts::changeCostLibraryComponentLifecycleState` | Archive/restore style lifecycle change via RPC. | Bulk archive and gated hard delete. | Archive first; hard delete only with zero references and storage-safe paths. | Action near lines 373-397. |

## 9. Repositories

| Repository | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|
| `src/lib/repositories/estimate-repository.ts` | Provides estimate/project tree data and row data used by actions and queries. | Bulk delete preview read model if not fully handled in action/RPC. | Future server action should use repository helpers or scoped Supabase queries consistently. | File exists and is used by estimate actions. |
| `src/lib/repositories/workspace-repository.ts` | Workspace loading/scoping helper. | Explicit bulk workspace membership validation where actions do not already scope. | Bulk actions must reject cross-workspace IDs. | File exists under repositories. |
| `src/lib/repositories/component-library-repository.ts` | Loads component library metadata, versions, lifecycle, attachments, variants. | Reference-count and delete-preview helpers. | Use repository-level reads before archive/hard delete. | Loader sections map component dependencies. |
| Project-related repository functions | Project data is loaded by projects/workshop actions and page loaders. | Bulk delete preview and permission-scoped project list. | Do not rely on client-provided access badges. | Project actions and page client show current ownership/access shapes. |

## 10. Zustand and TanStack State

| State Owner | File | Current Behavior | Missing Behavior | Implementation Implication | Evidence |
|---|---|---|---|---|---|
| Estimate UI store | `src/stores/estimate-ui-store.ts` | Tracks route/current node, selected row IDs, expanded IDs, and UI context. | No bulk tree selection state should be added unless global persistence is intentional. | Keep `bulkSelectedNodeIds` local to tree unless a future requirement says otherwise. | Store exists and backs estimate workspace UI. |
| Estimate query | `src/hooks/use-estimate-query.ts` | Owns TanStack query keys/cache for estimate tree/rows. | Clear stale bulk selection after query refresh. | Add `clearInvalidSelectionsAfterRefresh` utility. | File defines query keys and area tree query. |
| Estimate workspace state | `src/hooks/use-estimate-workspace-state.ts` | Owns selected/expanded node state per estimate. | Bulk selection must not overwrite route selection. | Keep route state separate. | Hook exists under `src/hooks`. |
| Estimate row mutations | `src/hooks/use-estimate-row-mutations.ts` | Row mutation/rollback flows. | Bulk delete must not corrupt pending row mutations. | Disable destructive bulk while conflicting mutations pending. | Hook exists under `src/hooks`. |
| TanStack table state | `src/components/workshop/ProjectEstimatesTable.tsx` | Table rows, filters, and visible rows. | Header select-visible and stale selection cleanup. | Use visible row model as selection source. | Table state around lines 790-806. |

## 11. Existing Tests

| Test File | Current Coverage | Preserve / Extend |
|---|---|---|
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | RCT config, app-side drag/drop guards, optimistic reorder, rollback, stale-cache safety. | Preserve and extend with checkbox/handle non-interference. |
| `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx` | DOM-level RCT tree rendering, drag props, root drop zones. | Add row slot markup and handle visibility checks. |
| `tests/vitest/estimate-tree-context-menu.test.tsx` | Right-click rename/delete, delete modal, route fallback, rollback, left-click navigation. | Preserve right-click and left-click behavior after checkbox additions. |
| `tests/vitest/estimate-tree-edit.test.ts` | Estimate tree delete planning helpers. | Extend for bulk descendant/root dedupe utilities. |
| `tests/vitest/estimate-tree-reorder.test.ts` | Reorder planning/validation. | Preserve after drag affordance changes. |
| `tests/vitest/project-estimates-table-inline-edit.test.tsx` | Table inline edit conventions. | Add separate bulk delete table tests; do not reference nonexistent `project-estimates-table.test.tsx`. |
| `tests/vitest/project-estimates-client-create.test.tsx` | Estimate sheet create client behavior. | Preserve create behavior after bulk toolbar additions. |
| `tests/vitest/library-folder-reorder.test.ts` | Folder reorder and delete-lift behavior. | Extend for bulk folder delete planning. |
| `tests/vitest/component-library-manager-ui.test.tsx` | Library manager UI surface. | Add component archive/delete selection coverage. |
| `tests/vitest/component-library-ui.test.tsx` | Existing library UI assumptions, including absence of old bulk controls. | Update intentionally when new bulk controls ship. |
| `tests/vitest/projects-page-shared-access.test.tsx` | Owned/shared/sheet-only/pending project card access states. | Add disabled selection and bulk delete permission coverage. |
| `e2e/estimate-tree-dnd.spec.ts` | Mutating Playwright drag/drop fixture gated by env vars. | Preserve; add separate bulk selection e2e only when env is available. |

## 12. Design-System Constraints

| Source | Constraint | Implementation Implication |
|---|---|---|
| `DESIGN.md` | Workshop app uses SF Pro scale, compact app typography, neutral surfaces, 3px `rounded-xs`, zero tracking. | Bulk bars, handles, checkboxes, modals, and cards must stay compact and product-native. |
| `scripts/enforce-app-design-system.mjs` | Scans `src/app` and `src/components`; blocks large text, non-xs radius, nonzero tracking, bold/fill icons. | Future implementation must run `bun run lint:design-system`. |
| `src/components/ui/button.tsx` | Shared button variants include danger/success and compact sizes. | Use shared `Button`; do not create ad hoc button styles. |
| `src/components/ui/modal.tsx` | Provides dialog role, Escape/backdrop close; no built-in focus trap/return guarantee. | Bulk confirmation must manage initial focus and focus return explicitly. |
| `src/components/ui/toast.tsx` | Toast roles support status/alert. | Use status for success and alert for destructive failures. |
| `src/components/ui/context-menu.tsx` and `action-menu.tsx` | Radix context/action menu primitives. | Preserve existing right-click rename/delete menus. |
| `src/components/ui/header-icon-toolbar.tsx`, `search-input.tsx` | Existing toolbar/search primitives. | Bulk actions and select-visible affordances should align with these primitives. |
| `src/lib/ui/cn.ts` | Shared class merge helper. | Use `cn` for state classes; avoid string-sprawl. |

## 13. Schema, RLS, RPC, and Dependency Findings

Generated `src/lib/supabase/types.ts` confirms available tables/RPC names but does not encode all FK cascade actions. The migration files below are the authoritative local evidence.

| Entity | Migration Evidence | Cascade / Non-Cascade Findings | RLS / Permission Findings | Existing RPC / Action | Missing Contract |
|---|---|---|---|---|---|
| Projects | `supabase/migrations/20260518090000_archestimator_core_schema.sql`; `20260526013617_workshop_favorites.sql`; `20260526142913_project_sheet_collaboration_access.sql`; `20260527120000_project_client_publication.sql`; `20260528220000_project_shared_link_overhaul.sql`; `20260602083000_beta_feedback_submissions.sql` | Estimates, project favorites, members, invitations, publications, and shared-link dependents mostly cascade; beta feedback project reference sets null. Project image paths require storage cleanup. | Project policies use helpers such as `can_access_project`, `can_edit_project`, and publication management helpers. | `deleteProject` single form action. | `deleteProjectsBulk` with workspace scoping, typed confirmation, transaction strategy, storage-safe cleanup, non-redirect result. |
| Estimate sheets | Core schema and collaboration/version migrations. | Estimate nodes, rows, versions, events, estimate favorites, estimate members/settings cascade or set null according to migrations. | Estimate policies use `can_access_estimate` and `can_edit_estimate`. | Create/duplicate/update and tree actions exist; no audited sheet delete action. | `deleteEstimateSheetsBulk` plus route fallback and revalidation. |
| Estimate nodes | Core schema and estimate version-control migrations. | Node children and row items cascade; events keep audit rows with node/row references set null. | Server action validates editable estimate before mutation. | `delete_estimate_node_with_history`, `reorder_estimate_nodes_with_history`; `deleteEstimateNode`. | `deleteEstimateNodesBulk` with deduped roots, preview, history, fallback. |
| Library folders | `supabase/migrations/20260523030333_library_folder_organization.sql` | Folder workspace cascades; parent folder sets null; cost library items set `library_folder_id` null. Current action also lifts child folders. | Workspace member policies apply. | `deleteLibraryFolder`, `reorderLibraryFolders`. | Optional `deleteLibraryFoldersBulk` preserving lift/unassign and synthetic-root restrictions. |
| Library components | `20260523120957_component_library_item_versioning.sql`; `20260524131204_component_variant_assets_cost_entries.sql` | Versions, price options, history, cost entries, attachments cascade under item/version/options; estimate row source references set null. | Workspace-scoped component policies and lifecycle RPC apply. | `set_cost_library_component_lifecycle_state`; `changeCostLibraryComponentLifecycleState`. | Bulk archive action and hard-delete action with zero-reference gate, permission check, and storage cleanup. |

## Files Required by the Prompt

All requested audit files were checked for existence and relevant behavior. No required runtime source file was modified. No Supabase migration, generated type, or test file was modified.

## Audit Confidence

Confidence is high for local source, tests, and migration-backed schema behavior. Confidence is intentionally marked as not absolute for live database behavior because this docs-only audit did not run live Supabase introspection.
