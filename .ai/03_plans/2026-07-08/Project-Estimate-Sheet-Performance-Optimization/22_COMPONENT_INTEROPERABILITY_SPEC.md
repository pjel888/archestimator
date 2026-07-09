# 22 - Component Interoperability Specification

## Purpose

This document specifies how the two component types — **Project Level Component** and **Library Level Component** — must interoperate across the estimate sheet's editing surfaces, including variant handling. It is grounded in a full code audit of the current source (AddComponentModal, EditComponentDrawer, EstimateSheetContent, use-estimate-row-handlers, use-estimate-row-mutations, d1-action-client, express-components) and corrects naming/identity inaccuracies found in the prior version of this spec.

This is a planning document. It does not authorize code changes.

## Component Type Identity Contract

### Library Level Component

- **Identity**: `sourceLibraryItemId` (non-null) + `componentVersionId`/`componentVersionNumber` library version snapshot, persisted inside the row's `source_snapshot` JSON (D1 column `source_snapshot_json`).
- **Creation (master)**: `AddComponentModal` in create mode, mounted from `ComponentLibraryManager.tsx:2871` (no `editingItem`, no `imageUploadProjectId`). Save calls the `createCostLibraryComponent` Server Action (`src/lib/component-library/actions.ts:1242`).
- **Creation (estimate instance)**: a library item is inserted into an estimate via `insertEstimateRowItemFromLibrary` (`actions.ts:3288`, RPC `insert_estimate_row_item_with_history`). The row carries `sourceLibraryItemId` and the variant projection from the selected price option.
- **Row reference**: `sourceLibraryItemId` on the estimate row. Mutations must NOT silently mutate the library master — instead, an edited library-linked row flips `linkState` to `"linked-overridden"` (`actions.ts:3430`).
- **Variant source**: `cost_library_item_price_options` table (defined in `supabase/migrations/20260523120957_component_library_item_versioning.sql:40`, columns for label/unit/unit_cost/pricing plus variant columns from `20260524120322_component_library_variants.sql`). Linked rows select a variant from library options.
- **Thumbnail source**: component-library image API route (`/api/component-library/images`). Create-mode uploads in AddComponentModal go here.
- **Edit behavior in estimate sheet**: row overrides only. Library-master editing is a separate surface (`EditComponentDrawer`, see "Three Edit Surfaces" below).

### Project Level Component

- **Identity**: UUID-based identity resolved by `getProjectComponentIdentity` (`src/lib/estimates/express-components.ts:215`), NOT a typed column. Resolved in priority order:
  1. `source_snapshot.sourceType` is a project-component source type → `sourceComponentId` ?? `sourceEstimateRowId`.
  2. `metadata.projectComponentProjection.componentId` (where `classification` is `"express"` or `"detached-library"`).
  3. `metadata.expressComponent.componentId` ?? `expressComponent.id`.
  4. fallback row id.
- **Creation**: project-level components are created **inline in the estimate sheet**, not via the AddComponentModal create path. They originate from:
  - **Blank row insertion** → emits an express component template (`pricingSource: "Express component"`, `metadata.expressComponent`).
  - **Inline editing of a legacy blank row** → upgraded to express on first inline edit.
  - **Promotion** → `promoteEstimateRowToLibraryComponent` / `promoteExpressRowToLibraryComponent` (`express-promotion-actions.ts`) converts an express/project row into a library component (separate flow).
- **Fan-out**: updating one project component instance fans out to other estimate row items sharing the same project-component identity within the same project (see "Project-Component Fan-Out" below).
- **Variant source**: row-local `priceOptions` array + `priceOptionId` + `priceOptionLabel`, persisted inside the row `source_snapshot`. Project-level variants are row/source-snapshot based.
- **Thumbnail source**: project image API route (`/api/projects/images`). Edit-mode uploads in AddComponentModal go here because `imageUploadProjectId` is passed.
- **Edit behavior in estimate sheet**: row update path with shared project-component fan-out.

