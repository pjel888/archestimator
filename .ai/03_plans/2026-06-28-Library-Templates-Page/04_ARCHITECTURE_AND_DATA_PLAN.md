# Architecture And Data Plan

## Recommended Track

Use the conservative track first.

Rationale:

- It satisfies the user's visual/workspace direction.
- It preserves the existing Library browse vs template editor distinction.
- It avoids making estimate-editor parity claims before permissions, conflict semantics, mobile behavior, and transaction hardening are funded.

Architecture council confirmation:

- No DB/RLS/RPC migration is required for this target.
- The existing server-seeded browse page, client-owned TanStack Query cache, server-loaded editor route, and server-action revalidation model are already the correct layering.
- Factor shared route-shell patterns only if they reduce duplication without coupling template management to live estimate editing.
- Keep browse reducer state local unless a concrete cross-route persistence requirement appears.

## Component Seams

### A. Template workbench shell

Target files:

- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/templates-browse/TemplateGallery.tsx`
- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx`

Plan:

- Keep the server route and query seeding.
- Reshape the browse manager into a workbench shell, preserving the left tree and selection reducer.
- Replace the optional preview dock with the configurable source dock only after the dock can hide `Templates`.
- Keep `TemplateGallery` behavior as center body for category/no-selection states, and add a selected-template center surface for selected state.

### B. Template editor hardening

Target files:

- `src/app/workshop/library/templates/[templateId]/page.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- `src/components/workshop/library/template-editor/use-template-editor.ts`
- `src/lib/component-library/template-editor-actions.ts`

Plan:

- Add an explicit `canEditTemplate` capability from the server page.
- Disable or hide editor-only actions for viewers.
- Keep action-level editor checks as defense in depth.
- Pass `canEditTemplate` through `TemplateEditorClient` and the immediate editor surface. Child contracts:
  - `TemplateStructureTree`: receives disabled/read-only flags or action omissions for add/rename/move/delete.
  - `TemplateEditorSheet`: receives disabled/read-only handlers for row add/update/delete, drag/drop, and source insertion.
  - `EstimateRightSidebar` host: disables insert/add-template mutation affordances for viewers while preserving Library browse/preview.
  - `useTemplateEditor`: may keep canonical local state helpers, but mutating callbacks must be gated by caller UI and still fail closed at server-action level.
- Do not add estimate history semantics unless separately scoped.
- For integrated editing or project-source composition, consider RPC-backed transactional copy/reorder before adding broader multi-statement operations.

### C. Configurable right source dock

Target files:

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/use-estimate-right-sidebar-state.ts`
- Existing sidebar tests under `tests/vitest/*right-sidebar*`, `component-library-ui.test.tsx`, and template editor tests.

Plan:

- Add a typed prop such as:

```ts
visibleTabs?: EstimateLibraryTab[];
initialActiveTab?: EstimateLibraryTab;
storageScope?: "estimate" | "template-library" | "template-editor";
```

- Clamp active tab and stored preferences against `visibleTabs`.
- Implement the clamp as a single helper, for example `resolveVisibleEstimateLibraryTab(candidate, visibleTabs, fallback)`, and use it at every selection boundary:
  - initial chrome state / host `initialActiveTab`;
  - localStorage hydration from `LIBRARY_PREFS_KEY`;
  - legacy `estimate_library_active_tab` hydration;
  - account preference hydration from `loadComponentLibraryUserPreferences`;
  - `handleTabChange`;
  - active-tab fallback when `visibleTabs` changes after mount;
  - persistence writes to local/account prefs.
- Template-focused hosts must never save `templates` as the active tab. If the previous account/local preference is `templates`, persist the visible fallback after hydration instead of replaying the hidden value.
- When `visibleTabs` excludes `templates`, do not render template toolbar, template tree, template bulk toolbar, template dialogs, or template source fetch triggers.
- Keep `Library` default active tab unless `initialActiveTab` is valid and visible.
- Add a route-specific storage key or storage namespace to avoid cross-route `Templates` resurrection.

### D. Project tab scope

Problem:

The current `Project` tab assumes estimate/project context for project component rows, and reusable estimate-source loading in `EstimateRightSidebar` is tied to the existing Templates-tab path. `/workshop/library/templates` has workspace context but no active project.

Required design:

1. `Project` tab is visible in v1.
2. The tab opens to a project selector when at least one authorized project source exists.
3. If no authorized project exists, the tab shows a clear unavailable state.
4. Project-scoped data loads only after a project is selected.

Concrete v1 data contract:

