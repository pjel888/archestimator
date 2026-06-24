# 10 — Insertion, Drag-Drop, and Bulk Audit

## Target eligibility matrix

**Single-node model (P6)**: ANY selected estimate node is a valid insertion target. There is no group-vs-area distinction — every node can parent rows and child areas.

| Source → Target | No selection | Root Area | Nested Area | Optimistic node | Deleted node | Other tab | Read-only |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Library Component | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |
| Project Component | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |
| Template (whole) | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |
| Template node | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |
| Template row | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |
| Project tab source | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |
| Project node source | root insert | ✅ | ✅ | ⛔ wait | ⛔ error | ⛔ | ⛔ |

**Target resolution**: the sidebar reads `selectedNodeId` / `selectedNodeKind` / `selectedNodeName` from props (passed by `EstimateSheetContent` which reads from `useEstimateWorkspaceSelection`). When no node is selected, inserts target the estimate root.

## Action equivalence

### Library Component Add
- **Inline "+" button**: calls `onInsertComponent(item)` — delegates to sheet
- **Double-click**: calls `onInsertComponent(item)` — same path
- **Context menu "Add"**: calls `onInsertComponent(item)` — same path
- **Preview "Add ×N"**: calls `onInsertComponent(item)` with quantity
- **Bulk "Add selected"**: loops `onInsertComponent` per item
- **Drag**: sets MIME `text/plain` + custom event on drop

**All paths resolve the same target and call the same callback.** ✅ Verified equivalent.

### Template Add
- **Context menu "Add to estimate"**: calls `onInsertTemplate(template)` — delegates to sheet
- **Category "Add all"**: loops `onInsertTemplate` per template in category
- **Bulk "Add selected"**: loops `onInsertTemplate` per checked template
- **Drag**: sets `ESTIMATE_TEMPLATE_DRAG_MIME_TYPE` payload

**All paths resolve the same target.** ✅

### Project Source Add
- **Context menu "Add to estimate"**: calls `onInsertProjectSource(source)` — delegates to sheet
- **Preview "Add" button**: same
- **Bulk "Add selected"**: loops per checked source
- **Drag**: sets `PROJECT_SOURCE_DRAG_MIME_TYPE` payload

**All paths resolve the same target.** ✅

## Drag-and-drop

### MIME payloads

```ts
// templates.ts
ESTIMATE_TEMPLATE_DRAG_MIME_TYPE = "application/x-archestimator-estimate-template"
PROJECT_SOURCE_DRAG_MIME_TYPE = "application/x-archestimator-project-source"
```

Payloads are JSON with discriminated `kind` field. Readers (`readEstimateTemplateDragPayload`, `readProjectSourceDragPayload`) validate the payload structure and return `null` on malformed data.

### Drag sources

| Source | `draggable` | `effectAllowed` | MIME payload |
| --- | --- | --- | --- |
| Library component row | ✅ | copy | `text/plain` = item id + custom event |
| Library folder (reorder) | ✅ | move | `text/plain` = node id |
| Template row | ✅ | copy | template MIME |
| Template node | ✅ | copy | template-node MIME |
| Category header | ✅ | copy | templates MIME (multiple ids) |
| Project tab source | ✅ | copy | project-source MIME |
| Project node source | ✅ | copy | project-source MIME |
| Template component row | ✅ | copy | item drag |

### Drop targets

| Target | Accepts | Position | Handler |
| --- | --- | --- | --- |
| Estimate Sheet (center) | library item, template, source | inside | sheet insertion |
| Estimate Tree node (left) | template, source | inside only | window event → sheet |
| Library sibling (reorder) | library folder/component | before/after | `onReorder` |
| Browser exterior | — | — | no-op (drop cancelled) |

### Internal reorder vs external copy conflict

**Library component rows** can be both:
- **Dragged outward** to copy into the estimate (effect: copy)
- **Dragged inward** to reorder among siblings (effect: move)

The `LibraryTree` component handles this by checking `reorderEnabled` in `handleCanDrag` (`LibraryTree.tsx:501-507`):
```ts
if (getLibraryNode(node)?.item) return Boolean(onItemDragStart) || reorderEnabled;
```

When both are enabled, a component row is draggable for both purposes. The drop target determines the operation:
- Drop on a sidebar sibling → reorder (local-only, browser-storage)
- Drop on the sheet/tree → insert (server-persisted)

**Potential confusion**: the user may intend to insert but accidentally drop on a sidebar sibling, triggering a local-only reorder. No visual feedback distinguishes the two modes during drag. **Low risk** but worth a dedicated drag handle for reorder.

### Payload validation at receiving boundary

The `EstimateSheetTree`'s `treeExternalDrop` (`EstimateSheetTree.tsx:792-835`) reads payloads via the `read*DragPayload` helpers which validate structure. Malformed payloads are silently ignored. ✅

## Bulk selection

### Cascade behavior

`toggleCascadeSelection` from `@/lib/bulk-selection/tree-selection` handles parent-to-child cascade. Selection nodes are built per-tree:
- **Library**: `buildLibrarySelectionNodes` (`index.tsx:788-794`)
- **Templates**: `buildTemplatesSelectionNodes` (`TemplatesTreeModel.ts:503-509`)
- **Estimate tree**: `buildEstimateTreeSelectionNodes` (`EstimateSheetTree.tsx:344-350`)

### Selection pruning

An effect prunes stale selected ids when the tree changes:
```ts
// EstimateSheetTree.tsx:487-500
useEffect(() => {
  queueMicrotask(() => {
    setBulkSelectedNodeIds((current) => {
      const next = pruneSelection(treeSelectionNodes, current);
      // ...
    });
  });
}, [treeSelectionNodes]);
```

This handles the case where a selected node is deleted or filtered out — its id is removed from the selection set.

### Indeterminate checkboxes

The shared `Tree` component computes `indeterminateIds` for unselected parents with selected descendants (`tree.tsx:700-715`). ✅

### Bulk delete (Library tab only)

- **Confirmation dialog**: ✅ with "Delete selected" / "Cancel"
- **Persistence**: ❌ LOCAL-ONLY (same as single delete — Finding F-06)
- **Undo**: ✅ local restore
- **Partial failure**: N/A (no server call)

### Bulk add

- **Sequential**: loops `onInsertComponent` / `onInsertTemplate` per item
- **No parallel batching**: each insert is a separate server call
- **Progress feedback**: none beyond individual toasts
- **Error isolation**: one insert failure does not stop subsequent inserts
- **Selection retention**: selection is cleared after bulk add completes
