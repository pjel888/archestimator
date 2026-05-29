# UI Componentization and Storybook Plan

**Date:** 2026-05-18
**Status:** Active governance + implementation plan
**Applies to:** non-landing Archestimator app/workshop UI

## User job

Improve developer UI experience so agents and developers stop creating one-off controls, oversized text, and inconsistent component patterns while building the estimate workspace and Component Library.

## Core rule

Every UI implementation must follow this order:

1. Check `src/components/ui/` and existing feature-shared components first.
2. Reuse the existing primitive if it fits.
3. Extend the shared primitive if one repeated use case is missing.
4. Create a new shared primitive if no reusable primitive exists and the pattern will repeat.
5. Only use feature-local markup for genuinely unique layout composition, not for reusable controls.

Feature-local raw buttons, icon buttons, search inputs, chips, tabs, filter controls, select controls, cards, panel headers, and empty states are defects unless there is a documented reason.

## Non-negotiable product-system rule

Outside the landing page:

- Font: SF Pro system stack.
- Weights: regular (`400`) and medium (`500`) only.
- Sizes: `12px` maximum; normal app/workshop controls/body/table/input/button text around `10px`, subtitles around `11px`, and meta/eyebrow labels around `8-9px`.
- Letter spacing: `0` only.
- Colors: strong `#292929`, default `#5D5D5D`, subtle `#7F7F7F`, selected background `#F5F5F5`, border `#F2F2F2`, plus semantic success/warning/danger only for meaning.
- Radius: `xs` (`3px`) only. No `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`, or arbitrary radius utilities.
- Icons: regular 1px-outline-style iconography; current Phosphor icons must use regular weight until a dedicated 1px icon library is approved.

## Current primitive inventory

### Existing primitives

- `src/components/ui/button.tsx`
  - Purpose: all buttons, toolbar buttons, icon buttons, scrim/overlay buttons.
  - Rule: add variants/sizes here before writing a feature-local `<button>` class string.

- `src/components/ui/search-input.tsx`
  - Purpose: all search fields in workshop, estimates, and Component Library surfaces.
  - Rule: no raw feature-local `<input type="search">` unless extracting a new shared primitive.

### Added initial primitives for this plan

- `src/components/ui/badge.tsx`
  - Purpose: compact counts, status labels, source/trust tags, category tags.

- `src/components/ui/chip.tsx`
  - Purpose: compact filter chips, removable active filters, selected facets.
  - Supports: `active` state for selected facet toggles and `removable` state for active filter chips.

- `src/components/ui/control-select.tsx`
  - Purpose: compact toolbar/filter dropdowns where native select is sufficient.

- `src/components/ui/control-input.tsx`
  - Purpose: compact labeled text fields and textareas for dense app/workshop forms.
  - Includes: `ControlField`, `ControlInput`, `ControlTextarea`, and the shared dense input surface class.
  - Rule: create/edit dialogs should compose these field primitives before writing feature-local label/input class strings.

- `src/components/ui/creatable-combobox.tsx`
  - Purpose: compact searchable create-or-select fields for workspace-managed option lists such as Component Library brands and suppliers.
  - Rule: use this before writing feature-local searchable dropdowns with typed "add this value" behavior.

- `src/components/ui/empty-state.tsx`
  - Purpose: consistent blank states in lists, panels, tables, search results.

- `src/components/ui/toast.tsx`
  - Purpose: fixed, non-layout-shifting app notifications for async saves, successes, failures, and transient UI responses.
  - Rule: use `ToastProvider` at the app-provider layer and `useToast()` from feature components; do not render inline save/response banners that change panel height.

- `src/components/ui/index.tsx`
  - Purpose: component barrel for intentional primitive imports.

## UI component matrix

### Foundation primitives

- Button
  - File: `src/components/ui/button.tsx`
  - Variants: primary, secondary, ghost, danger, overlay, scrim.
  - Sizes: sm, md, icon, icon-sm, scrim.
  - Used by: headers, action bars, sidebar actions, row actions, dialogs.
  - Storybook category: `UI/Actions/Button`.

- SearchInput
  - File: `src/components/ui/search-input.tsx`
  - Used by: estimate header search, Component Library search, right-sidebar picker, project/component management filters.
  - Storybook category: `UI/Inputs/SearchInput`.

- ControlSelect
  - File: `src/components/ui/control-select.tsx`
  - Used by: group/sort/view controls, facet dropdowns, compact toolbar options.
  - Storybook category: `UI/Inputs/ControlSelect`.

- ControlField / ControlInput / ControlTextarea
  - File: `src/components/ui/control-input.tsx`
  - Used by: dense modal forms, inspector forms, version/pricing edits, create/edit dialogs.
  - Rule: keep label, helper, error, hover, focus, invalid, and textarea styling here before adding feature-local input classes.
  - Storybook category: `UI/Inputs/ControlField`.

- CreatableCombobox
  - File: `src/components/ui/creatable-combobox.tsx`
  - Used by: workspace-scoped create/select fields where search and adding a missing value are both expected.
  - Storybook category: `UI/Inputs/CreatableCombobox`.

- ContextMenu
  - File: `src/components/ui/context-menu.tsx`
  - Used by: estimate tree Group/Area row right-click actions.
  - Rule: keep Radix/shadcn menu surfaces compact and portal-safe; do not replace existing modal/dialog primitives in this slice.
  - Storybook category: `UI/Actions/ContextMenu`.

- ActionMenu
  - File: `src/components/ui/action-menu.tsx`
  - Used by: context menu item/group definitions for estimate tree Rename/Delete.
  - Rule: shared action model for future menu triggers; do not implement future filter/icon menus until their interaction contract is planned.
  - Storybook category: `UI/Actions/ActionMenu`.

