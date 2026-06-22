# Current State And Code Audit

## Current User Problem

The right sidebar currently mixes reusable workspace components with project-owned component projections inside one `Components` tab. That is technically convenient because both are component-shaped rows, but it is weak IA: users read the tab as a reusable component library, then see project-specific entries in the same tree.

The better distinction is not "component vs non-component." It is "reusable library-owned component vs local project-owned component."

## Current Sidebar Shape

`src/components/workshop/component-library/index.tsx` defines:

```ts
const LIBRARY_TREE_TABS = [
  { id: "components", label: "Components" },
  { id: "templates", label: "Templates" },
] as const;
```

That drives `EstimateLibraryTab`, `activeTab`, `TreePanelHeader`, and the render branch:

- `activeTab === "templates"` renders `TemplatesTree`.
- Every other tab renders `LibraryTree`.

This is good news for implementation: adding `project` can follow the current pattern without inventing a new layout system.

## Current Data Flow

`EstimateSheetContent` lazily loads the sidebar dataset through:

- `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)`
- `loadProjectComponentLibraryLite(projectId)`

`loadProjectComponentLibraryLite` returns:

- `getProjectComponentRowsLibrary(projectId, { includeDetailGraph: false })`
- `getCurrentWorkspaceEstimateTemplates()`

So the current dataset already contains both reusable library rows and project-owned projected rows. A separate Project tab does not require a new provider path for v1.

## Current Project Projection

`projectEstimateRowToLibraryItem` in `src/lib/component-library/project-component-projection.ts` projects only:

- `classification === "express"` as `express`
- `row.link_state === "detached"` as `detached-library`

Everything else returns `null`.

The projected item is marked with:

- `source: "project"`
- `tags: ["project-component", projectionClassification, estimateName, nodeName]`
- `metadata.projectComponentProjection`
- `libraryFolderId = getProjectEstimateComponentsFolderId(projectId, estimateId)`

This is the right v1 inclusion rule for the new Project tab: it should show project-owned projected rows, not every row used in the project.

## Current Tree Issue

`buildLibraryTreeWithComponentRows("categories", ...)` currently calls `buildProjectComponentFolderTree(items, libraryFolders)` and prepends those project folders before the normal category taxonomy.

That means project rows are already being separated structurally, but still inside the `Components` tab. The Project tab should move this existing project-folder tree into its own branch and remove those rows from the reusable Library/Components branch.

Important code behavior:

- `buildProjectComponentFolderTree` fails closed unless an item has both a valid project folder id and project projection metadata.
- For `categories`, project-projected rows are removed from the catalog category tree after project folder extraction.
- For `suppliers`, `brands`, and custom views, the same exclusion is not explicit today. A Project tab implementation should filter reusable vs project items before calling tree builders, so project rows cannot leak through alternate component view modes.

## Current Templates Overlap

`TemplatesTree` already has a project-derived source hierarchy under a Projects section and a `Project sources` filter. That must stay in Templates because those entries are reusable estimate structures, not project-owned components.

However, if the new top-level tab is named `Project`, the Templates filter copy `Project sources` becomes overloaded. Rename it in the future implementation to something like `From projects` or `Project-derived templates`.

## Current User-Facing Labels

`src/components/workshop/estimate-sheet/rows/cells.tsx` already presents two user-facing component labels:

- `Library Component`
- `Project Component`

Internal terms such as `express`, `detached-library`, and `projectComponentProjection` should not appear in the sidebar UI.

## Audit Conclusion

The code supports the user instinct. The safest change is not a new component type, new database table, or new sidebar UI system. It is a view-model split:

- Reusable items remain in `Library`.
- Project projection items move to `Project`.
- Templates remain structurally separate.

