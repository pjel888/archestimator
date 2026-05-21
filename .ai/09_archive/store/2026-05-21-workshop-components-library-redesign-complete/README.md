# Workshop Components Library Redesign

**Date:** 2026-05-21
**Status:** Active implementation-readiness plan
**Route:** `/workshop/components`
**Visual reference route:** `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777701`

## Current Decision

The next `/workshop/components` build should mirror the estimate workspace layout from the visual reference route, but remove the right Component Library sidebar. The route becomes a full-screen Component Library workspace:

- left panel: estimate-tree-style navigator, with tabs for categories, suppliers, and later organization axes;
- center panel: estimate-sheet-style component sheet for custom user components;
- right panel: absent, because this route is the Component Library;
- old `/workshop/components` standalone search row and disabled icon toolbar: remove them and let the mirrored tree/sheet search rows own those positions.

This supersedes the earlier tree-only direction. The classification-first model still matters, but it now feeds the left navigator and center component sheet instead of a standalone matrix browser.

## Folder Map

- `01-current-state-audit.md` - current live route, reset debt, and removed manager behavior.
- `02-new-direction-workspace-mirror.md` - latest product decision and route scope.
- `03-ux-layout-contract.md` - exact UI layout, chrome, responsive, and visual parity contract.
- `04-data-and-interaction-contract.md` - custom component data, category/supplier tree, classification axes, and interaction boundaries.
- `05-implementation-sequence.md` - ordered implementation plan with target files and reuse decisions.
- `06-readiness-gates.md` - tests, Visual Ralph, Visual Verdict, UltraQA, browser evidence, and completion gates.
- `superseded/` - short records for the earlier classification-browser and tree-navigation directions that are no longer implementation authority.

## Design Direction

Purpose and audience: contractors and estimators managing their reusable component library with the same rhythm as the estimate workspace.

Tone: compact, work-focused, and spreadsheet-adjacent.

Layout strategy: clone the estimate workspace's two working columns after removing the right library sidebar: a left tree navigator and a center sheet. Search rows and icon toolbars stay in the same vertical locations as the estimate tree and estimate sheet.

Typography and color: use `DESIGN.md` app tokens, 10px default text, 12px maximum visible app text, white panels, hairline dividers, and the existing compact toolbar system.

Motion: no decorative motion; only focus, hover, keyboard selection, and optional resize feedback.

Signature differentiator: the user's custom components are edited in an estimate-sheet-like surface, while the left tree can switch between category and supplier organization without changing the workspace muscle memory.

## Source And Safety Notes

- Next.js version checked for the UI-design security gate: `16.2.6`, which is above the affected `16.0.x` canary range.
- Reference layout evidence comes from `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `EstimateSheetTree`, `EstimateSheetContent`, `ResizableSidePanel`, and `EstimateCenterColumnBoundary`.
- `EstimateSheetContent` already supports `renderSidebar={false}` in tests, which proves the center sheet can exist without the right Component Library sidebar.
- Historical estimate tree memory says `EstimateSheetTree.tsx` is high-blast-radius and combines navigation, selection, expand/collapse, drag/drop, optimistic updates, and route sync. Reuse must be extracted or wrapped carefully.
- Do not reintroduce the rejected dense table, facets, inspector, import/export, local CRUD manager shell, old seed adapter layer, or standalone `/workshop/components` top search/toolbar.
