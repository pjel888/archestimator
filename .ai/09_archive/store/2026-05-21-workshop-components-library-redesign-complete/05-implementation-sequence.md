# Implementation Sequence

**Date:** 2026-05-21
**Route:** `/workshop/components`
**Status:** Implementation-readiness plan

## Phase 1 - Lock Direction With Tests

Target files:

- `tests/vitest/component-library-manager-ui.test.tsx`
- `tests/vitest/aec-classification.test.ts`
- possible static layout-governance test

Test first:

- old route-level search/toolbar is absent from the target implementation;
- `Demo seed` is absent;
- old table/facet/inspector/import/export controls are absent;
- route renders left tree + center sheet and no right sidebar;
- tree has Categories and Suppliers tabs;
- tree has no drag/drop/reorder/add/rename/delete markers;
- classification paths are deterministic.

## Phase 2 - Add Domain Fixtures And Helpers

Target files:

- `src/lib/aec-classification/disciplines.ts`
- possible `src/components/workshop/component-library-manager/component-library-fixtures.ts`
- possible `src/components/workshop/component-library-manager/component-library-tree-data.ts`

Build:

- Archestimator-owned discipline matrix;
- aliases and canonical paths;
- category tree data;
- supplier tree data with honest placeholder/data-ready content;
- helpers for filtering tree and sheet rows.

## Phase 3 - Replace Current Components Route Shell

Target files:

- `src/app/workshop/components/page.tsx`
- `src/components/workshop/ComponentsPageClient.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

Remove:

- current top-level route search;
- current disabled icon toolbar;
- stale footer copy;
- reset empty body.

Add:

- inner full-height framed workspace surface matching the estimate route;
- left component library tree;
- center component sheet;
- no right sidebar.

## Phase 4 - Build Safe Reuse Layer

Preferred imports:

- `SearchInput`;
- `HeaderIconToolbar` or shared toolbar buttons;
- `ResizableSidePanel`;
- shared `cn` utility;
- shared badges/chips only when needed for compact row metadata.

Avoid direct reuse of:

- `EstimateSheetTree`;
- `EstimateSheetContent` as a whole;
- `EstimateRightSidebar`;
- estimate row mutation hooks;
- estimate tree mutation helpers;
- estimate route navigation hooks.

Extraction rule:

- Extract only behavior-free shell pieces if the extracted prop interface is small.
- If extraction would require flags like `disableEstimateMode`, do not extract yet.
- Route-local duplication of a small visual shell is acceptable for v1 if it prevents estimate behavior leakage.

## Phase 5 - Center Component Sheet

The center sheet should visually echo `EstimateSheetContent`:

- sticky header;
- sheet search row;
- sheet toolbar row;
- scrollable component row body;
- compact empty states;
- row labels and inputs sized like app UI.

But it should use component-library semantics:

- component name;
- supplier/source;
- discipline/subdiscipline;
- designation/spec note;
- unit;
- default cost/rate fields;
- pricing health/source date.

If editing is not implemented in v1, make the sheet read-only but shape it so editing can be added without changing the layout.

## Phase 6 - Visual QA And State Docs

After implementation:

- capture reference route screenshots;
- capture target route screenshots;
- compare left tree and center sheet chrome;
- run targeted tests, type-check, font-size lint, and `git diff --check`;
- run `bun run validate` before claiming completion;
- update `.ai/10_state/current-state.md`;
- update `.ai/10_state/decisions.md` only if this route shape becomes active product reality.

## Do Not Implement In This Slice

- Supabase schema changes;
- RLS/persistence changes;
- import/export;
- supplier CRUD;
- standards table import;
- right sidebar;
- tree drag/drop;
- estimate insertion.