- Badge
  - File: `src/components/ui/badge.tsx`
  - Used by: counts, pricing trust, scope status, category metadata.
  - Storybook category: `UI/Feedback/Badge`.

- Chip
  - File: `src/components/ui/chip.tsx`
  - Used by: active filters, category pills, scope selectors, selected facets.
  - Storybook category: `UI/Filters/Chip`.

- EmptyState
  - File: `src/components/ui/empty-state.tsx`
  - Used by: no search results, empty estimate nodes, empty component groups, missing project data.
  - Storybook category: `UI/Feedback/EmptyState`.

- ToastProvider / useToast
  - File: `src/components/ui/toast.tsx`
  - Used by: async save state, success/failure confirmation, transient workspace feedback that must not shift panel layout.
  - Storybook category: `UI/Feedback/Toast`.

### Next shared primitives to create when needed

- `PanelShell`
  - Purpose: consistent bordered panel with compact header/body/footer zones.
  - Trigger: two or more panels share header/action/body structure.

- `Toolbar`
  - Purpose: compact horizontal control rows with search, filters, stats, actions.
  - Trigger: estimate header, component library toolbar, project toolbar duplicate layout.

- `IconButton`
  - Preferred approach: either use `Button size="icon-sm"` directly or create a wrapper built on `Button` only if labels/tooltips/ARIA patterns repeat.

- `SegmentedControl` / `Tabs`
  - Purpose: compact view toggles and tabbed inspector sections.
  - Trigger: repeated view switching beyond one screen.

- `PanelSectionHeader`
  - Purpose: shared small title/count/action row inside sidebars and inspectors.

- `CompactCard`
  - Purpose: consistent item cards for library items, projects, summaries.
  - Trigger: after exact card anatomy stabilizes.

- `DataCell` / `EditableCell`
  - Purpose: table/grid display and inline edit cells.
  - Trigger: when estimate row editing starts repeating field behavior.

- `Dialog` / `Drawer`
  - Purpose: modal/drawer shell with compact sizing and accessibility.
  - Trigger: first repeated create/edit/confirm overlay.

## Storybook organization plan

Do not install Storybook until Philip approves the dependency/setup. However, organize components now as if Storybook will exist.

Target Storybook tree:

```txt
UI/
  Actions/
    Button
    IconButton
    ContextMenu
    ActionMenu
  Inputs/
    SearchInput
    ControlSelect
    TextInput
    EditableCell
  Filters/
    Chip
    SegmentedControl
    FacetGroup
  Feedback/
    Badge
    EmptyState
    InlineNotice
  Layout/
    PanelShell
    Toolbar
    PanelSectionHeader
  DataDisplay/
    CompactCard
    KeyValueList
    StatStrip
Workshop/
  EstimateSheet/
    HeaderToolbar
    TreeItem
    RowItem
    EmptyNodeState
  ComponentLibrary/
    LibraryCard
    LibraryGroup
    SidebarPicker
```

Story requirements once Storybook is installed:

1. Each shared primitive gets a default story, density story, disabled/loading/empty story where relevant, and accessibility notes.
2. Each story must visibly prove non-landing typography keeps the compact app/workshop `12px` maximum and expected `10px` control density.
3. Story names should map to user-facing patterns, not internal implementation quirks.
4. Feature stories under `Workshop/` may compose primitives but must not introduce new primitive class systems.
5. Storybook should be a documentation and QA tool, not the source of design truth. `DESIGN.md` remains the token/density source of truth.

## Developer pipeline update

Before implementation:

- Read `DESIGN.md` and this plan for app UI work.
- Inventory existing primitives in `src/components/ui/`.
- Add a UI component matrix row for any new primitive or repeated pattern.

During implementation:

- Import from `src/components/ui` where practical.
- Extend primitive props/variants instead of cloning class strings.
- Keep component API small and task-based.
- Avoid visual exceptions that depend on page-local overrides.

During review:

- Search for raw `<button>`, `<input type="search">`, repeated chip/select/card class strings, non-SF font utilities, non-regular/medium weights, nonzero tracking, non-xs radius, and unapproved icon weights.
- Treat duplicated controls as blocking defects.
- Run `bun run lint:design-system` and `bun run type-check` at minimum for UI primitive changes. `bun run lint:font-size` is retained as an alias.
- If browser-visible sizing is disputed, inspect computed styles with Playwright/browser tools rather than trusting source classes.

## Acceptance criteria

A UI slice is acceptable only if:

- Shared primitives are reused before feature-local controls.
- New repeated controls are extracted into `src/components/ui/` or a documented feature-shared component.
- Non-landing visible text stays at or below `12px`, with normal controls/body/table/input/button text around `10px`.
- Buttons remain medium-weight SF Pro through the shared button primitive.
- Every visible app/workshop radius is `xs`.
- App/workshop icons use regular outline weight.
- The component matrix is updated when a primitive is added or when a repeated pattern becomes clear.
- Storybook organization impact is noted for new primitives, even before Storybook is installed.

## Non-goals

- Do not install Storybook in this slice without explicit approval.
- Do not build a full design-system website.
- Do not refactor every existing component immediately.
- Do not create generalized primitives before a repeated need exists.

## Recommended implementation sequence

1. Lock this governance plan into the active docs.
2. Create the first small primitive set: Badge, Chip, ControlSelect, EmptyState, barrel export.
3. Refactor only current duplicated controls opportunistically during nearby feature work.
4. Add component stories later once Storybook setup is approved.
5. Add lint/static checks for raw feature-local controls after the shared library stabilizes.
