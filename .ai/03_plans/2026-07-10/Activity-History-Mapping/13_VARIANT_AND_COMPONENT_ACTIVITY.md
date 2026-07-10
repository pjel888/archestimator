# 13 - Variant And Component Activity Recording

> **This document addresses the explicit concern from project memory: "also that the variants should be accommodated as well."**

This is a deep audit of how component variants interact with activity history. It reveals significant gaps where variant/component operations are NOT properly recorded, making the activity log an incomplete record of what happened to components.

## Architecture: Where Variant Identity Lives

The single most important fact: **`estimate_row_items` has NO `price_option_id` / `price_option_label` columns.** Variant identity lives ONLY inside the `source_snapshot_json` JSON blob.

- Schema: `migrations/0015_publication_admin_sidecars.sql:11-34` — columns are `material`, `unit_cost`, `source_snapshot_json`, etc.
- Type: `EstimateRowItemRow` (`d1-action-client.ts:92-119`) — no price-option fields.
- Variant data (`priceOptionId`, `priceOptionLabel`, `priceOptionUpdatedAt`) is nested inside `source_snapshot_json`, not first-class.

This architectural choice drives most of the gaps below.

## How Variant Selection Routes Through Activity

`selectMaterialVariant` (`row-table.tsx:569-612`) branches by row source:

| Row source | Code path | RPC | Event type | Variant captured? |
|---|---|---|---|---|
| Project-level | `onUpdateRowItem` → `update_estimate_row_item_with_history` | `row_updated` | **Indirectly** — buried in `source_snapshot_json` |
| Library-linked | `onReplaceRowItem` → `replace_estimate_row_item_with_history` | `row_replaced` | **Indirectly** — in snapshot, not first-class |

## Gap Analysis

### GAP 1 (HIGH) — Project-row variant switch is indistinguishable from any inline edit

**Location:** `d1-action-client.ts:1929` (`changedFields` derivation), `row-table.tsx:571-587`

When a project-level row's variant is switched, the event is `row_updated` with `changedFields` derived from DB columns. Because `priceOptionId` is NOT a column (it's inside `source_snapshot_json`), `changedFields` will be `["source_snapshot_json", ...]` — never an explicit variant field.

**Impact:** The activity log cannot tell "user picked variant B" from "user changed the unit cost." Both are `row_updated`.

**Fix:** UNIT-009 (new) — add a `variant_changed` event type OR add `priceOptionId` to `changedFields` when the snapshot diff detects a variant change.

### GAP 2 (MEDIUM) — `priceOptions` array from UI is discarded server-side

**Location:** `use-estimate-row-handlers.ts:620-651`

`selectMaterialVariant` passes `priceOptions: computedItem.priceOptions` into `onUpdateRowItem`. In `commitRowItemUpdate`, `values.priceOptions` is never forwarded to the `updateRow` RPC. Only the single selected `priceOptionId`/`priceOptionLabel` inside the snapshot reaches D1.

### GAP 3 (HIGH) — Fan-out propagation writes NO per-row history events

**Location:** `d1-action-client.ts:1857-1885` (`propagateProjectComponentRowPatch`)

When a project-component edit fans out to sibling instances:
- Each sibling row's data is updated and `row_revision` bumped.
- **No `insertHistoryEvent` call is made for propagated rows.**
- Only the source row gets a history event.

**Impact:** If user edits a project component that fans out to 10 matching instances, the activity log shows 1 event for the source row. The 10 propagated changes are invisible to history.

### GAP 4 (HIGH) — `propagatedRowIds` is written but NEVER surfaced in UI

**Location:** `d1-action-client.ts:1933` (sole write site)

The source event's `payload.propagatedRowIds` contains the list of affected sibling row IDs. But:
- `activity-history.tsx` never reads `payload.propagatedRowIds`.
- `activity-history-model.ts` never reads it.
- The "Affected fields" summary only shows the source row's changed columns.

**Impact:** A user inspecting history for a fan-out edit sees one `row_updated` event whose `total_delta` reflects many rows, but with no indication of which other rows changed or that propagation occurred.

**Fix:** UNIT-009 — surface `propagatedRowIds` in the audit card: "This change propagated to N other rows."

