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
7. add reusable estimate templates into Group Nodes when a repeated room/scope structure should be copied at once;
8. edit quantity and Misc Cost locally;
9. see totals update in the visible estimate sheet.

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

The current Component Library taxonomy, suppliers, and seeded reusable rows are Supabase-backed through `component_category_nodes`, `component_suppliers`, and `cost_library_items`, with static `estimateLibraryItems` retained as a test/fallback fixture. Pricing is allowed to be a demo allowance only when labeled as requiring supplier verification.

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
- Persisted base width: default `272px`, min `216px`, max `432px`.
- On the estimate sheet detail route, the removed `ProjectMiniSidebar` width (`104px`) is added as a left extension to the estimate tree so the tree's right resize/collapse edge stays aligned with its previous position.
- Search input is present visually but not yet functionally wired.
- Add tree action opens the Add estimate tree node modal.
- Tree header tools include expand-all and collapse-all icon actions for the visible hierarchy.
- Node primary actions update scoped local selected-node state immediately, then navigate to `/workshop/projects/${projectId}/estimates/${node.id}` for deep-link/server reconciliation.
- Selected tree rows use `aria-current="page"` when they match the active local/route-selected node.
- Expand/collapse is separate from route navigation.
- Group/folder nodes can be nested inside other group/folder nodes through add-node parent selection; Area Nodes remain leaves for estimate rows only.
- Estimate-tree drag/drop reorganization has been removed. The tree has no reorder drop zones, drag previews, optimistic move pipeline, or active move action.
- The temporary single-pointer `Move` modal/button has also been removed and must not be restored as-is. Tree movement has no current UI path pending a replacement design.
- Tree indentation must align nested node icons with the parent row's text column; the current tree indent step is `20px`.

#### Center: Estimate sheet

Component: `EstimateSheetContent`

Purpose:

- Display the selected node branch as a compact hierarchical estimate sheet.
- Allow editable row costs and local insertion/deletion.

Current behavior:

- Owns local `estimateTree` state initialized from the active TanStack Query area-tree cache.
- Owns local `editableRows` state derived from existing estimate row items.
- Uses scoped estimate workspace selection state so the visible branch changes immediately when the tree selection changes, before route props catch up.
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
- Contains a compact sticky search row and `HeaderIconToolbar` only.
- Uses shared `SearchInput` and `Button` primitives in the main header controls.
- Supports local library item state initialized from the shared Supabase Component Library dataset.
- The Categories tree shares `/workshop/library`' taxonomy backbone: `All Components` is the estimate-sidebar root, the V3 organizer/category/subcategory taxonomy stays in source order from `component_category_nodes`, empty taxonomy folders remain visible, and the estimate sidebar adds matching library line items as draggable/click-insertable rows under their `category_node_id` folders.
- The Suppliers tree shares `/workshop/library`' supplier organization from `component_suppliers`, and the estimate sidebar adds matching line items under suppliers by `supplier_id` when available.
- The area below `HeaderIconToolbar` goes directly into the active tab body. Categories, Suppliers, and Custom render grouped component rows. Templates renders reusable estimate templates only.
- The estimate-page sidebar no longer renders the old Components/Assemblies/Templates bundle model, import/export actions, view/sort controls, target-status strips, bulk-selection actions, or the recent-items strip.
- The Templates tab inserts reusable estimate-structure bundles into the selected Group Node or the selected Area Node's nearest ancestor Group Node. Template insertion sends only `templateId` to the server; the server copies persisted Group Nodes, Area Nodes, and row snapshots into the estimate through `public.insert_estimate_template_into_estimate` with fresh UUIDs. It never mutates template source data.
- Supports local preference state via localStorage for grouping plus favorites/recents metadata; recents remain data for ranking/history, not a visible strip above the library rows.

### Reusable estimate templates

Current behavior:

