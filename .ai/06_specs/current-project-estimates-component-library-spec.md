# Current Project Estimates + Component Library Feature Spec

**Date:** 2026-05-18
**Status:** Current-state specification for the implemented post-reset slice
**Scope:** `/workshop/projects/[projectId]/estimates/[nodeId]` estimate workspace and the connected estimate-page Component Library sidebar
**Improvement plan:** `.ai/03_plans/project-estimates-component-library-improvement-plan.md`
**Primary code references:**

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/estimate-tree-data.ts`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/ComponentCard.tsx`
- `src/components/workshop/component-library/NewComponentForm.tsx`
- `src/components/workshop/component-library/helpers.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/search-input.tsx`
- `tests/vitest/estimate-tree-data.test.ts`

---

## 1. Product intent

The current implemented slice lets a contractor work inside a selected project estimate, navigate a location/work-scope hierarchy, and insert reusable Component Library items into estimate areas.

This is not yet the full MVP estimating system. It is a post-reset, local-state demonstration of the intended workflow:

1. choose a project;
2. enter the project estimate route;
3. select a lot / structure / floor / area node;
4. review existing estimate row items in that selected branch;
5. search and filter reusable components from a right-side library;
6. add a component to the selected estimate area by click or drag/drop;
7. edit quantity, supplementary cost, labor cost, discipline, and designation locally;
8. see totals update in the visible estimate sheet.

The feature exists to validate the project-estimate surface and the library-to-estimate connection without restoring the rejected full prototype.

---

## 2. Non-goals for the current slice

The following are intentionally not guaranteed by the current implementation:

- backend persistence;
- Supabase/Postgres connection;
- authenticated workspace data;
- project-specific persisted libraries;
- permanent saves of inserted rows or custom library items;
- server-side estimate mutations;
- proposal package generation;
- revision/version records;
- full spreadsheet/grid behavior;
- supplier quote workflow;
- destructive global library administration;
- exact source-verified pricing.

The current component and estimate data are local demo data. Pricing is allowed to be a demo allowance only when labeled as requiring supplier verification.

---

## 3. User roles and jobs

### Primary user

Small contractor, design-build contractor, fit-out estimator, or architect/contractor preparing a preliminary project estimate.

### Core jobs

- Build an estimate from reusable material/component rows instead of typing every row from scratch.
- Navigate by project scope/location rather than by a generic flat spreadsheet.
- Insert PH-relevant components quickly into the active estimate area.
- Adjust quantity, labor, and other cost allowances without losing the original component context.
- Keep price/source metadata visible enough to remind the user that supplier verification is required.

---

## 4. Route and layout specification

### Route

`/workshop/projects/[projectId]/estimates/[nodeId]`

### Route behavior

- Loads the project by `projectId` from `sampleProjects`.
- Falls back to the first sample project if the route project id is not found.
- Resolves `nodeId` against `sampleEstimateTree`.
- Falls back to the first top-level estimate node if the route node id is invalid.
- Renders a three-zone estimate workspace:
  - left estimate tree panel;
  - center estimate sheet content;
  - right Component Library sidebar.

### Required layout zones

#### Left: Estimate tree

Component: `EstimateSheetTree`

Purpose:

- Provide route-backed navigation across estimate hierarchy nodes.
- Show hierarchy depth, node icons, expand/collapse state, and selected node state.

Current behavior:

- Left panel is resizable through `ResizableSidePanel`.
- Width storage key: `estimate_sheet_tree_width`.
- Default width: `272px`.
- Min width: `216px`.
- Max width: `432px`.
- Search input is present visually but not yet functionally wired.
- Add-area button is present visually but not yet functionally wired.
- Node links navigate to `/workshop/projects/${projectId}/estimates/${node.id}`.
- Selected link uses `aria-current="page"`.
- Expand/collapse is separate from route navigation.

#### Center: Estimate sheet

Component: `EstimateSheetContent`

Purpose:

- Display the selected node branch as a compact hierarchical estimate sheet.
- Allow editable row costs and local insertion/deletion.

Current behavior:

- Owns local `estimateTree` state initialized from `sampleEstimateTree`.
- Owns local `editableRows` state derived from existing estimate row items.
- Renders a sticky header with selected node, stats, search placeholder, Filter, View, and total.
- Renders the selected node branch recursively.
- Shows child groups before row tables.
- Allows collapse/expand per rendered branch.
- Allows rows only on `kind: "area"` nodes.
- Rejects insertion into non-area nodes.
- Deletes row items from local estimate state and corresponding editable row state.

