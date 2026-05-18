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

## Non-negotiable density rule

Outside the landing page:

- Maximum visible font size: `12px`.
- Default controls/body/nav/table text: `10px`.
- Subtitles/supporting text: `11px`.
- Meta/eyebrow labels: `8px` to `9px`.
- Buttons: `10px` and bold.
- No `text-sm`, `text-base`, `text-lg`, `text-xl`, or raw `13px+` typography in app/workshop surfaces unless Philip approves a named exception.

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

- `src/components/ui/empty-state.tsx`
  - Purpose: consistent blank states in lists, panels, tables, search results.

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
2. Each story must visibly prove non-landing typography stays at or under `12px`.
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

- Search for raw `<button>`, `<input type="search">`, repeated chip/select/card class strings, and `13px+` typography.
- Treat duplicated controls as blocking defects.
- Run `bun run lint:font-size` and `bun run type-check` at minimum for UI primitive changes.
- If browser-visible sizing is disputed, inspect computed styles with Playwright/browser tools rather than trusting source classes.

## Acceptance criteria

A UI slice is acceptable only if:

- Shared primitives are reused before feature-local controls.
- New repeated controls are extracted into `src/components/ui/` or a documented feature-shared component.
- No non-landing visible text exceeds `12px`.
- Buttons remain `10px` bold through the shared button primitive.
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
