# 22 - Component Interoperability Specification

## Purpose

This document specifies how the two component types — **Project Level Component** and **Library Level Component** — must interoperate across the estimate sheet's Add, Edit, and Inline editing surfaces, including variant handling. It incorporates the implemented work from the component-interoperability plan (archived 2026-07-08) and identifies remaining gaps that must be verified and hardened before MVP readiness.

## Component Type Identity Contract

### Library Level Component

- Identity: `sourceLibraryItemId` + library item/version snapshot.
- Creation: `AddComponentModal` in create mode, via `createCostLibraryComponent` Server Action.
- Row reference: `sourceLibraryItemId` on the estimate row. Mutations must NOT silently mutate the library master.
- Variant source: library `price_options` table. Linked rows may select a variant from library options.
- Thumbnail source: component-library image API routes (`/api/component-library/images`).
- Edit behavior: row overrides only. Library-master editing is a separate product decision outside estimate sheet scope.

### Project Level Component

- Identity: UUID-based row identity + project component projection fields.
- Creation: NOT the AddComponentModal creation path. Project-level components are created inline in the estimate sheet (insert blank row, insert from library, or insert from template) and acquire their identity from the project context.
- Fan-out: updating one project component instance must fan out to other estimate row items that share the same project-component identity within the same estimate.
- Variant source: row-local `priceOptions` + `priceOptionId` + `priceOptionLabel`. Project-level variants are row/source-snapshot based.
- Thumbnail source: project image API routes (`/api/projects/images`). Uploaded thumbnails persist into row/project source snapshot.
- Edit behavior: row update path with shared project-component fanout.

### Identity Conflict Rules

- Component uniqueness is UUID-based, not name-based. Identical names, suppliers, brands, categories, descriptions, costs, and units are valid when component ids differ.
- Row-local display fields are projections, not identity: `material`, `description`, `brand`, `supplier`, `unit`, `itemCost`, `imageUrl`, and variant labels can repeat.
- `sourceLibraryItemId` being null indicates a project-level component; being non-null indicates a library-linked component.

## Surface Matrix

| Surface | Library-level behavior | Project-level behavior |
|---|---|---|
| **Add Component modal** | Creates a library component with variants, images, catalogue fields, and supplier/brand/category metadata. Duplicate-name warning appears in create mode only. | Not the creation path for project-row instances. |
| **Edit Component modal** | Opens for linked row in edit mode. Edits are row overrides. No duplicate-name blocking. Saves through row update. Library master NOT mutated. | Same modal, edit mode. Saves through row update with shared project-component fanout. Thumbnail/metadata/variant projection fans out to matching instances. |
| **Inline scalar editing** | Row override/update path via `use-estimate-row-mutations`. | Row update path with shared project-component fanout. |
| **Inline variant pill** | Library replacement path — variant choice replaces the row projection from a library option via `replaceEstimateRowFromLibraryItem`. | Row update path — variant choice edits the project component projection and fans out via standard row update. |
| **Thumbnail upload/preview** | Brokered through component-library image API routes. Existing raw storage paths normalized through image broker. | Brokered through project image API routes. Uploaded thumbnail persisted into row/project source snapshot. Fan-out applies to same-component instances. |

## Implemented Behavior (from component-interoperability plan)

### Edit Mode Initialization (`AddComponentModal.tsx`)

- `getInitialDraft` detects `editingItem` and initializes from the existing row/project component rather than create-mode defaults.
- Edit mode loads all active row `priceOptions`, picks the row-selected option as the active/default variant, and returns the edited variant set.
- `getSelectedEditingPriceOptionId` selects: explicit `priceOptionId` > default active > first active > null.

### Duplicate Suppression

- `possibleDuplicate` check is gated behind `isEditing`. Edit mode never reports "A component named ..." duplicate warnings.
- Duplicate names are allowed because ids carry identity.

### Image Normalization

- `resolveExistingComponentImageUrl` normalizes raw storage paths through brokered routes.
- Falls back from `/api/projects/images` to `/api/component-library/images` for unresolved paths.
- `createBrokeredExistingImageUrl` constructs parameterized broker URLs.
- Edit-mode thumbnail uploads route to the project image endpoint when `imageUploadProjectId` is provided; create mode uses the component-library image endpoint.

