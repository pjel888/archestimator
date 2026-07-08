# Component Interoperability Plan

Date: 2026-07-08

## Goal

Make project-level and library-level components interoperable across:

- Add Component modal
- Edit Component modal
- Inline row item editing
- Thumbnail images
- Variant selection and persistence

## Identity Contract

- Component uniqueness is UUID-based, not name-based. Identical names, suppliers, brands, categories, descriptions, costs, and units are valid when component ids differ.
- Library-level component identity comes from `sourceLibraryItemId` plus the library item/version snapshot. Editing a row that came from the library must not silently mutate the library master.
- Project-level component identity comes from project component metadata/projection and source snapshot fields. Updating one project component instance should fan out to the other estimate rows that share the same project-component identity.
- Row-local display fields are projections, not identity: `material`, `description`, `brand`, `supplier`, `unit`, `itemCost`, `imageUrl`, and variant labels can repeat.

## Surface Matrix

| Surface | Library-level behavior | Project-level behavior |
| --- | --- | --- |
| Add Component modal | Creates a library component with variants, images, catalogue fields, and supplier/brand/category metadata. Duplicate-name warning may appear in create mode only. | Not the creation path for project-row instances. |
| Edit Component modal | When opened for a linked row, edits are row overrides unless an explicit library-master edit path is chosen later. | Uses the same modal in edit mode, without duplicate-name blocking. Saves through row update so shared project instances receive the same thumbnail/metadata/variant projection. |
| Inline scalar editing | Row override/update path. | Row update path with shared project-component fanout. |
| Inline variant pill | Library replacement path, because variant choice is replacing the row projection from a library option. | Row update path, because variant choice edits the project component projection and must fan out to matching project instances. |
| Thumbnail upload/preview | Existing storage paths are brokered through component-library image API routes. | Existing storage paths are brokered through project image API routes; uploaded thumbnail is persisted into row/project source snapshot. |

## Implemented In This Iteration

- Edit mode for `AddComponentModal` now initializes from the existing row/project component rather than create-mode defaults.
- Edit mode no longer reports "A component named ..." duplicate warnings. Duplicate names are allowed because ids carry identity.
- Existing image previews are normalized through the image broker route so raw project/library storage paths do not render as broken thumbnails.
- Edit-mode thumbnail uploads from the estimate sheet use the project image endpoint with the current project id; library component creation still uses the component-library image endpoint.
- Edit mode loads all active row `priceOptions`, picks the row-selected option as the active/default variant, and returns the edited variant set.
- `EstimateSheetContent` forwards edited component metadata, image, selected variant id/label, and `priceOptions` into row updates.
- Row update patches now carry category, supplier/brand ids, SKU, pricing metadata, lifecycle fields, selected variant id/label, and row-local price options through optimistic/server patching.
- Project component row updates now fan out those fields to matching instances in the estimate tree.
- Variant pill selection now uses row update for project rows and the library replacement path for linked library rows.
- Row-update source snapshot text normalization now tolerates null-ish values so save paths do not crash on absent source URLs.

## Remaining Design Gaps

- Full project-level variant-list persistence is currently row/source-snapshot based. If project components need their own durable variant table independent of estimate rows, add a project-component variant schema and server action rather than overloading row snapshots further.
- Library-master edit mode remains a separate product decision. Current estimate-sheet edit mode is intentionally row/project projection editing.
- Browser/manual proof should cover the exact live upload path because file chooser persistence depends on the deployed/local storage adapter and image API route behavior.

## QA Matrix

- Create two library components with identical names and verify create mode allows the second after user intent.
- Edit a project component with an identical name and verify there is no duplicate-name warning.
- Upload/change a project component thumbnail and verify all same-project instances show the thumbnail after save/reload.
- Open edit mode for a row with an existing raw storage image path and verify the preview renders.
- Add two or more variants, select a non-default variant, save, and verify the selected variant id/label, cost, unit, image, SKU, and pricing metadata persist.
- Select a variant from the inline pill on a project row and verify the update action is used and matching project instances update.
- Select a variant from the inline pill on a linked library row and verify the library replacement action is used.
- Verify row details modal remains row-item only and does not include the component tab.

## Current Evidence

- `bunx vitest run tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx`
- Result: 3 test files passed, 63 tests passed.
