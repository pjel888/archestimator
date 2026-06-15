# 09 — Drop Event Translation Contract

**Date:** 2026-06-13
**Status:** Verified against live source
**Why this doc exists:** Drop translation is the highest-risk code in this migration. This doc replaces the original plan's loose "Option A vs Option B" framing with the exact contract, because the key discovery is: **the neutral planner already exists.**

---

## 1. The key simplification

`src/lib/component-library/library-folder-reorder.ts` already exports `buildLibraryFolderReorderPlan({ folders, draggedFolderId, targetParentId, targetIndex })` (line 250) — a pure, react-complex-tree-free planner that handles self-drop, cycle, no-op, bounds clamping, same-parent index adjustment, and sibling sort-order renormalization. It is pinned by `tests/vitest/library-folder-reorder.test.ts`.

The existing `evaluateLibraryFolderDrop` (line 299) is only a ~35-line translator from `react-complex-tree`'s `DraggingPosition` into that planner. The migration therefore does **not** touch the planner core at all. We write one new ~40-line translator for canonical `Tree` events and, in the cleanup PR, delete the old one plus the two type imports (`DraggingPosition`, `TreeItemIndex`).

```
OLD: react-complex-tree DraggingPosition ──evaluateLibraryFolderDrop──▶ buildLibraryFolderReorderPlan
NEW: canonical (draggedId, targetId, position) ──evaluateLibraryFolderTreeDrop──▶ buildLibraryFolderReorderPlan  (unchanged)
```

The discriminated-union result contract is preserved as-is: `{ ok: true, plan } | { ok: false, code, message }` — the error path in the UI (`onReorderStatus({ state: "error", message: result.message })`) keeps working.

---

## 2. Id schemes (must not change)

| Node | Id | Built by |
|---|---|---|
| Real folder | `folder:<folderId>` | `toLibraryFolderTreeItemId` (reorder lib, line 80) |
| Synthetic root | `folder:all-components` | `withAllComponentsRoot` (`LibraryFolderTree.tsx:209`) |
| Component row | `component:<parentFolderId>:<itemId>` | `toLibraryComponentTreeItemId` (`LibraryFolderTree.tsx:170`) |
| Abstract tree root | `library-folder-tree-root` | react-complex-tree only — **disappears**; in the canonical `Tree`, `nodes` = `[allComponentsRootNode]` |

Keeping these ids preserves the `data-*` attribute values (doc 08), the persisted expansion-state shape, and `fromLibraryFolderTreeItemId` round-tripping.

---

## 3. Canonical `Tree` drop surface

From `src/components/ui/tree.tsx`:

```ts
type TreeDropPosition = "before" | "after" | "inside";
onDrop?:  (draggedId: string, targetId: string, position: TreeDropPosition) => void;
canDrop?: (draggedId: string, targetId: string, position: TreeDropPosition) => boolean;
canDrag?: (node: TreeNode) => boolean;
```

- Single-drag only — the old `multi-drag-unsupported` failure path becomes unreachable (fine).
- `rootDropZones` would resolve to `onDrop(firstRootId, "before")` / `onDrop(lastRootId, "after")` (`tree.tsx:859–869`). Our only root node is the synthetic "All Components" root, and nothing may drop before/after it — **leave `rootDropZones` off.**
- The Tree already blocks self-drops and descendant drops internally; the planner re-validates anyway (defense in depth).

---

## 4. New evaluator

Add to `library-folder-reorder.ts` (alongside the old evaluator until cleanup):

```ts
export type LibraryFolderTreeDropInput = {
  folders: LibraryFolderRecord[];
  draggedFolderId: string;                      // real folder id (prefix stripped)
  targetFolderId: string;                       // real folder id, or ALL_COMPONENTS_FOLDER_ID
  position: "before" | "after" | "inside";
};

export function evaluateLibraryFolderTreeDrop(input: LibraryFolderTreeDropInput): LibraryFolderReorderResult
```

Phase 0 moves `ALL_COMPONENTS_FOLDER_ID` and `isAllComponentsFolderId` into this reorder module, with `library-folder-tree-shared.ts` re-exporting them. The evaluator therefore calls `isAllComponentsFolderId(targetFolderId)` directly. Do not inject a predicate or leave this as an implementer choice; the point of the move is to avoid an import cycle and keep the drop contract stable.

### 4.1 Folder-drag translation table

`parent(F)` and `index(F)` come from the **folder records** (`parent_id`, sorted by the existing `compareFolders` order), never from the mixed UI node array — component rows must not shift folder indices.

| Canonical event (dragged = folder D) | `targetParentId` | `targetIndex` | Notes |
|---|---|---|---|
| `inside` real folder F | `F` | `children(F).length` | Append — matches old `targetType:"item"` branch (line 322–330) |
| `before` real folder F | `parent(F)` (null if top-level) | `index(F)` | Planner adjusts when moving within same parent from an earlier index (line 271–273) |
| `after` real folder F | `parent(F)` | `index(F) + 1` | Same adjustment applies |
| `inside` synthetic root | `null` | `children(null).length` | Move to end of top level — matches old `targetType:"root"` branch (line 332–334) |
| `before` / `after` synthetic root | — | — | **Reject** (`unsupported-target`): the root is the only top-level node |
| any position on a component row | parent folder of the row | `children(parent).length` | Equivalent to old behavior: between-items `childIndex` past the folder count was clamped to append (line 191, 270) |
| dragged id is the synthetic root | — | — | **Reject** (`synthetic-root-drag`) — also blocked in `canDrag` |