### Identity Conflict Rules

- Component uniqueness is **UUID-based, not name-based**. Identical names, suppliers, brands, categories, descriptions, costs, and units are valid when component ids differ.
- Row-local display fields are **projections, not identity**: `material`, `description`, `brand`, `supplier`, `unit`, `itemCost`, `imageUrl`, and variant labels can repeat.
- `sourceLibraryItemId` non-null ⇒ library-linked component. Null ⇒ project-level (express, legacy-blank, or detached) component.
- `linkState` lifecycle (`EstimateRowLinkState` in `types.ts:4`): `"unlinked"` (default) → `"linked-clean"` (library-linked, no overrides) → `"linked-overridden"` (library-linked, row edited) → `"source-changed"` → `"detached"` (explicitly unlinked via `detachEstimateRowItemFromLibrary`). The CHECK constraint lives in `migrations/0021_estimate_row_projection_fields.sql:5`.

## Three Edit Surfaces (Correction)

The estimate sheet and component library have **three distinct editing surfaces**, not two. The prior version of this spec conflated them.

| Surface | File | Mode | Target | Server Action / Mutation | Mutates library master? |
|---|---|---|---|---|---|
| **AddComponentModal (create)** | `component-library-manager/AddComponentModal.tsx` | create (no `editingItem`) | New library component | `createCostLibraryComponent` (`component-library/actions.ts:1242`) | **Yes** — inserts `cost_library_items` |
| **AddComponentModal (edit)** | same file, edit mode (`editingItem` set) | edit | Estimate row component (library-linked OR project-level) | none directly; calls `onComponentUpdated` → `updateRowItem` → `updateEstimateRowItem` (`estimates/actions.ts:3386`) | **No** — row projection only; flips `linkState` to `linked-overridden` if library-linked |
| **EditComponentDrawer** | `library/EditComponentDrawer.tsx` | edit | Library master component (inspector) | `updateCostLibraryComponent` + `upsertCostLibraryComponentPriceOption` (`component-library/actions.ts:1437`, `:1507`) | **Yes** — mutates library master |

Key distinctions:
- The AddComponentModal edit path and the EditComponentDrawer are **completely different code paths** that write to **different tables**. They must not be confused.
- A user editing a library-linked row inside the estimate sheet edits the **row projection only** (AddComponentModal edit mode). A user editing a library component inside the component library workspace edits the **library master** (EditComponentDrawer).
- There is no "create project component" action — project-level components are born from blank-row insertion + inline editing.

## Surface Matrix

| Surface | Library-level behavior | Project-level behavior |
|---|---|---|
| **AddComponentModal — create mode** | Creates a library component with variants, images, catalogue fields, supplier/brand/category metadata. Duplicate-name warning fires in create mode only (debounced 300ms after Name blur). | N/A — not the creation path for project instances. |
| **AddComponentModal — edit mode** | Opens for linked row (`editingItem`). Edits are row overrides → `linkState` becomes `"linked-overridden"`. No duplicate-name blocking. Saves through `updateEstimateRowItem`. Library master NOT mutated. | Same modal, edit mode. Saves through `updateEstimateRowItem` with project-component fan-out. Thumbnail/metadata/variant projection fans out to matching instances. |
| **EditComponentDrawer** (library workspace) | Edits the library master component + price options. | N/A. |
| **Inline scalar editing** (row-table cells) | Row override/update path via `use-estimate-row-handlers.updateRowItem`. | Row update path with shared project-component fan-out. |
| **Inline express editor** (material cell) | N/A for pure library rows (they render read-only material card). | Express fields (name/desc/brand/supplier/unit/unitCost) commit through `commitExpressFields` → `updateRowItem`. |
| **Inline variant pill** | Library replacement path — variant choice replaces the row projection via `replaceEstimateRowItemWithLibrary` (`actions.ts:3448`, RPC `replace_estimate_row_item_with_history`). | Row update path — variant choice edits the project component projection and fans out via standard row update. |
| **Thumbnail upload/preview** | Create mode: brokered through `/api/component-library/images`. Edit mode (library-linked row): `/api/projects/images` (because `imageUploadProjectId` is set by the estimate-sheet mount). | Edit mode: `/api/projects/images`. Uploaded thumbnail persists into row/project source snapshot. Fan-out applies to same-component instances. |
| **Promote to library** | N/A. | `promoteRowToLibrary` → `promoteEstimateRowToLibraryComponent`/`promoteExpressRowToLibraryComponent` (`express-promotion-actions.ts`). Converts row into library component. |
| **Detach from library** | `detachEstimateRowItemFromLibrary` (`actions.ts:3466`, RPC `unlink_estimate_row_item_from_library_with_history`). Sets `linkState: "detached"`. | N/A. |