- `/workshop/library` is component-only. It has one visible tree tab, `Components`, and two view modes: `View By: Default` for editable library folders and `Suppliers` for supplier organization. The center sheet is scoped directly by the selected folder or supplier; it no longer has a row-collection dropdown. `/workshop/components` redirects to `/workshop/library`.
- `/workshop/templates` owns reusable estimate-structure bundles and a center template sheet. It visually mirrors the Library workspace for now but loads template data through the template-only repository helper.
- The estimate workspace still uses the combined repository helper for the right sidebar, but that helper bootstraps the current workspace once and then calls private component/template loaders with the same workspace/client.
- The estimate-page right sidebar has a Templates tab with compact template cards, add buttons, and native drag payloads.
- Templates are stored separately from component rows. They use `estimate_templates`, `estimate_template_nodes`, and `estimate_template_row_items`; the migration seeds shipped templates into existing workspaces, and static seed templates are used only as a repository fallback before local/remote migration rollout when the template tables are missing. Component UI defaults must not expose static templates on their own.
- Template rows inherit the active estimate-tree invariants: root template nodes are Group Nodes, Group Nodes may contain Group or Area Nodes, Area Nodes own rows and cannot parent children, and row items may attach only to Area Nodes.
- Template nodes follow the active two-kind estimate tree model: `group` nodes may contain `group` or `area` children, and `area` nodes own estimate row item snapshots.
- Inserting a template into an estimate is a single Postgres RPC boundary. `public.insert_estimate_template_into_estimate` validates workspace/project/estimate/template scope, validates the source template tree, writes copied `estimate_nodes` and `estimate_row_items` rows with fresh UUIDs and source snapshot metadata, and validates the target estimate tree before returning inserted root ids.

---

## 5. Estimate hierarchy model

Source: `src/components/workshop/estimate-tree-data.ts` for display data, with durable nesting rules in `src/lib/estimates/tree-hierarchy.ts`.

### Types

```ts
export type EstimateAreaNode = {
  id: string;
  name: string;
  kind: "group" | "lot" | "general" | "structure" | "level" | "area";
  total: string;
  children?: EstimateAreaNode[];
  estimateRowItems?: EstimateRowItem[];
};
```

### Durable hierarchy rule

The product model has two node concepts:

- Group Nodes organize the estimate tree.
- Area Nodes own estimate row items.

Newly created organizing nodes use `kind: "group"`. Existing storage kinds (`lot`, `general`, `structure`, and `level`) remain compatibility values and are displayed/validated as Group Nodes. Root accepts Group Nodes. Group Nodes may contain other Group Nodes and Area Nodes. Area Nodes are leaves for estimate rows.

Root placement remains part of the hierarchy model for created nodes, but there is no current tree-move UI. A future move workflow must define how valid group nodes can be moved back to the root without restoring the removed drag/drop behavior.

Hard rule:

- Only `kind: "area"` nodes may contain `estimateRowItems`.
- Insertion must enforce this rule, not only hide UI affordances.
- Tests and database constraints must continue to confirm that rows exist only on area groups.

### Existing validation

`tests/vitest/estimate-tree-data.test.ts` and add-node/tree route tests currently verify:

- multiple top-level Group Nodes are supported;
- parent groups may contain area groups directly;
- non-area group nodes may be nested under other non-area group nodes;
- estimate row items remain only on Area Nodes.
- estimate tree drag/drop and move-server-action assertions are intentionally absent.

### Tree navigation requirements

- Each visible node must have a stable route id.
- Route selection must use the selected `nodeId`, not local-only selected state.
- Expand/collapse state must not navigate.
- Node icons must derive from the two product concepts, not storage compatibility kinds:
  - Group Node: plain folder icon without icon background or border;
  - Area Node: cube/box icon.

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
  miscCost: number;
  miscCostDefault?: number;
  totalItemCosts: number;
  imageUrl?: string;
  category: string;
  categoryNodeId?: string;
  categoryPath?: string[];
  supplierId?: string;
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
- `totalItemCosts = subTotal + miscCost`

In the center estimate sheet, editable numeric fields are stored as strings in `editableRows`, parsed at calculation time, and formatted as PHP currency.

### Editable row state

Local editable state stores:

```ts
type EditableRowValue = {
  quantity: string;
  miscCost: string;
};
```

Editable fields in the current sheet:

- quantity;
- Misc Cost.

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

Source: `/workshop/library` reads component rows through `getCurrentWorkspaceComponentRowsLibrary()`, `/workshop/templates` reads templates through `getCurrentWorkspaceEstimateTemplates()`, and the estimate workspace uses `getCurrentWorkspaceComponentLibrary()` for the combined right-sidebar dataset. Static `estimateLibraryItems` in `estimate-tree-data.ts` is the fallback/test fixture.

Current inventory characteristics observed from the seeded Supabase source:

- 70 seeded `cost_library_items` rows are category- and supplier-linked.
- Major categories include:
  - Furniture;
  - Storage Systems;
  - Tile Flooring;
  - Wall Paints;
  - Lighting Fixtures;
  - Receptacles;
  - Plumbing Fixtures;
  - Kitchen Fixtures;
  - Casework;
  - Landscape / hardscape rows.
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
- default Misc Cost;
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

Helper-supported sort modes:

- relevance;
- name A–Z;
- price low-high;
- price high-low;
- recently used;
- recently added;
- supplier A–Z.

The estimate-page sidebar currently applies relevance sorting without rendering a sort selector.

