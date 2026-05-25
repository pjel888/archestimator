# 20 Activity Action Matrix And Group Rollup Plan

**Date:** 2026-05-25
**Status:** Planning artifact for the next Activity UX/data-model refinement slice.
**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Scope:** Better Activity/audit-card language, complete estimate-sheet action taxonomy, and clean Group Node / Area Node / row rollup semantics without duplicated facts.

## Objective

Turn the current Activity implementation into a contractor-readable audit system that explains exactly what changed in the sheet, the estimate tree, Group Nodes, Area Nodes, and row items.

The key design problem is not just "more events." It is a clean information model:

- store one canonical audit fact per committed user action or directly changed entity;
- derive sheet, Group Node, Area Node, and row views from those canonical facts;
- never write duplicate ancestor events only because a child event should appear under a parent Group Node;
- make cascade operations understandable through one aggregate card with expandable detail;
- make card copy specific enough that users understand actions such as "created Group Node", "renamed Area Node", "replaced Tile A with Tile B", and "inserted template under House."

## Current Baseline

Already implemented and supported:

- `estimate_sheet_events` is the active append-only audit source.
- Sheet Activity, node scopes, row scopes, and the Row item details Activity tab exist.
- Read filters, search, date bounds, cursor pagination, actor labels, and page-local correlation grouping exist.
- Node create and rename write history-owned events.
- Tree reorder, template insert, node cascade delete, row CRUD, and sheet metadata edits write server-owned history events.
- Named sheet versions, compare, and restore-as-copy are dormant and must stay out of this slice.

Current shortcomings to correct:

- Event labels and summaries are not specific enough for Group vs Area behavior. Example: `node_deleted_with_children` currently reads like an Area-only delete even when a Group subtree was removed.
- Event filters are a flat list of event types instead of a user-facing action taxonomy.
- Group Node Activity currently relies on descendant matching and correlation grouping, but the product rules for direct activity vs descendant rollup are not explicit.
- Cascade and template operations need a stronger "one source fact, many views" model so the sheet feed, parent Group Node feed, child Area feed, and row history do not feel like duplicate logs.
- The event payload contract is implicit. Future actions can easily add vague payloads that force weak card descriptions.

## Principles

1. **Canonical fact first.** `estimate_sheet_events` stores canonical audit facts. UI rollups must be derived from those facts, not written as duplicate ancestor rows.
2. **Scope is a lens, not a copy.** Sheet Activity, Group Node Activity, Area Node Activity, row-scope Activity, and the Row item details Activity tab are different lenses over the same facts.
3. **Group Nodes aggregate; Area Nodes own rows.** Group Node Activity can show direct structural events plus descendant Area/row activity. Area Node Activity shows the Area's structural events plus its row activity.
4. **Cascade is one action.** Deleting a Group subtree should render as one aggregate cascade card with counts, cost delta, and expandable affected nodes/rows unless the user explicitly opens a child detail view.
5. **Bulk operations stay grouped.** Template insertion, import, duplicate, and future bulk actions should have one operation-level card with child details, not dozens of top-level cards.
6. **Descriptions use user vocabulary.** Cards should say "Group Node", "Area Node", "row", "component", "template", "sheet code", and "project budget" instead of raw event names.
7. **No dormant version leakage.** The action matrix must not revive named sheet versions, compare, restore-as-copy, or proposal snapshot semantics.

## Scope Model

### Sheet Activity

Shows every supported event for the active estimate sheet.

Rules:

- Top-level feed groups repeated `correlation_id` values into operation cards.
- Sheet-level metadata events remain visible here.
- Node and row events include path context, such as `Lot / House / Kitchen`.
- Bulk operation cards show operation totals first, then expandable child detail.

### Group Node Activity

Shows the selected Group Node as an aggregation boundary.

Rules:

- Default view should include direct events for the selected Group Node plus descendant events under that Group.
- A compact segmented control should support `All descendant activity` and `Direct node only` if the volume or ambiguity grows.
- Direct events are structural changes to the selected node itself: created, renamed, moved/reordered, deleted.
- Descendant events are child Group, Area, and row changes that happened inside the selected Group subtree.
- Descendant events must not be copied into new ancestor event rows. The read model should derive inclusion from `estimate_node_id`, `target_row_id`, payload manifests, and tree ancestry.
- Cards should visibly mark descendant events with the nearest child path, not repeat the selected parent name on every line.

### Area Node Activity

Shows Area-level structural events and rows owned by that Area.

Rules:

- Area Node Activity should show Area created/renamed/moved/deleted events.
- Row added/replaced/updated/deleted events for rows in the Area should appear in the Area feed.
- Because Area Nodes are leaves, descendant aggregation should not introduce separate nested tree behavior.

