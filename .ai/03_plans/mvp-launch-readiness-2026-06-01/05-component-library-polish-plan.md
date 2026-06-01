# Component Library Polish Plan

Do not revive rejected bulk import/export or overbuilt manager UI. This is polish on the current `/workshop/library` route.

## Current Evidence

| Area | Evidence |
| --- | --- |
| Route data | `src/app/workshop/library/page.tsx:13` loads `getCurrentWorkspaceComponentRowsLibrary()`. |
| Client shell | `LibraryPageClient.tsx:12` dynamic-loads `ComponentLibraryManager`; fallback skeleton at `LibraryPageClient.tsx:19`. |
| Manager state | `localFolders`, `viewMode`, `selectedFolderId`, `selectedSupplierNodeId`, `selectedBrandNodeId`, `reorderStatus`, `sheetStatus`, `addComponentOpen`, `libraryItemState` at `ComponentLibraryManager.tsx:824`. |
| Sheet search | `itemMatchesSheetQuery` searches name, supplier, brand, category, unit, description, category path at `ComponentLibraryManager.tsx:138`. |
| Tree search | Folder tree search uses `filterFolderTree` at `LibraryFolderTree.tsx:138` and component matching at `LibraryFolderTree.tsx:87`. |
| Shared primitives | `SearchInput`, `HeaderIconToolbar`, `ResizableSidePanel`, `WorkshopTree`, `WorkshopTreeRow`, `WorkshopTreeTabs`, `EmptyState`. |
| Current empty state | Sheet uses `EmptyState` at `ComponentLibraryManager.tsx:745`; some folder rows use custom copy. |
| Mutation status | `SheetStatus` supports `idle`, `saving`, `saved`, `error` at `ComponentLibraryManager.tsx:105`. |

## UX Contract

| State | Trigger | Copy | Component |
| --- | --- | --- | --- |
| Loading route | Dynamic manager or route loading | Existing skeleton; keep compact row rhythm. | `LibraryManagerFallback`, route `loading.tsx`. |
| Empty all components | `libraryItems.length === 0` and no search | "No components in this workspace yet." Secondary: "Add a component to start building reusable estimate rows." | `EmptyState` |
| Empty filtered view | `visibleItems.length === 0` with `searchQuery` | `No components match "<query>".` | `EmptyState` |
| Empty folder | Selected folder has no rows | "No components in this folder yet." | `EmptyState` or row-level equivalent |
| Repository error | Route error boundary | "Component library could not load." Action: retry. | Existing `/workshop/library/error.tsx` |
| Mutation saving | create/rename/delete/reorder | Existing `saving` message, visible in toolbar/status region. | Existing status slot |
| Mutation error | action rejects | Error text from caught error, capped to one line plus tooltip if long. | Existing status slot |

## Search/Filter Contract

Keep current state variables:

- `viewMode`
- `selectedFolderId`
- `selectedSupplierNodeId`
- `selectedBrandNodeId`
- sheet-local `searchQuery`
- tree-local `searchQuery`

Filtering rules:

1. Text search normalizes case and punctuation.
2. Sheet search must match: `material`, `supplier`, `brand`, `category`, `unit`, `description`, `categoryPath`, and pricing source if present.
3. Tree search must match folder labels plus child component rows; add brand matching if absent in tree helper.
4. Filter count must display `visible / total` for the selected view.
5. Clearing search restores selected folder/supplier/brand view without changing selection.

## Component Row Display Fields

Each component card/row should show, when present:

- Name/material.
- Category path.
- Unit and item cost.
- Supplier.
- Brand.
- Pricing date/source.
- Confidence.
- Lifecycle/state if available in row data.
- Folder path or "No folder assigned" for unassigned cards.

Do not invent new data. Use `EstimateRowItem` fields already mapped by `normalizeComponentLibraryItem` in `component-library-repository.ts:104`.

## Data Quality Checks

Add fixture-backed repository tests for:

- Missing supplier/brand/category does not crash UI.
- Duplicate component names remain distinguishable by supplier/brand/unit.
- Missing price renders a nonblank placeholder and does not sort as a valid cost.
- Folder assignment missing renders under unassigned.
- Component rows never include templates in `/workshop/library`.

## Accessibility Requirements

- Search inputs have stable `aria-label`.
- Tree rows keep `role="treeitem"`, selected state, and keyboard-compatible focus.
- Icon buttons use tooltips/accessible labels.
- Empty states are announced through visible text, not icons only.
- Status errors are visible text and not color-only.

## Tickets

| Ticket | Implementation details | Acceptance criteria | Tests | Rollback |
| --- | --- | --- | --- | --- |
| MVP-LIB-001 | Normalize empty/loading/error/search copy; add brand/pricing-source search parity; keep existing state names. | Search and empty states behave consistently across sheet/tree. | `component-library-manager-ui.test.tsx`, route error-boundary test. | Revert copy/filter helper changes. |
| MVP-LIB-002 | Add trust fields to card/row using existing `EstimateRowItem` data; add malformed-data fixtures. | Cards show available supplier/brand/pricing/confidence/lifecycle without layout shift. | Repository and DOM fixture tests. | Hide added fields; data untouched. |

## Visual QA Checklist

- 1440px desktop: library tree and sheet do not overlap.
- 1024px laptop: filter counts and trust fields truncate cleanly.
- Mobile/tablet fallback: no text overflow in toolbar/search/buttons.
- Empty states use shared tone and do not create nested cards.
- Icons use the existing icon system and sizes.