## Implemented Behavior (verified from source)

### Edit Mode Initialization (`AddComponentModal.tsx`)

- `getInitialDraft` (line 494) detects `editingItem` and initializes from the existing row/project component rather than create-mode defaults.
- Edit mode loads all active row `priceOptions`, picks the row-selected option as the active/default variant, and returns the edited variant set.
- `getSelectedEditingPriceOptionId` (line 446) selects: explicit `priceOptionId` > default active > first active > `[0]` > `null`.
- `changeReason` defaults to `"Component updated from estimate sheet."` in edit mode (line 540) vs `"Component created from workshop library."` in create mode.

### Duplicate Suppression

- `duplicateIdentityIndex` (line 803) builds Maps keyed by `name\u001fcategory\u001fsupplier` and `name\u001fcategory\u001fbrand`; the edited item is excluded by id.
- `possibleDuplicate` (line 835) returns `null` immediately if `isEditing` (line 836). Edit mode never reports duplicate warnings.
- Duplicate check requires `duplicateCheckReady` (debounced 300ms after Name field blur) and is informational only — it does not gate `submit()`.

### Image Normalization

- `resolveExistingComponentImageUrl` (line 587) normalizes raw storage paths through brokered routes: tries `/api/projects/images` first (edit mode = project rows), falls back to `/api/component-library/images` (library-linked rows).
- `createBrokeredExistingImageUrl` (line 582) builds `<route>?path=<urlencoded>` and pipes through `normalizeEstimateRowImageUrl` (`src/lib/estimates/image-url.ts`).
- Edit-mode thumbnail uploads route to `/api/projects/images` when `imageUploadProjectId` is provided (always passed by the EstimateSheetContent mount at `EstimateSheetContent.tsx:2357`); create mode uses `/api/component-library/images`.
- `shouldBypassNextImageOptimization` (line 602) sets `unoptimized` on `<Image>` for brokered URLs.
- `removeComponentImageUpload` (line 652) routes DELETE based on `image.bucket === "project-images"`.

### Variant Persistence

- `VariantDraft` type (line 83): `id, label, description, sku, unitCost, unit, packageQuantity, packageUnit, isDefault, image, attachments`.
- `toVariantDraftFromPriceOption` (line 472) maps stored price options into drafts. Image source resolution: `option.thumbnailPath ?? option.imagePath ?? (isSelected ? editingItem.imageUrl : null)`.
- Variants sort by `variantSortOrder` then label (`compareExistingPriceOptions`, line 453).
- **`variantSortOrder` is derived from array position** in create mode (`index + 1`, `buildComponentPayload` line 1095), not read from the draft.
- Shared-image mode: `getVariantImage` (line 673) returns `draft.sharedImage` when `sharedImageForAllVariants`; all payload builders honor this.
- `buildEditedItem` (line 1404) rebuilds the `EstimateRowItem` locally and recomputes `subTotal/contingencyValue/adjustmentValue/totalItemCosts`.

### Row Update Patch (EstimateSheetContent → mutations)

