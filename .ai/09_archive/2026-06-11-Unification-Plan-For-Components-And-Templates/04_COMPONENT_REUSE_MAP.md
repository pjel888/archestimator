# 04 — Component Reuse Map

Per the DESIGN.md component-reuse contract: no feature-local duplicates of buttons, search inputs, dropdowns, trees, or panels. Everything below names the exact module. **All paths and exports verified against the working tree at commit `8f6f116` (2026-06-11).**

## Reused as-is

| Need | Existing component | Path |
|---|---|---|
| Page tabs | `TabStrip` (Storybook title: `Navigation/TabStrip`, `src/stories/navigation/tab-strip.stories.tsx`) — NOT the underline/pills `Tabs` (`Navigation/Tabs`, `tabs.stories.tsx`); `TabStrip` is the estimate-page vocabulary via `TreePanelHeader`. Note `WorkshopTreeTabs` is just a re-export alias of `TabStrip` (`src/components/workshop/workshop-tree.tsx:269`). `Tabs` stays available for secondary in-dock content if ever needed | `src/components/ui/tab-strip.tsx` |
| Tree panel sticky header (search disclosure + icon toolbar) | `TreePanelHeader` | `src/components/ui/tree-panel-header.tsx` |
| Icon toolbar | `HeaderIconToolbar` (`showDefaultActions={false}` unless wired) | `src/components/ui/header-icon-toolbar.tsx` |
| Search input | `SearchInput` | `src/components/ui/search-input.tsx` |
| Resizable panels (tree + dock) | `ResizableSidePanel` | `src/components/workshop/ResizableSidePanel.tsx` |
| Tree rows / DnD | Tree primitives in `src/components/ui/tree.tsx` (`TREE_ROW_ICON_SIZE = 12` at line ~53, `externalDrop` support at line ~99 — there is no single `Tree` default export) plus `WorkshopTree` (`src/components/workshop/workshop-tree.tsx`); the estimate sheet tree uses `react-complex-tree` (`ControlledTreeEnvironment`) | `src/components/ui/tree.tsx`, `src/components/workshop/workshop-tree.tsx` |
| Value pickers | `DropdownSelect` | `src/components/ui/dropdown-select.tsx` |
| Action menus / context menus | `DropdownMenu` (`src/components/ui/dropdown-menu.tsx`); `ActionMenu`/`ContextActionMenuContent` live in `src/components/ui/action-menu.tsx` | both paths listed |
| Panel width persistence | width storage-key config (both `component_library_tree_width` and `template_library_tree_width` already defined) | `src/components/workshop/side-panel-widths.ts` |
| Bulk selection dock | `BulkActionToolbar` (`placement="bottom-dock"`) | `src/components/ui/bulk-action-toolbar.tsx` |
| Empty states | `EmptyState` | `src/components/ui/empty-state.tsx` |
| Buttons | `Button` variants | `src/components/ui/button.tsx` |
| Modals/dialogs | `Modal`, existing confirm dialogs | `src/components/ui/overlays/modal.tsx` |
| Archive flow | `BulkDestructivePreviewModal` | existing library flow |
| Add component form | `AddComponentModal` / `NewComponentForm` | `src/components/workshop/component-library-manager/`, `src/components/workshop/component-library/NewComponentForm.tsx` |
| New template modal | `NewTemplateModal` | `src/components/workshop/component-library/NewTemplateModal.tsx` |
| Drag state | `estimate-workshop-drag` store, `beginEstimateWorkshopDrag`, `useEstimateWorkshopDrag` | `src/components/workshop/estimate-workshop-drag.ts` |
| Drag payloads | `application/x-archestimator-library-item`, `ESTIMATE_TEMPLATE_DRAG_MIME_TYPE`, `EstimateTemplateDragPayload` union | `src/components/workshop/component-library/templates.ts` |
| Library tree builders | `buildLibraryTree`, helpers | `src/components/workshop/component-library/tree/buildLibraryTree.ts`, `helpers.ts` |
| Trees (dock) | `LibraryTree`, `TemplatesTree` | `src/components/workshop/component-library/tree/` |
| Page shell | `WorkshopPageShell`, `MainSidebar` | `src/components/workshop/WorkshopPageShell.tsx`, `src/components/sidebar/MainSidebar.tsx` |