### Variant Persistence

- `toVariantDraftFromPriceOption` maps existing `priceOptions` into `VariantDraft[]`.
- Variants sort by `variantSortOrder`, then by label.
- Selected variant id/label, cost, unit, image, SKU, and pricing metadata persist through edit-mode save.
- `buildComponentPayload` serializes variants into `priceOptions` for the Server Action.

### Row Update Patch

- `EstimateSheetContent` forwards edited component metadata, image, selected variant id/label, and `priceOptions` into row updates.
- Row update patches carry: category, supplier/brand ids, SKU, pricing metadata, lifecycle fields, selected variant id/label, row-local price options.
- Updates flow through optimistic/server patching in `use-estimate-row-mutations`.

### Project Component Fan-out

- Row updates for project-level components fan out matching fields to other instances in the estimate tree that share the same project-component identity.
- Source snapshot text normalization tolerates null-ish values so save paths do not crash on absent source URLs.

### Variant Pill Routing

- Variant pill selection uses row update for project rows.
- Variant pill selection uses the library replacement path for linked library rows (`replaceEstimateRowFromLibraryItem`).

## Remaining Gaps

### GAP-01: Project-Level Variant Persistence

**Status**: Current row/source-snapshot based.  
**Severity**: Medium. Works for MVP but limits future variant management.  
**Action**: Defer to post-MVP. Document in product backlog.

### GAP-02: Library-Master Edit Mode

**Status**: Estimate-sheet edit mode is intentionally row/project projection editing.  
**Severity**: Low. Not an MVP blocker for the estimate sheet.  
**Action**: Product decision required before implementation.

### GAP-03: Browser/Manual Proof

**Status**: Local vitest evidence exists (3 test files, 63 tests passed) but no browser proof.  
**Severity**: High for MVP readiness claims. Without browser proof, the surface matrix claims are locally-tested but not user-verified.  
**Action**: Add to Phase 0 baseline measurement scope.

### GAP-04: Inline Component Addition Through Row Item

**Status**: Multi-step flow (insert blank → edit modal) works but no explicit "Convert to Project Component" or "Link to Library Component" UX.  
**Severity**: Medium. Current flow works but could be confusing.  
**Action**: Product decision for post-Phase 0 UX improvement.

### GAP-05: Edit Component Modal for Newly Inserted Rows

**Status**: Edit modal initializes from possibly-sparse row state.  
**Severity**: Low. Functional but could be improved.  
**Action**: Accept current behavior for MVP.

### GAP-06: Fan-out Verification at Scale

**Status**: Project-component fan-out walks the tree to find matching instances. At 5,000-row stress scale, this is O(N).  
**Severity**: Medium → High at stress scale.  
**Action**: Add `componentInstanceNodeIds` index to normalized graph store (Performance Plan Phase 2-3) for O(1) fan-out lookup.

## Component Type Decision Matrix for Row Mutations

| Row attribute | Library-linked | Project-level |
|---|---|---|
| `sourceLibraryItemId` | Non-null (library item id) | Null |
| `sourceSnapshot` | Library version snapshot | Project source snapshot |
| Row update action | `updateEstimateRowItem` (row-scoped) | `updateEstimateRowItem` (fan-out to matching instances) |
| Variant pill action | `replaceEstimateRowFromLibraryItem` | `updateEstimateRowItem` |
| Thumbnail upload endpoint | `/api/component-library/images` | `/api/projects/images` |
| Edit modal duplicate check | Suppressed (isEditing gate) | Suppressed (isEditing gate) |
| Row details tab | Row item only (no component tab) | Row item only (no component tab) |

## Requirements

