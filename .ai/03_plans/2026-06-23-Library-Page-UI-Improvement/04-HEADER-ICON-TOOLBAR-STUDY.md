# 04 - HeaderIconToolbar Study

## Why This Matters

The Library has tree-like panes, filters, display modes, add actions, and route tabs. Those are exactly the jobs already covered by `TreePanelHeader`, `HeaderIconToolbar`, `ToolbarIconButton`, `SearchInput`, `DropdownSelect`, and `TabStrip`. A local Library toolbar rule would make the UI drift further from Estimate Sheet and Projects.

## Source Contract

| Contract | Evidence | Library rule |
|---|---|---|
| Toolbar owns start/filter/expand/leading/add groups | `src/components/ui/header-icon-toolbar.tsx:88` | Do not build custom flex rows for pane tools unless a shared primitive cannot express the state. |
| Toolbar has a 38px sticky row through `TreePanelHeader` | `src/components/ui/tree-panel-header.tsx:194` | Components and Templates pane headers should use this rhythm. |
| Filter-only toolbar avoids orphan divider | `src/components/ui/header-icon-toolbar.tsx:113` | If a Library surface has only filters, avoid fake add/leading actions just to fill space. |
| Icon-only buttons get tooltips | `src/components/ui/toolbar-icon-button.tsx:78` | Library icon controls need accessible labels and tooltips. |
| Add emphasis is centralized | `src/components/ui/toolbar-icon-button.tsx:10` | Use orange add intentionally; do not duplicate the class or scatter orange. |
| Tree headers can include tabs below the toolbar | `src/components/ui/tree-panel-header.tsx:256` | Use built-in tab placement for pane-local tabs; do not add extra local tab strips. |

## Consumer Inventory

| Consumer | Current usage | Library implication |
|---|---|---|
| `TreePanelHeader` | Directly renders `HeaderIconToolbar` (`src/components/ui/tree-panel-header.tsx:212`) | Preferred wrapper for Library pane headers. |
| Estimate sheet tree | Uses shared header, filter popover, add action, and tabs (`src/components/workshop/EstimateSheetTree.tsx:1382`) | Closest production pattern for Library tree panes. |
| Estimate sheet content | Uses transparent local header/filter slot and tab strip (`src/components/workshop/EstimateSheetContent.tsx:721`, `src/components/workshop/EstimateSheetContent.tsx:3120`) | Components center sheet should preserve this rhythm. |
| Projects collection | Builds add action and filter controls before passing into collection layout (`src/components/workshop/projects-page-client.tsx:851`, `src/components/workshop/projects-page-client.tsx:1218`) | Use Projects for collection-level add/filter tone, not for dense data layout. |
| Library folder tree | Already builds `HeaderIconToolbarAddAction` for add folder (`src/components/workshop/component-library-manager/LibraryFolderTree.tsx:992`) | Keep; reskin with surface slots. |
| Older component-library manager | Uses `ToolbarIconButton` action cluster (`src/components/workshop/component-library/index.tsx:2201`) | Treat as historical/adjacent pattern, not the canonical route family target. |
| Share tree and activity history | Direct toolbar consumers outside Library | Shared changes can ripple; keep primitive cleanup late and tested. |

## Slot And Prop Rules

- `startActions`: navigation, view-by controls, or leftmost contextual tools.
- `filterSlot`: compact filter/search controls that affect the current pane.
- `leadingActions`: secondary pane utilities that should not be primary create actions.
- `addActions`: real create actions only. Do not render disabled/no-op add actions as decoration.
- `showVisibleLabel`: reserve for the dominant add action or when an icon alone is ambiguous.
- `toolbarClassName`: use `librarySurfaceClass(surfaceVariant, "toolbar")` or equivalent slot in glass contexts.
- `className` on `TreePanelHeader`: use a rail/header slot such as `librarySurfaceClass(surfaceVariant, "railPanelHeader")`.

## Label And Emphasis Policy

- Use icon-only plus tooltip for routine filter/view/expand/collapse actions.
- Use one visible-label primary add action when the page needs a clear creation entry point.
- Use neutral add actions for secondary create paths in dense toolbars.
- Use `workshop-liquid-button` for a visible primary action in glass command bands.
- Do not mix project-header square utility buttons and toolbar icon buttons in the same row unless the row has two clearly separated zones.

## Real Versus No-Op Actions

Every Library toolbar action must be backed by a real handler or a deliberate disabled state with accessible explanation. No decorative controls.

Required checks:

- Add folder opens the folder creation path.
- Add component opens `?add=component` / current add modal path.
- Add template opens the template creation path.
- View-by controls change the current grouping.
- Filter controls open filter popovers or menus.
- Reset/clear controls only render when active filters exist or are visibly disabled with reason.

## Regression Risks

- Shared primitive changes can affect Estimate Sheet, Projects, Share tree, and Activity History.
- Separator logic can create orphan dividers if Library invents unusual action combinations.
- Orange add emphasis can become noisy if every add action is treated as primary.
- Glass toolbar backgrounds can stack blur if `bg-white` is only partially stripped.
- Toolbar wrapping at mobile widths can overlap tabs if dimensions are not fixed.

## Reuse Guidance

Implementation should first make Library-local surface slots work with existing toolbar primitives. Only after Overview, Components, and Templates prove the slot contract should an implementer tune shared primitives such as `TabStrip`, search popovers, filter popovers, or `ResizableSidePanel`.
