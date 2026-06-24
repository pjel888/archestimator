# 07 — Project Tab Audit

## Data origin

The Project tab is a **read-only projection** of the current project's estimate rows. It is NOT a separate data source — it reuses the same `estimate_row_items` that the center sheet edits.

**Evidence**: `project-component-projection.ts:170-243` — `getProjectComponentRowsLibrary(projectId)`:
1. Fetches `estimate_row_items` where `estimate_nodes.estimates.project_id = project.id`
2. Classifies each row as `"express"` or `"detached-library"` via `classifyEstimateRowSource`
3. Projects qualifying rows into `EstimateRowItem` objects with `metadata.projectComponentProjection`
4. Injects virtual folders: `project-components-<projectId>` (project root) and `project-components-<projectId>-estimate-<estimateId>` (per-estimate)

## Projection model

- **Marker**: `metadata.projectComponentProjection.classification` (`"express"` or `"detached-library"`)
- **Split**: `splitSidebarComponentItems()` (`buildLibraryTree.ts:79-89`) separates library items from projection items using `isProjectComponentProjectionItem()` which checks for the marker
- **Folder id convention**: `project-components-<projectId>` and child `…-estimate-<estimateId>` — these are **synthetic ids**, not real `library_folders` rows
- **Refresh behavior**: projection is re-derived from `estimate_row_items` on every library load. No staleness caching beyond the React Query staleTime (5 min)

## Read-only intent

The Project tab exposes **NO edit, delete, duplicate, favorite, or folder management actions**.

**Evidence**: `tests/vitest/component-library-ui.test.tsx:688-694`:
```ts
const toolsRow = screen.getByRole("toolbar", { name: "Project tools" });
expect(within(toolsRow).queryByRole("button", { name: "Filter components" })).not.toBeInTheDocument();
expect(within(toolsRow).queryByRole("button", { name: "View by" })).not.toBeInTheDocument();
expect(within(toolsRow).queryByRole("button", { name: "Add folder" })).not.toBeInTheDocument();
expect(within(toolsRow).queryByRole("button", { name: "Add Component" })).not.toBeInTheDocument();
expect(within(toolsRow).queryByRole("button", { name: "Add Template" })).not.toBeInTheDocument();
```

And `component-library-ui.test.tsx:716-720`:
```ts
fireEvent.click(screen.getByRole("treeitem", { name: "Project Vanity" }));
expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Favorite" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
```

**VERIFIED WORKING**: the Project tab is correctly read-only.

## Bulk add

The Project tab DOES support bulk selection and "Add selected components" — but the dock shows NO "Delete selected components" button (unlike the Library tab).

**Evidence**: `component-library-ui.test.tsx:713-714`:
```ts
expect(within(dock).getByRole("button", { name: "Add selected components" })).toBeInTheDocument();
expect(within(dock).queryByRole("button", { name: "Delete selected components" })).not.toBeInTheDocument();
```

**VERIFIED CORRECT**.

## Insertion semantics

When a projected component is inserted into the estimate, it creates a new `estimate_row_items` row via the sheet's insert handler. The projection item carries `sourceLibraryItemId` pointing to the original estimate row — the insert flow uses the source snapshot to create a copy.

**Not a live link**: inserting a projected component copies its snapshot. Changes to the original estimate row do not propagate to the inserted copy. This matches the Library tab's insert behavior (also a snapshot copy).

## Source trust

Projected components carry their original `pricingSource`, `pricingDate`, `confidence`, and `lifecycleState` from the source estimate row's `source_snapshot`. The `SourceTrustChips` component renders these accurately.

## Terminology

The tab label "Project" is ambiguous — it could mean "this project's components" or "reusable project sources". See **Finding F-02** and [02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md](./02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md).