### GAP 5 (MEDIUM) — Propagation only fires for `row_updated`

**Location:** `d1-action-client.ts:1918` (`eventType === "row_updated"` guard)

Replacing, unlinking, or moving a project component does NOT fan out. The asymmetry means project-component propagation is inconsistent across edit types.

### GAP 6 (MEDIUM) — Variant identity nested in `source_snapshot_json` vs renderer expecting `sourceSnapshot`

**Location:** `d1-action-client.ts:1930-1931` vs `activity-history.tsx:233-235`

`patchRowItem` stores snapshots as raw DB rows with `source_snapshot_json` (the `_json` suffix). But `getAuditSnapshotSourceRecord` reads `snapshot.sourceSnapshot` (camelCase, no suffix). The key mismatch means the renderer may fall back to "Row snapshot" with no variant label for `row_updated`/`row_replaced` events.

### GAP 7 (HIGH) — AddComponentModal/EditComponentModal produce NO estimate activity events

**Location:** `AddComponentModal.tsx:1495-1522`

- **Create path:** calls `createCostLibraryComponent` → writes to cost library, NOT estimate sheet. No `estimate_sheet_events` row.
- **Edit path:** calls `onComponentUpdated?.()` — a callback not wired to any history-recording RPC in the estimate sheet handlers.

**Impact:** Editing a component's variants/price options through the modal updates the cost library but writes nothing to the estimate's activity history — even when the component is linked to estimate rows.

### GAP 8 (LOW) — Promotion event omits the created variant's label/cost

**Location:** `express-promotion-actions.ts:494-495`

`row_promoted_to_library` stores `metadata.priceOptionId` but not the variant's label ("Default") or cost. Reconstructable only by joining `cost_library_item_price_options`.

### GAP 9 (MEDIUM) — Unlink nulls `sourceSnapshot`, erasing variant identity

**Location:** `d1-action-client.ts:2376-2382`

`unlink_estimate_row_item_from_library_with_history` passes `sourceSnapshot: null`. Post-unlink, the row carries no variant/library identity. `oldSnapshot` retains the prior snapshot (good), but subsequent events have empty variant data.

## Variant Interaction → Event Type Matrix

| Action | Row type | Event type | Variant captured? | Propagation? |
|---|---|---|---|---|
| Variant pill select | project | `row_updated` | Buried in snapshot JSON | Yes (row_updated only) |
| Variant pill select | library | `row_replaced` | In snapshot JSON | No |
| Drag-replace from library | library | `row_replaced` | In snapshot JSON | No |
| Replace via picker | any | `row_replaced` | In snapshot JSON | No |
| Inline field edit | any | `row_updated` | N/A | Yes (project only) |
| Unlink | library | `row_unlinked` | Old snapshot retained, new nulled | No |
| Move/swap component | any | `row_component_moved` ×2 | In snapshot JSON | No |
| Promote to library | project | `row_promoted_to_library` | activePriceOptionId in metadata | No sibling re-link |
| Edit via modal | any | **NONE** | **Not recorded** | N/A |
| Create via modal | any | **NONE** | **Not recorded** | N/A |

## Recommendations

### UNIT-009 (new) — Variant and component activity completeness

**P0 items:**
1. Surface `propagatedRowIds` in the audit card UI (GAP 4).
2. Add per-propagated-row events OR a "propagation summary" display (GAP 3).
3. Wire AddComponentModal/EditComponentModal `onComponentUpdated` to produce estimate activity events for linked rows (GAP 7).

**P1 items:**
4. Add `variant_changed` to `changedFields` when the snapshot diff detects a variant change (GAP 1).
5. Fix snapshot key mismatch: normalize `source_snapshot_json` → `sourceSnapshot` in the reader (GAP 6).
6. Forward `priceOptions` to the RPC or explicitly document why it's client-only (GAP 2).

**P2 items:**
7. Extend propagation to `row_replaced` / `row_unlinked` (GAP 5).
8. Store variant label/cost in promotion event (GAP 8).
9. Preserve variant identity through unlink with a `prior_source_snapshot` field (GAP 9).
