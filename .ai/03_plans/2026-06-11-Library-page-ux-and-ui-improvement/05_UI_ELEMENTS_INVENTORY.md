# UI Elements Inventory

Status: corrected layout and element inventory. This document intentionally removes the old "Zone 1: Left Sidebar 288px" model.

## Corrected Zone Map

| Zone | Name | Current behavior | Audit status |
| --- | --- | --- | --- |
| G0 | Global workshop rail | Collapsed 64px rail on desktop via `lg:pl-[64px]`; expandable 288px global nav overlay. Hidden below `lg`. | Source-verified, visual pending |
| Z1 | Workshop title/header | Route title/header inside `WorkshopPageShell`. | Source-verified, visual pending |
| Z2 | Component sheet controls | Search input, toolbar, tab strip. | Source-verified, interaction pending |
| Z3 | Catalogue workspace | Grouped component card catalogue. | Source-verified, visual/perf pending |
| Z4 | Right tree/navigation panel | Folder/supplier/brand tree panel alongside sheet on wider viewports. | Source-verified, keyboard pending |
| Z5 | Modal/overlay layer | Add component modal and destructive preview modal. | Source-verified, e2e pending |

The global rail is not a Library page content column. Planning and screenshots should measure the Library workspace from the 64px collapsed rail edge on desktop, not from a permanent 288px sidebar.

## Element Inventory

### G0: Global Workshop Rail

| Element | Role | Current state | Required audit |
| --- | --- | --- | --- |
| Main nav rail | `nav`/buttons/links | Collapsed by default, expandable with toggle and keyboard shortcut | Confirm focus order, active route, reduced-motion behavior, and no content occlusion when expanded. |
| Components/Library link | link | Should navigate to `/workshop/library` | Confirm active state and accessible name. |
| Sidebar toggle | button | Toggles expanded/clipped state | Confirm visible focus and `Escape` collapse behavior. |

### Z1: Workshop Header

| Element | Role | Current state | Required audit |
| --- | --- | --- | --- |
| Page title | heading/title region | Title `Library` from `WorkshopPageShell` | Confirm hierarchy, app typography, and no duplicated eyebrow. |
| Breadcrumbs | navigation | `["Library"]` passed from route | Confirm label and keyboard skip cost. |
| Settings/notification actions | buttons/modals | Shell-owned | Confirm they do not disrupt Library focus order. |

### Z2: Component Sheet Controls

| Element | Role | Current state | Required audit |
| --- | --- | --- | --- |
| Search input | searchbox/input | Placeholder "Search Component Sheet"; `aria-label="Search component sheet"` | Add visible label or otherwise prove placeholder-only pattern is acceptable in dense header. Verify label-in-name and result announcements. |
| Clear search | button | Present through `SearchInput` when query exists | Verify target size, accessible name, and focus retention. |
| Filter button | icon button | Visible no-op if no `onFilter` prop | Remove/hide or wire before release. |
| Group button | icon button | Visible no-op if no `onGroup` prop | Remove/hide or wire before release. |
| Add Component | icon/add action | Opens Add modal, but default toolbar styling falls to orange classes | Override to neutral token styling or update toolbar default. Verify focus return. |
| Tab strip | tablist | Single selected tab with context label | Verify semantics are justified for single-tab state; otherwise simplify. |

### Z3: Catalogue Workspace

| Element | Role | Current state | Required audit |
| --- | --- | --- | --- |
| Category/group headings | headings/sections | Grouped card sections | Confirm heading levels, empty group policy, and count accuracy against DB. |
| Component card | list item/card-like surface | Displays thumbnail, name, category, price/unit, supplier/brand, confidence/source/date metadata where available | Confirm scannability, truncation, contrast, and whether card affordance implies clickable detail. |
| Thumbnail image | `next/image` | All visible items currently have thumbnail paths | Verify dimensions, alt text, lazy/preload behavior, LCP, and layout shift. |
| Archive checkbox | checkbox | Selects card for archive/bulk preview | Verify accessible label, target size, selected count, and keyboard operation. |
| Price text | text/numeric | Shows cost and unit | Verify tabular numeric alignment and contrast. |
| Supplier/brand metadata | text/chip candidate | Supplier present for 153/154; brand for 118/154 | Verify missing-brand copy and avoid obsolete "No supplier" broad issue. |
| Confidence/source/date metadata | text/badge candidate | Searchable fields | Verify visual hierarchy and trust meaning. |

