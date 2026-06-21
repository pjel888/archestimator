---
title: Estimate Sheet Improvement Backlog
date: 2026-06-21
status: recommended-plan
---

# Improvement Backlog

This is an implementation order, not a request to start coding. It prioritizes data correctness and user trust before polish.

## Phase -1: Canonicalize Component Taxonomy

This phase is partially complete for the estimate-sheet row-card/detail surface.

Files:
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet/activity-history.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `tests/vitest/estimate-component-drag.test.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/estimate-sheet-row-details-crud.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

Acceptance criteria:
- User-facing estimate-sheet row component copy exposes only `Library Component`
  and `Project Component`.
- Express/project-specific/manual labels do not appear as separate visible
  component types in row cards, row details, or the detach dialog.
- Internal provenance names remain untouched until a separate domain migration
  proves the compatibility and history cost is worth it.
- Future sidebar/project-source copy follows the same taxonomy when those
  surfaces are touched.

Suggested shape:
- Keep this as a copy/test revision, not a schema or helper rename.
- Treat `expressComponent`, `projectComponentProjection`, and `linkState` as
  internal state labels.

## Phase 0: Lock Cascading Row And Partial-Commit Risks

### 0.1. Make bulk row delete rollback row-scoped or atomic

Files:
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `tests/vitest/estimate-sheet-library-insert.test.tsx` or a new focused row-delete test

Acceptance criteria:
- Deleting selected rows cannot restore a row whose server delete succeeded.
- A failed selected-row delete visibly restores only that failed row.
- Failed row delete shows a user-visible error.
- Existing single-row delete behavior remains unchanged.

Suggested shape:
- Start with a regression test that reproduces one selected-row success and one failure.
- Prefer a small row-scoped rollback patch or one bulk row-delete mutation; avoid broad row-state refactors.

### 0.2. Make component move a coherent row-pair mutation

Files:
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `tests/vitest/estimate-component-drag.test.tsx`

Acceptance criteria:
- If target replace succeeds and source clear fails, the target does not roll back incorrectly.
- If target replace fails and source clear succeeds, the target is restored and source is reconciled intentionally.
- The UI cannot leave a component duplicated or lost without a visible recovery path.

Suggested shape:
- Prefer a row-pair operation or row-scoped rollback over a generic transaction layer.

### 0.3. Make bulk tree-node delete transactional

Files:
- `src/lib/estimates/actions.ts`
- Supabase migration/RPC
- generated types
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`

Acceptance criteria:
- Bulk tree delete validates all selected roots before deleting.
- A mid-bulk failure cannot leave earlier selected roots deleted.
- The action returns deleted ids, fallback id, and the refreshed active-tab tree.
- Existing parent/child dedupe behavior remains.

### 0.4. Harden write RPCs to edit-gating

Files:
- Supabase migration/RPC definitions for estimate row and node history writes
- `tests/vitest/estimate-sheet-actions-authz.test.ts`
- `tests/vitest/estimate-sheet-version-control-schema.test.ts`

Acceptance criteria:
- `replace_estimate_row_item_with_history` requires estimate edit permission.
- `delete_estimate_row_item_with_history` requires estimate edit permission.
- `delete_estimate_node_with_history` requires estimate edit permission.
- `update_estimate_row_item_with_history` requires estimate edit permission.
- Existing server actions and UI gates stay compatible.

## Phase 1: Stop Wrong-Tree And Stale-Revision Bugs

### 1. Make tree reorder/delete tab-scoped

Files:
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/lib/estimates/actions.ts`
- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`

Acceptance criteria:
- Reorder on non-default tab refreshes that tab tree.
- Single delete on non-default tab refreshes that tab tree and computes fallback inside it.
- Bulk delete on non-default tab refreshes that tab tree and computes fallback inside it.
- Cross-tab reparenting stays rejected.
- Existing default-tab and legacy no-tab behavior remains unchanged.

Suggested shape:
- Add optional `targetTabId` to reorder/delete/bulk-delete inputs.
- Resolve target tab server-side from nodes if client omits it.
- Use `getEstimateTabTree` when target tab exists.
- Keep legacy fallback only for missing tab schema/no-tab estimates.
- Apply the same committed-tab refresh rule to template insert actions: if SQL
  commits into the parent node's tab, the returned tree must be for that tab.

### 2. Return canonical row from replace-row action

Files:
- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-version-control-actions.test.ts`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`

Acceptance criteria:
- Replace-row server action exposes the canonical row already returned by the RPC.
- Replace mutation patches query cache with returned row.
- Immediate edit/delete/detach after replace does not revision-conflict.
- Server-normalized metadata/source snapshot/link state/unit/rowRevision are visible after replacement.
- Replace-style clear paths receive and patch the same canonical row response.

### 2.1. Serialize non-scalar same-row mutations

Files:
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

Acceptance criteria:
- Same-row replace, delete, detach, promote, and clear paths cannot interleave
  unsafely with queued scalar updates.
- Operation identity guards cover every mutation family that can rewrite row
  data.
- A concurrent update plus replace/delete regression has deterministic visible
  recovery.

## Phase 2: Make Failure States Trustworthy

### 3. Add retryable tree query error state

