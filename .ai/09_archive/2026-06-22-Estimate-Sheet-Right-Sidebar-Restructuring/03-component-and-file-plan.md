# Component And File Plan

## Implementation Strategy

Do this as a view-model split inside the existing Estimate Sheet sidebar. Avoid new data models unless tests prove the existing lite dataset is insufficient.

## Unit 1 - Scope Helpers

Primary files:

- `src/components/workshop/component-library/index.tsx`
- possibly a new local helper near the component-library sidebar code
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`

Work:

- Add a small helper to classify sidebar rows:
  - `isProjectSidebarComponent(item)`
  - `splitSidebarComponentItems(items)`
- Project items should be based on `readProjectComponentProjectionMetadata(item.metadata)` plus the existing project-folder contract.
- Library items should be every component row not owned by the project projection.

Stop condition:

- Tests prove project-projected rows are not present in the Library tab input and ordinary library rows are not present in the Project tab input.

## Unit 2 - Tab Contract

Primary file:

- `src/components/workshop/component-library/index.tsx`

Work:

- Change `LIBRARY_TREE_TABS` to three tabs.
- Prefer labels `Library`, `Project`, `Templates`.
- Add `"project"` to `EstimateLibraryTab`.
- Update stored preference hydration to accept `project`.
- Keep initial SSR state stable; apply stored tab preference only after mount as the current code does.

Stop condition:

- DOM test sees three tabs in order and no hydration-sensitive initializer reads browser storage.

## Unit 3 - Tree Branching

Primary files:

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`

Work:

- Build the Library tree from reusable items only.
- Build the Project tree from project items only.
- Reuse `LibraryTree` for Project rows unless a tiny prop is needed for copy/actions.
- Do not route Project tab through `TemplatesTree`.
- Keep Templates branch unchanged except copy.

Recommended shape:

```ts
const { libraryItemsForTab, projectItemsForTab } = useMemo(
  () => splitSidebarComponentItems(libraryItems),
  [libraryItems],
);
```

Then:

- Library tab uses `buildLibraryTreeWithComponentRows(componentTreeTab, libraryFacetFilteredItems, ...)`.
- Project tab uses a project-folder tree builder or the existing project-folder branch with only projected items.
- Templates tab returns no component tree.

Stop condition:

- Library view modes cannot leak Project rows through suppliers/brands/custom views.

## Unit 4 - Toolbar And Actions

Primary file:

- `src/components/workshop/component-library/index.tsx`

Work:

- Make toolbar controls tab-aware:
  - Library: current component facet/view/add controls.
  - Project: search and expand/collapse; no add folder; no delete from sidebar; add/drag into selected Area if `canInsert`.
  - Templates: current template controls.
- Clear search, preview, menu, template filter, and bulk selection on tab change, as `handleTabChange` already does.
- Ensure Project tab bulk selection does not trigger Library delete actions.

Stop condition:

- Tests prove Project tab actions produce component insert payloads, not template/project-source payloads.

## Unit 5 - Preview And Empty States

Primary files:

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/LibraryTree.tsx` if copy/action props are needed

Work:

- Reuse `PreviewPanel` for project components.
- Add project-specific context in copy when available:
  - project name
  - estimate sheet name
  - row/node source
- Add Project empty states for:
  - no project context
  - no project-owned components
  - search/filter no results
  - load failure inherited from lazy library loading if applicable

Stop condition:

- Project tab can be empty without making the sidebar look broken.

## Unit 6 - Templates Copy Cleanup

Primary files:

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- tests that assert Templates copy

Work:

- Rename `Project sources` filter copy to avoid collision with the new top-level Project tab.
- Do not change Templates data flow or insert behavior.

Stop condition:

- Existing Templates project-source tests still pass with updated labels.

## Unit 7 - Focused Tests

Primary test files:

- `tests/vitest/project-component-projection.test.ts`
- `tests/vitest/component-library-helpers.test.ts`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`

Work:

- Add projection fail-closed tests.
- Update tab contract tests.
- Add Library-vs-Project leakage tests.
- Add Project insert/bulk/drag path tests if those interactions are enabled in v1.
- Preserve Templates project-source tests.

Stop condition:

- Focused test matrix proves the split without relying on browser visual evidence.