- `updateComponentFromEditor` (`EstimateSheetContent.tsx:1740-1765`) flattens the edited `EstimateRowItem` back into `EditableRowValue` fields (note: `item.material` → `name` remapping at line 1742) and forwards `priceOptions`, `priceOptionId`, `priceOptionLabel`, `categoryNodeId`, `brandId`, `supplierId`, `sku`, pricing metadata, lifecycle fields into `updateRowItem`.
- It does **not** forward `sourceLibraryItemId`, `componentVersionNumber`, or `history` — those are preserved by the optimistic tree patcher (`patchEstimateRowItemInTree` merges, not replaces).
- Updates flow through `updateRowItem` (`use-estimate-row-handlers.ts:674`) → `commitRowItemUpdate` (line 516) → `enqueueRowUpdate` → `updateEstimateRowItem` Server Action.

## Project-Component Fan-Out (verified from source)

This is the most critical interop behavior. Fan-out exists at **two layers**:

### Server-side fan-out
- **Function**: `propagateProjectComponentRowPatch` (`src/lib/estimates/d1-action-client.ts:1632`).
- **Trigger**: `patchRowItem` with `eventType === "row_updated"` (line 1735).
- **Identity resolution**: `getProjectComponentIdentity(metadata, fallbackRowId, sourceSnapshot)` (`express-components.ts:215`).
- **Sibling match SQL** (lines 1644–1665): joins `estimate_row_items` to `estimates` on the same `project_id`, excludes the source row, matches the component identity via `COALESCE` over `json_extract` of `source_snapshot_json` and `metadata_json` buckets.
- **Patched fields**: only shared keys — `SHARED_PROJECT_COMPONENT_ROW_PATCH_KEYS` (line 1541) and `SHARED_PROJECT_COMPONENT_SOURCE_SNAPSHOT_KEYS` (line 1554, includes `priceOptionId`, `priceOptionLabel`, `priceOptionUpdatedAt`).
- Each sibling's `row_revision` is incremented; `totalDelta` from `unitCost` changes is accumulated.

### Client-side (optimistic) fan-out
- **Function**: `patchProjectComponentInstanceRowsInTree` (`src/lib/estimates/estimate-row-tree-patch.ts:275`).
- **Trigger**: `updateMutation.onMutate` in `use-estimate-row-mutations.ts:1203`.
- **Rollback**: `collectProjectComponentRollbackPatches` (`estimate-row-tree-patch.ts:357`) pre-collects inverse patches; `restoreEstimateRowPatchesInTree` applies them on error.
- **Projection caches**: `patchProjectComponentProjectionCaches` (`use-estimate-row-mutations.ts:595`) keeps projection caches consistent.
- **Current cost**: tree-walk — O(N) over the cached tree per mutation. **This is GAP-06.**

## Remaining Gaps

### GAP-01: Project-Level Variant Persistence

**Status**: Current row/source-snapshot based.
**Severity**: Medium. Works for MVP but limits future variant management.
**Action**: Defer to post-MVP. Document in product backlog.

### GAP-02: Library-Master Edit From Estimate Sheet

**Status**: Estimate-sheet edit mode (AddComponentModal edit) is intentionally row/project projection editing. Library-master editing happens via EditComponentDrawer in the library workspace — a deliberate separation.
**Severity**: Low. Not an MVP blocker for the estimate sheet.
**Action**: Product decision if users expect "edit library from row" UX.

### GAP-03: Browser/Manual Proof

**Status**: Local vitest evidence exists (`estimate-sheet-library-insert.test.tsx`, `library-add-component-modal-a11y.test.tsx`, `workshop-library-consolidation-ui.test.tsx`) but no browser proof for the estimate sheet route's component interop flows. The only browser proof of the component library surface is `workshop-library-demo-smoke.spec.ts` (search/trust/tree screenshot), which does NOT exercise sheet↔library interop.
**Severity**: High for MVP readiness claims.
**Action**: Add to Phase 0 baseline measurement scope; create `e2e/estimate-sheet-component-interop.spec.ts`.

