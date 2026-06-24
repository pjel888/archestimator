# 02 — Row Domain & Source-of-Truth

## Estimate row model

**Type definition:** `src/lib/estimates/types.ts:83-139` — `EstimateRowItem`. Key fields:

| Field | Type | Purpose | Canonical source |
|-------|------|---------|------------------|
| `id` | string | Row identity. Client-generated UUID for optimistic inserts (l. 453-468 `EstimateSheetContent.tsx`); server preserves via `insert_estimate_row_item_from_library` RPC. | Server `estimate_row_items.id` |
| `material` | string | Component name shown in card. Edited inline for express/blank rows only. | `estimate_row_items.material` |
| `source` | `"project" \| "supplier" \| "library"` | Coarse provenance. | `estimate_row_items.source` |
| `sourceLibraryItemId` | string \| null | Library link id. Null = unlinked/detached. | `estimate_row_items.source_library_item_id` |
| `linkState` | `unlinked \| linked-clean \| linked-overridden \| detached \| source-changed` | Library sync state. | `estimate_row_items.link_state` |
| `itemCost` | number | Unit cost. Editable inline for express; read-only for library. | `estimate_row_items.unit_cost` |
| `quantity` | number | Edited in numeric cell. | `estimate_row_items.quantity` |
| `subTotal` | number | `itemCost × quantity`. | computed (`editable-row-model.ts:81`) |
| `contingencyPercentage` | number | Adjustment %. Negative for discount. Clamped to [-100, 100] (`activity-history-model.ts:70-73`). | `estimate_row_items.contingency_percentage` |
| `contingencyValue` | number | `subTotal × pct / 100`. | computed |
| `miscCost` | number | Lump adjustment. | `estimate_row_items.misc_cost` |
| `totalItemCosts` | number | `subTotal + contingencyValue + miscCost`. | computed |
| `rowRevision` | number | Optimistic-concurrency version. Server enforces. | `estimate_row_items.row_revision` |
| `metadata` | object | Express component + projection metadata. | `estimate_row_items.metadata` (JSONB) |
| `sourceSnapshot` | object | Frozen library source at insert/replace time. | `estimate_row_items.source_snapshot` (JSONB) |
| `imageUrl`, `sourceUrl` | string \| undefined | Read off `sourceSnapshot` for library rows (`estimate-row-tree-patch.ts:50-55`). | denormalized from snapshot |

## Library Component vs Project Component

**Library Component** (`source: "library" \| "supplier"` AND `sourceLibraryItemId != null`):
- Read-only inline editor (only quantity, adjustment, misc cost are editable).
- Material card renders from `EstimateMaterialCardContent` (`cells.tsx:109-130`), pulling image from `getComponentImageUrl`.
- Source rail tone: `library` (`cells.tsx:60`) — warm orange.
- Trust gate fires on insert/replace (`EstimateSheetContent.tsx:282-284, 2396-2415, 2765-2793`).

**Project Component** — three flavors:
1. **Express** — `metadata.expressComponent != null` (`express-components.ts:207-209`). Authored inline; can be promoted to library.
2. **Detached** — `linkState: "detached"`. Was library, now independent.
3. **Legacy blank** — `material === "Drag or add a component here"` OR tag `manual-row-placeholder` (`activity-history-model.ts:79-93`). Auto-converts to express on first edit (`EstimateSheetContent.tsx:2218-2241`).

Classification helper: `classifyEstimateRowSource` at `src/lib/estimates/express-components.ts:229-240`.

## Linked states

| `linkState` | Meaning | Visible signal |
|-------------|---------|----------------|
| `unlinked` | Never linked (e.g. blank/express). | Gray rail (`divider`). |
| `linked-clean` | Following library exactly. | Orange rail (`#E8B99D`). |
| `linked-overridden` | Library with one or more local overrides (e.g. unit cost edited). | Orange rail + warning chip. |
| `detached` | Was library, now independent (Make Project Component). | Olive rail (`#A6B27B`). |
| `source-changed` | Library source's `updated_at` changed after row was added. | Orange rail + warning chip + trust gate fires on next commit. |

Source-rail color mapping at `cells.tsx:57-68` (`getComponentSourceRailClass`).

## Editable (local draft) vs canonical values

**Editable values** live in `editableRows: Record<string, EditableRowValue>` in `EstimateSheetContent` state (reducer-driven, `estimateSheetContentReducer` l. 1001-1019). Type at `editable-row-model.ts:54-66`:

```ts
type EditableRowValue = {
  quantity: string;
  contingencyMode: "contingency" | "discount";
  contingencyPercentage: string;
  miscCost: string;
  name: string;
  description: string;
  supplier: string;
  unit: string;
  unitCost: string;
  imageUrl: string;
  sourceUrl: string;
};
```

Strings (not numbers) so the user can type intermediate states (empty, leading zero, decimal separator).

**Canonical values** live in the React Query tree cache (`estimateQueryKeys.tabTree` or `.areaTree`).

**Sync flow:**
1. User types in a cell → `setEditableRows(...)` (l. 1401-1403) updates the editable map only.
2. `onBlur` (or Enter) → `commitRowItemUpdate` (l. 2187-2244) calls `updateRow(...)` which fires the server action and patches the query cache via `updateMutation.onMutate` (`use-estimate-row-mutations.ts:450-507`).
3. Server `updateEstimateRowItem` returns canonical row → `onSuccess` patches tree cache (l. 484-494).
4. `useEffect` at l. 2130-2147 (gated by `skipEditableRowsSyncRef`) recollects `editableRows` from the new tree ONLY when no skip is pending.

## Source-of-truth ledger

| State owner | File:line | Contains | Lifetime | Survives remount | Survives refresh |
|-------------|-----------|----------|----------|------------------|------------------|
| Server DB (`estimate_row_items`) | Supabase | Canonical rows. | Forever | Yes | Yes |
| React Query tree cache | `use-estimate-query.ts:60-83, 122-143` | Tree-shaped canonical snapshot + revision counter. | Session | Yes (gcTime 5min staleTime) | No (re-fetched) |
| `estimateTree` (returned by query hook) | `EstimateSheetContent.tsx:1358-1362` | Same reference as cache; reused in memos. | Render | Yes | Yes (via cache) |
| `editableRows` | reducer in `EstimateSheetContent.tsx:1368-1400` | Local drafts keyed by row id. | Component mount | No | No |
| `expressInsertDrafts` | same reducer + ref at l. 1365 | Buffered edits for in-flight inserts. | Insert flight | No | No |
| `pendingLibraryCommitGate` | same reducer | Stale target+item for trust-gate modal. | Modal-open | No | No |
| `bulkSelectedRowIds` | same reducer (Set) | Selection. | Component mount | No | No |
| `collapsedNodeIdsByScope` | same reducer | Per-scope (tab) collapse state. | Component mount | No | No |
| Column widths | `useEstimateColumnWidthsStore` (`estimate-column-widths-store.ts`) | localStorage per estimate + last-used. | Browser | Yes | Yes |
| Optimistic patches in mutation hook | `use-estimate-row-mutations.ts:450-507` | Per-mutation `previousPatch`. | Mutation flight | No | No |
| Project Component projection | server via `getProjectComponentRowsLibrary` | Detached-library projection rows. | Session | Yes | Yes |
| Flattened rows (computed) | `flattenEstimateRows` (`editable-row-model.ts:221-258`) | Inspector/export view. | Memo | n/a | n/a |
| Proposal preview model | `proposalPreviewModel` reducer state | Materialized editable tree. | Modal-open | No | No |
| Collaboration cursor state | `useEstimateCursorCollaboration` hook | Realtime cursors. | Channel subscription | No | No |

## Persistence truth table (selected actions)

