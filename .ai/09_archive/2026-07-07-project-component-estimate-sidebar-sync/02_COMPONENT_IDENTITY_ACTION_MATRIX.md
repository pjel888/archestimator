# Component Identity And Action Matrix

## Identity Types

| Type | Canonical owner | Estimate row reference | Sidebar source | Edit semantics | Drag/insert semantics | Promotion path |
| --- | --- | --- | --- | --- | --- | --- |
| Library component | Workspace component library item | `sourceLibraryItemId` points at library item, `linkState` starts `linked-clean` | Library tab plus normal library folders | Sheet row edits override or detach according to row action | Insert creates a new estimate row snapshot linked to the library item | Already library-owned |
| Project-level component | Estimate row authored or detached in the project | Row id is the project component identity, `source: "project"`, `sourceLibraryItemId: null`, `linkState: "detached"` or unlinked express metadata | Project tab projection from project estimate rows | Sheet row is canonical; sidebar projection should mirror the row immediately | Insert creates another estimate row from the projected row snapshot while preserving project-source metadata | Promote creates a library item and relinks source row to the new library component |
| Express row placeholder | New blank row authored in the sheet | Row id created optimistically, no library source | Becomes a project component after persistence/projection if classified express/detached | Sheet row is canonical after server insert returns revision | Same as project-level component once projected | Can be promoted to library |
| Reusable project source | Prior project/estimate/tab/node source, not a row component | Source key identifies project/estimate/tab/node | Templates/Project source tree | Copies a subtree/rows at insert time | Insert copies source tree into target node | Not direct component promotion |

## Required Behaviors

| User action | Sheet behavior | Project tab behavior | Required cache behavior | Notes |
| --- | --- | --- | --- | --- |
| Add blank/project row | Optimistic row appears in selected node | Matching Project tab item appears as soon as row is accepted/persisted | Patch lite sidebar query and rows-library query, then active refetch projected rows | If insert is still pending, keep draft visible in sheet and avoid duplicate sidebar items |
| Rename/material edit project row | Cell updates immediately | Same item name updates immediately | Patch projected item by row id using the same optimistic/server row patch | This is the reported bug |
| Edit cost/quantity/supplier | Row values update immediately | Project item cost/supplier metadata updates immediately | Same projection cache patch, preserving folder placement | Cost totals must stay derived from row values |
| Delete project row | Row disappears/undo path remains | Project item disappears immediately | Remove projected item by row id from sidebar caches; active refetch fallback | Do not remove unrelated library item with same material |
| Add multiple instances from Project tab | New row appears in target node | Original projected item remains; new row later appears as an additional project item if classified project-level | Insert action treats Project tab item like `source: "project"` library-item payload, with row id copied into metadata/source snapshot rather than `sourceLibraryItemId` | Multiple instances are separate estimate rows; they can share source metadata |
| Promote project row to library | Source row relinks to library | Project item leaves Project tab; library item appears/refreshes in Library tab | Remove project projection and actively invalidate library rows | Existing separate project instances remain project rows unless explicitly replaced/promoted |
| Drag project component into any valid tree area | Drop target accepts it like a library item | Sidebar drag state shows compatible drop zones | Use `LIBRARY_ITEM_DRAG_MIME_TYPE` for projected component rows | Project source subtree MIME remains for project/tab/node copy flows |

## Performance Contract

- Local optimistic patch must run before any network refetch.
- Active refetch is a reconciliation fallback, not the primary feedback mechanism.
- Cache keys must stay workspace/project scoped.
- No full project reload or page refresh for row-level CRUD.
- No broad `invalidateQueries` across unrelated workspaces.
