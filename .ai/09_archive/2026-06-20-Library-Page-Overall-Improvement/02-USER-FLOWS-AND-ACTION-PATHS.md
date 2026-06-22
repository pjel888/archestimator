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
3. The card is highlighted, scrolled into view, and focus lands on the inspector heading or the close/edit action. Visual (doc 35): the selected card adopts the glass selected state (`data-project-card-selected="true"` over `.workshop-project-card-glass` in Phase 2, `border-accent ring-1 ring-accent` on paper in Phase 1); the inspector dock renders as a floating `estimate-glass-rail` (`inspectorDock` slot).
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
- Visual (doc 35): the Components tab becomes a glass workspace — `estimate-glass-well` canvas, floating `estimate-glass-rail` tree/inspector rails, `estimate-glass-paper` centre, `estimate-glass-chrome` sticky header — via the `librarySurfaceClass(variant, slot)` slot system (Phase 1 skeleton). Catalogue cards promote to content-grade `.workshop-project-card-glass` in Phase 2; the Phase-5 dense mode must hold card-glass geometry at dense row heights (glass slots degrade to `--glass-bg-fallback` when `data-glass="ready"` is unset; jsdom never asserts blur).

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
- Visual (doc 35): per the overlay rule, modals keep a crisp paper interior (one blur per region, on the scrim only) so the form fields stay legible — Quick Add and the Advanced modal are NOT frosted panels; `BlurModal` is reserved for the rare single-blur case. The opener toolbar's primary action is a warm-glass CTA (`.dashboard-glass-warm`) / liquid button (`.workshop-liquid-button`).

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
- Visual (doc 35): the Templates tab adopts the same glass family as the Components tab (`workspaceWell`/`treeRail`/`centerColumn`/`sheetHeader` slots) in Phase 1; gallery rows stay paper through Phase 4 and promote to content-grade `.workshop-project-card-glass` in Phase 5 (one blur per region; chips are flat soft-fill spans on the glass, never nested glass).

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
- Visual (doc 35): the editor work surface is an `estimate-glass-well` with a floating `estimate-glass-paper` centre and a sticky `estimate-glass-chrome` header; **editable rows/fields stay paper** (`bg-white`) inside the glass paper so text editing stays crisp, and drop zones are translucent `bg-surfaceMuted/50` (no extra blur). Trust chips render as flat soft-fill spans on the glass paper, never nested glass.

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

---

## Flow Metadata Matrix (closes doc 25 §3 gaps; informational flows delegate per doc 34 §3)

Per doc 34 §3, **flow rows are informational** — they delegate the 12-dim dimensions to companion docs (27 Owner / 21 Flag / 17 Rollback / 24 Evidence / 20 Telemetry / 22 Copy / 31 A11y / 30 Perf / 29 Browser-proof / 28 i18n). This matrix is the delegation index: every flow binds to a phase, a flag, a rollback, a telemetry event, an a11y one-liner, a responsive one-liner, and the copy keys for its empty/error/denied states. An implementer building a flow reads the flow prose above for behavior + this row for dimensions.

### Dimension delegation per flow