### Row Version History

Shows only the selected row's row-specific history plus derived origin information when the row was born from a bulk operation.

Rules:

- Direct row operations remain first-class: manual row added, library row added, row replaced, scalar row updated, row deleted.
- If a row came from a template insertion or future import/duplicate action, row history may show a derived "Created by template/import" origin card from the operation payload.
- Derived row-origin cards must be marked as derived from the parent operation and must use the parent event id as source evidence.
- Row Version History should not show unrelated sibling rows from the same template or cascade operation.

## Action Matrix

| Entity | User action | Canonical event type | Required payload/context | Sheet Activity | Group Node Activity | Area Node Activity | Row History |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sheet | Rename estimate/sheet | `sheet_metadata_updated` | old/new `name`, changed fields | Single metadata card | Hidden unless scoped node context needs sheet event context | Hidden | Hidden |
| Sheet | Regenerate or edit sheet code | `sheet_code_updated` | old/new `sheetCode` | Single code card | Hidden | Hidden | Hidden |
| Sheet | Edit notes, budget, metadata | `sheet_metadata_updated` | changed fields, old/new values | Single metadata card with field chips | Hidden | Hidden | Hidden |
| Sheet | Duplicate estimate sheet | Future `sheet_duplicated` if needed | source estimate id, new estimate id/code, row/node counts | Original sheet: optional outbound copy card; new sheet: inbound creation card | Hidden | Hidden | Hidden |
| Group Node | Create Group Node | `node_created` | node id, kind `group`, name, parent id/name/path, sort order | Structural card | Direct card if selected node is new node or parent includes descendants | Hidden unless under selected Area is impossible | Hidden |
| Area Node | Create Area Node | `node_created` | node id, kind `area`, name, parent id/name/path, sort order | Structural card | Descendant card under parent Group | Direct card for created Area | Hidden |
| Group/Area Node | Rename node | `node_renamed` | node id, kind, old/new names, parent path | Structural rename card | Direct card for selected node; descendant card for ancestor Group | Direct card for selected Area | Hidden |
| Group/Area Node | Reorder among siblings | Current `tree_reordered`; future `node_reordered` view label | moved node ids, old/new parent ids, old/new sort order, affected sibling count | One grouped reorder card | Direct/descendant card depending on moved node ancestry | Direct card if selected Area moved | Hidden |
| Group Node | Move/reparent subtree | Current `tree_reordered`; future payload should distinguish move | moved node id, old/new parent path, descendant counts | One grouped move card | Direct if selected Group moved; descendant if child moved inside selected Group | Hidden unless selected Area moved | Hidden |
| Group Node | Delete Group subtree | `node_deleted_with_children` | deleted root id/name/kind/path, deleted Group count, Area count, row count, total delta, affected summaries | One cascade delete card | Direct card for deleted Group's parent/ancestor; historical selected deleted node needs payload fallback | Descendant rows should not appear as separate top-level duplicate cards | Derived row deletion only if row details can be opened from historical manifest |
| Area Node | Delete Area | `node_deleted_with_children` | deleted Area id/name/path, row count, total delta, affected row summaries | One Area delete card | Descendant card under parent Group | Direct Area delete card before route repair closes scope | Derived row deletion only if row details can be opened from historical manifest |
| Row | Add blank/manual row | `row_blank_added` | row id, Area id/path, material placeholder state, initial numeric fields | Row card | Descendant row card under parent Group | Direct row card in Area feed | Direct row creation card |
| Row | Insert library component | `row_added` | row id, Area path, source library id, material, supplier, category, unit cost, quantity, total | Row/component card | Descendant row card under parent Group | Direct row card | Direct row creation card |
| Row | Replace source component | `row_replaced` | old/new source ids, old/new material/supplier/category/unit cost/total, retained quantity/misc/contingency | Replacement card with `Old -> New` title | Descendant replacement card | Direct replacement card | Direct replacement card with component snapshot |
| Row | Edit quantity | `row_updated` | changed field `quantity`, old/new values, total delta | Scalar edit card | Descendant row card | Direct row card | Direct scalar card |
| Row | Edit contingency percent | `row_updated` | changed field `contingencyPercentage`, old/new %, old/new contingency value, total delta | Scalar edit card | Descendant row card | Direct row card | Direct scalar card |
| Row | Edit Misc Cost | `row_updated` | changed field `miscCost`, old/new currency, total delta | Scalar edit card | Descendant row card | Direct row card | Direct scalar card |
| Row | Edit multiple scalar fields from one commit | `row_updated` | changed fields array in stable display order, old/new values, total delta | One scalar edit card | Descendant row card | Direct row card | Direct scalar card |
| Row | Delete row | `row_deleted` | row snapshot before delete, Area path, total delta | Delete card | Descendant row card | Direct row card | Direct row deletion card if row detail context is available |
| Template | Insert template into Group | `template_inserted` | target parent id/path, template id/name, inserted Group count, Area count, row count, total added cost, compact child manifest | One aggregate template card | Direct card for target Group; descendant cards derived only if user expands | Direct only if target was Area, which should not be allowed under current template rules | Derived row-origin card from manifest for individual rows |
| Import/Future bulk | Import rows/nodes | Future `estimate_imported` | import source, target parent, counts, manifest, validation summary | One aggregate import card | Direct/descendant by target path | Direct if imported into Area | Derived row-origin cards only |
| Library sync/Future | Refresh row from library | Future `row_refreshed_from_library` | old/new source snapshot, explicit user confirmation id | Replacement-like card | Descendant row card | Direct row card | Direct refresh card |

