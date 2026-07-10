# 04 - Event Taxonomy And Naming Audit

> **CRITICAL FINDING — verified at source level on 2026-07-10.**

This document documents the systematic event-type naming split between the D1 write layer and the UI read/display layer. It is the single most important finding in the audit and the highest-priority fix.

## The Problem

The system has **two incompatible event-type vocabularies** that never align:

### Write layer (what gets INSERTed into `estimate_sheet_events.event_type`)

The D1 write layer (`src/lib/estimates/d1-action-client.ts`) uses `estimate_`-prefixed names for most events:

```
estimate_node_created, estimate_node_renamed, estimate_node_deleted,
estimate_nodes_deleted, estimate_nodes_reordered, estimate_nodes_restored,
estimate_tab_created, estimate_tab_renamed, estimate_tabs_reordered,
estimate_tab_duplicated, estimate_tab_archived, estimate_tab_deleted,
estimate_details_updated, sheet_adjustment_updated,
```

Plus a few bare names (no prefix):
```
row_inserted, row_updated, row_replaced, row_unlinked, row_deleted,
rows_deleted, rows_moved, row_component_moved,
template_inserted, template_node_subtree_inserted,
```

The AI package builder (`src/lib/ai/package-builder/apply.ts`) uses yet another variant spelling:
```
estimate_row_inserted, estimate_row_updated, estimate_row_deleted,
estimate_template_inserted, estimate_node_created, estimate_node_renamed,
project_estimate_package_applied,
```

### Read/display layer (what the UI expects)

All four UI-facing registries use **non-prefixed** names:

- `ACTIVITY_FILTER_EVENT_TYPES` — `src/components/workshop/estimate-sheet/activity-history.tsx:40-60` (the user-facing filter dropdown).
- `ESTIMATE_EVENT_ACTIONS` — `src/lib/activity/activity-copy-dictionary.ts:3-28` (maps event types to action verbs).
- `estimateTitle` switch — `src/lib/activity/activity-composer.ts:268-317` (generates human-readable titles).
- `estimateBucketEventTypes` — `src/lib/repositories/project-activity-feed-repository.ts:159-165` (project feed filter buckets).

They expect:
```
node_created, node_renamed, node_deleted_with_children, nodes_reordered, tree_reordered,
tab_created, tab_renamed, tabs_reordered, tab_duplicated, tab_archived, tab_deleted,
row_added, row_blank_added, row_updated, row_replaced, row_deleted, row_unlinked,
template_inserted, sheet_code_updated, sheet_metadata_updated,
sheet_version_created, sheet_restored_as_copy,
```

### The read path performs NO translation

`normalizeHistoryEvent` (`actions.ts:951-971`) sets `eventType: row.event_type` **verbatim**. The `event_type` string from the database flows directly into the composer, dictionary lookup, and filter matching without any rename or normalization.

## Impact

### Events that WORK end-to-end (writable AND recognized by UI)

Only **7 of ~31** writable event types are both written and recognized:

| event_type | Writer | Recognized by |
|---|---|---|
| `row_updated` | `d1-action-client.ts:2374` | All registries ✓ |
| `row_replaced` | `d1-action-client.ts:2375` | All registries ✓ |
| `row_unlinked` | `d1-action-client.ts:2377` | Dictionary + composer ✓ |
| `row_deleted` | `d1-action-client.ts:1968` | All registries ✓ |
| `template_inserted` | `d1-action-client.ts:2136` | All registries ✓ |
| `project_source_inserted` | `reusable-sources/actions.ts:762` | Dictionary + composer ✓ (NOT in filter list) |
| `row_promoted_to_library` | `express-promotion-actions.ts:486` | Dictionary ✓ (NOT in filter list or composer switch) |

### Events that are WRITTEN but render as generic fallback and are UNFILTERABLE

These 23+ event types are inserted into the database but never match any composer case, dictionary key, or filter option. They render as **"recorded estimate activity."** and have action verb **"recorded"** (the composer default):

