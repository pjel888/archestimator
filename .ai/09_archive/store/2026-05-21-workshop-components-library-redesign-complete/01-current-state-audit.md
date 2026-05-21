# Current State Audit

**Date:** 2026-05-21
**Route:** `/workshop/components`
**Status:** Current-state evidence for the workspace-mirror redesign

## Live Route Today

The current route is a reset shell, not the desired workspace mirror.

Active path:

- `src/app/workshop/components/page.tsx`
- `src/components/workshop/ComponentsPageClient.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

Current visible structure:

- `WorkshopPageShell` titled `Components`;
- route-level search input;
- disabled toolbar buttons for filter, group, and new component;
- empty body;
- footer copy containing `Workspace library` and `Demo seed`.

## Reset Work Already Completed

The rejected manager implementation was removed from the active route:

- seed-backed library item state;
- dense manager table;
- facets panel;
- sorting/grouping selects;
- status/health filters;
- read-only inspector;
- row selection;
- import/export controls;
- local manager adapter/helper/type layer;
- old manager helper/adapter tests.

That removal remains correct. The new direction must not revive those manager parts.

## New Reset Delta

The previous reset preserved the standalone search row and disabled icon toolbar. The newest direction supersedes that. The next implementation should remove the current `/workshop/components` top search/toolbar because the mirrored estimate-workspace layout will provide:

- left tree search in the estimate-tree location;
- left tree icons in the estimate-tree toolbar location;
- center sheet search in the estimate-sheet location;
- center sheet icons in the estimate-sheet toolbar location.

## Known Debt

- `src/app/workshop/components/page.tsx` still contains `Demo seed`.
- The footer still implies a seed-backed workspace.
- The component route does not currently mirror the project estimate workspace frame.
- The current body is empty and cannot display custom user components.

## Historical Non-Goals Still Active

- No rejected dense table.
- No facets panel.
- No inspector.
- No import/export controls in the first workspace-mirror slice.
- No local seed manager.
- No right Component Library sidebar.
- No drag/drop tree reorganization.

## Current-State Verification

Documentation-only verification:

```bash
rg -n "Demo seed|Filter library|Group library|New component|Component library table|Library filters" src/app/workshop/components src/components/workshop/component-library-manager tests/vitest/component-library-manager-ui.test.tsx
git diff --check
```

After implementation, the same search should show only tests that intentionally assert old manager behavior is absent.