#### Right: Component Library sidebar

Component: `EstimateRightSidebar`

Purpose:

- Provide a compact, high-frequency component picker connected to the active estimate.
- Enable click insertion and drag/drop insertion of reusable components into the selected estimate area.

Current behavior:

- Right panel is resizable through `ResizableSidePanel`.
- Width storage key: `estimate_component_library_width_v2`.
- Default width: `380px`.
- Min width: `360px`, with internal `min-w-[320px]`.
- Max width: `560px`.
- Contains sticky title/search/control header.
- Uses shared `SearchInput` and `Button` primitives in the main header controls.
- Supports local library item state initialized from `estimateLibraryItems`.
- Supports local preference state via localStorage for view/group/sort/favorites/recents.

---

## 5. Estimate hierarchy model

Source: `src/components/workshop/estimate-tree-data.ts`

### Types

```ts
export type EstimateAreaNode = {
  id: string;
  name: string;
  kind: "lot" | "structure" | "level" | "area";
  total: string;
  children?: EstimateAreaNode[];
  estimateRowItems?: EstimateRowItem[];
};
```

### Durable hierarchy rule

The current hierarchy is:

`Lot Group → Structure Group → Floor Group → Area Group → EstimateRowItem`

Allowed simplification:

- Parent groups may skip intermediate levels and contain Area Groups directly.
- Example: a lot group may contain a site-work area directly when the work does not need a building/floor subdivision.

Hard rule:

- Only `kind: "area"` nodes may contain `estimateRowItems`.
- Insertion must enforce this rule, not only hide UI affordances.
- Tests must continue to confirm that rows exist only on area groups.

### Existing validation

`tests/vitest/estimate-tree-data.test.ts` currently verifies:

- multiple top-level lot groups are supported;
- parent groups may contain area groups directly;
- estimate row items remain only on area groups.

### Tree navigation requirements

- Each visible node must have a stable route id.
- Route selection must use the selected `nodeId`, not local-only selected state.
- Expand/collapse state must not navigate.
- Node icons must derive from `kind`, not from depth:
  - lot / structure: house/building-like icon;
  - level: stack/slab-like icon;
  - area: cube/room-like icon.

---

## 6. Estimate row item model

Source: `EstimateRowItem` in `estimate-tree-data.ts`

### Fields

```ts
export type EstimateRowItem = {
  id: string;
  material: string;
  name?: string;
  description: string;
  supplier: string;
  source: "project" | "supplier" | "library";
  unit: string;
  itemCost: number;
  price?: number;
  currency?: string;
  quantity: number;
  subTotal: number;
  supplementaryCosts: number;
  laborCost: number;
  laborCostDefault?: number;
  otherCostDefault?: number;
  totalItemCosts: number;
  imageUrl?: string;
  category: string;
  discipline?: string;
  designation?: string;
  tags?: string[];
  sku?: string;
  sourceUrl?: string;
  notes?: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  pricingSource: string;
  pricingDate: string;
};
```

### Pricing calculations

The current display/calculation model is:

- `subTotal = itemCost × quantity`
- `totalItemCosts = subTotal + supplementaryCosts + laborCost`

In the center estimate sheet, editable numeric fields are stored as strings in `editableRows`, parsed at calculation time, and formatted as PHP currency.

### Editable row state

Local editable state stores:

```ts
type EditableRowValue = {
  quantity: string;
  supplementaryCosts: string;
  laborCost: string;
  discipline: string;
  designation: string;
};
```

Editable fields in the current sheet:

- quantity;
- supplementary / other costs;
- labor cost;
- discipline;
- designation.

### Source / trust metadata

Every library item must carry:

- `pricingSource`;
- `pricingDate`.

Current seed data commonly uses wording such as:

- demo seed assumption;
- supplier quote required;
- PH retail allowance;
- verify current depot quote.

This is correct for preliminary estimating and must not be reworded as final supplier-verified pricing unless actually sourced and verified.

---

## 7. Component Library inventory and facets

Source: `estimateLibraryItems` in `estimate-tree-data.ts`

Current inventory characteristics observed from the source file:

- At least 72 seeded library `row(...)` entries with explicit categories.
- Major categories include:
  - Finishes;
  - Furniture;
  - Plumbing Fixtures;
  - Wall Paints / Interior Finishes;
  - Lighting Fixtures;
  - Electrical Fixtures;
  - Kitchen Fixtures;
  - Outdoor;
  - Cabinetry.
