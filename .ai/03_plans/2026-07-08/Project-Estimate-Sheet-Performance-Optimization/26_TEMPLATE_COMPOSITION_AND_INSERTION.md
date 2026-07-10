# 26 - Template Composition And Insertion

## Purpose

This document specifies how reusable templates are composed, stored, and inserted into live estimates — a core workflow the user explicitly asked to understand ("how a template is composed", "their relation to templates"). It maps the template entity model, the optimistic insertion flow, the server-side copy semantics, and the cross-panel DnD bridge.

This is a planning/reference document. It does not authorize code changes.

## Template Entity Model

A **template** is a reusable, persisted tree that can be inserted into any estimate. Defined in `migrations/0024_estimate_templates.sql`.

| Entity | Table | Migration | Role |
|---|---|---|---|
| Estimate Template | `estimate_templates` | `0024:1` | The reusable template root |
| Estimate Template Node | `estimate_template_nodes` | `0024:18` | A branch in the template tree. `kind` is `"group"` or `"area"`. Self-parent CHECK constraint. |
| Estimate Template Row Item | `estimate_template_row_items` | `0024:37` | A line item under a template node |

Plus 5 supporting indexes in the same migration.

A template loaded client-side is typed as `EstimateTemplate { id, nodes: EstimateTreeNode[] }` — it uses the **same `EstimateTreeNode` shape** as live estimates, which is why the optimistic clone logic can reuse estimate tree helpers.

## Template Creation (authoring)

Templates are authored in the component library workspace:
- `template-editor.test.tsx` (14 tests), `template-editor-actions-authz.test.ts` (4 tests) cover the editor.
- `template-gallery.tsx` (14 tests — TemplatesBrowseManager Phase 2), `new-template-modal.tsx` (5 tests) cover creation entry points.
- `library-template-insert-picker.tsx` (3 tests — `InsertIntoEstimatePicker`) covers the insert-from-library picker.

Template authoring is **out of scope for the estimate sheet route itself** — templates are created in `/workshop/library` and consumed in the estimate sheet.

## Three Insertion Entry Points

All in `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`:

| Entry Point | Function | Server Action | RPC | Use Case |
|---|---|---|---|---|
| Whole template | `insertTemplateIntoParent` (line 67) | `insertEstimateTemplateIntoEstimate` (`actions.ts:3145`) | `insert_estimate_template_into_estimate_with_history` | Insert an entire template as children of a target node |
| Batch templates | `insertTemplatesIntoParent` (line 116) | `insertEstimateTemplatesIntoEstimate` (`actions.ts:3187`) | same RPC, **sequential** | Insert N>1 templates in a single round-trip; **INS-1**: sequential to avoid concurrent-insert tree-read race |
| Node + subtree | `insertTemplateNodeIntoParent` (line 183) | `insertEstimateTemplateNodeIntoEstimate` (`actions.ts:3244`) | `insert_estimate_template_node_into_estimate_with_history` | Insert one node + its subtree (not the whole template) |

### P6: Any node kind is a valid insert target

Per the P6 single-node model (`actions.ts:2286, 2923, 3295`), **any node may parent any node** — there is no area/group gate on template insertion. A template node can be inserted into any estimate node, regardless of `kind`. This is tested in `estimate-template-drop-zones.test.tsx` ("direct insert INTO a row-owning area (P6)").

## Optimistic Insertion Flow (uniform across all three)

```
1. Snapshot
   previousTree = estimateTree
   previousRows = editableRows (collectEditableRows — O(N))
   rollbackRevision = getEstimateTreeRevision()

2. Optimistic clone + append
   clonedNodes = cloneTemplateNodesForEstimate(templateNodes)
     ├─ deep clone with NEW UUIDs
     ├─ totals reset to "PHP 0.00"
     └─ children + row items cloned recursively
   setEstimateTree(appendTemplateNodesToParent(tree, targetParentNodeId, clonedNodes))
     ├─ pure tree append into the matched parent
     └─ bumps skipEditableRowsSyncRef so the sync effect doesn't fight the optimistic patch

3. Fire server action (async)

4. On success — reconcile ONLY if revision matches (stale-snapshot guard)
   if (getEstimateTreeRevision() === nextRevision) {
     // server-confirmed tree replaces optimistic
   }

5. On error — rollback
   restoreEstimateState(previousTree, previousRows, rollbackRevision)
```

The **stale-snapshot guard** (step 4) is critical: if another mutation landed between the optimistic insert and the server response, the optimistic tree is NOT blindly overwritten — the revision check prevents clobbering in-flight edits.

## Optimistic Model

`src/components/workshop/estimate-sheet/template-insertion-model.ts` (73 lines):

- `cloneLibraryItemForEstimate(libraryItem)` — new UUID, recomputes `subTotal/adjustmentValue/totalItemCosts`.
- `cloneTemplateNodesForEstimate(nodes)` — deep clone with new ids, `total: "PHP 0.00"`, children + row items cloned.
- `appendTemplateNodesToParent(tree, targetParentNodeId, templateNodes)` — pure tree append into the matched parent.

