# 04 — Variant & Component Create/Edit Flow (Deep-Dive)

> Evidence-grounded deep-dive into the core value stream of
> `/workshop/library/components`: creating/editing components and their
> variants (price options), cost entries, images, and attachments. Source read
> 2026-07-12; every claim has `file:line`.

## The two divergent variant surfaces

There are **two different edit surfaces**, and they behave differently — this
split is itself a defect:

| Surface | Where mounted | Multi-variant? | Persists to library? |
|---|---|---|---|
| `AddComponentModal` (create branch) | `ComponentLibraryManager.tsx:2872-2890` (no `editingItem`) | yes | yes (`createCostLibraryComponent`) |
| `AddComponentModal` (edit branch) | `EstimateSheetContent.tsx:2347-2364` (with `editingItem`) | yes | **no** — local estimate-row update only (BUG-VA-02) |
| `EditComponentDrawer` | `ComponentLibraryManager.tsx:118-119, 2892-2898` | **no** (single-variant) | yes (`upsertCostLibraryComponentPriceOption`) |

**Net:** the rich multi-variant edit UI built into `AddComponentModal` is
reachable for library editing only via the **create** path. From the library
manager, editing a component opens `EditComponentDrawer`, which can only edit
item-level fields + the single default price option — it cannot add/remove/
reorder variants, and never touches attachments, images, dimensions, mass,
package quantity, or SKU.

## 1. Variant lifecycle (create path, `AddComponentModal`)

A variant is a `VariantDraft` (`AddComponentModal.tsx:83-95`): `id` (client
`crypto.randomUUID()`), `label`, `description`, `sku`, `unitCost`, `unit`,
`packageQuantity/Unit`, `isDefault`, `image`, `attachments[]`.

- **Add:** `addVariant()` (`:1030-1039`) appends a draft + auto-opens the drawer.
- **Switch active:** click a variant card (`:2040-2056`) or a `V{n}` rail tab
  (`:2004-2028`).
- **Set as default:** `setActiveVariantAsDefault()` (`:1059-1066`) rewrites
  `isDefault` so exactly the active one is default.
- **Delete:** `removeActiveVariant()` (`:1041-1057`) reassigns default to index 0,
  picks a new active variant, fires best-effort DELETEs for image/attachment.
- **Reorder:** **NONE in the UI.** Order is array order; `variantSortOrder` is
  derived positionally at submit (`index + 1`, `:1115, 1342`). The repo honors a
  persisted `variantSortOrder` on read (`repository.ts:591`) and the modal sorts
  by it on edit-hydrate (`:453-458`) — but there is no move-up/down control.

Persist: `createCostLibraryComponent` (`actions.ts:1242-1392`) maps each variant
to a price option via `upsertComponentPriceOptionInD1` (serial `for` loop,
`:1334-1343`), then a single `UPDATE cost_library_items SET active_price_option_id`
points the item at the default variant (`:1346-1374`).

## 2. Cost entry model — `cost_library_item_variant_cost_entries`

- **"Current" selection** enforced server-side by `validatePriceOptions`
  (`actions.ts:648-658`): each variant's active cost entries must contain exactly
  one with `isCurrent === true`. On read, `normalizePriceOption` picks
  `costEntries.find((e) => e.isCurrent) ?? costEntries[0]` (`repository.ts:585`)
  and overrides price-option-level columns with that entry's values (`:602-609`).
- **History:** `upsertComponentPriceOptionInD1` captures old/new snapshot into
  `cost_library_item_price_history` only when `writeHistory: true`
  (`actions.ts:1142-1166`). **Create sets `writeHistory: false`** (`:1341`) — so
  the initial price is never recorded in price history; only subsequent edits are.