> **Deliberate behavior fix (Decision D12, doc 07):** today, a between-items drop whose visual parent is the synthetic root reports `parentItem = "folder:all-components"`, which `normalizeParentId` does **not** map to `null`, so `buildLibraryFolderReorderPlan` fails with `unknown-target-parent` — i.e., **reordering top-level folders by dragging between them silently fails in the current tree** (`canDropAt` rejects the hover). The new table maps `before`/`after` a top-level folder to `targetParentId: null`, which makes top-level reorder work. This is the one intentional deviation from strict parity.

### 4.2 Component-drag translation table

Mirrors `getComponentDropTargetFolderId` (`LibraryFolderTree.tsx:290–301`): resolve the drop to a **writable folder id** or null.

| Canonical event (dragged = component C with parent P) | Resolved target folder | Outcome |
|---|---|---|
| `inside` real folder F | `F` | Move |
| `before` / `after` real folder F | `parent(F)` → null if F is top-level | Move if non-null, else reject |
| `before` / `after` component row in folder F | `F` | Move |
| any position on/under synthetic root resolving to it | `null` | Reject with status error `"Drop components onto a library folder."` (`LibraryFolderTree.tsx:490`) |
| resolved target === P (current parent) | `P` | No-op with **saved**-tone status `"Component is already in that folder."` (`:494`) — blocked earlier in `canDrop` |

On success: `await onMoveComponentToFolder(item, targetFolderId)` then `onSelectFolder(targetFolderId)` and status `"Component moved."` — exactly the current sequence (`:498–505`).

### 4.3 Guard predicates

```
canDrag(node):
  !disabled && enableDragAndDrop
  && (node.data.kind === "folder"
        ? Boolean(folderId) && !isAllComponentsFolderId(folderId)        // LibraryFolderTree.tsx:464–465
        : Boolean(onMoveComponentToFolder && item && parentFolderId))     // :467

canDrop(draggedId, targetId, position):
  component drag → resolvedTargetFolderId !== null && resolvedTargetFolderId !== parentFolderId   // :473–475
  folder drag    → evaluateLibraryFolderTreeDrop(...).ok                                          // :477–481
```

`treeMutationPending` (the `disabled` prop) must gate both, as today.

### 4.4 Post-drop side effects (unchanged contract)

Folder drop, from `LibraryFolderTree.tsx:509–531`:

1. `evaluate…` → on failure: `onReorderStatus({ state: "error", message })`, stop.
2. Snapshot `previousFolders = folders`.
3. Optimistic: `onFoldersChange(result.plan.nextFolders)`; status `saving: "Saving folder order..."`.
4. `await reorderLibraryFolders({ updates: result.plan.updates })`.
5. Success: `onSelectFolder(result.plan.draggedFolderId)`; status `saved: "Folder order saved."`.
6. Failure: `onFoldersChange(previousFolders)` (rollback); status `error` with the thrown message.

The optimistic-state ownership stays where it is today: `FolderTree` receives `folders` + `onFoldersChange` + `onReorderStatus` as props; `ComponentLibraryManager` owns the canonical state. Do not move this into the new component.

---

## 5. Test cases for the new evaluator

Port/extend `tests/vitest/library-folder-reorder.test.ts` (same fixture: Structure ▸ Concrete, My Assemblies):

| Case | Input | Expect |
|---|---|---|
| Nest into folder | drag `folder-concrete`, target `folder-custom`, `inside` | ok; `targetParentId: "folder-custom"`; update `{ id: folder-concrete, parentId: folder-custom, sortOrder: 10 }` (mirrors existing test, line 83–110) |
| Top-level reorder (new) | drag `folder-custom`, target `folder-structure`, `before` | ok; `targetParentId: null`, `targetIndex: 0` |
| After-position | drag `folder-structure`, target `folder-custom`, `after` | no-op (already adjacent) — exercises same-parent index adjustment |
| Cycle | drag `folder-structure`, target `folder-concrete`, `inside` | `{ ok: false, code: "cycle" }` |
| No-op | drag `folder-concrete`, target `folder-concrete`'s current slot (`before` itself) | `{ ok: false, code: "no-op" }` or self-drop rejection |
| Synthetic root drag | drag root id | `{ ok: false, code: "synthetic-root-drag" }` |
| Inside synthetic root | drag `folder-concrete`, target root, `inside` | ok; `targetParentId: null`, appended last |
| Before/after synthetic root | drag any, target root, `before` | `{ ok: false, code: "unsupported-target" }` |

Component-resolution cases (pure function if extracted): folder target inside → F; folder target before/after → parent(F); component target → its parent; root → null.