| Action | Optimistic UI change | `editableRows` change | Tree cache change | Server action | RPC | History event | Rollback | Atomic | Survives refresh |
|--------|----------------------|----------------------|-------------------|---------------|-----|---------------|----------|--------|------------------|
| Add blank row | Row appended (l. 2351-2377) | New entry from `getInitialEditableRow` | Optimistic insert via `setEstimateTree` | `insertEstimateRowItemFromLibrary` | `insert_estimate_row_item_from_library` | `row_blank_added` or `row_added` | `restoreEstimateState` (full tree) | YES (single RPC) | YES |
| Add library component | Same as blank | Same | Same | Same | Same | `row_added` | Same | YES | YES |
| Drop library onto Area strip | Same | Same | Same | Same | Same | `row_added` | Same | YES | YES |
| Drop library onto material cell | Replace row inline (l. 2724-2762) | Reset to initial (l. 2745-2750) | Patched via `setEstimateTree` | `replaceEstimateRowItemWithLibrary` | `replace_estimate_row_item_with_library` | `row_replaced` | `restoreEstimateState` | YES | YES |
| Edit quantity | Cell text updates | `setEditableRows` | None until blur | `updateEstimateRowItem` (on blur) | `update_estimate_row_item` | `row_updated` | `restoreEstimateState` (full tree) | YES (single field) | YES (after blur) |
| Edit express name inline | Cell text updates | `setEditableRows` | None until blur | `updateEstimateRowItem` | Same | `row_updated` | Same | YES | YES |
| **Move component between rows** | **Both rows replaced (l. 2987-2992)** | **Both rows reset** | **Patch via `replaceEstimateRowItemsInTree`** | **2× `replaceEstimateRowItemWithLibrary`** | **2× `replace_estimate_row_item_with_library`** | **2× `row_replaced` (separate `correlation_id`s)** | **Per-row only — NOT atomic** | **NO (ESC-P0-01)** | **Partial on failure** |
| Clear component (linked) | Row blanked | Reset to initial | Patched | `updateEstimateRowItem` (material cleared, sourceLibraryItemId null) | `update_estimate_row_item` | `row_updated` | `restoreEstimateState` | YES | YES |
| Delete single row | Row removed | Entry deleted | Tree minus row | `deleteEstimateRowItem` | `delete_estimate_row_item` | `row_deleted` | `restoreEstimateRowItemAtLocation` | YES | YES |
| **Bulk delete** | **All selected removed (l. 3067-3070)** | **All entries deleted** | **N independent tree patches** | **N× `deleteEstimateRowItem`** | **N× `delete_estimate_row_item`** | **N× `row_deleted`** | **Per-row only — NOT atomic** | **NO (ESC-P1-03)** | **Partial on failure** |
| Make Project Component (detach) | Row source/linkState changed | Reset | Patched | `detachEstimateRowItemFromLibrary` | `detach_estimate_row_item_from_library` | `row_updated` (linkState) | `restoreEstimateState` | YES | YES |
| Promote to library | Row source=library, linkState=linked-clean | Reset | Patched | `promoteEstimateRowToLibraryComponent` | `promote_estimate_row_to_library_component` | `row_updated` + library events | `restoreEstimateState` | YES | YES |
| Insert template | Tree appended | New entries from template | Optimistic append | `insertEstimateTemplateIntoEstimate` | RPC returns full tree | `template_inserted` (with `correlation_id`) | `restoreEstimateState` | YES (single RPC) | YES |
| Insert template node | Same | Same | Same | `insertEstimateTemplateNodeIntoEstimate` | Same | Same | Same | YES | YES |
| **Insert project source** | **NONE (non-optimistic)** | **NONE (no new rows pre-RPC)** | **Full tree REPLACES on success** | **`insertProjectSourceIntoEstimate`** | **`insert_estimate_subtree_into_estimate_with_history`** | **Subtree events** | **None — RPC failure = no change** | **YES (single RPC) but see ESC-P0-02 for race** | **YES** |
| Create estimate tab | Tabs list updated server-side | None | None | `createEstimateTab` | RPC | `tab_created` | None (caller handles) | YES | YES |
| Delete estimate tab | Same | None | None | `deleteEstimateTab` | RPC | `tab_deleted` | None | YES | YES |
| Resize column | CSS var on surface | None | None | None (localStorage only) | None | None | N/A | YES | YES (localStorage) |
| Search | Tree filtered (memoized) | None | None | None | None | None | Clear filter | YES (display-only) | n/a |
| Filter (facets) | Same | None | None | None | None | None | Clear filter | YES | n/a |
| Group/sort | Reorder only | None | None | None | None | None | Reset to default | YES | n/a |
| Expand/collapse | Caret state | None | None | None | None | None | N/A | YES | NO (resets on remount) |

## Key insights

1. **All single-row operations are atomic** at the server (single RPC + single history event in the same transaction).
2. **Two operations break atomicity**: move-component (2 RPCs) and bulk-delete (N RPCs). Both leave the client to coordinate a multi-write flow that has no compensating transaction.
3. **Project-source insertion is the inverse problem**: it's atomic on the server but the client **non-optimistically replaces the entire tree** on success, which races with concurrent optimistic changes that arrived during the RPC window.
4. **editableRows sync is gated** by `skipEditableRowsSyncRef` to avoid the server tree clobbering in-flight cell edits during reconciliation. This protection is incomplete for the project-source case (see ESC-P0-02).
5. **Column widths are the only browser-local persistence** beyond the React Query cache. Every other piece of state is session-bound.