| Flow | Phase (doc 19) | Flag (doc 21) | Rollback (doc 17) | Evidence (doc 24) | Telemetry (doc 20) | A11y (doc 31) | Responsive (doc 12/31) | Copy keys (doc 22) |
|---|---|---|---|---|---|---|---|---|
| F1 Find a component from overview | 0B (route state) + 1 (continuity) | `library_component_deep_link` | redeploy flag=false (~5 min, C-010) → broad route, no deep-link | EV-FRONTEND-01 | `library_find_*` (result_clicked) | focus lands on inspector heading or close/edit action (focus-visible); selection announced once | overview bento → 2-up → 1-up per doc 35 §12; search input remains interactive at ≥320px | `library.search.placeholder`, `library.search.no_results`, `library.inspector.not_found`, `library.inspector.clear_selection` |
| F2 Browse, filter, inspect | 0B/1 (filter chips) + 5 (dense) | `library_component_deep_link` (selection); `library_dense_mode` (table); `library_cache_scope` (bleed fix at the editor dock, Phase 0B) | redeploy flag=false per flag; dense → card grid only | EV-FRONTEND-01 (chips); EV-FRONTEND-09 (dense) | `library_filter_applied`, `library_filter_cleared`, `library_component_selected` | applied-filter chips are removable via keyboard (Tab+Enter); result-count polite live region (doc 31 §5) | filter popover → bottom-sheet ≤768px; chip-wrap on mobile; dense table horizontal-scroll ≤1023px | `library.filter.applied_count`, `library.filter.clear_all`, `library.empty.filtered`, `library.empty.folder`, `library.filter.heading` |
| F3 Add a component | 0B (discard dialog) + 3 (Quick Add) | `library_quick_add` | redeploy flag=false → full AddComponentModal advanced path | EV-FRONTEND-08 | `quick_add_opened`, `quick_add_field_invalid`, `quick_add_saved` | dialog is `alertdialog` role with focus-trap; required fields `aria-invalid`; Escape = cancel (not discard) | modal full-bleed ≤768px; advanced fields collapse below required four on narrow viewports | `quick_add.title`, `quick_add.cta`, `quick_add.field.<name>.label`, `quick_add.field.<name>.error.required`, `confirm.discard_draft.title`, `confirm.discard_draft.body`, `confirm.discard_draft.cta` |
| F4 Manage component folders | 0B (early — before Quick Add) | `library_folder_dialogs` | redeploy flag=false → legacy native prompts as emergency-only fallback | EV-FRONTEND-02 | `folder_create_opened`, `folder_rename_opened`, `folder_delete_opened`, `folder_mutated` | text-prompt dialog `alertdialog`; focus lands on the input; focus returns to invoking control on close; delete is destructive `ConfirmDialog` with affected count | dialog full-bleed ≤768px; tree branches scroll independently | `folder.create.title`, `folder.create.body`, `folder.rename.title`, `folder.delete.title`, `folder.delete.body.count`, `folder.delete.cta`, `folder.error.duplicate_name`, `folder.error.empty_name` |
| F5 Archive components in bulk | 0B (copy fix) | n/a (copy fix; no new surface) | revert the `confirmationHint` commit; redeploy | n/a (existing modal) | `bulk_archive_previewed`, `bulk_archive_executed`, `bulk_archive_skipped` | destructive confirmation names affected count; partial-invalid IDs reported as skipped (polite live region) | modal scrolls internally on narrow viewport; selection mode explicit | `bulk.archive.title`, `bulk.archive.body.count`, `bulk.archive.hint.reversible`, `bulk.delete.hint.irreversible` (verb-branch per P2.3) |
| F6 Browse templates | 4 (combobox move + trust summary) | reuses `library_trust_chips` for trust summary | redeploy flag=false → trust summary hidden; real warnings unaffected | EV-BE-04 | `library_template_opened`, `template_route_not_found` (doc 13 §"Telemetry hooks") | gallery cards keyboard-navigable (Tab/Arrows); trust summary polite live region while join resolves | gallery → 2-up → 1-up; preview dock → bottom-sheet ≤1023px | `template.browse.empty`, `template.trust.loading`, `template.trust.no_source_rows`, `template.trust.count` (plural ICU per doc 28 §4) |
| F7 Insert template into estimate | 4 (explicit target + combobox picker) | n/a (no new flag; picker behavior change) | revert the picker commit; redeploy | EV-BE-04 | `insert_target_resolved`, `insert_target_confirmed` (component-path; template-path uses `insert_target_confirmed` per doc 20) | picker is `Modal` (alertdialog); submit disabled until target valid+re-resolved; stale-target recovery state announced (assertive live region for the error) | picker full-bleed ≤768px; project/estimate comboboxes collapse to native select ≤640px | `insert.picker.title`, `insert.picker.no_editable_estimate`, `insert.picker.target_resolved`, `insert.picker.stale_target`, `insert.picker.error.permission` |
| F8 Edit template | 2 (trust chips at decision points) | `library_trust_chips`; `library_cache_scope` (scope the un-scoped key — the one bleed surface in this flow) | redeploy flag=false for trust chips → existing hierarchy; redeploy `library_cache_scope=false` → un-scoped key returns (bleed) | EV-BE-04; EV-CACHE-01 (cache-bleed); EV-WS-SWITCH-CACHE | `trust_chip_*` (exposure + insert-gate decisions per doc 11 §"Trust-chip Telemetry"); `workspace_switch_cache_recovery` (bleed recovery) | trust chips are flat spans (not interactive), so no extra tab stops; chip color is NOT the sole carrier (icon + text per doc 31 §2); editable rows stay paper for legibility | editor 3-pane → 2-pane → 1-pane with inspector-dock drawer ≤1023px per doc 12; chip-wrap on mobile | `trust.label.fresh`, `trust.label.stale`, `trust.label.very_stale`, `trust.label.missing`, `trust.label.source_changed`, `trust.label.archived_dependency`, `trust.label.discontinued_dependency`, `trust.label.missing_source` |

