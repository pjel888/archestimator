# 10 — Reference Implementation: EstimateSheetTree

**Date:** 2026-06-13
**Why this doc exists:** `src/components/workshop/EstimateSheetTree.tsx` (1,465 LOC) already implements the exact migration target — canonical `Tree` + domain drop planner + optimistic state + bulk selection. The folder-tree migration is ~80% "do what the estimate tree does, for folders and components." **Read that file end-to-end before writing any `FolderTree` code.** This doc maps each `FolderTree` concern to the working pattern.

---

## 1. Pattern map

| `FolderTree` concern | `EstimateSheetTree.tsx` reference | What to copy / what differs |
|---|---|---|
| `canDrag` | `handleTreeCanDrag` (485–488): blocks while reordering disabled, editing, or search active | Copy the gating style. Folder tree adds: synthetic-root block, component-row predicate (doc 09 §4.3). Note: the estimate tree blocks dragging during search; the current folder tree does **not** — keep folder-tree parity (drag allowed during search). |
| `canDrop` | `handleTreeCanDrop` (490–498): calls the domain planner with `{ nodes, draggedNodeIds: [draggedId], target: { targetNodeId, position } }` and returns `.ok` | Identical shape; call `evaluateLibraryFolderTreeDrop` instead. |
| `onDrop` | `handleTreeDrop` (504–579): evaluate → optimistic apply → server call → confirm or rollback | Same skeleton, simpler: the folder tree's optimistic state lives in the parent (`folders`/`onFoldersChange` props), no revision counter needed. Follow `LibraryFolderTree.tsx:509–531` for the exact folder sequence (doc 09 §4.4). |
| Optimistic state + rollback | 239–247 (pending refs), 517–565 (snapshot → optimistic → server → merge/rollback) | The estimate tree's revision/merge machinery exists because cell edits mutate concurrently. The library tree doesn't need it — keep the simpler snapshot/rollback already in `LibraryFolderTree.tsx`. |
| Reorder status surfacing | 256, 305–335: `ReorderStatus` state synced to `useToast` | **Do not copy the toast.** Decision D9 (doc 07): the folder tree keeps its `role="status" aria-live="polite"` strip rendered by `LibraryFolderTreeSurface` (`LibraryFolderTree.tsx:1204–1215`), which already receives `onReorderStatus`. Zero new work. |
| Search filtering | 436–444: `displayedNodes` memo over `filterEstimateTreeNodes` | Folder tree equivalent already exists: `filterFolderTree` + `filterComponentItemsByFolderId` (`LibraryFolderTree.tsx:150–164, 224–233`). Reuse unchanged. |
| Expand-on-search | 436–444: when search active, `treeExpandedIds = collectEstimateFolderIds(displayedNodes)` (auto-expand all matches) | **Do not copy** (Decision D7): the current folder tree keeps user expansion state during search (initial state = all expanded, `LibraryFolderTree.tsx:409`). Pass the existing `expandedFolderItemIds` straight through as `expandedIds`. The estimate-tree auto-expand is a possible follow-up, out of scope. |
| Bulk selection | imports `pruneSelection`, `toggleCascadeSelection`, `dedupeSelectedRoots` from `@/lib/bulk-selection/tree-selection` (28–31) | The folder tree already uses the same helpers (`LibraryFolderTree.tsx:440–453`). Keep them; keep `TreeBulkActionBar` (not the estimate tree's `BulkActionToolbar`) for visual parity. |
| Panel shell | `TreePanelHeader` (line 17 import) | `LibraryFolderTreeSurface` already uses `TreePanelHeader` — unchanged. |
| Row rendering | `renderRow={renderEstimateTreeRowLabel}` (1354; impl 1140–1256) — **label-only** override; default row supplies checkbox, caret, drag handle, indent | **Differs — use `renderItem` instead.** See §2. |
| External template drops | `treeExternalDrop` memo (585–611) over `ESTIMATE_TEMPLATE_DRAG_MIME_TYPE` | **Not needed** (Decision D8): the current folder tree accepts no external drags. Skip `externalDrop` entirely. |

---

## 2. `renderRow` vs `renderItem` — the one place the estimate tree is NOT the model

The canonical `Tree` offers two row hooks (`tree.tsx:193–195`):

```ts
renderRow?:  (node: TreeNode, depth: number, isSelected: boolean, isExpanded: boolean) => ReactNode;
// replaces ONLY the label/content area; default row keeps checkbox, caret, rails, indent

renderItem?: (state: TreeItemState, rowProps: TreeRowDomProps) => ReactNode;
// replaces the ENTIRE row; consumer must spread rowProps for ARIA/DnD/keyboard bindings
```

The estimate tree gets away with `renderRow` because it only customizes the label text/inline-edit. The folder tree **cannot**, because it must:

- emit `data-library-folder-node-id`, `data-library-folder-arrow-id`, arrow spacers, and the component-row `data-*` attributes **on the row element** (test contract, doc 08 §3);
- render a two-line component row (name + supplier / price + unit, `LibraryFolderTree.tsx:749–759`);
- keep using `WorkshopTreeRow` with `dragHandleSlot`, `leadingSlot` (the `TreeSelectionCheckbox` with indeterminate state), and `contextMenuGroups` (`:788–832`);
- suppress checkbox/drag affordances on the synthetic root.

So: **`FolderTree` uses `renderItem`**, spreading the supplied `rowProps` onto `WorkshopTreeRow` (or its wrapper) and re-attaching the `data-*` attributes — structurally the same job the current code does with react-complex-tree's `context.itemContainerWithoutChildrenProps` / `interactiveElementProps` (`:701–707`), just with a cleaner source of props. Use `state.toggle()` for the caret's click handler and `state` flags (`isExpanded`, `isSelected`, `isIndeterminate`, depth/setsize info) instead of react-complex-tree's `context`.

The current `renderItem` body in `LibraryFolderTree.tsx:694–837` is the visual spec — port it nearly verbatim.

---

## 3. Context menus

The current tree builds `ActionMenuGroup[]` in `createActionGroups` (`LibraryFolderTree.tsx:533–598`): Select / Expand-Collapse (when children) / Add folder / Rename / Delete, with the synthetic root omitting Rename/Delete and creating at top level (`createParentId = null`, `:536`). `WorkshopTreeRow` accepts `contextMenuGroups` directly — this logic ports unchanged; only the expand/collapse toggle swaps from react-complex-tree item ids to the same ids in the canonical `expandedIds` array (ids are identical, doc 09 §2).

---

## 4. What the canonical `Tree` gives you for free (don't rebuild)

Verified against `tree.tsx`:

- Keyboard: Arrow keys, Home/End, Enter, Space, roving tabindex (935–1001).
- ARIA: `role="treeitem"`, `aria-level/setsize/posinset/expanded/selected/current` via `rowProps` (1037–1043).
- DnD plumbing incl. self/descendant-drop blocking (723–900).
- Indeterminate checkbox state (63, 418) — though we keep `TreeSelectionCheckbox` for test parity.
- `emptyState` prop — pass the existing "No folders match" block (`LibraryFolderTree.tsx:600–606`) verbatim.

What it does **not** give you (consumer's job, all already solved in existing code): search filtering, expand-on-search policy, bulk-selection cascade (`tree-selection.ts`), Shift+click range select (not supported today either — no gap), type-ahead (same — no gap).
