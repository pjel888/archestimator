# UX Layout Contract

**Date:** 2026-05-21
**Target route:** `/workshop/components`
**Visual reference route:** `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777701`

## Design Direction

Purpose and audience: contractors and estimators managing reusable custom components.

Tone: compact, work-focused, spreadsheet-adjacent.

Layout strategy: mirror the estimate workspace shell after removing the right library sidebar. Preserve the tree + sheet muscle memory.

Typography: use `DESIGN.md` app tokens, 10px default text, 12px maximum visible app text.

Color/surface: white panels, hairline borders, muted metadata, existing primary color only for meaningful action/focus.

Motion: none beyond focus, hover, keyboard selection, and optional resize feedback.

Signature differentiator: custom components are edited in an estimate-sheet-like working surface while the left tree switches the library organization mode.

## Outer Route Shell

The target route should keep the workshop app chrome, but the inner content should be a framed full-height workspace like project estimate routes.

Implementation should review:

- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `src/components/workshop/ProjectWorkspaceHeaderRow.tsx`
- `src/components/workshop/ProjectMiniSidebar.tsx`

Important distinction:

- The target route should mirror the estimate workspace's working surface.
- It should not become project-specific unless a later product decision says Component Library is scoped to a project.

## Column Layout

Target:

```txt
| Component Library Tree | Custom Component Sheet |
```

No right sidebar.

Left tree panel:

- default width: `272px`;
- minimum if resizable: `216px`;
- maximum if resizable: `432px`;
- same white background and right hairline border as estimate tree;
- same compact row density and selected-row treatment;
- use a component-library-specific storage key if resizable so resizing does not change estimate tree width unexpectedly.

Center sheet:

- `flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white`;
- sticky header;
- 38px search row;
- 38px icon toolbar row;
- scrollable body with 8px padding;
- sheet/table-like component rows.

Right side:

- absent;
- center sheet should extend through the space where the right Component Library sidebar appears on the estimate route.

## Search And Toolbar Placement

Remove:

- current `ComponentLibraryManager` route-level search row;
- current disabled `Filter library`, `Group library`, `New component` toolbar row.

Add through mirrored layout:

- left tree search at the top of the left tree panel;
- left tree icon toolbar immediately below tree search;
- center sheet search at the top of the sheet;
- center sheet icon toolbar immediately below sheet search.

Use shared primitives:

- `SearchInput`;
- `HeaderIconToolbar` or shared toolbar buttons;
- no feature-local raw search inputs or one-off icon buttons.

## Tree Tabs

Tabs belong in the left tree chrome, not above the whole route.

Initial tabs:

- Categories;
- Suppliers.

Future tabs only when real data exists:

- Standards;
- Materials;
- Systems.

Tabs must stay compact and must not inflate the tree header into a large admin panel.

## Empty And Loading States

Required states:

- no custom components yet;
- selected category has no components;
- selected supplier has no components;
- no search results;
- taxonomy data unavailable;
- component row pending save, if editing is implemented.

These states should use compact inline/sheet empty states, not oversized marketing cards.

## Responsive Contract

Desktop:

- tree left, sheet center;
- no right sidebar;
- center sheet fills remaining width.

Mobile/tablet:

- use the same responsive behavior as `ResizableSidePanel` where applicable;
- tree may collapse to zero width under the existing `max-width: 1023px` behavior;
- component sheet remains the primary working area;
- document any mobile compromise before implementation is called complete.

## Accessibility Contract

- Tree tabs are keyboard reachable.
- Tree rows are keyboard navigable.
- Search inputs have route-specific labels.
- Toolbar buttons have accessible labels and tooltips.
- Selection changes are perceivable in the center sheet heading/state.
- No drag/drop-only operation is required.
