# 02 - Target Visual-System Audit

## Target Decision

The Library should visually align closest to the Estimate Sheet workspace: glass rails and chrome around crisp paper content, compact 38px local headers, and dense data presentation. Dashboard and Projects inform atmosphere and cards, but the Library must not inherit dashboard-only display scale or bento composition.

## Design Authority

| Source | Evidence | Target interpretation |
|---|---|---|
| Dashboard exception | `DESIGN.md:400` to `DESIGN.md:430` | Dashboard bento/glass is exploratory and path-scoped. Use as inspiration only. |
| Shared primitives | `DESIGN.md:467` to `DESIGN.md:480` | Do not invent Library-only buttons, search, dropdowns, tabs, cards, empty states, or toolbars when shared primitives exist. |
| App shell and depth | `DESIGN.md:498` to `DESIGN.md:561` | Auth app is a full-browser workspace on grey canvas. Paper holds dense content; liquid glass frames chrome. |
| Add affordance | `DESIGN.md:573` to `DESIGN.md:601`, `src/components/ui/toolbar-icon-button.tsx:10` | Orange add is centralized and should be deliberate. Use only where the Library needs a primary add action, not for every plus icon. |
| Library card content | `DESIGN.md:639` to `DESIGN.md:651` | Library items must expose name, category/type, unit, default cost, pricing date, supplier/source, and linked state. Search/filter/insertion are priority jobs. |
| Do/don't rules | `DESIGN.md:675` to `DESIGN.md:704` | Compact, aligned, accessible, no over-rounded one-off visual styles, do not hide confidence/source risk. |

## Reference Surface Comparison

| Trait | Dashboard | Projects | Estimate Sheet | Project Dashboard | Library target |
|---|---|---|---|---|---|
| Background | `dashboard-canvas-wash`, imageband, desk (`src/components/workshop/dashboard/WorkshopDashboard.tsx:130`) | transparent collection canvas via `WorkshopCollectionLayout` (`src/components/workshop/WorkshopCollectionLayout.tsx:53`) | `estimate-glass-well` root (`src/components/workshop/EstimateWorkspaceClient.tsx:121`) | `dashboard-glass` panels and compact sections (`src/components/workshop/ProjectDashboardClient.tsx:527`) | Use Estimate-style glass well/rails. Overview can borrow collection canvas spacing, not dashboard bento. |
| Main content | Dashboard cards and spotlight (`src/components/workshop/dashboard/DashboardGlassPanel.tsx:19`) | glass project cards (`src/components/workshop/LiveProjectCard.tsx:677`) | crisp sheet/paper for dense rows (`src/app/globals.css:1360`) | card panels for project state | Dense Library data should be paper/sheet-like; browsing cards may use project-card glass style lightly. |
| Toolbar | dashboard-specific cards/actions | `TreePanelHeader` plus `DropdownSelect` and add action (`src/components/workshop/projects-page-client.tsx:1218`) | `TreePanelHeader` and `HeaderIconToolbar` for local panes (`src/components/workshop/EstimateSheetTree.tsx:1382`) | compact sticky subheaders | Reuse `TreePanelHeader`/`HeaderIconToolbar` for pane-level tools. |
| Tabs | destination/card navigation | `Tabs variant="underline"` for collection state (`src/components/workshop/projects-page-client.tsx:480`) | tab strip above sheet body (`src/components/workshop/EstimateSheetContent.tsx:3120`) | local section tabs | Keep route-backed `TabStrip`, tune active tab for glass context. |
| Typography | path-scoped display scale | compact card metadata | compact app scale, tabular values | compact labels and status blocks | Compact SF Pro app scale, no dashboard display type. |
| Motion/effects | exploratory | hover card reveal (`src/components/workshop/LiveProjectCard.tsx:677`) | sticky headers, restrained hover | dashboard hover/status | Keep hover/focus states useful; do not add decorative motion. |

## Liquid Glass Rules For Library

- Glass belongs to the outer workspace shell, left rails, header chrome, right docks, and selected command bands.
- Dense content belongs on paper or flat paper tiles, not nested blur cards.
- Each visible region should have one depth owner. If the rail is glass, child rows should be transparent or flat, not blurred again.
- Use `librarySurfaceClass` as the Library-specific adapter, backed by `estimateSurfaceClass`.
- If new slots are required, add them centrally: `rightDock`, `contentTile`, `denseTable`, `segmentedControl`, `popup`, `emptyState`, `skeleton`.

## Transparent Backgrounds

The route already sits inside `WorkshopPageShell` and `workshop-workspace-glass-surface` (`src/components/workshop/WorkshopPageShell.tsx:133`, `src/app/globals.css:981`). Library children should not reintroduce full-viewport white slabs.

Target:

- Page-level route content: transparent.
- Pane layout root: `estimate-glass-well` or Library slot equivalent.
- Left/right rails: `estimate-glass-rail`.
- Center content: `estimate-glass-paper`.
- Header chrome: `estimate-glass-chrome` / `estimate-glass-headchrome`.
- Dense rows and cards: flat paper tiles with hairlines, no local heavy shadow.

## Tabs

Current route tabs use shared `TabStrip` (`src/components/ui/tab-strip.tsx:45`). Keep this semantic model. The visual work is to make active/inactive tabs read as part of the glass subheader rather than a separate white slab.

Target:

- Route tabs remain in `LibraryTabsLayoutClient`.
- No duplicate tabs inside Overview/Components/Templates.
- Active tab may retain paper lift when it sits against a paper region; in glass subheaders it should use a softened glass/paper hybrid.
- Keyboard and ARIA behavior remain unchanged.

## Buttons And Toolbar Tone

Use:

- `HeaderIconToolbar` and `ToolbarIconButton` for tree/pane tools.
- `Button` and existing variants for text commands.
- `workshop-liquid-button` for a visible primary add action inside glass contexts.
- Compact project-header utility tone only for true header utilities, not primary workflows.

Avoid:

- Text-heavy action rows in tight pane headers.
- Multiple visually primary add actions on one surface.
- New one-off icon button classes.

## Responsive Behavior

The Library target should retain app workspace behavior:

- Desktop: left rail, center paper, optional right dock.
- Laptop/tablet: rails can resize/collapse; the center remains the primary job surface.
- Mobile: route tabs scroll safely, pane tools wrap or become menus, right docks become drawers, no horizontal overflow.
- Sticky headers must mask scroll content without creating stacked blurred strips.

## Intentional Divergences

- Do not copy Dashboard display type, bento hero rhythm, or broad gradient experiments. `DESIGN.md:400` makes Dashboard path-scoped.
- Do not copy Projects' missing empty-state ambiguity. Library has critical search/create jobs and needs explicit empty/loading/error states.
- Do not copy Estimate Sheet's estimate-only Add orange everywhere. Use orange only for the dominant Library creation action.