- **In practice:** the modal never sends `costEntries` (`buildComponentPayload`
  doesn't populate them), so `normalizePriceOptionInput` always synthesizes one
  current entry from the flat `unitCost` (`actions.ts:780-792`).

## 3. Data round-trip — the JSON-blob contract (RESOLVED)

**This was DATA-DRIFT-01 in the first audit pass; it is now resolved.**

- **Write:** `priceOptionSnapshot` (`actions.ts:909-944`) serializes the full
  normalized price option into `metadata_json`; `upsertComponentPriceOptionInD1`
  binds `jsonText(metadata)` (`:1090`). The INSERT writes only the 16 real D1
  columns (`:1055-1058`).
- **Read:** `normalizePriceOption` (`repository.ts:580-632`) reads back from
  `metadata_json` with a **column-first, metadata-fallback** ladder: prefers the
  typed column (`row.sku`), falls back to `metadata.<field>` only when the column
  is null.
- **Order:** `json_extract(metadata_json, '$.variantSortOrder')` (`repository.ts:1162`).

**Verdict:** variant fields (sku, variantDescription, variantSortOrder,
packageQuantity/Unit, dimensions, mass, image bucket/path, variantMetadata,
activeCostEntryId) **DO round-trip** through `metadata_json`. The
`ComponentPriceOptionRow` type declaring those as optional columns is a
**tolerant read model**, not a missing-column bug. No data is lost on the basic
round-trip.

**Two latent fragilities** (not data loss today, but traps):
1. The typed columns are never written by the actions layer — they exist only as
   a fallback ladder that always falls through to `metadata_json`. If a future
   writer sets a stale column while `metadata_json` holds truth, the column wins
   and the blob is silently shadowed.
2. `sanitizeOpenDesignAddComponentPriceOption` (`actions.ts:842-867`) wipes most
   price-level fields (`pricingSource/pricingDate/confidence/sourceUrl/notes/
   costEntries/dimensions/mass/packageQuantity`) before they reach
   `normalizePriceOptionInput` — only `packageQuantity/Unit` survive when
   `unitUsesContentConversion(unit)`. So on the modal's own create path, those
   fields are persisted as `null`. The round-trip "works" but carries `null`.

**Write-only fields in the modal's own model:**
- `imageMetadata` (dimensions, byte sizes) is written into `metadata_json` but
  the modal never reads it back on edit-hydrate (`toVariantDraftFromPriceOption`
  `:472-492` reconstructs the image from `thumbnailPath ?? imagePath` only).
- `variantMetadata` similarly write-only in the modal.

## 4. Validation gaps

**Rules enforced in `actions.ts`:** ≥1 variant (`:638`); exactly 1 default
(`:639-640`); variant label/unit required; `unitCost/miscCost ≥ 0`; exactly 1
current cost entry per variant *when any active cost entries are sent*
(`:649-651` — bypassable since the modal never sends them); cost-entry
positivity; attachment path/filename/content-type/size; `packageQuantity/
dimension/mass > 0` if provided; quick-add field rules for the **default variant
only** (`:1261-1287`); workspace quota (10 000).

**Missing / weak:**
1. **No SKU uniqueness** (within item, across items, or workspace-wide).
2. **No variant-label uniqueness within an item** — two variants can share "V1".
   This matters because `buildOptimisticItem` (`:1333`) reconciles persisted
   options **by label**, so duplicate labels produce nondeterministic id matching.
3. **No dimension/mass unit validation** — `dimensionUnit`/`massUnit` are free
   text; "banana" is accepted as a mass unit.
4. **No currency validation** — defaults to "PHP", never checked against ISO.
5. **No variant-count cap** (only the workspace-wide 10 000-item cap).
6. **Per-variant quick-add validation runs for the default variant only** —
   non-default variants skip date/source/confidence checks.
7. **`variantSortOrder` not validated** — collisions not detected.
8. **The "exactly one current cost entry" rule is bypassable** (modal never sends
   `costEntries`; sanitizer strips them).
9. **No re-validation of `imagePath`/`thumbnailPath` ownership** — the server
   stores whatever path the client sends into `metadata_json` (`:933-935`) without
   checking the path belongs to the workspace/user (unlike the attachment DELETE
   route which enforces `isOwnedAttachmentPath`).

## 5. Image + attachment per variant

### Image (works, with a re-edit data-loss caveat)
- Upload: `handleThumbnailUpload` (`:1183-1229`) client-side resizes to 1600px
  WebP, POSTs to `/api/component-library/images`, stores the returned
  `UploadedComponentImage` as a `VariantImageDraft` (`:412-425`).
- "Use same image for all variants" (`sharedImageForAllVariants`, `:1274-1288`).
- Submit writes `imageBucket/imagePath/thumbnailPath/imageMetadata` per variant
  into `metadata_json` (`actions.ts:933-936`). The UI displays it (`:795, 2066`).
- **BUG-VA-03:** `toExistingVariantImageDraft` (`:569-580`) discards `bucket`,
  `path`, `thumbnailStoragePath`, and all of `imageMetadata` on edit-hydrate. A
  re-edit that changes only the label and saves will **overwrite the stored image
  paths with empty strings** unless the user re-uploads. Data-loss-on-re-edit.

### Attachments (the most serious defect — see BUG-VA-01)
- Migration `0022_component_attachment_metadata.sql` defines a rich table with
  `price_option_id`, `item_id`, `review_status` enum
  (`uploaded/approved/rejected/superseded`), `applicable_cost_entry_id`,
  `is_current_approved`, review metadata, `superseded_by`, `review_revision`,
  `UNIQUE(storage_bucket, storage_path)`.
- The modal uploads attachments per variant (`handleAttachmentUpload`
  `:1231-1263` → `/api/component-library/attachments`), which stores the object
  in R2 + records an `upload_assets` row. It returns scan status. The modal
  renders chips (`:2249-2273`) with fileName/size/remove.
- Submit sends `attachments[]` per variant (`:1126-1133`); they pass
  `validatePriceOptions` and survive sanitization.
- **But `upsertComponentPriceOptionInD1` (`actions.ts:1012-1180`) never writes a
  row into `cost_library_item_variant_attachments`.** Verified: zero production
  `INSERT INTO cost_library_item_variant_attachments` in `src/` (only the proof
  harness `upload-lifecycle-proof-router.ts:268` writes it).
- **Consequence:** uploaded attachment files sit orphaned in R2 + `upload_assets`
  with no link to any price option or item. On next library read,
  `attachmentsByPriceOptionId` is empty → the modal shows "No files attached" on
  re-edit. **Attachments are write-and-display-once; they never persist.**
- **Review workflow exposure:** the table has a full review model + the GET
  download route enforces `review_status='approved' AND is_current_approved=1`
  (`attachments/route.ts:263-265`) — but nothing in the create flow can ever set
  those columns (no row is ever inserted), and the modal exposes **none** of the
  review lifecycle (no approve/reject UI, no `scanStatus` display).

## 6. Bugs specific to the variant flow

### BUG-VA-01 [P1] — Variant attachments are never persisted
Detailed in §5. `upsertComponentPriceOptionInD1` has no attachment write. Files
orphan in R2 + `upload_assets`; the attachment table is only ever written by a
proof harness. Silent data-loss: the user sees a successful "Add Component" and
the attachment chips disappear on next load. **Location:**
`src/lib/component-library/actions.ts:1012-1180`.

### BUG-VA-02 [P1] — In-estimate edit path does not persist to the library
`EstimateSheetContent.tsx:2347-2364` opens `AddComponentModal` in edit mode
(`editingItem`). On save, `submit()` calls `onComponentUpdated(buildEditedItem())`
(`AddComponentModal.tsx:1530-1531`) → `updateComponentFromEditor`
(`EstimateSheetContent.tsx:1740-1765`), which only calls `updateRowItem(...)` — a
**local estimate-row state update**. It never calls
`updateCostLibraryComponent` or `upsertCostLibraryComponentPriceOption`. Users
will believe they edited the library component; they only edited the row.
**Location:** `src/components/workshop/EstimateSheetContent.tsx:1740-1765`.

### BUG-VA-03 [P2] — Image metadata lost on re-edit
`toExistingVariantImageDraft` (`AddComponentModal.tsx:569-580`) discards
`bucket/path/thumbnailStoragePath/imageMetadata`. A re-edit + save overwrites
stored image paths with empty strings. **Location:**
`AddComponentModal.tsx:569-580`.

### BUG-VA-04 [P2] — Non-atomic serial writes in `createCostLibraryComponent`
`actions.ts:1294-1384`: INSERT item → serial `for` loop of
`upsertComponentPriceOptionInD1` per variant → UPDATE `active_price_option_id` →
`insertComponentVersion`, no transaction, no rollback. A failure on variant 3
orphan-commits the item + first two variants. `runBatch` exists (`:153-165`) but
is used only within a single variant (cost entries), not across the whole create.
Same non-atomicity in `updateCostLibraryComponent` (`:1437-1505`) and
`upsertCostLibraryComponentPriceOption` (`:1507-1581`).

### BUG-VA-05 [P2] — Optimistic update reconciliation by label is fragile
`buildOptimisticItem` (`:1333`) matches draft variants to server-returned
`priceOptions` by `option.label === entry.label`. Duplicate labels (which
validation permits) or server-side label trims → wrong persisted id attached, or
a dangling `optimistic-` prefixed id that never matches a real row.

### BUG-VA-06 [P2] — Optimistic update drops miscCost/pricingSource/confidence/sourceUrl/notes
`buildOptimisticItem` (`:1337-1371`) hardcodes `miscCost: 0`,
`pricingSource: null`, etc. regardless of user input or server truth. Until a
full refetch, the UI shows zero misc cost + no pricing provenance. Combined with
BUG-VA-02, the in-estimate view can diverge from both intent and library truth.

### BUG-VA-07 [P2] — Race on concurrent default mutation
`upsertComponentPriceOptionInD1` clears sibling defaults (`actions.ts:1038-1050`)
in a separate statement before the upsert, no transaction. Two concurrent
upserts for different variants on the same item can interleave → both end
`is_default=1`, violating the invariant at the storage layer.
`validatePriceOptions` runs only on the in-memory input array, not stored rows.

### BUG-VA-08 [P3] — localStorage catalogue options vs. server persistence divergence
Locally-created suppliers/brands/categories (ids prefixed `local-catalogue-option:`,
`:238`) are persisted with `supplier_id = null` but `supplier = "<typed name>"`
(`:1301-1308`). The local option is never promoted to a real
`component_suppliers` row, so it never appears in other surfaces' lists and
cannot be managed.

### BUG-VA-09 [P3] — No rollback on image/attachment upload-then-discard
Draft discard (`:1143-1148` → `cleanupUploadedDraftAssets` `:1068-1071`) issues
best-effort DELETEs (`.catch(() => undefined)`, `:660, 670`). On failure, R2
objects orphan.

### BUG-VA-10 [P3] — `insertComponentVersion` version-number race
`nextVersion = current_version_number + 1` (`:1446, 1523, 1596`) under concurrent
edits can produce two versions with the same number (no unique index enforcement
at the write site; `INSERT OR IGNORE` keyed on random UUID never fires).

### BUG-VA-11 [P3] — Variant drawer cannot reorder
No move-up/down control; `variantSortOrder` honored on read but not editable.
Feature gap.

## Key file references
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` (2369L)
- `src/lib/component-library/actions.ts` (2959L) — `validatePriceOptions` 637-676,
  `normalizePriceOptionInput` 735-840, `priceOptionSnapshot` 909-944,
  `upsertComponentPriceOptionInD1` 1012-1180, `createCostLibraryComponent`
  1242-1392, `updateCostLibraryComponent` 1437-1505,
  `upsertCostLibraryComponentPriceOption` 1507-1581
- `src/lib/repositories/component-library-repository.ts` — `normalizePriceOption`
  580-632
- `src/components/workshop/library/EditComponentDrawer.tsx` — single-variant edit
- `src/components/workshop/EstimateSheetContent.tsx:1740-1765` — local-only update
- `migrations/0022_component_attachment_metadata.sql` — attachment table schema