## Canonical Payload Requirements

Every event payload should be enough to render useful copy after related rows/nodes are deleted.

Required shared fields when applicable:

- `nodeId`, `nodeKind`, `nodeName`, `nodePath` for node events;
- `parentNodeId`, `parentNodeName`, `parentPath` for node creation, move, template, and cascade events;
- `targetAreaId`, `targetAreaName`, `targetAreaPath` for row events;
- `rowId`, `material`, `supplier`, `category`, `unit`, `quantity`, `unitCost`, `miscCost`, `contingencyPercentage`, `lineTotal` for row events;
- `affectedGroupCount`, `affectedAreaCount`, `affectedRowCount`, and `totalDelta` for bulk/cascade events;
- `affectedNodeSummaries` and `affectedRowSummaries` only when bounded and needed for deleted/historical contexts;
- `sourceOperationEventId` only for derived display facts, not for extra stored ancestor events.

Size rules:

- Scalar row events should stay under the existing small-event guardrails.
- Bulk manifests should be compact summaries, not full row/source snapshots.
- If a template/import/cascade would exceed payload limits, store counts plus top N summaries and expose an explicit "details truncated" note.

## Aggregation Design

### Source event rows

Do write:

- one event for one direct row scalar edit;
- one event for one direct node create/rename;
- one event for one direct row insert/replace/delete;
- one operation event for one template insert, cascade delete, import, or other bulk operation;
- multiple event rows under one `correlation_id` only when each row is a distinct direct mutation that users need to inspect independently.

Do not write:

- parent Group Node copies of every descendant row event;
- Area copies of row events when `target_row_id` plus `estimate_node_id` already identifies the owning Area;
- sheet-level duplicates of every event solely to make Sheet Activity work;
- per-row delete events for a cascade delete if the cascade event already carries the manifest and counts.

### Read model

The UI should normalize raw events into display facts:

```ts
type ActivityFact = {
  sourceEventId: string;
  factKey: string;
  subjectType: "sheet" | "group-node" | "area-node" | "row" | "bulk-operation";
  relationToScope: "direct" | "descendant" | "sheet";
  title: string;
  summary: string;
  path: string[];
  actorLabel: string;
  createdAt: string;
  totalDelta: number | null;
  details: AuditChangeDetail[];
  childFacts?: ActivityFact[];
};
```

This should live as a pure view-model helper in the future implementation, separate from `EstimateSheetContent`, so card language can be tested without rendering the whole estimate sheet.

### Deduplication rules

- Deduplicate by `sourceEventId` inside a single scope unless a derived row-origin card uses `factKey = sourceEventId + ":row-origin:" + rowId`.
- When grouping by `correlation_id`, show one operation group in the list and nest child event cards inside it.
- In Group Node Activity, if an event targets the selected Group directly, classify it as `direct`, not `descendant`.
- In Group Node Activity, descendant row events should show the nearest Area path once in the meta row or detail body, not in every title.
- If a cascade delete appears in Sheet Activity and Group Node Activity, it is the same event viewed in two scopes. The UI should not label it as a new event.

### Historical cascade caveat

Current descendant matching starts from live node and row ids. Deleted nodes and deleted rows can lose live ancestry. For exact historical Group rollups after deletion, plan a read-side SQL RPC that can match:

- direct `estimate_node_id`;
- `target_row_id`;
- `payload.nodePath` / `payload.parentPath`;
- `affectedNodeSummaries[].id`;
- `affectedRowSummaries[].id`;
- `correlation_id`.

Do not add this SQL RPC until product usage shows the current PostgREST path is insufficient or the next implementation slice explicitly targets cascade-history accuracy.