### Grouping

Implemented by `groupComponents`.

Current group modes:

- none;
- category;
- supplier;
- discipline;
- room/area designation;
- recently used.

### Card display

The estimate-page sidebar currently renders the compact component-card layout only.

Detailed/grid card modes are not exposed in the estimate-page sidebar. Group preference is stored locally through `archestimator_component_library_preferences_v1`.

### Favorites and recents

Current localStorage keys:

- `archestimator_component_library_favorites_v1`;
- `archestimator_component_library_recents_v1`.

Favorites are toggled locally. Recents are updated when an item is added, but the estimate-page sidebar does not render a separate recent-items strip above the grouped rows.

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

- New estimate row ids are generated as UUIDs before persistence.
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
- quantity input;
- unit;
- item/base cost;
- Misc Cost input;
- computed total;
- action strip including drag/open affordance and delete.

Discipline belongs to the source library component metadata, not the editable estimate row item surface. Designation is not shown or editable on estimate row items in the current slice.

### Empty states and drop zones

- Empty branches can show an empty-area message.
- Area branches with contents can show a drag/drop zone below the row table.
- Populated estimate row tables must not include row-shaped add/drop placeholder rows.
- Area drop-zone copy uses "Drag and drop estimate component here".
- Clicking or keyboard-activating an Area drop zone appends a manual unlinked estimate row so users can fill quantity/Misc Cost before choosing a Component Library source.
- Manual blank rows render the material/component cell as "Drag or add a component here" until the user drops a component onto that cell or otherwise replaces the row source; they must not render product thumbnails or category image fallbacks.
- Drop zones must only insert into area nodes.

---

## 11. Data persistence and state boundaries

### Current state boundary

The current implementation is local-first with Supabase reconciliation:

- estimate tree and row data are read through server actions/repositories and cached in TanStack Query;
- estimate row edits update the client cache optimistically, then reconcile with Supabase persistence;
- inserted estimate row ids must be UUIDs because `estimate_row_items.id` is a Supabase UUID column; the client generates UUIDs for optimistic row ids, and `insertEstimateRowItemFromLibrary()` normalizes stale/non-UUID client row ids to server-generated UUIDs before inserting;
- static UI library ids such as `lib-sofa` are persisted through `source_snapshot`, not `source_library_item_id`; only UUID-backed `cost_library_items.id` sources can remain `linked-clean`;
- blank rows created from the estimate drop zone are persisted as unlinked project/manual rows with no `source_library_item_id`;
- selected estimate node state lives in a scoped Zustand store keyed by estimate id so tree selection and the center sheet update immediately before route navigation catches up;
- route state remains the deep-link and server-render reconciliation boundary;
- editable row values live in React state inside `EstimateSheetContent` while optimistic save state is in flight;
- component library view state lives in React state inside `EstimateRightSidebar`;
- library preferences/favorites/recents use browser localStorage.

### Current implications

- Tree selection must not wait for Supabase or route navigation before updating the sheet.
- Supabase remains the canonical store after optimistic mutations settle.
- Refreshing the page may preserve library preferences/favorites/recents because those use localStorage.
- Custom components created in the sidebar are not persisted across refresh unless later storage is added.

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
- Tree nav uses `aria-label` and route-navigation row buttons use `aria-current="page"` for the selected node.
- Expand/collapse buttons use `aria-expanded`.
- Estimate tree drag/drop move controls have been removed; no replacement move UI is currently active.
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
- User can edit quantity and Misc Cost locally.
- Row totals update from editable values.
- Branch totals update recursively from row totals and child totals.
- User can delete a row, and the row state is removed so totals update immediately.

### Component Library sidebar

- User can search components by name, supplier, category, description, tags, discipline, designation, unit, and notes/source.
- User can filter components by category, supplier, discipline, designation, unit, price, favorite/recent/custom state, image state, and supplier state.
- Sidebar list sorting is fixed to relevance in the current UI.
- User can cycle grouping by none, category, supplier, discipline, room/area designation, and recency from the icon toolbar.
- Sidebar component cards render in compact mode only.
- User can favorite, duplicate, preview, delete, and create local components.
- User can add a component by click.
- User can drag a component into an eligible area drop zone.
- User can click or keyboard-activate an eligible area drop zone to append a blank manual row before choosing a component.

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
6. **Partial source-change review model:** inserted rows persist `sourceLibraryItemId`, category/supplier ids, and snapshots for UUID-backed library sources, but no source-change review UI exists yet.
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
5. Add in-app mutation flows for database-backed Component Library categories, suppliers, and custom components after hierarchy-editing rules are specified.
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
