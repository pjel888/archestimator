# UI Reuse Audit

Date: 2026-06-06

Scope: `src/components`, `src/app`, `.ai` state, package dependencies, and prior repo memory relevant to workshop UI, component library, estimate trees, and share trees.

## 2026-06-06 Refinement Addendum

Live repo verification corrected and strengthened this audit:

- File sizes verified on 2026-06-06: `EstimateSheetContent.tsx` 4,071 lines, `EstimateSheetTree.tsx` 1,576 lines, `AddComponentModal.tsx` 2,362 lines, `ComponentLibraryManager.tsx` 1,257 lines, `LibraryFolderTree.tsx` 1,249 lines, `ShareEstimateTreePanel.tsx` 433 lines, and `ShareEstimateTreeView.tsx` 308 lines.
- Referenced-test inventory is now 8 existing and 12 aspirational, not 7 existing. The live repo includes `tests/vitest/route-transition-peak-load-profile.test.tsx`.
- Proposed future folders (`tree-core`, `share-tree`, `estimate-tree`, `estimate-sheet`, `catalogue`, and `add-component`) do not currently exist.
- Memoization and dynamic import decisions must coordinate with `.ai/03_plans/route-transition-performance-optimization/19-react-memo-strategy.md` and `14-code-splitting-named-exports.md`.
- The safest shippable componentization target remains read-only share tree unification, not editable estimate sheet decomposition.

## Current Design Constraints

The plan must preserve the workshop product UI baseline:

- Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Supabase/Postgres.
- Existing UI stack includes Radix Context Menu, Phosphor icons, TanStack Query, Zustand, TanStack Table, React Complex Tree, and shadcn-like local primitives.
- Workshop surfaces use compact neutral UI: SF Pro, small type, low radius, regular-outline icons, and dense operational layouts.
- Do not introduce broad visual restyling while extracting components.

## Ranked Componentization Targets

### P0 - Estimate Workspace Split

Primary files:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`

Evidence:

- `EstimateSheetContent.tsx` is about 4,071 lines and owns row rendering, row editing, row math, optimistic mutations, proposal preview, activity/history, dialogs, and sidebar coupling.
- `EstimateSheetTree.tsx` is about 1,576 lines and owns controlled React Complex Tree state, drag/drop, rename, delete, bulk selection, rollback, toolbar, panel shell, and row rendering.
- `EstimateWorkspaceClient.tsx` already dynamically imports `EstimateSheetTree` and `EstimateSheetContent`, which proves this route has recognized client-bundle pressure.

Reusable seams to extract:

- `EstimateRowItemsTable` into a row-table module with a stable editable-cell contract.
- `EstimateSheetBranch` into a sheet tree/body renderer that receives memoized row groups and command callbacks.
- Activity/history tree into a generic flat-tree primitive before adding new version/history UI.
- Row mutation handlers into a hook such as `useEstimateRowMutations`.
- Proposal preview and row details dialogs into route-local modules.
- Shared sheet width/layout shell for center content and header alignment.

Why this is P0:

This file concentrates the most render work and the most coupling. A small UI change inside it can rerender large trees and tables. Splitting by behavior seams also makes targeted tests possible before any performance work.

### P0 - Shared Tree Core

Primary files:

- `src/components/workshop/workshop-tree.tsx`
- `src/components/workshop/tree-row-affordances.tsx`
- `src/components/workshop/tree-visual-style.ts`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`

Evidence:

- `workshop-tree.tsx` is already a shared recursive tree shell and shared row surface.
- `tree-row-affordances.tsx` already centralizes drag handles, checkboxes, and bulk action bar behavior.
- `tree-visual-style.ts` already centralizes compact tree indentation and row sizing.
- Share tree view and share tree panel duplicate row rendering, money formatting, mobile handling, default expansion, and filtering logic.
- Editable estimate and library folder trees use React Complex Tree but still render rows with repo-local chrome.

Reusable seams to extract:

- `tree-core/flatten-visible-tree.ts`
- `tree-core/filter-tree.ts`
- `tree-core/tree-index.ts`
- `tree-core/use-tree-expansion.ts`
- `tree-core/use-tree-selection.ts`
- `tree-core/tree-aria.ts`
- `tree-core/TreeSurfaceShell.tsx`
- `tree-core/TreeRowLayout.tsx`

Why this is P0:

Trees are repeated across the app and have different data behaviors. The reusable layer should be behavior-neutral and visual-contract-aware, not a single forced tree component that breaks drag/drop or share accessibility.

### P1 - Component Library Manager Split

Primary files:

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`

Evidence:

- `AddComponentModal.tsx` is about 2,362 lines.
- `ComponentLibraryManager.tsx` is about 1,257 lines and includes outline building, catalogue card rendering, branch recursion, sheet rendering, state, and panel composition.
- `LibraryFolderTree.tsx` is about 1,249 lines and includes search, selection, tree-model creation, drag/drop validation, rendering, optimistic reorder, and row-specific UI.

Reusable seams to extract:

- `ComponentCatalogueCard`
- `CatalogueCardGrid`
- `ComponentCatalogueBranch`
- `LibraryTreePanel`
- `AddComponentFormSections`
- `useComponentLibraryTreeModel`
- `useLibraryFolderDrop`
- `useLibraryBulkSelection`

Why this is P1:

This area already has route-specific requirements, version/history behavior, and shared sidebar constraints. Splitting here gives the component library a stable base before new classification or versioning work.

### P1 - Share Tree Renderer Unification

Primary files:

- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/lib/share/reconstruct-share-tree.ts`