### Notes on the matrix

- **Phase column** is the earliest phase whose contract the flow consumes (severity-to-phase rule, doc 01 §"Hardening Audit Addendum").
- **Flag column** names the flag in doc 21 §4 that gates the flow's new behavior. `n/a` means the flow is a pure behavior fix (no new flag) or a regression-protected existing flow.
- **Rollback column** is the one-line behavior from doc 17 §phase-rollback + doc 21 §4 rollback cell.
- **Telemetry column** names the events from doc 20 §6/§6A. Trust decision events (`trust_insert_gate_*` from doc 11 §"Trust-chip Telemetry") and route-state events (`library_component_selected`, `route_state_authz_denied`, `workspace_switch_cache_recovery` from doc 13 §"Telemetry hooks") are already registered in doc 20 — they are listed here by name so a flow-builder doesn't have to grep for them.
- **A11y column** is the one-line pass condition from doc 31 §2 (WCAG 2.1 AA + Library-specific: focus ≥2px ≥3:1, touch ≥44px, color-not-sole-carrier, chip-not-badge C-002, secondary #5D5D5D never tertiary #7F7F7F for load-bearing meta) — the full per-surface criteria live in doc 31.
- **Responsive column** is the one-line breakpoint behavior from doc 12 §responsive-contract.
- **Copy keys column** lists the keys from doc 22; ICU plural shapes follow doc 28 §4 (`{count,n, plural, =0 {} =1 {} other {#}}`); screen-reader-only keys use the `*.sr_label`/`*.announcement` suffix convention per doc 22 §12C.

### Cross-flow failure contracts — dimension mapping

The "Actor And Failure-State Addendum" + "Cross-flow failure contracts" + "Additional hostile branches" sections above are **informational behavioral contracts** (not gate rows). Their dimension coverage:

| Contract | Owner (doc 27) | Phase | Binding |
|---|---|---|---|
| Actor split (workspace_role enum) | Security lead | 0A (contract lock) | doc 14 actor matrix; `workspace_role` enum in doc 19 §Enums |
| Cross-flow failure contracts (5 bullets) | Frontend lead + Backend lead | each flow's phase | doc 13 §"Cross-flow failure contracts"; doc 02 above |
| Hostile branches (7 cases) | Security lead + QA lead | 0A (test scaffolding) + each flow's phase | doc 18 ADV rows (ADV-KEYBOARD-MGMT, ADV-WS-SWITCH-CACHE, ADV-PUBLIC-REDACTION, ADV-ROUTE-STATE, ADV-STALE-TARGET, ADV-COPY-MICROCOPY, ADV-VIEWER-MUTATION) |
