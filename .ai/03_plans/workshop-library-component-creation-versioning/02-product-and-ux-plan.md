# 02 Product and UX Plan

## User Job

The user wants to create a reusable construction component from `/workshop/library`, classify it correctly, define one or more pricing options, and know later when the component or its price changed.

## Add Component Entry Point

Add the entry to the existing component sheet toolbar, not the old standalone manager chrome.

Recommended placement:

- Center sheet toolbar: primary `Add Component` action.
- Tree context menu on folders: `Add component here`.
- Supplier view context: future `Add component for supplier`, but this can be second slice.

The entry should open a modal, not navigate away.

Current code anchor: `ComponentLibrarySheet` renders `HeaderIconToolbar` with `addActions={[]}`. The implementation should replace that empty action list with a primary `Add Component` action and keep the toolbar rhythm instead of adding a new page header.

## Modal Structure

Use a compact multi-section modal that fits the app density rules.

Use the existing shared `Modal` primitive first. If the form needs more width than the default `max-w-md`, pass a route-local `className` such as a wider max width rather than creating a second modal system. Keep all visible workshop text at or below the `12px` app limit from `DESIGN.md`.

Modal contract:

- Use a wider route-local modal width such as `max-w-3xl`, with a bounded scroll body.
- Use section navigation or compact tabs inside the modal so Identity, Classify, Pricing, Lifecycle, and Review do not become one long undifferentiated form.
- Keep a sticky compact footer with primary Save, secondary Save and add another, and Cancel.
- Initial focus goes to Name. Closing returns focus to the Add Component button.
- Disable Save while invalid or saving.
- Keep the modal open on server errors and place errors next to the affected field/section.
- Block Escape/scrim close while saving.
- If the form is dirty, Escape/scrim/Cancel should require an explicit discard confirmation or route through a shared dirty-close guard.
- `Save and add another` resets identity/pricing fields after success while preserving current folder/category/supplier context.

Recommended sections:

1. **Identity**
   - Name
   - Kind
   - Description
   - Unit
   - SKU/reference
   - Brand
   - Image URL/path

2. **Classify**
   - Library folder picker using the existing folder tree.
   - Reporting category picker using the existing taxonomy path.
   - Supplier selector/create-new supplier.
   - Show the selected path as compact breadcrumbs.
   - Keep three explicit controls visible: Library folder, Reporting category, Supplier.
   - Folder/category pickers need search, keyboard traversal, selected-path breadcrumb, and empty state.
   - If the selected folder has a `source_category_node_id`, show the reporting category as inherited until the user changes it.

3. **Pricing**
   - Pricing option dropdown.
   - At least one required price option.
   - Fields per option:
     - label, e.g. `Retail`, `Supplier Quote`, `Allowance`, `Contractor Rate`
     - unit cost
     - misc/default add-on cost
     - unit
     - pricing source
     - pricing date
     - confidence
     - notes/source URL
   - Add option, duplicate option, mark default option.

4. **Lifecycle**
   - Current state dropdown.
   - Recommended states:
     - `draft`
     - `in_production`
     - `available`
     - `discontinued`
     - `archived`
   - Effective date.
   - Change note.

5. **Review**
   - Summary row: folder path, category path, supplier, default price, current state.
   - Save button.
   - Save and add another button.

## Categorization Behavior

Default values should come from current route context:

- In `View By: Default`, selected `library_folder_id` becomes the default folder.
- If the folder has `source_category_node_id`, default `category_node_id` to that source category node.
- In `Suppliers`, selected supplier becomes default `supplier_id`.
- If no folder is selected, default to the first folder but require the user to confirm classification before saving.

The modal should not ask users to type a category string when a structured category exists. Free-text `category` remains only a legacy/read fallback derived from the selected taxonomy label.

For the picker UI, reuse the existing tree package and row rhythm instead of adding a graph package. Folder selection can adapt the existing route tree. Reporting category selection will need a modal-local taxonomy picker built from existing `categoryTree` data because `/workshop/library` does not currently expose a route-level category picker mode. Supplier selection can start as a compact searchable select/list and graduate to a tree only if supplier hierarchy becomes real data.

The modal picker trees are selectors only. They must not move component rows into the tree and must not create a second route navigation state. Selecting a folder/category inside the modal changes only the draft component classification until Save succeeds.

## Component State Column

Add a visible state column or compact badge in the center sheet rows.

Suggested center sheet columns:

- Component name
- Supplier/category subline
- State badge
- Default price
- Unit
- Pricing date or stale indicator

Rows should remain dense. Avoid a wide table if the current sheet-list rhythm is preserved; add state as a small badge next to or beneath the component name.

Row anatomy contract:

- first line: component name
- second line: supplier/category metadata with lifecycle badge inline
- right side: default price and unit
- pricing date/stale indicator: secondary text in selected details or compact subline, not a new wide column by default
- no `text-sm` or larger workshop body text unless an existing design token explicitly permits it
- no table-style widening unless a later design pass replaces the entire sheet rhythm

Use the existing `Badge` primitive for lifecycle state. Recommended tones:

- `draft`: neutral
- `in_production`: info
- `available`: success
- `discontinued`: warning
- `archived`: danger or neutral muted, depending on whether archived rows are visible

## Version History UI

Do not overload the first modal with a full audit table. Recommended first slice:

- Preview/details drawer or modal tab: `History`.
- Show a compact chronological log:
  - version number
  - changed fields summary
  - price option changes
  - state transitions
  - changed by
  - changed at
  - effective date when applicable

History can be read-only in the first implementation.

The compact read-only History view is required for the first implementation if edit price/state flows ship in the same slice. If history UI is deferred, price/state editing must also be deferred or the acceptance criteria must be lowered to database-only history verification.

The first history visualization should be an app-native vertical timeline/list, not a node-link graph. Use `Badge`, compact timestamps, and short changed-field summaries. A graph package is only justified later if versions branch or if relationships between components/suppliers/categories need canvas navigation.

## Error Handling

- Required fields should validate before server submit.
- Server action must re-validate workspace access and foreign keys.
- If a selected folder/category/supplier is deleted before save, return a precise error and keep the modal open.
- If pricing has invalid numeric values or missing date/source, block save with field-level messages.