### GAP-04: Inline Component Addition Through Row Item

**Status**: Multi-step flow (insert blank → inline edit → optional promote) works but no explicit "Convert to Project Component" or "Link to Library Component" UX.
**Severity**: Medium. Current flow works but could be confusing.
**Action**: Product decision for post-Phase 0 UX improvement.

### GAP-05: Edit Component Modal for Newly Inserted Rows

**Status**: Edit modal initializes from possibly-sparse row state.
**Severity**: Low. Functional but could be improved.
**Action**: Accept current behavior for MVP.

### GAP-06: Fan-Out Verification at Scale

**Status**: Client-side project-component fan-out walks the tree to find matching instances (`patchProjectComponentInstanceRowsInTree`). At 5,000-row stress scale, this is O(N) per mutation. Server-side fan-out is a single SQL join (already efficient).
**Severity**: Medium → High at stress scale.
**Action**: Add `componentInstanceNodeIds: Record<string, string[]>` index to the normalized graph store (Performance Plan Phase 2) for O(1) client fan-out lookup. Server-side fan-out is already efficient and does not need this index.

### GAP-07: Restore-Deleted Paths Throw on D1

**Status**: `restoreDeletedEstimateRows` (`d1-action-client.ts:2222`) and `restoreDeletedEstimateNodes` (`:2224`) throw unconditionally on D1 — restore is a known unimplemented path against the D1 history store.
**Severity**: Medium. Delete works, but undo/restore is not available on the active substrate.
**Action**: Document as a known MVP limitation; "soft delete + confirm" UX must be clear because restore is unavailable.

### GAP-08: Variant-Order Stability for Library Components

**Status**: `variantSortOrder` is derived from array position on create (`index + 1`). Reordering variants in create mode renumbers. For library-linked rows in edit mode, the stored `variantSortOrder` is respected.
**Severity**: Low.
**Action**: Accept for MVP; note if reorder UX is added later.

## Component Type Decision Matrix for Row Mutations

| Row attribute | Library-linked | Project-level |
|---|---|---|
| `sourceLibraryItemId` | Non-null (library item id) | Null |
| `linkState` | `linked-clean` → `linked-overridden` on edit | `unlinked` |
| `sourceSnapshot` | Library version snapshot | Project source snapshot (express/promoted) |
| Identity resolution | `sourceLibraryItemId` | `getProjectComponentIdentity` (JSON buckets) |
| Row update action | `updateEstimateRowItem` (row-scoped, flips linkState) | `updateEstimateRowItem` (row-scoped + server fan-out) |
| Client optimistic fan-out | None (row-scoped) | `patchProjectComponentInstanceRowsInTree` (O(N) tree-walk) |
| Server fan-out | None | `propagateProjectComponentRowPatch` (SQL join) |
| Variant pill action | `replaceEstimateRowItemWithLibrary` | `updateEstimateRowItem` |
| Thumbnail upload endpoint (edit mode) | `/api/projects/images` (estimate mount) | `/api/projects/images` |
| Thumbnail upload endpoint (create mode) | `/api/component-library/images` | N/A (no create path) |
| Edit modal duplicate check | Suppressed (isEditing gate) | Suppressed (isEditing gate) |
| Detach action | `detachEstimateRowItemFromLibrary` | N/A |
| Promote action | N/A | `promoteExpressRowToLibraryComponent` |

## Requirements

