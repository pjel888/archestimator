# Implementation Handoff

## Current Decision

Philip confirmed the key product model: `Project` is an ownership/scope tab, not a new component type.

The implementation should not invent `Project Component` as a third system type. The app already has the right user-facing distinction:

- `Library Component`
- `Project Component`

The sidebar tab only separates where those component rows are owned and reused.

## First Patch Target

Start in `src/components/workshop/component-library/index.tsx`.

Do the smallest coherent pass:

1. Add the third tab.
2. Split `libraryItems` into reusable and project-owned arrays.
3. Route Library and Project through the existing `LibraryTree` pattern.
4. Leave Templates behavior intact except label cleanup.
5. Add focused tests.

Do not start with a new data loader, new route, new database model, or visual redesign.

## Defaults To Lock

| Topic | Default |
| --- | --- |
| Tabs | `Library`, `Project`, `Templates` |
| Project meaning | Project-owned component rows only |
| Component type model | unchanged |
| Data source | reuse `loadProjectComponentLibraryLite(projectId)` |
| Project inclusion | strict projection metadata/contract |
| Source-less manual rows | exclude in v1 unless projected |
| Project tab creation controls | no folder/create component button in v1 |
| Project tab destructive actions | no delete in v1 |
| Templates project sources | keep under Templates; rename copy to avoid collision |
| Browser/visual proof | skip unless implementation needs browser-only proof |

## Suggested Code Shape

Use a local split before all component tree building:

```ts
const sidebarComponentItems = useMemo(
  () => splitSidebarComponentItems(libraryItems),
  [libraryItems],
);
```

Where the helper returns:

```ts
{
  libraryItems: EstimateRowItem[];
  projectItems: EstimateRowItem[];
}
```

The project check should be fail-closed:

```ts
readProjectComponentProjectionMetadata(item.metadata) !== null
```

If the helper also checks project folder ids, keep metadata as the authority. A malicious or malformed item with a `project-components-*` folder but no projection metadata must not enter the Project tab.

## Tree Routing

Library:

- build from `sidebarComponentItems.libraryItems`
- current category/supplier/brand/custom view modes can remain
- no project folders

Project:

- build from `sidebarComponentItems.projectItems`
- prefer project/estimate folder hierarchy from existing projection folders
- reuse `LibraryTree` row format
- use tab-specific action suppression for edit/delete/folder management

Templates:

- keep the existing `TemplatesTree`
- keep existing source loading, search, prefetch, and insert behavior

## Exact Guardrails

Do not:

- show project rows in the Library tab
- show Library rows in the Project tab
- route Project tab rows through `TemplatesTree`
- treat Templates project sources as Project components
- add a database migration
- create a new persistent component type
- widen the right dock
- add cards or a new visual shell
- run broad formatting on `index.tsx`

## First Test Order

1. `project-component-projection.test.ts`
   - fail-closed projection rules
   - detached and express included
   - linked and malformed rows excluded

2. `component-library-helpers.test.ts`
   - Project tree from projected rows
   - Library tree excludes projected rows in every view mode

3. `component-library-ui.test.tsx`
   - tab order
   - Project tab render
   - search scoping
   - toolbar/action differences
   - Templates behavior still works

4. `estimate-sheet-library-lazy-load.test.tsx`
   - only if cache/loading code changes

5. `estimate-sheet-library-insert.test.tsx`
   - if Project tab add/drag path is changed or newly covered

## Implementation Stop Points

Stop and reassess if:

- Project tab requires source-less manual rows to be included.
- The existing lite loader cannot provide enough metadata.
- Project tab needs edit/delete behavior for estimate rows.
- Templates project-source tests start failing for reasons beyond copy updates.
- The split requires a new cross-surface abstraction bigger than a small helper.

## Ready-To-Code Summary

This is ready for implementation. The strongest path is a contained sidebar refactor: add `project` as a tab, split item ownership before tree construction, reuse existing tree/preview/add mechanics, suppress unsafe Library-management actions on Project, and prove it with focused tests.

