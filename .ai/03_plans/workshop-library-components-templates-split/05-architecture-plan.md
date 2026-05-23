# 05 Architecture Plan

## Recommended Component Boundary

Use route-scoped managers plus a small shared layout frame.

```txt
src/components/workshop/
  LibraryPageClient.tsx                         existing, component route client
  TemplatesPageClient.tsx                       new
  component-library-manager/
    ComponentLibraryManager.tsx                 component-only after cleanup
  template-library-manager/
    TemplateLibraryManager.tsx                  new, template-only
  library-workspace/
    LibraryWorkspaceFrame.tsx                   optional shared two-pane frame, layout only
```

The exact folder names can be adjusted during implementation, but the boundary should stay clear:

- component route owns component folder/supplier state;
- template route owns template tree/sheet state;
- shared frame owns only layout, not data rules.

## Component Route Design

### `ComponentLibraryManager`

Keep:
- folder tree construction;
- folder create/rename/delete/reorder;
- supplier tree construction;
- search for right sidebar tree;
- sheet search;
- component row rendering;
- right-side `ResizableSidePanel`;
- a component-only sheet wrapper if it keeps React DevTools boundaries clear.

Remove:
- `Templates` from `LIBRARY_TABS`;
- `TemplateLibrarySheet`;
- `templateTree`;
- `selectedTemplateNodeId`;
- `selectedTemplateNode`;
- `activeTab === "templates"` branches;
- `RowCollectionSelect`;
- `RowCollectionId` variants that exist only for the dropdown;
- `folderCollectionId`;
- `supplierCollectionId`;
- `collectionOptions`;
- `changeCollection`.

Delete or narrow `ComponentLibrarySheetPanel` during this cleanup. It must not remain as a hidden component/template switch because templates will be owned by `/workshop/templates`.

Replace with:

```ts
type ComponentViewMode = "default" | "suppliers";
```

Sheet rows derive from view state:

```ts
if (viewMode === "suppliers") {
  if (selectedSupplierNodeId === "all-suppliers") return getSupplierBackedItems(libraryItems);
  return getLibraryItemsForTreeNode("suppliers", selectedSupplierNodeId, libraryItems, [], [], { categoryTree, suppliers });
}

return getLibraryItemsForFolderNode(selectedFolderNode, libraryItems);
```

This directly encodes the new UX: the right sidebar selection owns the sheet.

## Template Route Design

### `TemplateLibraryManager`

Inputs:

```ts
type TemplateLibraryManagerProps = {
  templates?: EstimateTemplate[];
};
```

State:
- `selectedTemplateNodeId`, default `all-templates`.
- right-sidebar search query.
- sheet search query.

Derived data:
- `templateTree = buildTemplateNavigationTree(templates)`.
- `selectedTemplateNode = findNode(templateTree, selectedTemplateNodeId)`.
- sheet rows from `getTemplatesForTreeNode(selectedTemplateNode?.id, templates)`.

UI:
- reuse current `TemplateLibrarySheet` rendering logic, moved out of component manager.
- right sidebar uses `LibraryTree` with template nodes.
- page shell copy says `Templates`.

## Repository Plan

### Keep existing combined helper for estimate route

`getCurrentWorkspaceComponentLibrary()` should remain because the estimate workspace still needs:

- component categories;
- suppliers;
- library items;
- templates for estimate-sidebar insertion.

### Add mandatory template-only helper

Use this single helper name:

```ts
export async function getCurrentWorkspaceEstimateTemplates(): Promise<EstimateTemplate[]>
```

This should reuse the same private template query/build logic currently inside `getCurrentWorkspaceComponentLibrary()`. Do not duplicate normalization logic.
`/workshop/templates` must not call `getCurrentWorkspaceComponentLibrary()` just to discard component rows, suppliers, and folders.

## Route Plan

### `/workshop/library`

Keep route path. Update visible shell:

- title: `Components`.
- breadcrumb: `Components`.
- footer: component-specific copy, not `Categories and templates`.

Recommended for first implementation:

- title: `Components`
- breadcrumb: `Components`
- footer: `Workspace library` / `Component rows`

### `/workshop/templates`

New route:

```txt
src/app/workshop/templates/page.tsx
```

Use `WorkshopPageShell`:

- title: `Templates`
- breadcrumb: `Templates`
- footer: `Workspace templates` / `Estimate structures`

### `/workshop/components`

Keep redirect to `/workshop/library`.

## Shared Layout Extraction Guidance

Extract only after writing failing tests and before duplicating substantial markup.

Good shared candidates:
- `LibraryWorkspaceFrame`:
  - rounded workspace border;
  - header row;
  - `aria-label` for workspace;
  - flex shell for sheet-left/sidebar-right.
- `LibrarySidebarPanel` if props stay small:
  - `ResizableSidePanel side="right"`;
  - search;
  - toolbar;
  - optional view controls;
  - tree children slot.

Avoid genericizing:
- folder mutation handlers;
- supplier selection semantics;
- template category semantics;
- sheet row rendering;
- empty states that use route-specific language.

## Accessibility Notes

- Keep `aria-label="Component library workspace"` or update tests and labels deliberately.
- Add template-specific labels:
  - `aria-label="Template library workspace"`;
  - `aria-label="Template library tree"`;
  - `aria-label="Template sheet"`.
- The view-by control should have a stable group label such as `View components by`.
- The first view button visible text and accessible name should be `View By: Default`.