| Written event_type | File:line | What the UI expects |
|---|---|---|
| `estimate_details_updated` | `d1-action-client.ts:1140` | `sheet_metadata_updated` / `sheet_code_updated` |
| `estimate_tab_created` | `d1-action-client.ts:1172` | `tab_created` |
| `estimate_tab_renamed` | `d1-action-client.ts:1192` | `tab_renamed` |
| `estimate_tabs_reordered` | `d1-action-client.ts:1214` | `tabs_reordered` |
| `estimate_tab_duplicated` | `d1-action-client.ts:1279` | `tab_duplicated` |
| `estimate_tab_archived` | `d1-action-client.ts:1296` | `tab_archived` |
| `estimate_tab_deleted` | `d1-action-client.ts:1324` | `tab_deleted` |
| `estimate_node_created` | `d1-action-client.ts:1351` | `node_created` |
| `estimate_node_renamed` | `d1-action-client.ts:1372` | `node_renamed` |
| `estimate_nodes_reordered` | `d1-action-client.ts:1428` | `nodes_reordered` / `tree_reordered` |
| `estimate_node_deleted` | `d1-action-client.ts:1493` (single) | `node_deleted` / `node_deleted_with_children` |
| `estimate_nodes_deleted` | `d1-action-client.ts:1493` (bulk) | `node_deleted_with_children` |
| `estimate_nodes_restored` | `d1-action-client.ts:1597` | No UI representation at all |
| `row_inserted` | `d1-action-client.ts:1682` | `row_added` |
| `estimate_row_inserted` | `apply.ts:1267` | `row_added` |
| `estimate_row_updated` | `apply.ts:1354` | `row_updated` |
| `estimate_row_deleted` | `apply.ts:1459` | `row_deleted` |
| `row_component_moved` | `d1-action-client.ts:2391,2396` | No UI representation |
| `rows_deleted` | `d1-action-client.ts:2060` | `row_deleted` (see restore mismatch below) |
| `rows_moved` | `d1-action-client.ts:2001` | No UI representation |
| `template_node_subtree_inserted` | `d1-action-client.ts:2136` | `template_inserted` |
| `estimate_template_inserted` | `apply.ts:1645` | `template_inserted` |
| `sheet_adjustment_updated` | `d1-action-client.ts:2040` | No UI representation |
| `project_estimate_package_applied` | `apply.ts:2620` | No UI representation |

### UI filter options that can NEVER match any row

These filter dropdown options (`ACTIVITY_FILTER_EVENT_TYPES`) will return an **empty list** because no code path ever writes these event types:

| Filter option | Expected event_type | Why it's dead |
|---|---|---|
| "Added rows" | `row_added` | Writer emits `row_inserted` / `estimate_row_inserted` |
| "Added blank rows" | `row_blank_added` | No writer anywhere emits this |
| "Node created" | `node_created` | Writer emits `estimate_node_created` |
| "Node renamed" | `node_renamed` | Writer emits `estimate_node_renamed` |
| "Tree reordered" | `tree_reordered` | Writer emits `estimate_nodes_reordered` |
| "Node deleted" | `node_deleted_with_children` | Writer emits `estimate_node_deleted` / `estimate_nodes_deleted` |
| "Estimate code" | `sheet_code_updated` | Writer emits `estimate_details_updated` |
| "Estimate metadata" | `sheet_metadata_updated` | Writer emits `estimate_details_updated` |
| "Tab created" | `tab_created` | Writer emits `estimate_tab_created` |
| "Tab renamed" | `tab_renamed` | Writer emits `estimate_tab_renamed` |
| "Tabs reordered" | `tabs_reordered` | Writer emits `estimate_tabs_reordered` |
| "Tab duplicated" | `tab_duplicated` | Writer emits `estimate_tab_duplicated` |
| "Tab archived" | `tab_archived` | Writer emits `estimate_tab_archived` |
| "Tab deleted" | `tab_deleted` | Writer emits `estimate_tab_deleted` |

## Restore Type Mismatch

The UI restore guards define restorable event-type sets that don't match what the writer emits:

```typescript
// activity-history.tsx:220-221
const RESTORABLE_ROW_DELETE_EVENT_TYPES = new Set(["row_deleted", "rows_bulk_deleted"]);
const RESTORABLE_NODE_DELETE_EVENT_TYPES = new Set(["node_deleted_with_children", "nodes_bulk_deleted_with_children"]);
```

| Restore guard expects | Writer actually emits | Result |
|---|---|---|
| `row_deleted` ✓ | `row_deleted` (`d1-action-client.ts:1968`) | **Works** — single row delete is restorable |
| `rows_bulk_deleted` ✗ | `rows_deleted` (`d1-action-client.ts:2060`) | **Broken** — bulk delete rows are NOT restorable from UI |
| `node_deleted_with_children` ✗ | `estimate_node_deleted` (`d1-action-client.ts:1493`) | **Broken** — node delete restore button never appears |
| `nodes_bulk_deleted_with_children` ✗ | `estimate_nodes_deleted` (`d1-action-client.ts:1493`) | **Broken** — bulk node delete restore button never appears |

**However:** The node-restore server action (`restoreDeletedEstimateNodes`, `d1-action-client.ts:1535`) accepts `estimate_node_deleted` / `estimate_nodes_deleted` as valid source event types. So the D1 layer is self-consistent — it's only the UI guard set that uses the wrong names.