- Many items are Philippine-context examples or allowances from brands/suppliers such as IKEA Philippines, Wilcon Depot, Mariwasa, Boysen, Davies, Floor Center, Matimco, American Standard, HCG, Grohe, Franke, Panasonic, Firefly, and similar PH retail/supplier contexts.
- Thumbnails prefer local `/component-thumbnails/...` paths when mapped, then item image URL, then category fallback.

### Required component metadata

A reusable component should have, at minimum:

- id;
- material/name;
- description;
- category;
- supplier;
- source;
- unit;
- item cost;
- default quantity;
- default supplementary/other cost;
- default labor cost;
- image URL or inferred image fallback;
- pricing source;
- pricing date.

Recommended metadata:

- discipline;
- designation;
- tags;
- SKU;
- source URL;
- notes;
- favorite/custom/created/updated/last-used state.

---

## 8. Component Library sidebar behavior

### Search

Implemented by `searchComponents` in `component-library/helpers.ts`.

Search considers:

- name/material;
- supplier;
- category;
- description;
- tags;
- discipline;
- designation;
- unit;
- notes/pricing source.

Search scoring currently prioritizes:

1. exact name match;
2. name starts with query;
3. name contains query;
4. supplier/category match;
5. discipline/designation/unit match;
6. description/tags/notes match.

### Filters

Implemented by `filterComponents` and `FilterPanel`.

Current filters:

- category;
- supplier;
- discipline;
- designation;
- unit;
- min/max price;
- favorites only;
- recent only;
- custom only;
- image state: all / has image / no image;
- supplier state: all / has supplier / no supplier.

### Sorting

Implemented by `sortComponents`.

Current sort modes:

- relevance;
- name A–Z;
- price low-high;
- price high-low;
- recently used;
- recently added;
- supplier A–Z.

### Grouping

Implemented by `groupComponents`.

Current group modes:

- none;
- category;
- supplier;
- discipline;
- room/area designation;
- recently used.

### View modes

Current view modes:

- compact;
- detailed;
- grid.

Preferences are stored locally through `archestimator_component_library_preferences_v1`.

### Favorites and recents

Current localStorage keys:

- `archestimator_component_library_favorites_v1`;
- `archestimator_component_library_recents_v1`.

Favorites are toggled locally. Recents are updated when an item is added.

### Preview panel

The preview panel shows:

- image thumbnail;
- name;
- category and supplier;
- price/unit;
- description;
- discipline;
- designation;
- custom badge;
- tags;
- actions: add, duplicate, favorite, delete.

### New component form

The sidebar can open `NewComponentForm`.

Creation requires:

- component name/material;
- category;
- unit;
- non-negative base price.

Created components are local-only and inserted at the front of the sidebar state.

Creation sets:

- id: `custom-${Date.now()}`;
- source: `library`;
- currency default: `PHP`;
- quantity default: `1`;
- custom flag: `true`;
- created/updated timestamps;
- pricing source: `User-created local component`;
- pricing date: current ISO date.

---

## 9. Library-to-estimate connection

### Click insertion

Flow:

1. User clicks Add on a `LibraryItemCard`, preview panel, or Save and add from the new component form.
2. `EstimateRightSidebar` dispatches a browser event:

```ts
window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: item }));
```

3. `EstimateSheetContent` listens for `archestimator:add-library-item`.
4. The selected route node id is used as the insertion target.
5. `insertLibraryItem(selectedNodeId, item)` is called.
6. Insertion is accepted only if the target node is `kind: "area"`.
7. The library item is cloned into a new estimate row item.
8. The cloned row is appended to the target area's `estimateRowItems`.
9. Editable row state is initialized for the new item.
10. Recent item state is updated in the sidebar.

### Drag/drop insertion

Flow:

1. User drags a `LibraryItemCard`.
2. Card sets `application/x-archestimator-library-item` dataTransfer payload to the serialized item.
3. An area branch drop zone accepts the payload.
4. Drop zone parses the payload and calls `onInsertLibraryItem(node.id, parsedItem)`.
5. Insertion is accepted only when the receiving branch node is `kind: "area"`.

### Cloning behavior

Implemented by `cloneLibraryItemForEstimate`.

Current behavior:

- New id is generated as `${targetNodeId}-${libraryItem.id}-${Date.now()}`.
- Quantity defaults to `libraryItem.quantity || 1`.
- Subtotal and total item costs are recalculated.
- The clone preserves the source library item's descriptive, pricing, category, supplier, image, and metadata fields.

### Important current limitation

The connected sidebar can add to the currently selected route node only by click. If the selected node is a lot/structure/level, click insertion is rejected because only areas can receive rows. Drag/drop can target visible area drop zones directly.

Future implementation should provide an explicit target-area resolver or target picker when a non-area node is selected.

---

## 10. Estimate sheet display behavior

### Header

The sticky estimate sheet header displays:

- `Estimate sheet` eyebrow;
- selected node name;
- selected node kind;
- shared search input placeholder for row search;
- Filter button;
- View button;
- stats row with row count and area count;
- project total.

Current limitation:

- Search, Filter, and View are visual controls only unless further wired.

### Branch headers

Each branch header displays:

- collapse/expand button;
- kind icon;
- node name;
- kind label;
- computed total.

Totals are computed recursively from row totals and child node totals.

### Row table

The estimate row table shows existing/inserted row items with:

- material thumbnail/name/supplier/description;
- discipline selector;
- designation selector;
- quantity input;
- unit;
- item/base cost;
- supplementary/other cost input;
- labor cost input;
- computed total;
- action strip including drag/open affordance and delete.

### Empty states and drop zones

- Empty branches can show an empty-area message.
- Area branches with contents can show a drag/drop zone.
- Drop zones must only insert into area nodes.

---

## 11. Data persistence and state boundaries

### Current state boundary

The current implementation is client-local and route-local:

- estimate tree state lives in React state inside `EstimateSheetContent`;
- editable row values live in React state inside `EstimateSheetContent`;
- component library view state lives in React state inside `EstimateRightSidebar`;
- library preferences/favorites/recents use browser localStorage;
- no project estimate mutation is persisted to disk or backend.

### Current implications

- Refreshing the page resets inserted estimate rows.
- Refreshing the page may preserve library preferences/favorites/recents because those use localStorage.
- Custom components created in the sidebar are not persisted across refresh unless later storage is added.
- The route uses shared demo estimate data for all projects, not project-specific estimate records.

### Future persistence requirement

Before making this production-like, introduce a repository boundary that separates:

- canonical project estimate data;
- component library source data;
- estimate row snapshots created from library items;
- mutable user edits;
- localStorage-only UI preferences.

Do not let UI grid/card objects become the data model.

---

## 12. Design-system requirements

This feature must obey the current Archestimator design rules:

- Outside landing page, visible UI text must not exceed `12px` unless Philip explicitly approves a named exception.
- Normal app text, controls, tables, inputs, chips, and buttons should be around `10px`.
- Meta labels should be around `8–9px`.
- Buttons and icon buttons should use `src/components/ui/button.tsx` or a shared wrapper built on it.
- Search controls should use `src/components/ui/search-input.tsx`.
- Repeated cards, chips, filters, dropdowns, panels, and empty states should be extracted or reused as shared components.
- The right panel must remain usable at a real working width of at least `320px`; do not over-shrink it to preserve the table.
- Component thumbnails are functional estimating cues, not decoration.

Known current design-system debt to monitor:

- Some raw `<button>` controls still exist inside the component library for chips, active filters, group headers, and menu items.
- Some raw `<input>` controls still exist for price range filters and tree search.
- Future cleanup should decide whether to extract shared `Chip`, `ControlSelect`, `FilterPill`, `MenuItemButton`, and compact field primitives.

---

## 13. Accessibility requirements

Current accessibility behaviors:

- Estimate route section has an `aria-label` based on project name.
- Tree nav uses `aria-label` and route links use `aria-current="page"` for selected node.
- Expand/collapse buttons use `aria-expanded`.
- Component cards use keyboard activation for preview with Enter/Space.
- Add/favorite/delete buttons have item-specific `aria-label`s.
- Delete confirmation uses `role="alertdialog"` and `aria-modal="true"`.

Required accessibility guardrails:

- Click insertion must always have a keyboard-accessible alternative.
- Drag/drop must never be the only insertion path.
- Search/filter controls need clear labels.
- Icon-only controls must have `aria-label`.
- Focus states must remain visible.
- If destructive library actions remain available, confirmation must stay explicit.

---

## 14. Acceptance criteria for the current feature

### Estimate tree

