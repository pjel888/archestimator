# 02 - User Flows And Action Paths

All file paths, columns, enums, query keys, server actions, RPCs, constants, and test commands in this doc bind to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone). When this doc and the keystone disagree, the keystone wins. Phase labels and the single-priority tags use the keystone Phase Map: 0A Contract Lock, 0B Overlay & Route-State Reliability, 1 Findability & Applied Filters, 2 Source Trust at Decision Points, 3 Add/Edit Component Flow Split (Quick Add), 4 Templates Browse/Insert/Editor Clarity, 5 Dense Maintenance Mode. Canonical order: 0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5.

Every flow below names its inline loading, empty, and error states so an implementer does not have to invent them.

## Flow 1 - Find A Component From Overview

Current path:

1. User lands on `/workshop/library` (`src/app/workshop/library/page.tsx`).
2. User searches in `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`, backed by the `searchLibraryOverview` server action.
3. Template results open the template editor route `/workshop/library/templates/[templateId]`.
4. Component results route to `/workshop/library/components` without selecting the item; `RecentComponentCard.tsx` has the same loss.

Friction:

- The exact item intent is lost.
- The user may need to search again or scan the folder tree.
- Recent component cards have the same issue.

Target path:

1. Search result or recent card routes to `/workshop/library/components?component=<id>` (canonical param per `13-DATA-CONTRACTS-ROUTE-CACHE.md`; `<id>` = `cost_library_items.id`).
2. Components route (`LibraryPageClient.tsx` -> `ComponentLibraryManager.tsx`) reads `?component=<id>` and opens the inspector dock (`ComponentInspectorDock.tsx`) for that item.
3. The card is highlighted, scrolled into view, and focus lands on the inspector heading or the close/edit action.
4. Back returns to Overview with the search state or at least route history intact.
5. Closing the inspector removes only `component` from the URL.

Inline states:

- Loading: while `loadCurrentWorkspaceComponentRowsLibrary` (key `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`) is in flight, the route shows its existing `loading.tsx` skeleton. The placeholder-vs-not-found boundary is decided by TanStack Query state, not by list membership alone: show the inspector's self-contained "Loading component" placeholder when the targeted `?component=<id>` row is absent from the cached list AND the query is still resolving (`isLoading || isFetching`, i.e. an initial fetch or an in-flight refetch could still surface it); switch to the Empty / not-found state below only once the query has settled (`isFetching === false && isSuccess`) and the `<id>` is still absent. This makes the gate self-checkable: "absent + still fetching" -> placeholder; "absent + settled" -> not-found.
- Empty / not-found: if `<id>` does not resolve in the current workspace (deleted, archived-and-filtered, or denied), show an inspector-level not-found state with a clear-selection action; preserve other search/filter/folder context; do not leak whether a cross-workspace object exists (mirrors the invalid-`component` contract in `13-DATA-CONTRACTS-ROUTE-CACHE.md`).
- Error: a fetch failure surfaces inline in the inspector with a retry that re-runs the same query key; the search/filter/folder state is preserved per the cross-flow failure contract.

Priority: Phase 1 (overview-search-to-`?component=<id>` continuity). The `?component=<id>` route-state plumbing itself lands in Phase 0B.

## Flow 2 - Browse, Filter, And Inspect Components

Current path:

1. User enters Components tab.
2. Left tree (`LibraryFolderTree.tsx`) scopes folders/suppliers/brands.
3. Search and facet filters (`component-facet-filter.tsx`) narrow catalogue cards. Search is 100% client-side synchronous filtering over the in-memory dataset: the `facetedItems` useMemo at `ComponentLibraryManager.tsx:876` (facet filter `componentMatchesFacets` at `:877`) feeds the `visibleItems` useMemo whose search filter `itemMatchesSheetQuery` is at `:881` (deps close at `:882`) — i.e. the synchronous filter chain spans `ComponentLibraryManager.tsx:876-882`. There is no stale/out-of-order response race today.
4. User opens the inspector dock (`ComponentInspectorDock.tsx`) from a card.
5. User can edit, duplicate, archive, or promote a projection.

