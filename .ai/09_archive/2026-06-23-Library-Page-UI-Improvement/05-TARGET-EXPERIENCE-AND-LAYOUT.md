# 05 - Target Experience And Layout

## Information Architecture

Keep the existing top-level route model:

- Overview: command surface for search, creation, health, and recent activity.
- Components: dense reusable component management.
- Templates: reusable estimate-template browsing and preview.
- Template Editor: editing mode with compact title bar state.

Do not add another navigation layer inside the content area. `LibraryTitleBarClient` and `LibraryTabsLayoutClient` already orient the route.

## Global Layout Grammar

```text
WorkshopPageShell
  titleSlot: LibraryTitleBarClient
  subHeader: LibraryTabsLayoutClient / TabStrip
  content:
    glass well / transparent route root
      optional left rail
      center paper or command surface
      optional right dock
```

Rules:

- The outer shell is already owned by `WorkshopPageShell`.
- Library route content should use a transparent root and one glass/paper composition, not a centered page card.
- Rails and docks are glass. Dense lists/tables/editing content are paper.
- Gaps should follow Estimate Sheet's compact 8px rhythm where panes sit together.

## Overview Target

Convert Overview from a white scroll page into a Library command surface.

Target regions:

1. Command chrome: global Library search, primary Add Component action, secondary Add Template action, and status filters.
2. Health strip: small, scan-friendly source freshness/trust summary.
3. Recent Components ledger: compact paper list or dense card rail with name, category, unit, cost, source, pricing date.
4. Recent Templates ledger: compact list with type, updated time, insert/open actions.
5. Empty/loading/error states: same geometry as final content, not generic white placeholders.

## Components Target

Keep current behavior and route state. Reskin around it:

- Root: Library glass well.
- Left tree: glass rail with `TreePanelHeader`.
- Center: paper sheet with sticky headchrome.
- Cards: flat paper tiles or project-card-inspired glass only for browse mode.
- Dense: preferred large-library mode, with crisp rows and sticky headchrome.
- Inspector: right glass dock with flat detail rows.
- Filters/chips: glass-compatible, but source-trust metadata remains visible.

## Templates Browse Target

Templates should visually match Components:

- Left tree rail.
- Center template gallery on paper.
- Right preview dock as glass rail/dock.
- `TreePanelHeader` for tree/search/filter/action rows.
- Loading and empty states aligned to final geometry.

## Template Editor Target

Template Editor is behavior-heavy, so polish it later:

- Keep current editor state, drag/drop, inline editing, save state, and insert action.
- Bring left rail/root under the same Library surface slots.
- Keep editing content paper-like.
- Do not alter estimate-sidebar reuse unless the implementation phase explicitly proves it is safe.

## Header And Action Row

- Top route title remains compact: "Library" for normal route; breadcrumb/save/action cluster for editor route.
- Route tabs remain in `LibraryTabsLayoutClient`.
- Pane-level search/filter/view/add rows use `TreePanelHeader` and `HeaderIconToolbar`.
- Overview command band can use visible text buttons because it is a command surface, but it must still use shared `Button` variants and existing icon patterns.

## Empty, Loading, And Error States

Every route needs state parity:

- Loading skeleton uses final pane geometry.
- Empty component/template lists explain the next action and provide one primary create action.
- Error states preserve shell/pane layout and expose retry without data-model leakage.
- No state should fall back to a full white page inside the glass shell.

## Responsive Rules

- Desktop: left rail + center + optional right dock.
- 1024px laptop/tablet: side rails resize/collapse; center remains primary.
- Mobile: route tabs scroll horizontally if needed; pane tools collapse into menus; docks become drawers.
- Buttons and tab labels must not overflow fixed-height rows.
- Sticky headers should not overlap scrolled content.

## Keyboard And Focus Expectations

- Preserve route tab ARIA semantics.
- Toolbar icon buttons need accessible labels and tooltips.
- Search inputs keep predictable focus order.
- Drawer/dock close returns focus to the opener.
- Modal/drawer escape behavior remains unchanged.
- Dense rows and cards expose the same actions in keyboard order as pointer users get.

## Interaction State Contract

Every visual implementation phase must account for these states before it exits:

| Surface | Required states | Proof expectation |
|---|---|---|
| Route tabs | default, active, hover, focus-visible, disabled/unavailable if ever rendered, mobile overflow | `library-tabs-layout`/`tab-strip` tests plus browser mobile proof when tab paint changes |
| Pane toolbars | default, hover, pressed, focus-visible, disabled, loading, menu-open, tooltip-visible | `header-icon-toolbar-ui` test and source review for labels/tooltips |
| Overview command search | idle, focused, fetching, result list, no-result list, keyboard navigation, popover open/closed | `library-overview` tests and browser proof for popover placement after implementation |
| Cards and compact ledgers | default, hover, focus-visible, selected/open, empty metadata, source-trust chip states | Library DOM tests and Visual Ralph screenshot review |
| Dense component rows | default, hover, focus-visible, selected, bulk-action selected, sticky header, horizontal/vertical scroll | dense e2e proof at 5000 rows when dense visuals change |
| Left tree rails | default, row hover, row selected, context menu open, empty tree, collapsed/resized rail | route-specific DOM tests and browser proof for rail geometry |
| Right docks | closed, open, resized, keyboard close, focus return, mobile drawer fallback | browser proof if dock geometry/focus containers change |
| Popovers and context menus | open, keyboard focus, outside click/escape, reduced-transparency fallback | DOM/browser proof if portal classes or shared popup primitives change |
| Loading, empty, error | final geometry reserved, action reachable, retry visible, no full white slab | route loading/error source review plus browser proof after implementation |
| Reduced transparency/no glass ready | readable text, preserved hierarchy, no transparent-on-transparent controls | source review and browser proof if glass/fallback classes change |