### Z4: Right Tree/Navigation Panel

| Element | Role | Current state | Required audit |
| --- | --- | --- | --- |
| View mode controls | segmented/menu buttons | Switch folder/supplier/brand tree data mode | Verify selected state and label clarity. |
| Tree search | searchbox/input | Source present | Verify visible label, keyboard interaction, result status, and no-results state. |
| Folder/category nodes | tree items/buttons | Expand/collapse/select | Verify APG-compatible keyboard behavior or document alternate semantics. |
| Drag/drop controls | pointer/keyboard actions | Source present | Verify reorder affordance, keyboard alternative, permissions, and error states. |
| Bulk tree actions | buttons/menus | Source present | Verify destructive preview and status messaging. |

### Z5: Modal/Overlay Layer

| Element | Role | Current state | Required audit |
| --- | --- | --- | --- |
| Add Component modal | dialog | Add-only form | Verify focus trap, labels, validation, loading, error, file upload, and save success. |
| Supplier/brand comboboxes | combobox/listbox | Source present | Verify APG keyboard behavior and active option visibility. |
| File upload | file input/drop area | Source/API present | Verify constraints, progress/error states, and storage behavior. |
| Bulk archive preview | dialog/confirm | Source present | Verify destructive copy, item count, permission failures, cancellation, and success status. |

## Design-System Compliance Risks

| Risk | Evidence | Required correction path |
| --- | --- | --- |
| Orange Add button in workshop UI | `HeaderIconToolbar` default class uses `bg-orange-50 text-orange-700` | Override or change default to neutral app tokens before release. |
| Visible no-op controls | Filter/group buttons render by default without handlers | Hide with `showDefaultActions={false}` or implement real handlers. |
| Card shadow/depth | Catalogue card shell includes shadow class | Check against `DESIGN.md` preference for crisp neutral surfaces; keep only if it improves scanability and passes visual review. |
| Placeholder-only search label | Search relies on placeholder plus aria label | Add persistent label or prove dense header pattern meets usability/accessibility bar. |
| Single-tab tablist | One selected tab may be unnecessary semantic overhead | Simplify or ensure it carries meaningful context. |

## Existing UI Primitives To Prefer

Use the barrel export from `src/components/ui/index.tsx` before creating new markup:

| Need | Existing primitive candidates |
| --- | --- |
| Primary/secondary actions | `Button`, `IconButton`, `ToolbarIconButton`, `HeaderIconToolbar` |
| Search and filters | `SearchInput`, `FilterPopover`, `Popover`, `DropdownMenu`, `CommandDialog` |
| Detail/inspection | `InspectorDrawer`, `Sheet`, `SidePanel`, `Drawer` |
| Dense list/table | `DataTable`, `ScrollArea`, `Pagination`, `Tabs` |
| Tree | `Tree`, existing `LibraryFolderTree` primitives |
| Feedback | `Toast`, `Alert`, `Banner`, `Spinner`, `Skeleton`, `EmptyState` |
| Confirm destructive action | `ConfirmDialog`, `DeleteConfirmDialog`, existing `BulkDestructivePreviewModal` |
| Form controls | `ControlInput`, `ControlTextarea`, `ControlSelect`, `CreatableCombobox`, `CurrencyInput`, `DatePicker`, `FileUpload`, `Checkbox` |

## Inventory Completion Criteria

The inventory is complete only after authenticated screenshots confirm:

1. Desktop, tablet, and mobile layout.
2. Collapsed and expanded rail behavior.
3. Search, no-results, add modal, archive preview, tree mode switch, and tree search states.
4. Keyboard focus order and visible focus on every interactive element.
5. Contrast and target-size checks on all controls.
6. Console and network logs with no unexpected runtime errors.