Strengths:

- Strong metadata on cards and inspector.
- Cache warming keeps route transitions efficient.
- Folder tree and selected branch context are useful.

Friction:

- Applied filter state is mostly hidden behind the filter popover.
- Card format is slower for maintenance comparison.
- Component exact selection is not URL-addressable enough yet.

Target path:

- Keep the current browse model.
- Add visible applied filter chips or a compact applied-filter strip, driven by the `component-facet-filter.tsx` filter state (including the `ComponentPricingFreshness` facet: `any | fresh | stale | missing`).
- Add clear-all and per-facet reset.
- Make selected component state URL-driven and shareable via `?component=<id>`.
- Add dense list/table mode (Phase 5; net-new — no density toggle exists yet) reusing `src/lib/workshop/virtualization-flags.ts` (`WORKSHOP_VIRTUALIZATION_FLAGS` + `@tanstack/react-virtual`).

Inline states:

- Loading: route `loading.tsx` skeleton while `loadCurrentWorkspaceComponentRowsLibrary` resolves; filter/search remain interactive against the in-memory dataset once it is present.
- Empty (no items): show a folder/workspace-scoped empty state with an Add Component affordance.
- Empty (filtered to zero): show a "No components match these filters" state alongside the applied-filter chips and a clear-all action, so the user can recover without losing folder scope.
- Error: a fetch failure surfaces inline with retry; folder/search/filter/sort/density state is preserved per the cross-flow failure contract.

Priority: applied-filter chips and result/scope strip are Phase 1; URL-driven selection is Phase 0B/1; dense table mode is Phase 5.

## Flow 3 - Add A Component

Current path:

1. User clicks Add Component from Overview or Components.
2. Query param `?add=component` can open the modal from Overview.
3. `AddComponentModal.tsx` (2,359 lines) collects identity, folders, variants, costs, measurement, attachments, lifecycle, and activity.
4. Dirty close uses the native `window.confirm("Discard this component draft?")` at `AddComponentModal.tsx:963`.

Friction:

- The modal is too large for quick catalog capture.
- Advanced fields compete with required fields.
- Native discard confirm breaks overlay consistency.

Target path:

- Default to Quick Add (CANONICAL QUICK ADD CONTRACT; folder and category are two distinct axes, never conflated; no schema change — all columns already exist on `public.cost_library_items`):
  - Required: `name`, `category` (free-text taxonomy), `unit`, `unit_cost`.
  - Optional: `supplier`/`brand`, `pricing_date`, `pricing_source` (the "source URL/note"; URL validity is app-side over free text), `confidence` (free-text string, not an enum).
  - `libraryFolderId` is OPTIONAL and defaults to the currently selected folder (organizational axis, separate from required `category`).
- Submit calls `createCostLibraryComponent` (RPC `create_cost_library_component`); the action guards via `rpc("is_workspace_editor", { target_workspace_id })`.
- Offer Advanced Catalog Record:
  - Variants.
  - Cost entries.
  - Measurements.
  - Attachments.
  - Lifecycle and activity.
- Replace the native dirty-discard confirm with the text-prompt dialog pattern (inline `ConfirmDialog` from `src/components/ui/overlays/confirm-dialog.tsx`), matching the migrated pattern in `TemplatesBrowseManager.tsx`.
- Preserve focus return to the opener and restore draft state only when intentionally supported.

Inline states:

- Loading: Save shows a busy/disabled state while `createCostLibraryComponent` runs; the form stays mounted.
- Validation: missing any required field (`name`/`category`/`unit`/`unit_cost`) blocks submit with inline field errors; the action also validates server-side and returns a validation error distinct from permission/conflict per `action-errors.ts`.
- Error: a permission, validation, conflict, or network/database error returns inline without closing the modal or discarding the draft; on success, the modal closes and the affected caches invalidate per `13-DATA-CONTRACTS-ROUTE-CACHE.md` (overview, components, folder counts).

Priority: Phase 3 (Quick Add path). The native dirty-discard confirm replacement lands earlier in Phase 0B.