- User can see multiple top-level lot groups.
- User can expand/collapse hierarchy nodes without changing route.
- User can click hierarchy nodes to navigate to route-backed selected state.
- Selected route node is marked with `aria-current="page"`.
- Rows are owned only by area nodes.

### Estimate sheet

- User can view the selected node branch.
- User can collapse/expand branch sections.
- User can edit quantity, supplementary/other cost, labor cost, discipline, and designation locally.
- Row totals update from editable values.
- Branch totals update recursively from row totals and child totals.
- User can delete a row, and the row state is removed so totals update immediately.

### Component Library sidebar

- User can search components by name, supplier, category, description, tags, discipline, designation, unit, and notes/source.
- User can filter components by category, supplier, discipline, designation, unit, price, favorite/recent/custom state, image state, and supplier state.
- User can sort by relevance, name, price, recency, and supplier.
- User can group by none, category, supplier, discipline, room/area designation, and recency.
- User can switch compact/detailed/grid view modes.
- User can favorite, duplicate, preview, delete, and create local components.
- User can add a component by click.
- User can drag a component into an eligible area drop zone.

### Library-to-estimate connection

- Click Add dispatches the shared add-library-item event.
- Estimate sheet listens for that event.
- Insertion into non-area selected nodes is rejected.
- Insertion into area nodes appends a cloned estimate row.
- Clone id is unique enough for local demo use.
- Inserted rows preserve component metadata and initialize editable row state.

---

## 15. Test coverage expectations

### Existing tests

`tests/vitest/estimate-tree-data.test.ts` covers hierarchy shape and row ownership.

### Required next tests before expanding this feature

Add tests for helper-level library behavior:

- `searchComponents` ranking exact/name/supplier/category/description matches;
- `filterComponents` category/supplier/discipline/designation/price/favorites/recent/custom/image/supplier states;
- `sortComponents` each sort mode;
- `groupComponents` each group mode;
- `createComponent` validation and field defaults.

Add component/DOM tests for:

- click Add dispatches `archestimator:add-library-item` with the selected item;
- drag start sets `application/x-archestimator-library-item`;
- non-area selected node does not receive inserted rows;
- area selected node receives inserted row and total updates;
- delete row removes both canonical local row and editable row state;
- search/filter empty states render.

Run baseline:

```bash
bun run validate
git diff --check
```

If code changes affect routes/build output, also run:

```bash
bun run build
```

---

## 16. Known risks and implementation debts

1. **No persistence:** inserted rows and custom components are volatile.
2. **Shared demo tree across projects:** project route changes do not yet load project-specific estimate trees.
3. **Click insertion target ambiguity:** selecting a non-area node makes click Add silently no-op because only areas receive rows.
4. **Search/filter/view controls in estimate header are not fully wired.**
5. **Tree search and add-area controls are visual only.**
6. **No source-link snapshot model:** inserted rows copy fields, but there is no explicit `sourceLibraryItemId`, link state, or source-change review state yet.
7. **LocalStorage only for preferences:** favorites and recents are browser-local, not workspace/account-level.
8. **Raw controls remain:** some chips, pills, selects, and menu items should be moved into shared primitives.
9. **Thumbnail/source quality varies:** seeded data uses a mix of local thumbnails, official/product URLs, and Unsplash/category fallbacks.
10. **Pricing is preliminary:** many items are allowances requiring supplier quote verification.

---

## 17. Recommended next implementation sequence

1. Extract and reuse compact shared UI primitives for chips, active filter pills, select controls, menu buttons, and compact number/money fields.
2. Add helper tests for component library search/filter/sort/group/create behavior.
3. Add DOM tests for click insertion and drag payload behavior.
4. Add explicit selected target-area behavior when a lot/structure/level is selected:
   - either prompt/pick nearest eligible area;
   - or disable Add with a clear message until an area is selected.
5. Add explicit `sourceLibraryItemId` and snapshot/link-state fields to inserted estimate rows.
6. Introduce a local repository boundary for project-specific estimate data when the UX is stable enough to persist.
7. Wire estimate header search/filter/view controls only after row filtering behavior is specified.
8. Wire tree search/add-area only after hierarchy mutation rules are specified.

---

## 18. Definition of done for this spec

This spec is complete when future agents can answer, without reading chat history:

- what the current project-estimate/component-library feature does;
- which routes and components implement it;
- what data model it uses;
- how library items enter estimates;
- which behaviors are implemented versus only visual;
- what is intentionally not implemented;
- what tests must protect before expansion;
- which design-system rules apply.