| ID | Source | Description |
|---|---|---|
| REQ-CI-01 | component-interoperability plan | AddComponentModal must support both create (library master) and edit (row/project projection) modes |
| REQ-CI-02 | component-interoperability plan | Edit mode must suppress duplicate-name warnings |
| REQ-CI-03 | component-interoperability plan | Existing image URLs must normalize through image broker routes |
| REQ-CI-04 | component-interoperability plan | Edit-mode image uploads must use correct endpoint (project vs library) |
| REQ-CI-05 | component-interoperability plan | Variant selection must persist through edit-mode save |
| REQ-CI-06 | component-interoperability plan | Project-level row updates must fan out to matching instances (server + client) |
| REQ-CI-07 | component-interoperability plan | Variant pill must route to correct action (`replaceEstimateRowItemWithLibrary` vs row update) |
| REQ-CI-08 | component-interoperability plan | Source snapshot text normalization must tolerate null-ish values |
| REQ-CI-09 | this plan | Component type identity (library vs project) must be explicitly checked before mutations |
| REQ-CI-10 | this plan | Client fan-out must not become O(N) at stress scale (requires graph index) |
| REQ-CI-11 | this plan | Add/Edit/Inline surfaces must behave correctly for both component types at stress scale |
| REQ-CI-12 | this plan | AddComponentModal create (library master) and AddComponentModal edit (row projection) must write to different tables and not be conflated |
| REQ-CI-13 | this plan | EditComponentDrawer (library master editing) is a distinct surface from AddComponentModal edit mode |
| REQ-CI-14 | this plan | Library-linked row edits must flip `linkState` to `linked-overridden` without mutating the library master |
| REQ-CI-15 | this plan | Restore-deleted row/node paths must be documented as unavailable on D1 (throw on call) — delete UX must be clear about irreversibility |
| REQ-CI-16 | this plan | Promote-to-library (`promoteEstimateRowToLibraryComponent`) must produce a library component and update the source row's linkage |

## Performance Path

The component-interoperability work adds these data flows to the estimate sheet:

1. **Edit modal open**: O(1) for target row + O(V) for variant drafts.
2. **Edit modal save**: O(V) for variant serialization + client fan-out (currently O(N) tree-walk via `patchProjectComponentInstanceRowsInTree`, target: O(1) graph index) + server fan-out (single SQL join — already efficient).
3. **Inline scalar edit**: Same as existing edit hot path + client/server fan-out for project-level.
4. **Inline variant pill**: O(1) dispatch + mutation cost (library replacement or row update).
5. **Thumbnail upload**: Async fetch, not on main thread hot path.
6. **Promote to library**: async Server Action; row linkage update.

**Primary scale risk**: client-side fan-out tree-walk (GAP-06). The normalized graph store (Performance Plan Phase 2) must include `componentInstanceNodeIds: Record<string, string[]>` mapping project-component identity → list of row ids. Server-side fan-out is a single SQL join and does not need the index.

## QA Matrix

### Library Component Scenarios

| ID | Scenario | Expected Result |
|---|---|---|
| CI-QA-01 | Create two library components with identical names | Create mode allows second after user acknowledges duplicate warning |
| CI-QA-02 | Insert library component into estimate sheet | Row created with `sourceLibraryItemId`, variant projection, and `linkState: "linked-clean"` |
| CI-QA-03 | Edit library-linked row in AddComponentModal (edit mode) | Edit mode opens; no duplicate warning; save updates row only; `linkState` becomes `linked-overridden`; library master unchanged |
| CI-QA-04 | Select variant from inline pill on library-linked row | `replaceEstimateRowItemWithLibrary` action fires; row projection updates from new library option |
| CI-QA-05 | Edit library-linked row's thumbnail (estimate mount) | Upload goes to `/api/projects/images` (because `imageUploadProjectId` is set by estimate mount) |
| CI-QA-05b | Edit library master via EditComponentDrawer (library workspace) | `updateCostLibraryComponent` + `upsertCostLibraryComponentPriceOption` fire; library master mutates; warm query cache patched |
| CI-QA-05c | Detach library-linked row | `detachEstimateRowItemFromLibrary` fires; `linkState` becomes `detached`; row becomes project-level |

### Project Component Scenarios