Evidence:

- `ShareEstimateTreePanel.tsx` and `ShareEstimateTreeView.tsx` both render share estimate hierarchy rows with very similar tree-node renderer logic.
- `ShareEstimateTreePanel.tsx` carries filtering, collect-all-node IDs, expansion toolbar, search, mobile handling, and tree render code.
- `reconstruct-share-tree.ts` caps rows for reconstruction and preserves snapshot/fallback trees, so the renderer should not add unbounded DOM cost.

Reusable seams to extract:

- `ShareTreeNodeRow`
- `useShareTreeExpansion`
- `useShareTreeSearch`
- `filterShareTreeNodes`
- `formatShareTreeMoney`
- `ShareTreeSurface`

Why this is P1:

This is a low-risk extraction because it can be tested with fixed share tree fixtures and should not touch editable workshop behavior.

### P1 - Tables and Editable Cell Primitives

Primary files:

- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/ProjectChartBucketTable.tsx`

Evidence:

- `ProjectEstimatesTable.tsx` already uses TanStack Table but keeps several editable cell and row action patterns inline.
- `EstimateSheetContent.tsx` renders row item tables directly and maps all visible rows under each branch.
- Current package dependencies include `@tanstack/react-table` but not `@tanstack/react-virtual`.

Reusable seams to extract:

- `EditableTextCell`
- `EditableMoneyCell`
- `InlineTableActionMenu`
- `DenseDataTableShell`
- `EmptyFillerRows`
- `TableColumnSizingVars`

Why this is P1:

The table work can reduce duplication without changing data fetching. Virtualization can be evaluated later against row-count thresholds.

### P2 - Header, Toolbar, Modal, and Form Sections

Primary files:

- `src/components/workshop/ProjectPublicationHeader.tsx`
- `src/components/workshop/ProjectTeamspaceHeader.tsx`
- `src/components/workshop/BulkActionToolbar.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/search-input.tsx`
- `src/components/ui/action-menu.tsx`
- `src/components/ui/control-input.tsx`
- `src/components/ui/control-select.tsx`

Evidence:

- Local UI primitives already exist and should be reused before new abstractions.
- Header and toolbar files are individually large enough to justify extracting repeated action/menu/status groups.
- The design system has strong typography and alignment requirements.

Reusable seams to extract:

- `HeaderActionCluster`
- `SelectionActionBar`
- `ModalFormSection`
- `TwoColumnControlRow`
- `DenseStatusBadge`

Why this is P2:

These are worthwhile, but tree and estimate workspace extraction has higher performance and maintenance impact.

## Anti-Patterns To Avoid

- Do not replace `react-complex-tree` with a homemade editable drag/drop tree in the first pass.
- Do not add virtualization inside recursive tree rendering without first flattening visible rows.
- Do not create a generic `Tree` that hides drag/drop, share, and activity-specific semantics behind excessive props.
- Do not memoize everything. Memoization is useful only when props are stable and measurements show render cost.
- Do not move domain data logic into UI primitives. Tree core should operate on adapters and IDs, not Supabase entities.
- Do not componentize by visual resemblance alone. Preserve behavior contracts first.

## Recommended Component Boundaries

Use three layers:

1. Pure data utilities:
   - Build indexes, flatten visible nodes, filter trees, collect descendants, compute aria metadata, normalize search, and group items.

2. Headless hooks:
   - Expansion, selection, focus, search, bulk selection, drag/drop validation, and optimistic rollback coordination.

3. Render shells:
   - Compact rows, tree surface headers, search/toolbar slots, tree/tabs shells, editable cells, dense table shells, and modal sections.

## Immediate Extraction Candidate List

Start with these because they are small enough to test and broad enough to matter:

- Extract `collectAllNodeIds` and default expansion logic from share/estimate surfaces into a tree utility.
- Extract share tree filtering and renderer duplication between `ShareEstimateTreePanel.tsx` and `ShareEstimateTreeView.tsx`.
- Convert `WorkshopTree` to normalize `expandedIds` to a `Set` internally and accept stable callback props.
- Extract `ComponentCatalogueCard`, `CatalogueCardGrid`, and `ComponentCatalogueBranch` from `ComponentLibraryManager.tsx`.
- Extract `EstimateRowItemsTable` and `EstimateSheetBranch` from `EstimateSheetContent.tsx`.
- Extract `ActivityScopeTree` into a generic flat-tree display surface with WAI-ARIA-compatible keyboard expectations.

## Local Validation Strategy

Minimum validation for a componentization branch:

- `bun run type-check`
- `bun run lint:design-system`
- `bun test tests/vitest/workshop-tree-row-affordances.test.tsx`
- `bun test tests/vitest/library-folder-tree-selection.test.tsx`
- `bun test tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `bun test tests/vitest/share/reconstruct-share-tree.test.ts`
- `bun test tests/vitest/route-transition-peak-load-profile.test.tsx`
- `git diff --check`

Add route smoke only when fixture auth state is available.
