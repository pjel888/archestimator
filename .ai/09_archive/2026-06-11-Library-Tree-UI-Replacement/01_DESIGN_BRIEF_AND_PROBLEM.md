# 01 — Design Brief & Problem Statement

**Date:** 2026-06-13
**Scope:** `/workshop/library/components` left-panel tree (Folders view mode)

---

## Exact user job

> As a user managing the component library, I want the folder tree on the Components page to look, feel, and behave like the tree in the estimate workspace, so that selection, drag-and-drop, and keyboard navigation are predictable across the app.

## Problem statement

The authenticated workshop currently contains **two tree UI implementations**:

1. **Canonical `Tree`** (`src/components/ui/tree.tsx`) — used in:
   - Estimate workspace left sidebar (`EstimateSheetTree.tsx`)
   - Estimate workspace right sidebar library (`LibraryTree.tsx`)
   - Estimate workspace right sidebar templates (`TemplatesTree.tsx`)
   - Library Components route **Suppliers** and **Brands** view modes (`LibraryTree` inside `LibraryFolderTreeSurface`)

2. **`react-complex-tree`** — used only for the **Folders** view mode in:
   - `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
   - `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
   - `src/components/workshop/component-library-manager/AddComponentModal.tsx` (via `LibraryFolderTreePicker`)

This creates:
- **Visual inconsistency:** row heights, hover states, focus rings, drag handles, and checkbox placement differ.
- **Behavioral inconsistency:** keyboard shortcuts, expansion persistence, selection model, and drag preview styling differ.
- **Maintenance drag:** bug fixes and accessibility improvements to the canonical `Tree` do not automatically apply to the folder tree; the `react-complex-tree` surface must be maintained separately.
- **Dependency weight:** the project carries `react-complex-tree` plus its global CSS import only for this one surface.

## Goals

1. Make the **Folders** view mode in `/workshop/library/components` use the canonical `Tree` component.
2. Preserve all existing folder-tree behavior:
   - Folder expand/collapse
   - Folder search/filter
   - Folder drag-to-reorder
   - Component drag-to-move-between-folders
   - Bulk folder selection with cascade indeterminates
   - Context-menu actions on folders (add/rename/delete)
   - Component click selects the parent folder
   - "All Components" synthetic root behavior
3. Migrate the folder picker in `AddComponentModal` to the same canonical tree.
4. Remove the `react-complex-tree` dependency from the workshop once migration is complete.

## Non-goals

- Do not change the **Suppliers** or **Brands** view modes — they already use the canonical `Tree`.
- Do not change the component catalogue card grid or the center sheet.
- Do not change the estimate workspace tree behavior.
- Do not introduce new tree features (multi-drag, copy-on-drag, lazy loading, virtual scrolling).
- Do not change the folder data model in Supabase.

## Success criteria

1. The Folders view mode renders with `src/components/ui/tree.tsx` and passes the same visual/keyboard QA as the estimate tree.
2. All existing folder/component DnD operations produce the same server-confirmed results as before (single sanctioned delta: top-level folder reorder starts working — D12 in doc 07).
3. All existing context-menu actions on folders work unchanged.
4. `AddComponentModal` folder picker works with the new tree.
5. `react-complex-tree` and its global CSS import are removed.
6. The six Vitest gate files (doc 08 §1) pass — with their `react-complex-tree` mocks deleted, not papered over — and the supporting cleanup/ARIA/DnD tests in doc 08 §1.1 and doc 12 pass without regressions.

## Design-system rationale

`DESIGN.md` and `reference/product.md` both state:

> “All app/workshop UI must be built from shared primitives and reusable product components. Before adding local markup, agents must check `src/components/ui/` and the relevant `src/components/workshop/` shared components, then reuse or extend them.”

> “Inconsistent component vocabulary across screens. If the ‘save’ button looks different in two places, one is wrong.”

The folder tree is the last major workshop surface that does not obey this contract. Fixing it is a design-system integrity task, not a feature request.
