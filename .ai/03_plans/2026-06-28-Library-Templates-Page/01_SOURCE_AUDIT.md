# Source Audit

## Routes

### `/workshop/library/templates`

Current entry:

- `src/app/workshop/library/templates/page.tsx`
- Server page calls `getCurrentWorkspaceEstimateTemplatesSeed()`.
- It passes `templates`, `userId`, and `workspaceId` into `TemplatesBrowsePageClient`.
- Perf labels include `workshop.library.templates` and `library.templates.seed`.

Client shell:

- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- Seeds TanStack Query with server data.
- Query key is partitioned by `{ userId, workspaceId }` when scope is available.
- `staleTime` is 5 minutes.
- Mutations patch or invalidate the templates query instead of forcing broad refresh.
- Wraps the surface in `LibrarySurfaceVariantProvider variant="glass"`.

Browse manager:

- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- Current geometry is left `TemplatesBrowseTreePanel`, center `TemplateGallery`, optional right `TemplatePreviewDock`.
- Tree grouping: root `All Templates`, category folders sorted alphabetically, templates sorted by name.
- Left rail uses `ResizableSidePanel` with `storageKey="template_library_tree_width"`, default width `272`, min `216`, max `432`.
- Template leaves support drag/drop between categories and have keyboard/menu equivalents.
- Center gallery is a row list, not an estimate-sheet editor.
- Preview dock is a selected-template preview, not the future Library/Project source dock.

### `/workshop/library/templates/[templateId]`

Current entry:

- `src/app/workshop/library/templates/[templateId]/page.tsx`
- Loads `getEstimateTemplateById(templateId)`.
- Returns 404 for missing template or missing workspace id.
- Passes only `{ template, workspaceId }` into `TemplateEditorClient`.

Template editor:

- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- Already uses estimate-style anatomy: left structure panel, center editable template sheet, right `EstimateRightSidebar`.
- Right dock is lazy-requested on pointer/focus/click intent.
- Reuses `workspaceComponentLibraryLiteQueryKey(workspaceId)` so the editor and estimate workspace can share cached component library data.
- Passes `templateCreateMode="scratch"` to the right sidebar.
- Does not pass `projectId`, `estimateId`, `projectSources`, or `onInsertProjectSource`.

Editor state:

- `src/components/workshop/library/template-editor/use-template-editor.ts`
- Optimistic local tree updates.
- Server action runs after local update.
- `router.refresh()` or deferred refresh pulls canonical data.
- Failures roll back local state and set save indicator to error.

### Target estimate editor route

Current route:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Resolves route context through `resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)`.
- Resolves edit capability.
- Renders `EstimateWorkspaceClient surfaceVariant="glass"`.

Workspace shell:

- `src/components/workshop/EstimateWorkspaceClient.tsx`
- Three-pane shell: `EstimateSheetTree` left, `EstimateSheetContent` center, right sidebar mounted from content.
- Root frame uses full-height flex, `gap-2`, `p-2`, glass surface.
- Has desktop notice / mobile guard.

Left tree:

- `src/components/workshop/EstimateSheetTree.tsx`
- Uses `ResizableSidePanel` default `272`, min `216`, max `432`.
- Uses `TreePanelHeader`.
- Preserves server tree order, supports selection, drag/drop, reorder, external template/project drops, bulk selection, and keyboard/menu alternatives.

Right dock:

- `src/components/workshop/component-library/index.tsx`
- `EstimateRightSidebar` is memoized and shared by estimate workspace and template editor.
- Tab arrays are hardcoded:
  - `LIBRARY_TREE_TABS`: `Library`, `Project`, `Templates`.
  - `PUBLIC_LIBRARY_TREE_TABS`: `Library`, `Templates`.
- Active tab defaults to `components`.
- Stored preferences can restore `templates`.
- `enableReusableProjectSources` controls whether `Project` appears, but the tab set cannot currently be customized to `Library + Project only`.

## Data And Mutation Findings

Template seed:

- `src/lib/repositories/component-library-repository.ts`
- Preferred path calls `library_templates_seed`.
- Fallback reads `estimate_templates`, `estimate_template_nodes`, and `estimate_template_row_items`.
- Templates are ordered by `sort_order`, then name; nodes and row items by `sort_order`.

Template editor actions:

- `src/lib/component-library/template-editor-actions.ts`
- Every mutation checks current workspace and calls `is_workspace_editor`.
- Database trigger `validate_estimate_template_tree` is the hierarchy backstop.
- Actions are plain server actions, not estimate-grade history RPCs.
- Some operations loop through multiple updates or clean up after failed copy instead of using a single transaction.

Existing decision record:

- `.ai/10_state/decisions.md` records that template editor mutations are plain actions, the right dock is re-hosted `EstimateRightSidebar`, and estimate presentational rows are shared through `SheetMutationHandlers`.
- `.ai/10_state/current-state.md` records `/workshop/library/templates` as browse/manage and `/workshop/library/templates/[templateId]` as estimate-style template editor.

## Current Test Surface

Relevant existing tests:

- `tests/vitest/template-gallery.test.tsx`
- `tests/vitest/library-templates-cache.test.tsx`
- `tests/vitest/template-browse-project-sources.test.tsx`
- `tests/vitest/template-editor.test.tsx`
- `tests/vitest/template-editor-actions-authz.test.ts`
- `tests/vitest/library-template-insert-picker.test.tsx`
- `tests/vitest/library-tabs-layout.test.tsx`
- `tests/vitest/estimate-side-panel-rails.test.ts`
- `tests/vitest/estimate-template-drop-zones.test.tsx`
- `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx`
- `e2e/workshop-template-insert-smoke.spec.ts`
- `e2e/route-transition-performance.spec.ts`
- `e2e/estimate-sources-drawer.spec.ts`

## Audit Conclusion

The current browse route already has a workspace shell, but its center and right surfaces are browse/preview-oriented. The true estimate-like template editor is the detail route. The implementation plan should avoid a route identity collapse and instead create a coherent workbench family:

- Browse/manage workbench at `/workshop/library/templates`.
- Full edit workbench at `/workshop/library/templates/[templateId]`.
- Shared right dock that can be configured to hide `Templates` and clamp stored preferences.