| ID | Scenario | Expected Result |
|---|---|---|
| CI-QA-06 | Edit project component in AddComponentModal (edit mode) | Edit mode opens; no duplicate warning; save fans out to matching instances via `propagateProjectComponentRowPatch` |
| CI-QA-07 | Edit project component with identical name to another | No duplicate-name warning (ids differ) |
| CI-QA-08 | Upload/change project component thumbnail | All same-project instances show new thumbnail (server + client fan-out of shared snapshot keys) |
| CI-QA-09 | Add variants, select non-default, save | Selected variant id/label, cost, unit, image, SKU, pricing metadata persist into row source snapshot |
| CI-QA-10 | Select variant from inline pill on project row | Row update action (`updateEstimateRowItem`) fires; client + server fan-out apply |
| CI-QA-11 | Open edit mode for row with raw storage image path | Preview renders via broker route normalization (`resolveExistingComponentImageUrl`) |
| CI-QA-12 | Insert blank row then inline-edit | Express component template emitted; `metadata.expressComponent` set; legacy blank row upgraded on edit |
| CI-QA-13 | Promote project component to library | `promoteExpressRowToLibraryComponent` fires; library component created; source row linkage updated |

### Scale Scenarios

| ID | Scenario | Expected Result |
|---|---|---|
| CI-QA-14 | Edit project component in 5,000-row estimate | Server fan-out (SQL join) completes efficiently; client fan-out (tree-walk) p95 <= 75 ms |
| CI-QA-15 | Open edit modal for library-linked row in stress fixture | Modal opens with row data; no performance regression |
| CI-QA-16 | Inline scalar edit on project component at scale | Edit responsive; server fan-out O(1) SQL; client fan-out O(1) via graph index (post-Phase 2) |
| CI-QA-17 | Delete a row then attempt restore | Restore throws on D1 (documented limitation); delete UX must confirm irreversibility |

## Verification

- `verification_mode`: emulated (same-agent improvement pass grounded in full source audit).
- Readiness caps apply per Improve-Plan-Prompt Suite Succession contract.
- Browser proof required for CI-QA-06 through CI-QA-16 before MVP readiness.
- Local vitest evidence exists for CI-QA-01 through CI-QA-05c (component-library + estimate-sheet-library-insert suites).
- GAP-07 (restore throws on D1) must be reflected in delete UX and documentation.

## CI-QA ↔ Test Mapping (Pass-3 addition)

Every CI-QA scenario must map to at least one named test (vitest or browser). The vitest column lists the existing test that proves the scenario at jsdom tier; the browser column lists the future `e2e/estimate-sheet-component-interop.spec.ts` scenario. "GAP" means no direct named test exists today and must be backfilled in U0.5.3 (see doc 16 Pass-3 takeaway).