## Extended (existing module, new capability)

| Component | Extension | Why |
|---|---|---|
| `ComponentLibraryManager` (`src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`) | Tree moves to left slot; right slot becomes inspector dock; orange add → ink primary; no-op filter/group removed or wired | Phase 1 backbone of Components tab |
| `LibraryFolderTree` (same dir) | Re-hosted in left panel; context-menu CRUD parity with templates tree | D4/D7 |
| `EstimateRightSidebar` (`src/components/workshop/component-library/index.tsx`) | Accept a generic "insert target" context (estimate XOR template) instead of assuming an estimate; bulk-add label switches (`Add to template`) | Re-host as the template editor's dock without forking |
| `TemplatesTree` | Add `Open` navigation action (router push to editor) alongside existing insert actions | Browse↔editor handoff |
| `SearchInput` | Optional visible-label slot (or documented dense-header exception) | Audit R6 |
| `WorkshopPageShell` (`src/components/workshop/WorkshopPageShell.tsx`) | Add optional `subHeader?: ReactNode` slot rendered under `WorkshopTitleHeader` so the library layout can host the page `TabStrip` inside the shell | Phase 0 routing (shell is per-page today; it moves to the library layout) |

## New components and composed surfaces

| New component | Purpose | Built from |
|---|---|---|
| `LibraryTabsLayoutClient` | Title bar + TabStrip + breadcrumb/mode-chip swap for editor route | `TabStrip`, `usePathname` |
| Component facet filters | Reuse/extend the existing generic `FilterPopover` exported from `src/components/ui/overlays/popover.tsx` and `src/components/ui/index.tsx`; add a library-specific wrapper under `src/components/workshop/library/` only if the generic popover cannot own selected-count/reset semantics cleanly | `FilterPopover`, `Checkbox`, `Chip`, `DropdownMenu` |
| `ComponentInspectorDock` | Detail inspector (mockup 01 right) | `ResizableSidePanel` + kv layout; data from existing item + price-history queries |
| `TemplatePreviewDock` | Browse-state preview (mockup 02 right) | outline rows reuse tree row styles |
| `TemplateGallery` | Template rows with actions (mockup 02 center) | replaces `TemplateLibrarySheet` card list |
| `TemplateEditorSheet` | Editable grid (mockup 03 center) | **shared row/cell primitives extracted from `EstimateSheetContent`** (see note) |
| `TemplateStructureTree` | Left tree of one template | `Tree` primitive + node CRUD menus |
| `InsertIntoEstimatePicker` | Project→estimate picker popover | `DropdownSelect`/`Modal` + existing project queries |
| `TemplateModeChip` | TEMPLATE badge | trivial; lives in `ui/` if reused |

### The big extraction (Phase 3 prerequisite)

`EstimateSheetContent.tsx` (**3,032 lines**, verified) owns the grid rendering today, and also re-exports `EstimateRightSidebar` at line 98 (canonical definition: `component-library/index.tsx:278` — import from there). Do **not** fork it for templates. Extract the presentational layer — group/area/item row components, cell editors, drop-zone row, sticky header — into `src/components/workshop/estimate-sheet/rows/*` consumed by both `EstimateSheetContent` and `TemplateEditorSheet`. Mutations stay separate (estimate actions vs template actions) behind a small `SheetMutationHandlers` interface. This is the riskiest refactor in the plan; it gets its own phase gate and `gitnexus_impact` run on every extracted symbol before edit.

## Retired

| Module | Fate |
|---|---|
| `TemplateLibraryManager.tsx` + `TemplateLibrarySheet` + `TemplateLibraryTreePanel` | Deleted after Phase 2 (gallery + left tree replace them) |
| `TemplatesPageClient.tsx` | Deleted; route becomes a redirect |
| `WorkshopTreeTabs` single-tab usage on both pages | Removed (page TabStrip replaces; audit P2-4 / Templates finding 7) |
| Empty 40px header row on templates page (`TemplateLibraryManager.tsx:398-406`) | Gone with the manager |
| Orange add-action styling (`header-icon-toolbar.tsx:150` — `bg-orange-50 text-orange-700 hover:bg-orange-100 …`) | Replaced by neutral tokens — fix lands in the shared primitive, benefiting every surface |