## Flow 4 - Manage Component Folders

Current path:

1. User creates, renames, or deletes folders from the component tree (`ComponentLibraryManager.tsx`).
2. Create/rename use native `window.prompt("Folder name")` (`ComponentLibraryManager.tsx:1493` create, `:1515` rename).
3. Delete uses native `window.confirm` (`ComponentLibraryManager.tsx:1534`).

Friction:

- Native prompts are inconsistent with the rest of Library.
- Error recovery and validation cannot be styled consistently.
- Focus return is browser-controlled rather than product-controlled.

Target path:

- Use the text-prompt dialog pattern for create/rename: there is NO standalone PromptDialog/InputDialog primitive, so reuse the inline `ConfirmDialog` + child `<input>` + local `textPrompt` state pattern from `TemplatesBrowseManager.tsx:531-883` (or explicitly scope extracting a shared primitive).
- Use the destructive confirmation dialog (`ConfirmDialog`) for delete.
- Wire create/rename/delete to `createLibraryFolder` / `renameLibraryFolder` / `deleteLibraryFolder` (delete RPC `delete_library_folder`).
- Show exact folder name and consequence copy.
- Show inline mutation errors without closing.
- Return focus to the invoking menu/button.

Inline states:

- Loading: the dialog primary action shows a busy/disabled state while the folder server action runs; the dialog stays open.
- Validation: empty or duplicate folder name blocks submit with an inline message (folder is the `libraryFolderId` org axis, distinct from `category`).
- Error: a mutation error renders inline in the dialog without closing; on success the dialog closes, focus returns to the invoking control, and the folder sidebar/counts + components surfaces invalidate per `13-DATA-CONTRACTS-ROUTE-CACHE.md`.

Note (in-scope, Phase-later): the estimate-page panel `src/components/workshop/component-library/index.tsx` still has the same native `window.confirm` (`:939`) and `window.prompt` (`:1428`); it is in `00-PLAN.md` scope and follows the same replacement.

Priority: Phase 0B (folder native-prompt replacement lands early, before Quick Add).

## Flow 5 - Archive Components In Bulk

Current path:

1. User checks component cards.
2. Bulk toolbar appears (`src/components/workshop/BulkActionToolbar.tsx`, over shared primitive `src/components/ui/bulk-action-toolbar.tsx`).
3. Bulk archive preview modal (`src/components/workshop/BulkDestructivePreviewModal.tsx`) shows affected components and confirmation, backed by `previewBulkArchiveLibraryComponents` / `executeBulkArchiveLibraryComponents` (RPCs `preview_bulk_archive_library_components` / `execute_bulk_archive_library_components`).

Strengths:

- Typed confirmation and server preview hash are good safety patterns.
- Selection mode is explicit.

Friction:

- Current copy conflicts about reversibility.
- Bulk action scope could expand later, but archive copy must be fixed first.

Target path:

- Fix the conflicting copy: `BulkDestructivePreviewModal.tsx:107-108` sets `confirmationHint = canExecute ? "This action cannot be undone." : ...`, gated on `canExecute` not on the verb. Branch the archive copy on `actionCopy.verb` so archive reads as hidden/restorable and "cannot be undone" is reserved for irreversible delete.
- Archive moves items to `lifecycle_state = archived` (recoverable), so the copy must say hidden-from-insertion/restorable.
- Future bulk actions can include move folder, lifecycle update, source refresh, and export.

Inline states:

- Loading: the modal shows a busy/disabled confirm while `previewBulkArchiveLibraryComponents` (preview) and `executeBulkArchiveLibraryComponents` (execute) run.
- Empty: if the selection resolves to zero eligible items server-side, the modal explains the empty result rather than executing.
- Error: a stale preview hash, permission, or network/database error returns inline, keeps the selection, and does not partially apply; on success the selected inspector state, overview, components, and folder counts invalidate per `13-DATA-CONTRACTS-ROUTE-CACHE.md`.

Priority: Phase 0B (archive-copy verb fix ships with the overlay reliability work).

## Flow 6 - Browse Templates

Current path:

1. User enters Templates tab (`src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`).
2. Left tree scopes template groups.
3. Gallery rows open preview dock or the editor route `/workshop/library/templates/[templateId]`.
4. User can insert into an estimate, rename, duplicate, move, delete, or create template.

Strengths:

- Tree/gallery/preview model is clear.
- Template browse already uses the design-system text-prompt dialog pattern (`ConfirmDialog` + child `<input>` + local `textPrompt` state, `TemplatesBrowseManager.tsx:531-883`) for rename/move/delete — these are NOT native prompts.
- Preview dock preserves browse context.

Friction:

- Move already uses a DS text-prompt dialog (not native), but a free-text group entry will not scale as group count grows (see `01-CURRENT-STATE-AUDIT.md` P3.1).
- Trust/source confidence for template contents is not prominent.

Target path:

- Replace the move text entry with the creatable combobox primitive `src/components/ui/creatable-combobox.tsx` (supports existing groups plus create-new) — this is the scaling fix for an already-DS dialog, not a native-prompt migration.
- Add a template trust summary when templates contain component-backed rows. Template trust counts (dependency count, missing-link, source-changed, archived/discontinued dependencies) are a COMPUTED JOIN over `estimate_template_row_items.source_library_item_id` / `link_state`, not stored fields; there is NO `last_reviewed`/`reviewed_at` column, so any "last reviewed" cue re-scopes to `estimate_templates.updated_at` or is gated behind the Data Migration Gate in `13-DATA-CONTRACTS-ROUTE-CACHE.md`.
- Keep preview in dock, not modal, because users compare while browsing.

Inline states:

- Loading: gallery and preview dock use route `loading.tsx`; the trust summary shows a compact loading cue while its computed-join counts resolve.
- Empty: no templates in scope shows a create-template empty state; a template with zero component-backed rows shows "no source-backed rows" rather than a misleading trust score.
- Error: a load or mutation error surfaces inline and preserves tree/gallery selection; move/rename/delete invalidate `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })` and template preview per `13-DATA-CONTRACTS-ROUTE-CACHE.md`.

Priority: creatable-combobox move and template trust summary are Phase 4.

## Flow 7 - Insert Template Into Estimate

Current path:

1. User selects Insert into estimate (`src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx`, a `Modal`).
2. Modal asks for project and estimate; the candidate targets come from `listEstimateInsertTargets`.
3. Submit resolves the target group/area via `resolveEstimateTemplateInsertTarget` (THE insert-target resolver).

Friction:

- The final insert destination is implicit.
- Empty/error target states arrive late.

Target path:

- Picker (`InsertIntoEstimatePicker.tsx`) lists candidates from `listEstimateInsertTargets` and displays Project, Estimate, and resolved group/area target.
- If only one valid target exists, disclose it (the `resolveEstimateTemplateInsertTarget` result) before submit.
- Submit remains disabled until the target is valid and re-resolved.
- On commit, the server re-resolves via `resolveEstimateTemplateInsertTarget` and authorizes via `rpc("can_edit_estimate", { target_estimate_id })` (defense-in-depth over RLS); it never silently switches targets per `13-DATA-CONTRACTS-ROUTE-CACHE.md`.
- Success offers "Open estimate".
- Failure remains inline and keeps selections.

Inline states:

- Loading: while `listEstimateInsertTargets` loads candidates and while `resolveEstimateTemplateInsertTarget` resolves the group/area, the picker shows a busy state and disables submit.
- Empty (no targets): if the user has no editable estimate (`can_edit_estimate` false for all candidates), show an explicit "No estimate you can edit" state with guidance, not a silent disabled submit.
- Stale target: if the resolved target changed or the estimate was deleted/moved after the picker opened, return a recovery state asking the user to reselect; do not mutate the wrong estimate.
- Error: permission, validation, conflict, stale-target, and network/database errors return distinctly and inline, keeping the user's Project/Estimate selections.

Priority: Phase 4 (explicit insert-target resolution and combobox-driven picker).

## Flow 8 - Edit Template

Current path:

1. User opens the template editor route `/workshop/library/templates/[templateId]` (`template-editor/TemplateEditorClient.tsx`).
2. Left tree manages structure.
3. Center sheet edits rows.
4. The component library dock can insert components (consumes `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`).
5. Add/rename/delete actions use design-system `ConfirmDialog` confirmations (already migrated off native prompts; matches are comments not calls).

Strengths:

- Template editor is already closer to the desired overlay model.
- Self-insert prevention exists.
- Inline quantity and optimistic row behavior are covered by tests.

Friction:

- Source confidence for rows is not prominent enough.
- Insert target fallback logic can feel implicit.
- The component library dock reads the UN-SCOPED `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]`, the one real workspace-switch cache-bleed surface (see `13-DATA-CONTRACTS-ROUTE-CACHE.md`); scope or invalidate it on workspace switch.

Target path:

- Show source/trust chips for component-backed rows, bound to real columns/helpers: `pricing_date` freshness via `getComponentPricingFreshness` and `getStalenessTone`/`getStalenessLabel` (`success | warning | danger`); `lifecycle_state` (`draft | in_production | available | discontinued | archived`); `confidence` (free-text label).
- Add source-change indicators using `estimate_template_row_items.link_state` (`unlinked | linked-clean | linked-overridden | detached | source-changed`); "missing source" is a DERIVED UI state when the source item is deleted, not an enum value. "Stale" is PRICING freshness only; link drift uses "source-changed".
- Keep the `ConfirmDialog` add/rename/delete pattern as the model for the component folder actions in Flow 4.

Inline states:

- Loading: trust chips render a compact loading cue while the row's source-resolution / freshness computes; the editable sheet remains usable.
- Empty: a row with no `source_library_item_id` shows no trust chip (manual row), not a false trust state.
- Error: a source-resolution failure degrades the chip to an unknown/neutral state without blocking row editing; row mutations preserve optimistic behavior and reconcile on settle.

Priority: Phase 2 (source-trust chips at decision points).

## Actor And Failure-State Addendum

All flows above must obey the actor split in
`14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`. Roles bind to the `workspace_role` enum
(`owner | admin | member | viewer`); writes guard via RPC `is_workspace_editor`
(role in `owner, admin, member`) and read access via `is_workspace_member` (any
membership):

- unauthenticated users get no protected Library access
- public/shared-link viewers get only the FROZEN snapshot rendered from
  `project_publications.snapshot_json` via `src/app/share/[token]` +
  `src/app/api/share/[token]/route.ts` — NOT a live Library query; redaction is
  about what the snapshot builder writes into `snapshot_json`, per
  `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`
- workspace `viewer` can inspect but not mutate Library data (the only read-only
  role)
- workspace editors (`owner | admin | member`) can create, update, and insert
  within permitted workspace scope
- `admin`/`owner` can perform destructive Library management inside their
  workspace

Cross-flow failure contracts:

- Keep safe context on retry: search text, filters, folder, sort, density, and
  pagination remain unless the failed state itself invalidates them.
- Never silently switch a mutation target. If the target estimate, project,
  folder, component, or template is stale, ask the user to reselect or confirm.
- Permission errors name the missing capability without leaking whether a
  cross-workspace object exists.
- Public/shared-link routes never redirect into protected Library edit surfaces.
- Autosave is not assumed. Unsaved changes require explicit save, cancel, or
  app-owned discard behavior.

Additional hostile branches to design and test:

- Overview result belongs to another workspace.
- Selected `?component=<id>` route param is invalid, deleted, `archived`, or denied.
- User switches workspace with the inspector dock open (note the un-scoped
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` cache-bleed surface — it must refetch or
  clear on workspace switch).
- Folder (`libraryFolderId`) is deleted while selected in the route.
- Insert target is deleted or changed after the picker opens (re-resolve via
  `resolveEstimateTemplateInsertTarget` + `can_edit_estimate`).
- Template includes `archived`, `discontinued`, `source-changed`
  (`estimate_template_row_items.link_state`), or deleted-source (derived
  "missing source") component dependencies.
- Network failure returns after the user changed search/filter state.