| ID | Source | Description |
|---|---|---|
| REQ-CI-01 | component-interoperability plan | AddComponentModal must support both create (library) and edit (row/project) modes |
| REQ-CI-02 | component-interoperability plan | Edit mode must suppress duplicate-name warnings |
| REQ-CI-03 | component-interoperability plan | Existing image URLs must normalize through image broker routes |
| REQ-CI-04 | component-interoperability plan | Edit-mode image uploads must use correct endpoint (project vs library) |
| REQ-CI-05 | component-interoperability plan | Variant selection must persist through edit-mode save |
| REQ-CI-06 | component-interoperability plan | Project-level row updates must fan out to matching instances |
| REQ-CI-07 | component-interoperability plan | Variant pill must route to correct action (row update vs library replacement) |
| REQ-CI-08 | component-interoperability plan | Source snapshot text normalization must tolerate null-ish values |
| REQ-CI-09 | this plan | Component type identity (library vs project) must be explicitly checked before mutations |
| REQ-CI-10 | this plan | Fan-out must not become O(N) at stress scale (requires graph index) |
| REQ-CI-11 | this plan | Add/Edit/Inline surfaces must behave correctly for both component types at stress scale |

## Performance Path

The component-interoperability work adds these data flows to the estimate sheet:

1. **Edit modal open**: O(1) for target row + O(V) for variant drafts.
2. **Edit modal save**: O(V) for variant serialization + O(I) for fan-out (currently tree-walk, target: O(1) graph index).
3. **Inline scalar edit**: Same as existing edit hot path.
4. **Inline variant pill**: O(1) dispatch + same mutation cost.
5. **Thumbnail upload**: Async fetch, not on main thread hot path.

**Primary scale risk**: fan-out tree-walk (GAP-06). The normalized graph store (Performance Plan Phase 2) must include `componentInstanceNodeIds: Record<string, string[]>` mapping project component identity → list of row ids.

## QA Matrix

### Library Component Scenarios

| ID | Scenario | Expected Result |
|---|---|---|
| CI-QA-01 | Create two library components with identical names | Create mode allows second after user acknowledges |
| CI-QA-02 | Insert library component into estimate sheet | Row created with `sourceLibraryItemId` and variant projection |
| CI-QA-03 | Edit library-linked row in AddComponentModal | Edit mode opens; no duplicate warning; save updates row only |
| CI-QA-04 | Select variant from inline pill on library-linked row | Library replacement action fires; row projection updates |
| CI-QA-05 | Edit library-linked row's thumbnail | Upload goes to component-library image endpoint |

### Project Component Scenarios

| ID | Scenario | Expected Result |
|---|---|---|
| CI-QA-06 | Edit project component in AddComponentModal | Edit mode opens; no duplicate warning; save fans out to matching instances |
| CI-QA-07 | Edit project component with identical name to another | No duplicate-name warning (ids differ) |
| CI-QA-08 | Upload/change project component thumbnail | All same-project instances show new thumbnail |
| CI-QA-09 | Add variants, select non-default, save | Selected variant id/label, cost, unit, image, SKU, pricing metadata persist |
| CI-QA-10 | Select variant from inline pill on project row | Row update action fires; fan-out applies |
| CI-QA-11 | Open edit mode for row with raw storage image path | Preview renders via broker route normalization |

### Scale Scenarios

| ID | Scenario | Expected Result |
|---|---|---|
| CI-QA-12 | Edit project component in 5,000-row estimate | Fan-out completes without blocking; edit p95 <= 75 ms |
| CI-QA-13 | Open edit modal for library-linked row in stress fixture | Modal opens with row data; no performance regression |
| CI-QA-14 | Inline scalar edit on project component at scale | Edit responsive; fan-out O(1) via graph index |

## Verification

- `verification_mode`: emulated (same-agent improvement pass).
- Readiness caps apply per Improve-Plan-Prompt Suite Succession contract.
- Browser proof required for CI-QA-06 through CI-QA-14 before MVP readiness.
- Local vitest evidence for CI-QA-01 through CI-QA-05 exists from component-interoperability plan.

## Source Documents

- `.ai/03_plans/2026-07-08/component-interoperability/README.md` (implemented, to be archived)
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` (primary surface)
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` (row mutation dispatch)
- `src/hooks/use-estimate-row-mutations.ts` (optimistic/server patching)
- `src/lib/estimates/types.ts` (EstimateRowItem type, sourceLibraryItemId field)