## Root Cause Analysis

This split most likely arose from two parallel development efforts that were merged without event-type vocabulary reconciliation:

1. **The estimate-sheet version-control effort** (archived `2026-05-29`) defined the UI-facing vocabulary (`node_created`, `tab_created`, `row_added`, etc.) in the composer, dictionary, and filter list. These were likely defined before the D1 migration was complete.

2. **The Cloudflare D1 migration effort** rewrote the mutation handlers in `d1-action-client.ts` using `estimate_`-prefixed event types, which was natural given the table is named `estimate_sheet_events`. The writer code was never reconciled with the pre-existing UI vocabulary.

3. **The AI package-builder** (`apply.ts`) was written independently yet again, with its own variant spellings.

## Fix Strategy

`UNIT-001` fixes this by choosing ONE canonical vocabulary and normalizing at the read boundary. The safest, most backward-compatible approach is a **read-side normalization function** that maps all variant spellings to the canonical non-prefixed UI vocabulary, because:

1. It requires changes in ONE place (the read path) rather than across ~31 write sites.
2. It doesn't require a data migration of existing rows.
3. It can be tested with a comprehensive mapping table.

The alternative (changing all write sites to emit non-prefixed names) would require touching ~31 INSERT sites across 4 files and would leave historical rows with the old names, requiring either a data migration or a dual-read-path.

**Decision: `DEC-AUTO-001` — read-side normalization map.** See `10_DECISIONS_RISKS_AND_AUTH_BOUNDARIES.md`.

## Complete Event-Type Matrix

| Canonical (UI) name | D1 writer name(s) | AI builder name(s) | Other | Source event_type for restore | Filterable | Readable copy | Restorable |
|---|---|---|---|---|---|---|---|
| `row_added` | `row_inserted` | `estimate_row_inserted` | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `row_blank_added` | — (no writer) | — | — | — | Dead UI option | — | — |
| `row_updated` | `row_updated` | `estimate_row_updated` | — | — | ✓ | ✓ | — |
| `row_replaced` | `row_replaced` | — | — | — | ✓ | ✓ | — |
| `row_unlinked` | `row_unlinked` | — | — | — | ✓ | ✓ | — |
| `row_deleted` | `row_deleted` | `estimate_row_deleted` | — | `row_deleted` ✓ | ✓ | ✓ | ✓ (single) |
| (bulk row delete) | `rows_deleted` | — | — | UI expects `rows_bulk_deleted` ✗ | ✗→✓ (fix) | ✗→✓ (fix) | ✗→✓ (fix) |
| `rows_moved` | `rows_moved` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `row_component_moved` | `row_component_moved` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `node_created` | `estimate_node_created` | `estimate_node_created` | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `node_renamed` | `estimate_node_renamed` | `estimate_node_renamed` | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tree_reordered` / `nodes_reordered` | `estimate_nodes_reordered` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `node_deleted_with_children` | `estimate_node_deleted` / `estimate_nodes_deleted` | — | — | UI expects `node_deleted_with_children` ✗ | ✗→✓ (fix) | ✗→✓ (fix) | ✗→✓ (fix) |
| (node restored) | `estimate_nodes_restored` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `template_inserted` | `template_inserted` / `template_node_subtree_inserted` | `estimate_template_inserted` | — | — | ✓→✓ | ✓→✓ | — |
| `project_source_inserted` | `project_source_inserted` | — | — | — | ✗ (not in filter) →✓ (fix) | ✓ | — |
| `row_promoted_to_library` | `row_promoted_to_library` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `sheet_metadata_updated` / `sheet_code_updated` | `estimate_details_updated` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `sheet_adjustment_updated` | `sheet_adjustment_updated` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tab_created` | `estimate_tab_created` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tab_renamed` | `estimate_tab_renamed` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tabs_reordered` | `estimate_tabs_reordered` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tab_duplicated` | `estimate_tab_duplicated` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tab_archived` | `estimate_tab_archived` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `tab_deleted` | `estimate_tab_deleted` | — | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| (package applied) | — | `project_estimate_package_applied` | — | — | ✗→✓ (fix) | ✗→✓ (fix) | — |
| `sheet_version_created` | — (DORMANT, no writer) | — | — | — | Dead (prohibited) | — | — |
| `sheet_restored_as_copy` | — (DORMANT, no writer) | — | — | — | Dead (prohibited) | — | — |

Legend: `✗→✓ (fix)` means currently broken, fixed by `UNIT-001`. `✓` means already working.