## Server-Side Copy Semantics

`copyTemplateNodes` (`d1-action-client.ts:1887`):

1. Reads `estimate_template_nodes` + `estimate_template_row_items` (optionally scoped to a subtree via `collectTemplateDescendantNodeIds`).
2. Maps old→new node ids.
3. Inserts `estimate_nodes` (resolving `estimate_tab_id` from the parent node or arg).
4. Inserts `estimate_row_items` under the new nodes.
5. Writes a history event: `template_inserted` (whole template) or `template_node_subtree_inserted` (node + subtree).
6. Returns `inserted_root_node_ids`.

The inserted rows carry forward the template's component data (material, costs, variants, source snapshots) but get **fresh UUIDs** and **fresh `sort_order`** within their new parent.

## Cross-Panel DnD Bridge

Template drops originate from the left panel (`EstimateSheetTree`) or the right panel (component library templates browser), but the actual insertion happens in the middle sheet (`EstimateSheetContent`). The bridge is a **window event**, not direct component coupling:

```
Left panel (EstimateSheetTree.tsx) or Right panel (templates browser)
  └─ dispatches window event: INSERT_ESTIMATE_TEMPLATE_EVENT
       payload: { templateIds: string[], targetNodeId?: string }

Middle panel (EstimateSheetContent.tsx:2152-2181)
  └─ listens for INSERT_ESTIMATE_TEMPLATE_EVENT
       └─ routes to insertTemplateIntoParent / insertTemplatesIntoParent
            └─ (if targetNodeId provided) insert into that node
            └─ (else) insert into selected node
```

This decoupling means the left tree and the middle sheet don't share direct props for template insertion — they communicate through the window event bus. The same pattern is used for library item inserts (`ADD_LIBRARY_ITEM_EVENT`), row moves (`REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT`), and project source inserts (`INSERT_PROJECT_SOURCE_EVENT`).

### Template Drop Zones

`estimate-sheet/rows/drop-zones.tsx`:
- `TemplateDropZone` (line 188) — per-node template target, rendered **only while a template drag is in flight** (reads `useEstimateWorkshopDrag()`).
- Every node has a "plain insert zone" (`estimate-template-drop-zones.test.tsx`: "plain insert zone on EVERY node").
- Subtree-only insert is supported for `insertTemplateNodeIntoParent`.

Tested in `estimate-template-drop-zones.test.tsx` (9 tests): drop zones hidden at rest; template drop zones on groups; subtree-only insert; plain insert zone on every node; direct insert INTO a row-owning area (P6).

## Project Sources (reusable project-level subtrees)

Distinct from templates but use a parallel flow: `PROJECT_SOURCE_DRAG_MIME_TYPE` + `INSERT_PROJECT_SOURCE_EVENT`. Project sources are reusable subtrees scoped to a project (vs templates which are workspace-global). The insertion path mirrors template insertion.

- `template-browse-project-sources.tsx` (2 tests) covers the project-sources browser.
- `templates-tree-performance.test.ts` (8 tests) covers project-source perf helpers (dedup).

## Performance Considerations

| Operation | Cost | Notes |
|---|---|---|
| Optimistic clone | O(T) where T = template size | deep clone with new UUIDs |
| Optimistic append | O(D) where D = depth of target | tree append |
| `collectEditableRows` snapshot | O(N) full tree | per-insertion; GAP — addressed by normalized graph |
| Server `copyTemplateNodes` | O(T) | single pass over template nodes + rows |
| Reconciliation | O(N) only if revision matches | stale-snapshot guard prevents most reconciliation |

**Risk**: inserting a large template into a large estimate triggers an O(N) editable-rows re-seed. For MVP template sizes this is acceptable; for very large templates, the normalized graph store should make insertion entity-scoped.

## Test Coverage

| File | Tests | Covers |
|---|---|---|
| `estimate-sheet-library-insert.test.tsx` | 38 (subset) | template insertion via shared event path; single + batch; stale-tree handling |
| `estimate-template-drop-zones.test.tsx` | 9 | DnD affordances; drop zones; P6 insert target; subtree-only |
| `template-editor.test.tsx` | 14 | template authoring editor |
| `template-editor-actions-authz.test.ts` | 4 | editor authz |
| `template-gallery.tsx` | 14 | TemplatesBrowseManager |
| `new-template-modal.tsx` | 5 | creation modal |
| `library-template-insert-picker.tsx` | 3 | InsertIntoEstimatePicker |
| `template-browse-project-sources.tsx` | 2 | project sources browser |
| `templates-tree-performance.test.ts` | 8 | project-source perf helpers |

**Gap**: no browser proof for template insertion into the estimate sheet (all jsdom). Canonical `UNIT-002` owns the browser scenario and `UNIT-010` reruns it in integrated proof.

## Verification

- Planning provenance: source-grounded audit of `use-estimate-template-insertion.ts`, `template-insertion-model.ts`, `actions.ts`, and `d1-action-client.ts`.
- The optimistic insertion flow and stale-snapshot guard are verified by `estimate-sheet-library-insert.test.tsx`.