- Meaning: `Project` exposes reusable estimate structures from authorized projects so users can compose templates from past project work. It does not expose project-owned component-library rows in this slice.
- Source action/repository: add or reuse a bounded repository/server action that lists authorized project roots for the current workspace, then lazily loads the selected project's estimate/source outline. Prefer the existing reusable-source functions/patterns behind `listReusableProjectSources` / `listReusableProjectEstimateSources` if they can be scoped by selected project without requiring an active estimate; otherwise create a template-workbench-specific action wrapper with the same DTO discipline.
- State owner: `TemplatesBrowseManager` owns selected project id, Project-tab selector state, project source loading/error state, and stale-response guards. The shared `EstimateRightSidebar` should receive a normalized Project-tab adapter payload or an explicit host mode; do not force workspace-level Project data through `projectId`/`estimateId` props that imply an active estimate.
- Query key shape: `{ userId, workspaceId, selectedProjectId }` for project-source detail data; project-list data is `{ userId, workspaceId }`. Selected project changes must reset Project-tab search/tree/selection state.
- Auth boundary: the project list and project-source reads must be derived from authorized workspace/project membership, never from client-provided ids alone. Server-side reads re-check workspace/project ownership.
- States: selector loading, selector empty/unavailable, selected project loading, selected project empty, selected project error, stale selected project removed.
- Rendering choice: if adapting `EstimateRightSidebar` would create misleading estimate-context branches, create a thin template-workbench source-dock adapter that uses the same tree/header primitives but owns workspace-level Project semantics.

Rejected: deferring or hiding `Project`. The user's requested tab set is exactly `Library` and `Project`.

### E. Browse-route source dock and cache boundary

Target files:

- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/lib/component-library/query-keys.ts`
- `src/lib/component-library/actions.ts`

Plan:

- `TemplatesBrowsePageClient` already owns template query seeding; extend its props only if the workbench source dock needs `workspaceId`/`userId` from `queryScope`.
- `TemplatesBrowseManager` owns `dockRequested`, selected project id, and source dock visibility. This mirrors `TemplateEditorClient`'s intent-gated `dockRequested` pattern but keeps browse state local.
- The Library source dock uses `workspaceComponentLibraryLiteQueryKey(workspaceId)` and `loadCurrentWorkspaceComponentLibraryLite()` only after source-dock intent when `workspaceId` is known. If scope is missing, render an unavailable state instead of firing a workspace-less query.
- `onLibraryDataChanged` invalidates the workspace component-lite query and the scoped templates query as needed; it must not call broad `router.refresh()` for dock-only data.
- Project source dock data uses the Project-tab key shape above and loads only after project selection.
- If `EstimateRightSidebar` cannot represent this without estimate-specific assumptions, create a route-local adapter that composes the same primitives and leaves `EstimateRightSidebar` unchanged for estimate/editor hosts.

## Data Rules

- Template seed remains workspace-scoped and user/workspace query-key partitioned.
- Component library dock data remains lazy and cacheable with `workspaceComponentLibraryLiteQueryKey(workspaceId)`.
- Project tab data must use a project-scoped key and must not reuse workspace-only cache keys if selected project changes.
- Viewer/member read access may browse templates; editor/admin write access mutates.
- Copy semantics remain snapshot-based; inserted data is not a live link.
- Preserve the current `initialData` plus `staleTime` cache pattern for warm template route revisits.
- Preserve current direct cache patching vs invalidation granularity on browse mutations; do not replace it with broad `router.refresh()` unless a canonical reseed claim requires it.
- Project selector data must be bounded and authorization-scoped; selecting a project changes the project-source cache key and resets Project-tab tree state.

## Mutation Rules

Conservative track:

- No new mutation semantics required for initial layout transition.
- Existing template create/rename/duplicate/move/delete and insert picker behavior must remain unchanged.
- Full editor mutations stay in `[templateId]`.

Integrated editor track:

- Add UI capability gating first.
- Add conflict semantics decision: accept single-editor optimistic beta or add revision columns/RPC guards.
- Convert multi-statement copy/reorder paths to transactional RPCs before expanding project-source composition.
- Add rollback and idempotency handling for route-launched inserts.

## Performance Rules

- Do not load right-dock component/project datasets before user intent unless a measured route budget supports it.
- Do not let inactive sidebar trees render when hidden.
- Do not let stored prefs trigger hidden `Templates` work.
- Keep route transition budget aligned with existing `authenticatedWorkshopTransition` measures.
- Do not merge route trees or globalize route state in the name of visual parity; that widens cache and revalidation blast radius without solving the visible UX requirement.
