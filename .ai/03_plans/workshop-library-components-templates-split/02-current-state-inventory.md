# 02 Current State Inventory

## Live Routes

### `/workshop/library`

File: `src/app/workshop/library/page.tsx`

Current behavior:
- Protected workshop route inside `WorkshopPageShell`.
- Title/eyebrow/breadcrumbs say `Library`.
- Footer says `Workspace library` and `Categories and templates`.
- Loads `getCurrentWorkspaceComponentLibrary()`.
- Passes `categoryTree`, `suppliers`, `libraryFolders`, `libraryItems`, and `templates` to `LibraryPageClient`.

### `/workshop/components`

File: `src/app/workshop/components/page.tsx`

Current behavior:
- Redirects to `/workshop/library`.
- Must remain compatibility-only.

### `/workshop/templates`

Current behavior:
- Does not exist yet.

## Main Navigation

File: `src/components/sidebar/MainSidebar.tsx`

Current behavior:
- Library group contains one item:
  - `Library` -> `/workshop/library`
- Unit baseline test expects `/workshop/library` and `label: "Library"`.

Required future behavior:
- Library group should expose:
  - `Components` -> `/workshop/library`
  - `Templates` -> `/workshop/templates`

## Client Entry

File: `src/components/workshop/LibraryPageClient.tsx`

Current behavior:
- Thin client wrapper around `ComponentLibraryManager`.
- Prop type includes `templates`.
- No separate template route client exists.

## Main Manager

File: `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

Current relevant symbols:
- `LIBRARY_TABS`: `Categories`, `Templates`.
- `CATEGORY_ORGANIZE_MODES`: `Default folders`, `Suppliers`.
- `RowCollectionId`: includes `estimate-row-items`, `custom-row-items`, `uncategorized`, `supplier-row-items`, `folder:*`, `supplier:*`.
- `CategoryOrganizeControls`: renders two view buttons.
- `ComponentLibraryTreePanel`: right-side tree panel with search, toolbar, tabs, view controls, folder tree, or supplier tree.
- `RowCollectionSelect`: wrong dropdown UI.
- `ComponentLibrarySheet`: component row sheet; branches on `activeCollectionId`.
- `TemplateLibrarySheet`: template row/list sheet.
- `ComponentLibrarySheetPanel`: switches component vs template sheet.
- `ComponentLibraryManager`: owns all category, supplier, folder, collection, and template state.

Dropdown state/functionality currently owned by:
- `RowCollectionId`.
- `folderCollectionId`.
- `supplierCollectionId`.
- `activeCollectionId`.
- `collectionOptions`.
- `changeCollection`.
- `ComponentLibrarySheet` branch logic for `estimate-row-items`, `custom-row-items`, `uncategorized`, `supplier-row-items`, `folder:*`, and `supplier:*`.

Template state/functionality currently owned by:
- `templates` prop.
- `templateTree`.
- `selectedTemplateNodeId`.
- `selectedTemplateNode`.
- `activeTab === "templates"` branches.
- `TemplateLibrarySheet`.
- `buildTemplateNavigationTree`, `getTemplatesForTreeNode`, and `summarizeEstimateTemplate`.

## Repository Layer

File: `src/lib/repositories/component-library-repository.ts`

Current behavior:
- `getCurrentWorkspaceComponentLibrary()` returns one combined `ComponentLibraryDataset`.
- Dataset includes:
  - component category tree;
  - suppliers;
  - library folders;
  - library items;
  - estimate templates.
- Template rows are read from `estimate_templates`, `estimate_template_nodes`, and `estimate_template_row_items`.
- Static templates are used only when template tables are missing.

Required future helper:
- `getCurrentWorkspaceEstimateTemplates()` should reuse the template-building logic and return only `templates`.
- Do not duplicate template normalization.
- `/workshop/templates` should use this helper instead of loading the full component dataset.

## Existing Tests That Must Change

### `tests/vitest/component-library-manager-ui.test.tsx`

Currently asserts:
- Library views tablist has `Categories` and `Templates`.
- `Categories` active.
- `Templates` can be clicked and renders template rows.
- Static templates are not exposed when route provides none.
- `Library row collection` dropdown exists and includes `Estimate Row Items`, `Custom Row Items`, and `Uncategorized`.

These are now intentionally stale.

### `tests/vitest/workshop-library-consolidation-ui.test.tsx`

Currently asserts:
- `/workshop/library` route is canonical.
- Top-level tabs are `Categories` and `Templates`.
- Supplier organization is under Categories.
- Row collection dropdown contains selected folder/supplier and collection options.
- Folder drag/drop actions remain.

These need to be updated to the new Components-only route and split template route.

### `tests/unit/reset-baseline.test.ts`

Currently asserts:
- main sidebar contains `href: "/workshop/library"`.
- main sidebar contains `label: "Library"`.

This must update when sidebar label becomes `Components` and `/workshop/templates` is added.

## Tests That Should Stay Mostly Unchanged

- `tests/vitest/component-library-templates-schema.test.ts`
- `tests/vitest/component-library-templates-repository.test.ts`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`

These protect template persistence and estimate-sidebar insertion behavior. The route split should not alter those contracts.
