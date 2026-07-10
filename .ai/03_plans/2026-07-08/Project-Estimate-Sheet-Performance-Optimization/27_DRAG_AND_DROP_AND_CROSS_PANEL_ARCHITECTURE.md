# 27 - Drag-And-Drop And Cross-Panel Architecture

## Purpose

This document maps the drag-and-drop system and cross-panel coordination that the Project Estimate Sheet depends on. The sheet is a three-panel workspace (area tree / sheet / component library), and many user actions cross panel boundaries. This documents how that works.

This is a planning/reference document. It does not authorize code changes.

## Three-Panel Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ EstimateWorkspaceClient.tsx  (shell, SurfaceVariantProvider)     │
│                                                                  │
│ ┌──────────┐  ┌──────────────────────────┐  ┌──────────────────┐ │
│ │ Estimate │  │ EstimateSheetContent     │  │ EstimateRight    │ │
│ │ Sheet    │  │  (the sheet — branches,  │  │  Sidebar         │ │
│ │ Tree     │  │   rows, cells)           │  │  (component      │ │
│ │ (LEFT)   │  │  (MIDDLE)                │  │   library, RIGHT)│ │
│ └──────────┘  └──────────────────────────┘  └──────────────────┘ │
│                                                                  │
│ All three are dynamic() imports; sidebar lazy (no first-paint   │
│ block). Overlays (CommandPalette, AddComponentModal, etc.) are   │
│ dynamic + ssr:false + state-gated inside EstimateSheetContent.   │
└──────────────────────────────────────────────────────────────────┘
```

## Drag-And-Drop System

### Transport: native HTML5 drag + Zustand side-channel

HTML5 drag payloads are unreadable until drop, so a **Zustand side-channel store** (`estimate-workshop-drag.ts`) carries the drag context:

- **Originators** call `beginEstimateWorkshopDrag({ kind, ... })` on `dragstart`.
- **Consumers** read `useEstimateWorkshopDrag()` to conditionally render drop zones.
- **Clear**: `document`-level `dragend`/`drop` + `window` `keydown(Escape)` + `blur` listeners guarantee the store resets even on cancelled drags.

### Drag MIME Types

| MIME Type | Constant | Origin | Drop Effect |
|---|---|---|---|
| `application/x-archestimator-estimate-tree-item` | `ESTIMATE_TREE_DRAG_MIME_TYPE` (`drag-types.ts:1`) | Left tree node | Internal tree reorder |
| (row item) | `ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE` | Row in a table | Row reorder between areas |
| (library item) | `LIBRARY_ITEM_DRAG_MIME_TYPE` | Right sidebar / library | Insert library component as row |
| (component) | `ESTIMATE_COMPONENT_DRAG_MIME_TYPE` | Row component | Move component between rows (replace) |
| (template) | `ESTIMATE_TEMPLATE_DRAG_MIME_TYPE` | Templates browser / tree | Insert template/subtree |
| (project source) | `PROJECT_SOURCE_DRAG_MIME_TYPE` | Project sources browser | Insert reusable project source subtree |

### Drop Zones (`estimate-sheet/rows/drop-zones.tsx`)

| Component | Line | Trigger | Action |
|---|---|---|---|
| `ComponentDropTarget` | 135 | library-item OR row-item drag active | Per-node target; quiet "Add row" button at rest (`QuietAddRowButton`); swaps to `ActiveComponentDropZone` mid-drag with enter/leave counter |
| `TemplateDropZone` | 188 | template drag active | Per-node template target |
| `EstimateDropZone` | 29 | — | The dashed visual surface |

### Edge Auto-Scroll (`use-drag-edge-autoscroll.ts`)

`useDragEdgeAutoScroll(anchorRef, enabled)`:
- Attaches imperative `dragover`/`dragleave` listeners to the `[data-estimate-pointer-surface]` scroller.
- Runs a rAF loop scrolling at linearly-ramped speed (max 18px/frame) within 72px edge zones.
- `computeEdgeScrollSpeed` (line 16) is pure/deterministic for testability.
- Listeners attach to `document` for `dragend`/`drop` and `window` for `blur` to guarantee the loop stops.
- **Only the root branch enables it** (`branch.tsx:200`: `useDragEdgeAutoScroll(sectionRef, depth === 0)`).

Tested in `estimate-drag-edge-autoscroll.test.ts` (5) and `estimate-drag-edge-autoscroll-hook.tsx` (5).

## Cross-Panel Bridge (window events)

The three panels don't share direct props for cross-panel operations. Instead, the left tree dispatches **window events** that the middle sheet listens for:

| Event | Dispatcher | Listener | Routes to |
|---|---|---|---|
| `REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT` | `EstimateSheetTree.tsx` external drop | `EstimateSheetContent.tsx:2152-2181` | `moveRowItemToNode` |
| `ADD_LIBRARY_ITEM_EVENT` | left tree library-item drop | same listener | `insertLibraryItem` |
| `INSERT_ESTIMATE_TEMPLATE_EVENT` | left tree template drop | same listener | `insertTemplateIntoParent` / `insertTemplatesIntoParent` |
| `INSERT_PROJECT_SOURCE_EVENT` | left tree project-source drop | same listener | project source insertion |

This decoupling means:
- The left tree doesn't need to know about the sheet's internal mutation handlers.
- The sheet doesn't need to know which panel originated the drop.
- The right sidebar (component library) inserts via its own drag-and-drop directly onto the sheet's `ComponentDropTarget` components (not via window events) because it drags onto visible sheet DOM.

## Row-Item Drag-And-Drop (within and between areas)

In `row-table.tsx` (lines 421-460):
- Native HTML5 drag, sets `ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE`.
- Calls `beginEstimateWorkshopDrag({ kind: "estimate-row-item", ... })`.
- Drop targets compute `before`/`after` edge via `getEstimateRowDropEdge` (line 255).
- Calls `onMoveRowItem(rowItemId, targetNodeId, rowIndex+1 | rowIndex)`.
- `moveRowItemToNode` wraps the tree update in `flushSync` so the moved row's DOM appears before `requestPendingRowFocus` runs (otherwise the focus-into-row rAF loop races the render).

Tested in `estimate-component-drag.tsx` (31 tests), `estimate-tree-drag-over-perf.test.ts` (2), `estimate-workshop-drag.test.ts` (1).

## Component Move / Replace

- **Move component between rows**: `ESTIMATE_COMPONENT_DRAG_MIME_TYPE` → `onMoveComponent` → `moveEstimateRowComponentWithHistory` (swaps two rows' components).
- **Replace row's component with library item**: library-item drop on a row's material cell → `handleReplacementDrop` (`cells.tsx:1060`) → `replaceEstimateRowItemWithLibrary`.
- **Component drop on node**: `ComponentDropTarget` → insert as new row via `insertLibraryItem`.

## Selection Model

- **Bulk row selection**: `bulkSelectedRowIds` in the reducer state. `visibleSheetRowIds` (recursive walk) prunes stale selection ids when the displayed subtree changes.
- **Tree bulk selection**: `EstimateSheetTree.tsx` `buildEstimateTreeSelectionNodes` (line 441).
- Selection re-renders are isolated to the affected table (tested in `estimate-sheet-render-relief.test.tsx`).

## Command Palette

`CommandPalette` (dynamic, ssr:false, state-gated in `EstimateSheetContent`). Provides keyboard-driven insert/navigation. Opening it re-renders nothing in the sheet body (tested in render-relief suite).

## Collaboration Overlay Isolation

Remote cursors (`useEstimateCursorCollaboration`) render overlays **without re-rendering the sheet or any row table**. Tested in `estimate-sheet-cursor-isolation.test.tsx` (3 tests):
- Incoming cursors render overlay without sheet/row re-render.
- Focus + typed value survive cursor broadcasts mid-typing.
- Overlay clears when cursor list empties without touching row tables.

**Gap**: no high-frequency / N-collaborator stress test (only 1-3 cursors in tests).

## Performance Implications Of DnD

| Behavior | Cost | Notes |
|---|---|---|
| Drag start/end | all mounted drop targets + branches re-render | intentional (reveal/hide zones); `useEstimateWorkshopDrag()` subscription |
| Drop zone rendering | O(visible branches) | only while drag active |
| Edge auto-scroll rAF | 1 rAF loop, only root branch | max 18px/frame |
| Row move | O(source + target) + flushSync | focus-correct |
| Cross-panel event dispatch | O(1) | window event |

**Risk**: `branch.tsx:245` calls `setState` during render (`if (!templateDragActive && templateDragOverCount !== 0) setTemplateDragOverCount(0)`) — a self-correcting guard for cancelled drags that forces a re-render when a drag ends. React tolerates this but it's a re-render trigger.

## Test Coverage

| File | Tests | Covers |
|---|---|---|
| `estimate-component-drag.tsx` | 31 | component move/replace drag |
| `estimate-sheet-tree-dnd.tsx` | 13 | tree internal reorder DnD |
| `estimate-template-drop-zones.test.tsx` | 9 | template drop zones |
| `estimate-drag-edge-autoscroll.test.ts` | 5 | edge scroll speed calc |
| `estimate-drag-edge-autoscroll-hook.tsx` | 5 | edge scroll hook |
| `estimate-tree-drag-over-perf.test.ts` | 2 | drag-over perf |
| `estimate-workshop-drag.test.ts` | 1 | drag side-channel store |
| `estimate-sheet-render-relief.test.tsx` | 6 | selection isolation |
| `estimate-sheet-cursor-isolation.test.tsx` | 3 | collaboration overlay isolation |

**Gap**: no browser proof for DnD flows (all jsdom). Canonical `UNIT-002` owns pointer/keyboard browser proof and `UNIT-010` reruns it after activated changes.

## Verification

- Planning provenance: source-grounded audit of `drop-zones.tsx`, `use-drag-edge-autoscroll.ts`, `branch.tsx`, `row-table.tsx`, `cells.tsx`, `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx`, and `estimate-workshop-drag.ts`.