## Audit Card UX Plan

### Information hierarchy

Each audit card should follow this order:

1. **Meta row:** timestamp, actor, direct/descendant scope, path.
2. **Title:** user-language action and subject, e.g. `Group Node created`, `Kitchen renamed`, `Tile A replaced with Tile B`.
3. **Summary:** one sentence that explains the business meaning.
4. **Primary facts:** compact chips or rows for counts, total delta, changed fields, source/supplier/category.
5. **Diff/details:** old -> new values for scalar or replacement events.
6. **Expandable detail:** child manifest for template/cascade/bulk operations.

### Card families

Use a shared card shell with event-specific body renderers:

- `RowActivityCardBody` for row add/update/replace/delete.
- `NodeActivityCardBody` for Group/Area create/rename/move/delete.
- `BulkActivityCardBody` for template insert, cascade delete, future import/duplicate.
- `SheetActivityCardBody` for sheet code, notes, budget, and metadata.

### Copy rules

- Prefer `Group Node` and `Area Node` in structural cards.
- For user-facing labels, use the node name where possible: `House renamed to Main House`.
- For descendant rollups, say `Inside House` or show path `House / Kitchen`, not "related activity" alone.
- For cascade deletes, say `Deleted Services House: 2 groups, 5 areas, 18 rows removed`.
- For template insertion, say `Inserted Finish Schedule under House: 4 areas, 22 rows added`.
- For row replacements, preserve the strongest existing pattern: `Tile A -> Tile B`.
- For scalar edits, include field names and values: `Quantity 12 -> 18`, `Contingency 5% -> 8%`.

## Filter And Navigation Plan

Replace the flat event-type dropdown with action groups, while keeping raw event type internally:

- `All activity`
- `Rows`
- `Components replaced`
- `Costs changed`
- `Groups and areas`
- `Templates and bulk actions`
- `Sheet details`

Node Activity should expose:

- `All descendant activity`
- `Direct node only`

Only show the direct/descendant control when the selected node is a Group Node. Area Nodes do not need it.

## Implementation Sequence For A Future Code Slice

1. Add a pure activity catalog/view-model module.
   - Define supported event types, action groups, labels, summaries, and payload readers.
   - Unit test the matrix before touching UI.
2. Strengthen payload normalization.
   - Add path/count helpers for row, node, template, and cascade events.
   - Keep SQL event writes server-owned.
   - Avoid adding ancestor duplicate rows.
3. Refactor card rendering.
   - Move event labels/details out of `EstimateSheetContent`.
   - Add card body renderers for row, node, bulk, and sheet families.
4. Improve Group Node and Area Node Activity UI.
   - Add direct/descendant scope labeling.
   - Improve correlation group headings from `N related activity events` to action-specific summaries.
5. Add derived row-origin cards for template/import-created rows if payload manifests support row lookup.
6. Add tests.
   - Pure catalog tests for every action matrix row.
   - UI tests for Group Node descendant rollups without duplicate cards.
   - UI tests for cascade delete and template insert aggregate cards.
   - Action/schema tests that new payload fields stay compact and dormant named-version events remain filtered.
7. Run validation.
   - Focused Vitest for Activity actions/UI/schema.
   - `bun run type-check`.
   - `bun run validate` if source code changes.
   - `git diff --check`.

## Acceptance Criteria

- Group Node Activity clearly separates direct node events from descendant Area/row activity.
- Area Node Activity shows Area structural events and its row activity without tree-level noise.
- Sheet Activity presents bulk/cascade operations as aggregate cards, not repeated unexplained rows.
- Row Version History remains row-specific and does not list sibling rows from a bulk operation.
- No ancestor duplicate events are written for rollups.
- Event descriptions are human-readable for all supported row, sheet, Group Node, Area Node, template, reorder, and cascade actions.
- Every visible action group maps back to explicit canonical event types.
- Dormant named-version events remain filtered out of the Activity UI.

## Non-Goals

- No named sheet versions, compare, or restore-as-copy.
- No Activity export/report.
- No Supabase Realtime feed.
- No undo/redo command stack.
- No destructive cleanup of linked-remote QA residue.
- No broad proposal/export snapshot semantics.

## Open Implementation Risks

- Exact historical Group rollups after deletion may need a read-side SQL RPC because live descendant lookup cannot always recover deleted ancestry.
- Template insertion may need a stronger compact manifest if row-level origin cards are required.
- Moving event formatting out of `EstimateSheetContent` will touch a high-blast-radius component and should be tested before any UI change.
- Bulk manifests must be bounded so event payload size stays below the measurement guardrails in `17-activity-expansion-roadmap.md`.