| CI-QA ID | Scenario | Existing vitest (file:test name) | Browser scenario (Phase 0.5) |
|---|---|---|---|
| CI-QA-01 | Create two library components with identical names | `library-add-component-modal-a11y.test.tsx` (duplicate-name warning test, 1 of 21) | `e2e/estimate-sheet-component-interop.spec.ts:01-duplicate-name-create` |
| CI-QA-02 | Insert library component into estimate sheet | `estimate-sheet-library-insert.test.tsx` (insert test, 1 of 38) | `:02-insert-library-row` |
| CI-QA-03 | Edit library-linked row in AddComponentModal (edit mode) | `estimate-sheet-library-insert.test.tsx` (edit test) + new `estimate-link-state-transitions.test.ts` | `:03-edit-library-row-linkstate` |
| CI-QA-04 | Inline variant pill on library-linked row → `replaceEstimateRowItemWithLibrary` | `estimate-sheet-library-insert.test.tsx` (variant pill test) | `:04-inline-variant-pill-library` |
| CI-QA-05 | Edit library-linked row thumbnail → `/api/projects/images` | **GAP** — new `estimate-three-edit-surfaces.test.ts` (U0.5.3) | `:05-edit-thumbnail-library-row` |
| CI-QA-05b | EditComponentDrawer mutates library master | **GAP** — new `estimate-three-edit-surfaces.test.ts` | `:05b-edit-component-drawer-library-master` |
| CI-QA-05c | Detach library-linked row | `estimate-sheet-version-control-actions.test.ts` (detach test) | `:05c-detach-library-row` |
| CI-QA-06 | Edit project component → server + client fan-out | `estimate-sheet-library-insert.test.tsx` (project fan-out subset) | `:06-edit-project-component-fanout` |
| CI-QA-07 | Identical project-component name (no duplicate warning) | `library-add-component-modal-a11y.test.tsx` (isEditing suppression) | `:07-identical-name-project` |
| CI-QA-08 | Project component thumbnail fan-out | **GAP** — new `estimate-three-edit-surfaces.test.ts` | `:08-thumbnail-fanout-project` |
| CI-QA-09 | Project component variant persistence | `estimate-sheet-library-insert.test.tsx` (variant persistence subset) | `:09-variant-persistence-project` |
| CI-QA-10 | Inline variant pill on project row → row update + fan-out | `estimate-sheet-library-insert.test.tsx` (project variant pill) | `:10-inline-variant-pill-project` |
| CI-QA-11 | Open edit mode for row with raw storage image path | `estimate-image-url.test.ts` (2 tests) | `:11-image-url-normalization` |
| CI-QA-12 | Insert blank row + inline edit → express component | `estimate-sheet-library-insert.test.tsx` (express init test) | `:12-blank-row-express-init` |
| CI-QA-13 | Promote project component to library | **GAP** — new integration test (U0.5.3) | `:13-promote-to-library` |
| CI-QA-14 | Edit project component in 5,000-row estimate | (none — needs browser + graph index) | `:14-stress-fanout-5000-rows` |
| CI-QA-15 | Open edit modal at stress fixture | (none — needs browser) | `:15-stress-modal-open` |
| CI-QA-16 | Inline scalar edit on project component at scale | (none — needs browser + graph index) | `:16-stress-inline-edit` |
| CI-QA-17 | Delete + restore-throws | `estimate-sheet-version-control-actions.test.ts` (restore-throws test) | `:17-delete-restore-limitation` |

**Coverage status**: 11 of 17 scenarios have direct named vitest tests today. 6 scenarios (CI-QA-05, 05b, 08, 13, 14, 15, 16) need either new vitest tests (U0.5.3) or new browser scenarios (U0.5.1/.2). This is the traceability gap Phase 0.5 closes.

## Source Documents

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` (primary surface — create + edit modes)
- `src/components/workshop/library/EditComponentDrawer.tsx` (library-master edit surface — distinct path)
- `src/components/workshop/EstimateSheetContent.tsx` (edit-mode mount + `updateComponentFromEditor`)
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` (row mutation dispatch)
- `src/hooks/use-estimate-row-mutations.ts` (optimistic/server patching + client fan-out)
- `src/lib/estimates/actions.ts` (`updateEstimateRowItem`, `replaceEstimateRowItemWithLibrary`, `detachEstimateRowItemFromLibrary`, `insertEstimateRowItemFromLibrary`)
- `src/lib/estimates/d1-action-client.ts` (`propagateProjectComponentRowPatch` server fan-out; restore stubs that throw)
- `src/lib/estimates/express-components.ts` (`getProjectComponentIdentity`)
- `src/lib/estimates/estimate-row-tree-patch.ts` (`patchProjectComponentInstanceRowsInTree` client fan-out)
- `src/lib/estimates/express-promotion-actions.ts` (promote flows)
- `src/lib/component-library/actions.ts` (`createCostLibraryComponent`, `updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`)
- `src/lib/estimates/types.ts` (`EstimateRowItem`, `EstimateRowLinkState`, `EstimateRowItemSource`)
- `migrations/0021_estimate_row_projection_fields.sql` (`link_state` CHECK constraint, `source_library_item_id`)