Files:
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-query.ts`
- `tests/vitest/estimate-sheet-library-insert.test.tsx` or new focused test

Acceptance criteria:
- `tabTreeQuery.isError` renders explicit "Could not load this tab" state.
- Legacy tree query error renders explicit "Could not load estimate rows" state.
- Retry button calls the relevant `refetch`.
- Empty tab copy appears only for successful empty data.

### 4. Add row mutation error presenter and counted save state

Files:
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

Acceptance criteria:
- Concurrent mutations keep state `saving` until all settle.
- Any update/delete/detach/clear/insert failure is visible.
- Failed state remains until a later successful save or explicit retry clears it.
- Rollback behavior remains intact.

### 5. Type row revision conflicts

Files:
- `src/lib/estimates/actions.ts`
- row mutation hook/client error presenter
- targeted conflict tests

Acceptance criteria:
- `estimate_sheet_row_revision_conflict` maps to typed stale-data error.
- Client refetches active tree and tells user the row changed elsewhere.
- Generic provider details are not exposed raw to the user.

## Phase 3: Fix Project-Source Concurrency

### 6. Serialize or merge project-source inserts

Files:
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`
- project-source DOM/action tests

Acceptance criteria:
- Bulk project-source add cannot drop earlier inserted sources due to response order.
- User feedback waits for server success or distinguishes "adding" from "added".
- Failure shows a visible message and leaves current tree intact.
- Success copy is emitted only after the server action resolves.

Suggested shape:
- Queue project-source inserts per estimate/tab.
- Or create a batch server action mirroring multi-template insert.
- Prefer batch action if it keeps one tree refresh.

## Phase 4: Reduce Large-Data Ceilings

### 7. Add cheap drag-over validation

Files:
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/ui/tree.tsx`
- `src/lib/estimates/estimate-tree-reorder.ts`

Acceptance criteria:
- Drag-over does not clone/rebuild tree.
- Drop still builds full reorder plan and preserves current validations.
- Benchmark shows acceptable handler time for large trees.

### 8. Use the existing bulk RPC for template-node subtrees

Files:
- `src/lib/estimates/actions.ts`
- generated types
- action tests

Acceptance criteria:
- `insertEstimateTemplateNodeIntoEstimate` calls
  `insert_estimate_subtree_into_estimate_with_history` once for subtree copy.
- A new migration is added only if a focused spike proves the existing RPC cannot
  satisfy template-node semantics.
- History events are preserved.
- Large subtree insert latency is bounded and tested.

### 9. Add route/library budgets

Files:
- `src/lib/repositories/workspace-repository.ts`
- route page/content empty/truncation UI
- component library repository/sidebar

Acceptance criteria:
- Estimate route can cap node/row load and display truncation state.
- Sidebar can page/search library components/templates server-side.
- Export/proposal paths retain full-data behavior under their own explicit caps.

### 9.1. Cap reusable project-source search fan-out

Files:
- `src/lib/reusable-sources/actions.ts`
- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/template-browse-project-sources.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`

Acceptance criteria:
- Search caps accessible projects, estimates, tabs, nodes, and rows scanned.
- Search returns lightweight hits instead of materializing full outlines.
- Full outlines load only when the user explicitly expands a source.
- Telemetry or debug metadata can report scan counts during regression tests.

## Phase 5: UX Polish

### 10. Make insert and refresh feedback visible

Files:
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/estimate-sheet/rows/*`

Acceptance criteria:
- Library/template/project-source inserts show compact visible pending status.
- "Added" or equivalent success copy appears only after persistence succeeds.
- Sidebar source refresh shows "refreshing", "updated", and retry on failure.
- Screen-reader live region remains.

### 10.1. Relabel local-only sidebar component actions

Files:
- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`

Acceptance criteria:
- Sidebar edit/duplicate/delete actions either become persisted library CRUD or
  say they affect only the local/sidebar view.
- Undo/delete copy does not imply existing estimate rows or shared library
  records were changed when they were not.
- Newly created persisted components still auto-appear in the current sidebar.

### 10.2. Add right-sidebar component row thumbnails

Detailed handoff: `10-right-sidebar-component-thumbnails-plan.md`.

Files:
- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/workshop/component-library/helpers.ts`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/ui-tree.test.tsx` or
  `tests/vitest/component-library-sidebar-thumbnails.test.tsx`
- `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`

Acceptance criteria:
- Component leaves show a compact square thumbnail after the existing tree icon
  and before the title.
- Thumbnail rendering is opt-in for the estimate-sheet sidebar and does not
  change other `LibraryTree` consumers by default.
- Folder/template/source rows do not show component thumbnails.
- Missing, invalid, disallowed, or failed thumbnail URLs render a fixed-size
  placeholder.
- The row accessible name, drag payload, add action, right-click menu, keyboard
  preview, and search behavior remain unchanged.
- Large libraries instantiate thumbnail DOM only for mounted virtual rows, not
  for every component in the catalog.
- The implementation uses stored thumbnail URLs from `EstimateRowItem.imageUrl`
  and does not call broad card/preview fallback imagery from the row list.

Suggested shape:
- Keep the first implementation at 24px square thumbnails so the current 28px
  tree row estimate remains valid.
- Add a row-specific safe thumbnail helper local to the tree row path instead
  of changing the card fallback helper.
- Use native `<img loading="lazy" decoding="async" fetchPriority="low">` with
  reserved dimensions and a local placeholder.
- If product later wants larger 32px thumbnails, pass a sidebar-specific tree
  row-height estimate and run browser proof for focus/hover/drag overlap.

### 11. Strengthen drag/drop affordances

Files:
- `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`

Acceptance criteria:
- Valid drop targets are obvious during drag.
- Empty drop zone uses first-row copy.
- Sidebar draggable rows expose grip or "Drag to sheet" tooltip on hover/focus.

### 12. Align small UI details

Files:
- `src/components/workshop/ProjectEstimateMetadataStrip.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx`

Acceptance criteria:
- Estimate-name errors are visible and keyboard/touch accessible.
- Hardcoded blue states use sheet tokens.
- Column reset uses an icon, not literal `R`.
- Add a sheet-shaped `[nodeId]/loading.tsx` if route-transition polish becomes
  worth the small UI implementation.
