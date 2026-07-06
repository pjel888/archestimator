"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useReducer,
  useRef,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  type RefCallback,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CaretDown,
  CaretRight,
  DotsSixVertical,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";

// ─── Types ───────────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  label: string;
  /** Accessible row name; defaults to the rendered row content. */
  ariaLabel?: string;
  children?: TreeNode[];
  draggable?: boolean;
  selectable?: boolean;
  icon?: ReactNode;
  /** Explicit folder hint: `false` forces folder treatment even with no children. */
  isLeaf?: boolean;
  /**
   * Accent the disclosure caret (orange) to flag a meaningful node — e.g. an
   * estimate area that directly holds components. Expandable nodes tint their
   * caret; leaf nodes render a static accented caret marker in the reserved
   * caret slot. Trees that don't set this render the default (muted) caret.
   */
  accent?: boolean;
  /** Extra classes applied to this node's row container. */
  rowClassName?: string;
  data?: Record<string, unknown>;
}

export type TreeDropPosition = "before" | "after" | "inside";

export type TreeRootDropEdge = "top" | "bottom";

export type TreeDragActivation = "row" | "handle";

/** Horizontal indent applied per depth level, in pixels. */
const TREE_INDENT_STEP = 16;

/**
 * Canonical size for icons inside tree rows, in pixels. Every tree consumer
 * (sheets tree, components tree, templates tree) must pass this to its row
 * icons so the panels read at one scale.
 */
export const TREE_ROW_ICON_SIZE = 12;

const EMPTY_TREE_ID_LIST: string[] = [];

type TreeDropTarget = { id: string; position: TreeDropPosition } | null;

type TreeInvalidDropTarget = { id: string; position: TreeDropPosition; reason: string } | null;

type TreeState = {
  uncontrolledExpanded: Set<string>;
  dragSourceId: string | null;
  dropTarget: TreeDropTarget;
  invalidDropTarget: TreeInvalidDropTarget;
  activeRootDropEdge: TreeRootDropEdge | null;
  focusId: string | null;
};

type TreeStateAction =
  | { type: "setUncontrolledExpanded"; value: SetStateAction<Set<string>> }
  | { type: "setDragSourceId"; value: SetStateAction<string | null> }
  | { type: "setDropTarget"; value: SetStateAction<TreeDropTarget> }
  | { type: "setInvalidDropTarget"; value: SetStateAction<TreeInvalidDropTarget> }
  | { type: "setActiveRootDropEdge"; value: SetStateAction<TreeRootDropEdge | null> }
  | { type: "setFocusId"; value: SetStateAction<string | null> }
  | { type: "clearDragState" }
  | { type: "clearDropIndicators" };

function resolveTreeStateAction<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === "function" ? (value as (currentValue: T) => T)(current) : value;
}

function createInitialTreeState(defaultExpandedIds: readonly string[]): TreeState {
  return {
    uncontrolledExpanded: new Set(defaultExpandedIds),
    dragSourceId: null,
    dropTarget: null,
    invalidDropTarget: null,
    activeRootDropEdge: null,
    focusId: null,
  };
}

function treeReducer(state: TreeState, action: TreeStateAction): TreeState {
  switch (action.type) {
    case "setUncontrolledExpanded": {
      const uncontrolledExpanded = resolveTreeStateAction(action.value, state.uncontrolledExpanded);
      return uncontrolledExpanded === state.uncontrolledExpanded ? state : { ...state, uncontrolledExpanded };
    }
    case "setDragSourceId": {
      const dragSourceId = resolveTreeStateAction(action.value, state.dragSourceId);
      return dragSourceId === state.dragSourceId ? state : { ...state, dragSourceId };
    }
    case "setDropTarget": {
      const dropTarget = resolveTreeStateAction(action.value, state.dropTarget);
      return dropTarget === state.dropTarget ? state : { ...state, dropTarget };
    }
    case "setInvalidDropTarget": {
      const invalidDropTarget = resolveTreeStateAction(action.value, state.invalidDropTarget);
      return invalidDropTarget === state.invalidDropTarget ? state : { ...state, invalidDropTarget };
    }
    case "setActiveRootDropEdge": {
      const activeRootDropEdge = resolveTreeStateAction(action.value, state.activeRootDropEdge);
      return activeRootDropEdge === state.activeRootDropEdge ? state : { ...state, activeRootDropEdge };
    }
    case "setFocusId": {
      const focusId = resolveTreeStateAction(action.value, state.focusId);
      return focusId === state.focusId ? state : { ...state, focusId };
    }
    case "clearDragState": {
      if (!state.dragSourceId && !state.dropTarget && !state.invalidDropTarget && !state.activeRootDropEdge) return state;
      return { ...state, dragSourceId: null, dropTarget: null, invalidDropTarget: null, activeRootDropEdge: null };
    }
    case "clearDropIndicators": {
      if (!state.dropTarget && !state.invalidDropTarget && !state.activeRootDropEdge) return state;
      return { ...state, dropTarget: null, invalidDropTarget: null, activeRootDropEdge: null };
    }
  }
}

/** Computed per-row state passed to `renderItem`. */
export interface TreeItemState {
  node: TreeNode;
  depth: number;
  isFolder: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  /** Unselected node with at least one selected descendant. */
  isIndeterminate: boolean;
  /** Matches the `currentId` prop (aria-current="page"). */
  isCurrent: boolean;
  isFocused: boolean;
  isDragSource: boolean;
  isDropTarget: boolean;
  isInvalidDropTarget: boolean;
  dropPosition: TreeDropPosition | null;
  dropDisabledReason: string | null;
  setSize: number;
  posInSet: number;
  toggle: () => void;
}

/** DOM wiring to spread onto the row element rendered by `renderItem`. */
export type TreeRowDomProps = {
  role: "treeitem";
  "aria-level": number;
  "aria-setsize": number;
  "aria-posinset": number;
  "aria-expanded"?: boolean;
  "aria-selected"?: boolean;
  "aria-current"?: "page";
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-grabbed"?: boolean;
  "aria-dropeffect"?: "move" | "copy";
  tabIndex: number;
  draggable: boolean;
  ref: RefCallback<HTMLElement>;
  "data-tree-row": string;
  "data-tree-drag-activation": TreeDragActivation;
  "data-tree-drop-state"?: "valid" | "invalid";
  "data-tree-drop-position"?: TreeDropPosition;
  "data-tree-drop-reason"?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDoubleClick?: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: (event: DragEvent<HTMLElement>) => void;
};

export type TreeDragHandleDomProps = {
  "aria-label": string;
  "aria-disabled"?: true;
  draggable: boolean;
  "data-tree-drag-handle": string;
  "data-tree-drag-disabled-reason"?: string;
  title?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: (event: DragEvent<HTMLElement>) => void;
};

export type TreeRootDropZonesOption =
  | boolean
  | {
      edges?: readonly TreeRootDropEdge[];
      className?: (edge: TreeRootDropEdge, active: boolean) => string;
      render?: (edge: TreeRootDropEdge, active: boolean) => ReactNode;
    };

export interface TreeExternalDropOptions {
  /** dataTransfer MIME types accepted from outside this tree instance. */
  types: string[];
  /** DataTransfer drop effect for an accepted external drop. Defaults to copy. */
  dropEffect?: (
    types: readonly string[],
    targetId: string,
    position: TreeDropPosition,
    node: TreeNode
  ) => DataTransfer["dropEffect"];
  /**
   * Domain validation for an external payload hovering a row. Drag payloads
   * are unreadable during dragover (HTML5 DnD protected mode), so validation
   * can only key off the payload's MIME types and the target row.
   */
  canDrop: (
    types: readonly string[],
    targetId: string,
    position: TreeDropPosition,
    node: TreeNode
  ) => boolean;
  /** Apply the drop; read the payload from `event.dataTransfer`. */
  onDrop: (
    event: DragEvent<HTMLElement>,
    targetId: string,
    position: TreeDropPosition,
    node: TreeNode
  ) => void;
}

export interface TreeVirtualizationOptions {
  enabled?: boolean;
  minRows?: number;
  estimateRowHeight?: number;
  overscan?: number;
  useFlushSync?: boolean;
  initialViewportHeight?: number;
  getScrollElement?: () => HTMLElement | null;
}

export interface TreeProps {
  nodes: TreeNode[];
  /** Accessible name for the tree container. */
  ariaLabel?: string;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  /**
   * Override checkbox toggling with the requested next state, e.g. to apply
   * cascade selection. When set, `onSelectionChange` is not called for
   * checkbox or Space-key toggles; update `selectedIds` yourself.
   */
  onCheckboxToggle?: (nodeId: string, checked: boolean, node: TreeNode) => void;
  /** Row marked as the user's current location (aria-current="page"), independent of checkbox selection. */
  currentId?: string | null;
  onDrop?: (draggedId: string, targetId: string, position: TreeDropPosition) => void;
  /** Domain validation for drops; the tree already blocks self/descendant drops. */
  canDrop?: (draggedId: string, targetId: string, position: TreeDropPosition) => boolean;
  /** Per-node drag gate, combined with `node.draggable !== false`. */
  canDrag?: (node: TreeNode) => boolean;
  /** Human-readable reason used when `canDrag` blocks an otherwise draggable node. */
  getDragDisabledReason?: (node: TreeNode) => string | null;
  /**
   * Fires after the default drag payload (`text/plain` = node id, move
   * effect) is stamped, so consumers can replace the payload, effect, or
   * drag image — e.g. dragging library items out as copy with JSON data.
   */
  onNodeDragStart?: (nodeId: string, event: DragEvent<HTMLElement>) => void;
  onNodeDragEnd?: (nodeId: string) => void;
  onToggle?: (nodeId: string, expanded: boolean) => void;
  onContextMenu?: (nodeId: string, node: TreeNode, event: MouseEvent) => void;
  /** Keyboard equivalent for row rename actions, usually F2. */
  onRenameShortcut?: (nodeId: string, node: TreeNode, event: KeyboardEvent<HTMLDivElement>) => void;
  /** Keyboard equivalent for opening a row context/action menu, usually Shift+F10 or ContextMenu. */
  onKeyboardContextMenu?: (nodeId: string, node: TreeNode, event: KeyboardEvent<HTMLDivElement>) => void;
  onRowClick?: (nodeId: string, node: TreeNode) => void;
  onRowDoubleClick?: (nodeId: string, node: TreeNode) => void;
  /** Controlled: currently expanded node IDs */
  expandedIds?: string[];
  /** Controlled: called when expandedIds should change */
  onExpandedChange?: (expandedIds: string[]) => void;
  /** Uncontrolled: initially expanded node IDs */
  defaultExpandedIds?: string[];
  draggable?: boolean;
  /**
   * Pointer drag source. Defaults to row for backwards compatibility; handle
   * mode leaves row click/focus/context-menu behavior untouched and starts
   * reorders only from the grip.
   */
  dragActivation?: TreeDragActivation;
  selectable?: boolean;
  expandable?: boolean;
  /**
   * Allow "inside" (containment) drops on leaf rows, not just folders. Leaves
   * normally only accept before/after band drops; set this when any node can
   * gain children (e.g. the unified estimate tree, where a childless node can
   * still receive a dropped node, template, or subtree). Defaults to false so
   * existing consumers keep folder-only containment.
   */
  allowInsideOnLeaves?: boolean;
  /** Extra MIME type stamped on drag data, for cross-surface drop targeting. */
  dragDataType?: string;
  /**
   * Accept drags that originate outside this tree (other trees, panels).
   * Independent of `draggable`/`onDrop`, which only govern intra-tree moves.
   * Rows reuse the same before/after/inside indicators; "inside" drops expand
   * collapsed folders so the result stays visible.
   */
  externalDrop?: TreeExternalDropOptions;
  /**
   * Drop zones above/below the rows for moving nodes before the first or
   * after the last root item. Maps to `onDrop(draggedId, firstOrLastRootId,
   * "before" | "after")`. Only rendered while `draggable`.
   */
  rootDropZones?: TreeRootDropZonesOption;
  className?: string;
  emptyState?: ReactNode;
  /**
   * Keep the drag/select rail space open regardless of hover or focus.
   * Hover and focus-within both drop while an overlay owns the pointer and
   * focus (e.g. a context menu portal), so consumers pin the rails for the
   * overlay's lifetime to stop rows shifting under it. Selection already
   * pins the rails internally.
  */
  railsPinned?: boolean;
  /** Shows the selected-row fill. Disable when the left rail/current marker is the intended signal. */
  showSelectedBackground?: boolean;
  /** Custom content for the label area of the default row. */
  renderRow?: (node: TreeNode, depth: number, isSelected: boolean, isExpanded: boolean) => ReactNode;
  /** Horizontal indent applied per depth level. Defaults to `TREE_INDENT_STEP`. */
  indentStep?: number;
  /** Full row control: replaces the default row entirely. Spread `rowProps` onto your row element. */
  renderItem?: (state: TreeItemState, rowProps: TreeRowDomProps, dragHandleProps: TreeDragHandleDomProps) => ReactNode;
  /** Optional default-off virtual rendering for very large flat trees. */
  virtualization?: TreeVirtualizationOptions;
  ref?: Ref<HTMLDivElement>;
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface FlatNode {
  id: string;
  node: TreeNode;
  depth: number;
  isFolder: boolean;
  isExpanded: boolean;
  setSize: number;
  posInSet: number;
}

function isFolderNode(node: TreeNode): boolean {
  if (node.isLeaf !== undefined) return !node.isLeaf;
  return Boolean(node.children && node.children.length > 0);
}

/** Flatten tree into visible nodes (expanded children included) */
function flattenTree(
  nodes: TreeNode[],
  expandedIds: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = [];
  nodes.forEach((node, index) => {
    const isExpanded = expandedIds.has(node.id);
    result.push({
      id: node.id,
      node,
      depth,
      isFolder: isFolderNode(node),
      isExpanded,
      setSize: nodes.length,
      posInSet: index + 1,
    });
    if (node.children && node.children.length > 0 && isExpanded) {
      result.push(...flattenTree(node.children, expandedIds, depth + 1));
    }
  });
  return result;
}

function indexTree(nodes: TreeNode[], into = new Map<string, TreeNode>()): Map<string, TreeNode> {
  for (const node of nodes) {
    into.set(node.id, node);
    if (node.children?.length) indexTree(node.children, into);
  }
  return into;
}

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return element;
}

function containsDescendant(node: TreeNode, targetId: string): boolean {
  for (const child of node.children ?? []) {
    if (child.id === targetId || containsDescendant(child, targetId)) return true;
  }
  return false;
}

function normalizeTypeaheadLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable='true']")) return true;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function readDropPositionFromEvent(
  event: DragEvent<HTMLElement>,
  allowInside: boolean
): TreeDropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const hasUsableRect = rect.height > 0;
  const clientY = hasUsableRect && Number.isFinite(event.clientY)
    ? event.clientY
    : rect.top + rect.height / 2;
  const ratio = hasUsableRect ? (clientY - rect.top) / rect.height : 0.5;
  if (allowInside) {
    if (ratio < 0.25) return "before";
    if (ratio > 0.75) return "after";
    return "inside";
  }
  return ratio < 0.5 ? "before" : "after";
}

// ─── Default row ─────────────────────────────────────────────────────

interface DefaultTreeRowProps {
  state: TreeItemState;
  rowProps: TreeRowDomProps;
  dragHandleProps: TreeDragHandleDomProps;
  dragActivation: TreeDragActivation;
  draggable: boolean;
  selectable: boolean;
  expandable: boolean;
  nodeDragHandleVisible: boolean;
  /** Keep the affordance rails open (e.g. while a selection exists). */
  railsPinned: boolean;
  showSelectedBackground: boolean;
  indentStep: number;
  onCheckboxClick: (nodeId: string, event: MouseEvent<HTMLInputElement>) => void;
  rowRenderer?: (node: TreeNode, depth: number, isSelected: boolean, isExpanded: boolean) => ReactNode;
}

const DefaultTreeRow = memo(function DefaultTreeRow({
  state,
  rowProps,
  dragHandleProps,
  dragActivation,
  draggable,
  selectable,
  expandable,
  nodeDragHandleVisible,
  railsPinned,
  showSelectedBackground,
  indentStep,
  onCheckboxClick,
  rowRenderer,
}: DefaultTreeRowProps) {
  const {
    node,
    depth,
    isFolder,
    isExpanded,
    isSelected,
    isIndeterminate,
    isCurrent,
    isDropTarget,
    isInvalidDropTarget,
    dropPosition,
  } = state;
  const renderedDragHandleProps =
    dragActivation === "handle"
      ? dragHandleProps
      : {
          "aria-label": dragHandleProps["aria-label"],
          "data-tree-drag-handle": node.id,
          onClick: dragHandleProps.onClick,
        };
  const dragHandleDisabled = dragActivation === "handle" && dragHandleProps["aria-disabled"] === true;

  return (
    <div className="select-none">
      <div
        {...rowProps}
        className={cn(
          // Named group keeps hover reveals row-scoped even when the tree sits
          // inside an ancestor that also uses the plain `group` class.
          "group/tree-row flex min-h-7 items-center px-1 text-[10px] text-ink tracking-normal transition-colors outline-none",
          "border border-transparent",
          node.rowClassName,
          showSelectedBackground && isSelected && "bg-accentSoft",
          (isCurrent || state.isFocused) && "border-l-focus",
          state.isDragSource && "opacity-70",
          isDropTarget && dropPosition === "inside" && "bg-surfaceMuted",
          isDropTarget && dropPosition === "before" && "border-t-2 border-t-primary",
          isDropTarget && dropPosition === "after" && "border-b-2 border-b-primary",
          isInvalidDropTarget && "border-danger/50 bg-dangerSoft/40",
          "hover:bg-surfaceMuted cursor-pointer"
        )}
      >
        {/* Left rail: drag handle and checkbox sit at the row edge, outside
            the depth indent. The rails take no width at rest so content owns
            the full left edge; they open when the pointer or focus is inside
            the nearest `group/tree` scope (or while a selection exists), and
            the icons themselves only show on the hovered row. The tree root
            carries `group/tree` by default; panels can also place that class
            on a wrapping sidebar so toolbar interactions outside the rows
            keep the rail space open. Slots render on every row so siblings
            with mixed capabilities still align. */}
        {draggable && (
          <span
            data-tree-rail="drag"
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden",
              "transition-[width,margin] duration-150 motion-reduce:transition-none",
              railsPinned
                ? "mr-1 w-4"
                : "mr-0 w-0 group-hover/tree:mr-1 group-hover/tree:w-4 group-focus-within/tree:mr-1 group-focus-within/tree:w-4",
            )}
          >
            {nodeDragHandleVisible && (
              <span
                {...renderedDragHandleProps}
                className={cn(
                  "flex items-center justify-center opacity-0 transition-opacity group-hover/tree-row:opacity-100",
                  dragHandleDisabled ? "cursor-not-allowed" : "cursor-grab",
                )}
              >
                <DotsSixVertical weight="regular" className="h-3.5 w-3.5 text-muted" />
              </span>
            )}
          </span>
        )}

        {selectable && (
          <span
            data-tree-rail="select"
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden",
              "transition-[width,margin] duration-150 motion-reduce:transition-none",
              railsPinned
                ? "mr-1.5 w-3.5"
                : "mr-0 w-0 group-hover/tree:mr-1.5 group-hover/tree:w-3.5 group-focus-within/tree:mr-1.5 group-focus-within/tree:w-3.5",
            )}
          >
            {node.selectable !== false && (
              <SelectionCheckbox
                checked={isSelected}
                indeterminate={isIndeterminate}
                ariaLabel={`Select ${node.label}`}
                tabIndex={-1}
                onClick={(e) => onCheckboxClick(node.id, e)}
              />
            )}
          </span>
        )}

        {/* Depth indent applies to the content only, never the rail. */}
        {depth > 0 && (
          <span
            aria-hidden="true"
            data-tree-indent
            className="shrink-0"
            style={{ width: `${depth * indentStep}px` }}
          />
        )}

        {/* Expand/collapse caret */}
        {expandable && isFolder && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              state.toggle();
            }}
            className="shrink-0 mr-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-xs hover:bg-[#E8E8E8] cursor-pointer transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <CaretDown weight="regular" className="h-2.5 w-2.5 text-tertiary" />
            ) : (
              <CaretRight weight="regular" className="h-2.5 w-2.5 text-tertiary" />
            )}
          </button>
        )}

        {expandable && !isFolder && <span className="w-4 shrink-0" />}

        {node.accent !== undefined ? (
          // Occupancy dot (after the caret, before the label): olive green iff
          // this node directly holds components, muted otherwise. Renders on
          // every row — folder or leaf — so the cue lives in one consistent column.
          <span className="shrink-0 mr-1.5 flex items-center" aria-hidden="true">
            <span
              data-occupancy-dot=""
              className={cn("size-[3px] rounded-xs", node.accent ? "bg-[#6b8e23] opacity-70" : "bg-divider")}
            />
          </span>
        ) : node.icon ? (
          <span className="shrink-0 mr-1.5 flex items-center">{node.icon}</span>
        ) : null}

        {rowRenderer ? (
          rowRenderer(node, depth, isSelected, isExpanded)
        ) : (
          <span className="truncate">{node.label}</span>
        )}
      </div>
    </div>
  );
});

interface TreeFlatRowProps {
  flat: FlatNode;
  buildItemState: (flat: FlatNode) => TreeItemState;
  buildRowProps: (flat: FlatNode) => TreeRowDomProps;
  buildDragHandleProps: (flat: FlatNode) => TreeDragHandleDomProps;
  dragActivation: TreeDragActivation;
  draggable: boolean;
  selectable: boolean;
  expandable: boolean;
  nodeDragHandleVisible: boolean;
  railsPinned: boolean;
  showSelectedBackground: boolean;
  indentStep: number;
  onCheckboxClick: (nodeId: string, event: MouseEvent<HTMLInputElement>) => void;
  rowRenderer?: TreeProps["renderRow"];
  itemRenderer?: TreeProps["renderItem"];
}

const TreeFlatRow = memo(function TreeFlatRow({
  flat,
  buildItemState,
  buildRowProps,
  buildDragHandleProps,
  dragActivation,
  draggable,
  selectable,
  expandable,
  nodeDragHandleVisible,
  railsPinned,
  showSelectedBackground,
  indentStep,
  onCheckboxClick,
  rowRenderer,
  itemRenderer,
}: TreeFlatRowProps) {
  const state = buildItemState(flat);
  const rowProps = buildRowProps(flat);
  const dragHandleProps = buildDragHandleProps(flat);

  if (itemRenderer) {
    return <Fragment>{itemRenderer(state, rowProps, dragHandleProps)}</Fragment>;
  }

  return (
    <DefaultTreeRow
      state={state}
      rowProps={rowProps}
      dragHandleProps={dragHandleProps}
      dragActivation={dragActivation}
      draggable={draggable}
      selectable={selectable}
      expandable={expandable}
      nodeDragHandleVisible={nodeDragHandleVisible}
      railsPinned={railsPinned}
      showSelectedBackground={showSelectedBackground}
      indentStep={indentStep}
      onCheckboxClick={onCheckboxClick}
      rowRenderer={rowRenderer}
    />
  );
});

// ─── Component ───────────────────────────────────────────────────────

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function Tree({
      nodes,
      ariaLabel,
      selectedIds = EMPTY_TREE_ID_LIST,
      onSelectionChange,
      onCheckboxToggle,
      currentId,
      onDrop,
      canDrop,
      canDrag,
      getDragDisabledReason,
      onNodeDragStart,
      onNodeDragEnd,
      onToggle,
      onContextMenu,
      onRenameShortcut,
      onKeyboardContextMenu,
      onRowClick,
      onRowDoubleClick,
      expandedIds: controlledExpandedIds,
      onExpandedChange,
      defaultExpandedIds = EMPTY_TREE_ID_LIST,
      draggable = false,
      dragActivation = "row",
      selectable = false,
      expandable = true,
      allowInsideOnLeaves = false,
      dragDataType,
      externalDrop,
      rootDropZones,
      className,
      emptyState,
      railsPinned = false,
      showSelectedBackground = true,
      renderRow,
      indentStep = TREE_INDENT_STEP,
      renderItem,
      virtualization,
      ref,
}: TreeProps) {
    // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: controlled/uncontrolled setup is render state, not effect-driven event logic.
    const isControlled = controlledExpandedIds !== undefined;
    const treeRootRef = useRef<HTMLDivElement | null>(null);
    const dropStatusId = useId();
    useImperativeHandle(ref, () => treeRootRef.current as HTMLDivElement, []);

    const [treeState, dispatchTreeState] = useReducer(
      treeReducer,
      // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: reducer initializer seed, not effect-driven event logic.
      defaultExpandedIds,
      createInitialTreeState
    );
    const {
      uncontrolledExpanded,
      dragSourceId,
      dropTarget,
      invalidDropTarget,
      activeRootDropEdge,
      focusId,
    } = treeState;

    const expandedSet = useMemo(
      () => (isControlled ? new Set(controlledExpandedIds!) : uncontrolledExpanded),
      [isControlled, controlledExpandedIds, uncontrolledExpanded]
    );

    const rowElementsRef = useRef<Map<string, HTMLElement>>(null!);
    if (rowElementsRef.current === null) rowElementsRef.current = new Map();
    const typeaheadRef = useRef<{ query: string; lastTypedAt: number }>({ query: "", lastTypedAt: 0 });

    const flatNodes = useMemo(
      // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: pure tree flattening in render memo, not effect-driven event logic.
      () => flattenTree(nodes, expandedSet),
      [nodes, expandedSet]
    );
    const virtualMinRows = virtualization?.minRows ?? 150;
    const virtualEnabled = Boolean(virtualization?.enabled && flatNodes.length >= virtualMinRows);
    const rowVirtualizer = useVirtualizer({
      count: flatNodes.length,
      getScrollElement: () => virtualization?.getScrollElement?.() ?? findScrollParent(treeRootRef.current),
      estimateSize: () => virtualization?.estimateRowHeight ?? 28,
      overscan: virtualization?.overscan ?? 8,
      getItemKey: (index) => flatNodes[index]?.id ?? index,
      enabled: virtualEnabled,
      useFlushSync: virtualization?.useFlushSync ?? false,
      initialRect: { height: virtualization?.initialViewportHeight ?? 480, width: 0 },
    });

    const nodeIndex = useMemo(() => indexTree(nodes), [nodes]);

    const focusFlatNode = useCallback(
      (index: number) => {
        const nextId = flatNodes[index]?.id ?? null;
        if (nextId && virtualEnabled) rowVirtualizer.scrollToIndex(index, { align: "auto" });
        dispatchTreeState({ type: "setFocusId", value: nextId });
      },
      [flatNodes, rowVirtualizer, virtualEnabled]
    );

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    // Unselected nodes with at least one selected descendant render as
    // indeterminate checkboxes.
    const indeterminateIds = useMemo(() => {
      const result = new Set<string>();
      if (!selectable || selectedSet.size === 0) return result;
      const visit = (node: TreeNode): boolean => {
        let anySelected = false;
        for (const child of node.children ?? []) {
          const childHasSelection = visit(child) || selectedSet.has(child.id);
          anySelected = anySelected || childHasSelection;
        }
        if (anySelected && !selectedSet.has(node.id)) result.add(node.id);
        return anySelected;
      };
      nodes.forEach(visit);
      return result;
    }, [selectable, selectedSet, nodes]);

    // Roving tabindex target: explicit focus, else the current row, else
    // current selection, else first row.
    const effectiveFocusId = useMemo(() => {
      if (focusId && flatNodes.some((fn) => fn.id === focusId)) return focusId;
      if (currentId && flatNodes.some((fn) => fn.id === currentId)) return currentId;
      const selected = selectedIds.find((id) => flatNodes.some((fn) => fn.id === id));
      return selected ?? flatNodes[0]?.id ?? null;
    }, [focusId, flatNodes, currentId, selectedIds]);

    const handleToggle = useCallback(
      (nodeId: string) => {
        if (isControlled) {
          const next = new Set(controlledExpandedIds);
          if (next.has(nodeId)) {
            next.delete(nodeId);
            onToggle?.(nodeId, false);
          } else {
            next.add(nodeId);
            onToggle?.(nodeId, true);
          }
          onExpandedChange?.(Array.from(next));
        } else {
          dispatchTreeState({ type: "setUncontrolledExpanded", value: (prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
              next.delete(nodeId);
              onToggle?.(nodeId, false);
            } else {
              next.add(nodeId);
              onToggle?.(nodeId, true);
            }
            return next;
          } });
        }
      },
      [isControlled, controlledExpandedIds, onExpandedChange, onToggle]
    );

    const triggerSelection = useCallback(
      (nodeId: string, multi: boolean) => {
        if (!selectable) return;
        if (onCheckboxToggle) {
          const node = nodeIndex.get(nodeId);
          if (node) onCheckboxToggle(nodeId, !selectedIds.includes(nodeId), node);
          return;
        }
        if (!onSelectionChange) return;
        const isSelected = selectedIds.includes(nodeId);
        if (multi) {
          onSelectionChange(
            isSelected
              ? selectedIds.filter((id) => id !== nodeId)
              : [...selectedIds, nodeId]
          );
        } else {
          onSelectionChange(isSelected ? [] : [nodeId]);
        }
      },
      [selectable, selectedIds, onSelectionChange, onCheckboxToggle, nodeIndex]
    );

    // ─── Drag/drop ─────────────────────────────────────────────────

    const isNodeDragEligible = useCallback(
      (node: TreeNode) => draggable && node.draggable !== false,
      [draggable]
    );

    const isNodeDraggable = useCallback(
      (node: TreeNode) => {
        if (!isNodeDragEligible(node)) return false;
        return canDrag ? canDrag(node) : true;
      },
      [isNodeDragEligible, canDrag]
    );

    const getNodeDragDisabledReason = useCallback(
      (node: TreeNode) => {
        if (!isNodeDragEligible(node) || isNodeDraggable(node)) return null;
        return getDragDisabledReason?.(node) ?? "Drag is not available for this item.";
      },
      [getDragDisabledReason, isNodeDragEligible, isNodeDraggable]
    );

    const readDraggedId = useCallback(
      (event: DragEvent<HTMLElement>) => {
        if (dragSourceId) return dragSourceId;
        const fromCustomType = dragDataType ? event.dataTransfer?.getData(dragDataType) : "";
        return fromCustomType || event.dataTransfer?.getData("text/plain") || null;
      },
      [dragSourceId, dragDataType]
    );

    const getDropDisabledReason = useCallback(
      (draggedId: string, targetId: string, position: TreeDropPosition) => {
        if (draggedId === targetId) return "Cannot drop a node onto itself.";
        const draggedNode = nodeIndex.get(draggedId);
        if (!draggedNode) return "Drag source is unavailable.";
        if (!nodeIndex.has(targetId)) return "Drop target is unavailable.";
        if (containsDescendant(draggedNode, targetId)) return "Cannot move a node inside its own descendant.";
        if (canDrop && !canDrop(draggedId, targetId, position)) return "Drop is not allowed here.";
        return null;
      },
      [nodeIndex, canDrop]
    );

    const isDropAllowed = useCallback(
      (draggedId: string, targetId: string, position: TreeDropPosition) =>
        getDropDisabledReason(draggedId, targetId, position) === null,
      [getDropDisabledReason]
    );

    const clearDragState = useCallback(() => {
      dispatchTreeState({ type: "clearDragState" });
    }, []);

    // ─── External drops (payloads from other surfaces) ─────────────

    /**
     * MIME types of an external drag hovering this tree, or null when the
     * drag is internal (this tree set `dragSourceId`) or carries none of the
     * accepted types.
     */
    const readExternalDragTypes = useCallback(
      (event: DragEvent<HTMLElement>): readonly string[] | null => {
        if (!externalDrop || dragSourceId) return null;
        const eventTypes = event.dataTransfer?.types;
        if (!eventTypes) return null;
        const matched = externalDrop.types.filter((type) => eventTypes.includes(type));
        return matched.length > 0 ? matched : null;
      },
      [externalDrop, dragSourceId]
    );

    /**
     * Resolve where an external payload hovering `flat` may land: the
     * pointer-band position first, then "inside" as a fallback so rows whose
     * domain only accepts containment (e.g. templates into groups) light up
     * across the whole row instead of dead-zoning the outer bands.
     */
    const resolveExternalDropIntent = useCallback(
      (
        flat: FlatNode,
        event: DragEvent<HTMLElement>,
        types: readonly string[]
      ): { id: string; position: TreeDropPosition } | null => {
        if (!externalDrop) return null;
        const banded = readDropPositionFromEvent(event, flat.isFolder || allowInsideOnLeaves);
        const candidates: TreeDropPosition[] = banded === "inside" ? ["inside"] : [banded, "inside"];
        for (const position of candidates) {
          if (externalDrop.canDrop(types, flat.id, position, flat.node)) {
            return { id: flat.id, position };
          }
        }
        return null;
      },
      [externalDrop, allowInsideOnLeaves]
    );

    // External drags end outside this tree's rows (drop elsewhere, Escape),
    // so row-level dragleave/drop cannot be relied on to clear the indicator.
    useEffect(() => {
      if (!externalDrop) return undefined;
      const handleDragFinished = () => {
        dispatchTreeState({ type: "clearDropIndicators" });
      };
      window.addEventListener("dragend", handleDragFinished);
      window.addEventListener("drop", handleDragFinished);
      return () => {
        window.removeEventListener("dragend", handleDragFinished);
        window.removeEventListener("drop", handleDragFinished);
      };
    }, [externalDrop]);

    const handleDragStart = useCallback(
      (flat: FlatNode, event: DragEvent<HTMLElement>) => {
        if (!isNodeDraggable(flat.node)) {
          event.preventDefault();
          return;
        }
        event.dataTransfer?.setData("text/plain", flat.id);
        if (dragDataType) event.dataTransfer?.setData(dragDataType, flat.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        dispatchTreeState({ type: "setDragSourceId", value: flat.id });
        onNodeDragStart?.(flat.id, event);
      },
      [isNodeDraggable, dragDataType, onNodeDragStart]
    );

    /**
     * Resolve where a hover over `flat` would drop. The bottom band of an
     * expanded folder with visible children remaps to "before its first
     * child": that is exactly where the indicator line renders, so the drop
     * lands where the line shows instead of after the whole subtree.
     */
    const resolveDropIntent = useCallback(
      (flat: FlatNode, event: DragEvent<HTMLElement>): { id: string; position: TreeDropPosition } => {
        const position = readDropPositionFromEvent(event, flat.isFolder || allowInsideOnLeaves);
        const firstChildId = flat.node.children?.[0]?.id;
        if (position === "after" && flat.isFolder && flat.isExpanded && firstChildId) {
          return { id: firstChildId, position: "before" };
        }
        return { id: flat.id, position };
      },
      [allowInsideOnLeaves]
    );

    const isDropIntentForRow = useCallback(
      (intent: { id: string; position: TreeDropPosition } | null, flat: FlatNode) => {
        if (!intent) return false;
        if (intent.id === flat.id) return true;
        return intent.position === "before" && intent.id === flat.node.children?.[0]?.id;
      },
      []
    );

    const handleDragOver = useCallback(
      (flat: FlatNode, event: DragEvent<HTMLElement>) => {
        const externalTypes = readExternalDragTypes(event);
        if (externalTypes) {
          const intent = resolveExternalDropIntent(flat, event, externalTypes);
          if (!intent) {
            const position = readDropPositionFromEvent(event, flat.isFolder || allowInsideOnLeaves);
            dispatchTreeState({ type: "setDropTarget", value: (current) => (isDropIntentForRow(current, flat) ? null : current) });
            dispatchTreeState({ type: "setInvalidDropTarget", value: { id: flat.id, position, reason: "Drop is not available here." } });
            return;
          }
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = externalDrop?.dropEffect?.(externalTypes, intent.id, intent.position, flat.node) ?? "copy";
          }
          dispatchTreeState({ type: "setDropTarget", value: (current) =>
            current?.id === intent.id && current.position === intent.position ? current : intent
          });
          dispatchTreeState({ type: "setInvalidDropTarget", value: null });
          dispatchTreeState({ type: "setActiveRootDropEdge", value: null });
          return;
        }
        if (!draggable || !onDrop) return;
        const draggedId = readDraggedId(event);
        if (!draggedId) return;
        const intent = resolveDropIntent(flat, event);
        const dropDisabledReason = getDropDisabledReason(draggedId, intent.id, intent.position);
        if (dropDisabledReason) {
          dispatchTreeState({ type: "setDropTarget", value: (current) => (isDropIntentForRow(current, flat) ? null : current) });
          dispatchTreeState({ type: "setInvalidDropTarget", value: { ...intent, reason: dropDisabledReason } });
          dispatchTreeState({ type: "setActiveRootDropEdge", value: null });
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        dispatchTreeState({ type: "setDropTarget", value: (current) =>
          current?.id === intent.id && current.position === intent.position
            ? current
            : intent
        });
        dispatchTreeState({ type: "setInvalidDropTarget", value: null });
        dispatchTreeState({ type: "setActiveRootDropEdge", value: null });
      },
      [draggable, externalDrop, onDrop, readDraggedId, readExternalDragTypes, resolveDropIntent, resolveExternalDropIntent, getDropDisabledReason, isDropIntentForRow, allowInsideOnLeaves]
    );

    const handleDragLeave = useCallback(
      (flat: FlatNode, event: DragEvent<HTMLElement>) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
        dispatchTreeState({ type: "setDropTarget", value: (current) => (isDropIntentForRow(current, flat) ? null : current) });
        dispatchTreeState({ type: "setInvalidDropTarget", value: (current) => (isDropIntentForRow(current, flat) ? null : current) });
      },
      [isDropIntentForRow]
    );

    const handleDrop = useCallback(
      (flat: FlatNode, event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        const externalTypes = readExternalDragTypes(event);
        if (externalTypes && externalDrop) {
          const intent = resolveExternalDropIntent(flat, event, externalTypes);
          clearDragState();
          if (!intent) return;
          externalDrop.onDrop(event, intent.id, intent.position, flat.node);
          // Dropping into a collapsed folder would hide the inserted nodes;
          // expand the target so the result of the drop stays visible.
          if (intent.position === "inside" && flat.isFolder && !flat.isExpanded) {
            handleToggle(flat.id);
          }
          return;
        }
        const draggedId = readDraggedId(event);
        const intent = isDropIntentForRow(dropTarget, flat) && dropTarget
          ? dropTarget
          : resolveDropIntent(flat, event);
        clearDragState();
        if (!draggedId || !isDropAllowed(draggedId, intent.id, intent.position) || !onDrop) return;
        onDrop(draggedId, intent.id, intent.position);
        // Dropping into a collapsed folder would hide the moved node; expand
        // the target so the result of the drop stays visible.
        if (intent.position === "inside" && intent.id === flat.id && !flat.isExpanded) {
          handleToggle(flat.id);
        }
      },
      [readDraggedId, readExternalDragTypes, externalDrop, resolveExternalDropIntent, dropTarget, isDropIntentForRow, resolveDropIntent, clearDragState, isDropAllowed, onDrop, handleToggle]
    );

    const handleDragEnd = useCallback(
      (flat: FlatNode) => {
        clearDragState();
        onNodeDragEnd?.(flat.id);
      },
      [clearDragState, onNodeDragEnd]
    );

    // ─── Root edge drop zones ──────────────────────────────────────

    const rootDropZonesEnabled = Boolean(rootDropZones) && draggable && nodes.length > 0;
    const configuredRootDropEdges =
      typeof rootDropZones === "object" && rootDropZones.edges ? rootDropZones.edges : undefined;
    const rootDropEdgeEnabled = useCallback(
      (edge: TreeRootDropEdge) => !configuredRootDropEdges || configuredRootDropEdges.includes(edge),
      [configuredRootDropEdges]
    );

    const resolveRootEdgeTarget = useCallback(
      (edge: TreeRootDropEdge): { id: string; position: TreeDropPosition } | null => {
        if (edge === "top") {
          const first = nodes[0];
          return first ? { id: first.id, position: "before" } : null;
        }
        const last = nodes[nodes.length - 1];
        return last ? { id: last.id, position: "after" } : null;
      },
      [nodes]
    );

    const handleRootEdgeDragOver = useCallback(
      (edge: TreeRootDropEdge, event: DragEvent<HTMLElement>) => {
        if (!onDrop) return;
        const draggedId = readDraggedId(event);
        const target = resolveRootEdgeTarget(edge);
        if (!draggedId || !target || !isDropAllowed(draggedId, target.id, target.position)) {
          dispatchTreeState({ type: "setActiveRootDropEdge", value: (current) => (current === edge ? null : current) });
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        dispatchTreeState({ type: "setActiveRootDropEdge", value: edge });
        dispatchTreeState({ type: "setDropTarget", value: null });
        dispatchTreeState({ type: "setInvalidDropTarget", value: null });
      },
      [onDrop, readDraggedId, resolveRootEdgeTarget, isDropAllowed]
    );

    const handleRootEdgeDrop = useCallback(
      (edge: TreeRootDropEdge, event: DragEvent<HTMLElement>) => {
        const draggedId = readDraggedId(event);
        const target = resolveRootEdgeTarget(edge);
        clearDragState();
        if (!draggedId || !target || !isDropAllowed(draggedId, target.id, target.position) || !onDrop) return;
        event.preventDefault();
        event.stopPropagation();
        onDrop(draggedId, target.id, target.position);
      },
      [readDraggedId, resolveRootEdgeTarget, clearDragState, isDropAllowed, onDrop]
    );

    const renderRootEdge = useCallback(
      (edge: TreeRootDropEdge) => {
        const active = activeRootDropEdge === edge;
        const custom = typeof rootDropZones === "object" ? rootDropZones : undefined;
        return (
          <div
            aria-hidden="true"
            data-tree-root-drop-edge={edge}
            data-tree-root-drop-active={active ? "true" : undefined}
            onDragOver={(event) => handleRootEdgeDragOver(edge, event)}
            onDrop={(event) => handleRootEdgeDrop(edge, event)}
            onDragLeave={() => dispatchTreeState({ type: "setActiveRootDropEdge", value: (current) => (current === edge ? null : current) })}
            className={
              custom?.className?.(edge, active) ??
              cn("relative h-1.5 transition-colors", active && "h-6 bg-surfaceMuted")
            }
          >
            {custom?.render?.(edge, active) ?? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 transition-colors",
                  active ? "bg-primary" : "bg-transparent"
                )}
              />
            )}
          </div>
        );
      },
      [activeRootDropEdge, rootDropZones, handleRootEdgeDragOver, handleRootEdgeDrop]
    );

    // ─── Keyboard Navigation ───────────────────────────────────────

    const resolveKeyboardFocusId = useCallback(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && treeRootRef.current?.contains(activeElement)) {
        const activeRow = activeElement.closest<HTMLElement>("[data-tree-row]");
        const activeRowId = activeRow?.dataset.treeRow;
        if (activeRowId && flatNodes.some((flat) => flat.id === activeRowId)) return activeRowId;
      }
      return effectiveFocusId;
    }, [effectiveFocusId, flatNodes]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (!flatNodes.length) return;
        if (isEditableKeyboardTarget(e.target)) return;

        const keyboardFocusId = resolveKeyboardFocusId();
        const currentIdx = keyboardFocusId
          ? flatNodes.findIndex((fn) => fn.id === keyboardFocusId)
          : -1;

        const currentNode = currentIdx >= 0 ? flatNodes[currentIdx] : null;

        if (e.key === "F2" && currentNode && onRenameShortcut) {
          e.preventDefault();
          onRenameShortcut(currentNode.id, currentNode.node, e);
          return;
        }

        if (((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") && currentNode && onKeyboardContextMenu) {
          e.preventDefault();
          onKeyboardContextMenu(currentNode.id, currentNode.node, e);
          return;
        }

        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey && e.key !== " ") {
          const now = Date.now();
          const previous = now - typeaheadRef.current.lastTypedAt <= 750 ? typeaheadRef.current.query : "";
          const query = normalizeTypeaheadLabel(`${previous}${e.key}`);
          typeaheadRef.current = { query, lastTypedAt: now };
          if (query) {
            const startIndex = currentIdx >= 0 ? currentIdx + 1 : 0;
            const ordered = [...flatNodes.slice(startIndex), ...flatNodes.slice(0, startIndex)];
            const match = ordered.find((flat) => normalizeTypeaheadLabel(flat.node.label).startsWith(query));
            if (match) {
              e.preventDefault();
              focusFlatNode(flatNodes.findIndex((flat) => flat.id === match.id));
            }
          }
          return;
        }

        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            const nextIdx = Math.min(currentIdx + 1, flatNodes.length - 1);
            focusFlatNode(nextIdx);
            break;
          }
          case "ArrowUp": {
            e.preventDefault();
            const prevIdx = Math.max(currentIdx - 1, 0);
            focusFlatNode(prevIdx);
            break;
          }
          case "Home": {
            e.preventDefault();
            focusFlatNode(0);
            break;
          }
          case "End": {
            e.preventDefault();
            focusFlatNode(flatNodes.length - 1);
            break;
          }
          case "ArrowRight": {
            e.preventDefault();
            if (currentIdx >= 0) {
              const fn = flatNodes[currentIdx];
              if (fn.isFolder && !fn.isExpanded) handleToggle(fn.id);
              else if (fn.isFolder && fn.isExpanded && flatNodes[currentIdx + 1]?.depth === fn.depth + 1) focusFlatNode(currentIdx + 1);
            }
            break;
          }
          case "ArrowLeft": {
            e.preventDefault();
            if (currentIdx >= 0) {
              const fn = flatNodes[currentIdx];
              if (fn.isFolder && fn.isExpanded) handleToggle(fn.id);
              else if (fn.depth > 0) {
                for (let index = currentIdx - 1; index >= 0; index -= 1) {
                  if (flatNodes[index]?.depth === fn.depth - 1) {
                    focusFlatNode(index);
                    break;
                  }
                }
              }
            }
            break;
          }
          case "Enter": {
            e.preventDefault();
            if (currentIdx >= 0) {
              const fn = flatNodes[currentIdx];
              if (onRowClick) onRowClick(fn.id, fn.node);
              else triggerSelection(fn.id, e.ctrlKey || e.metaKey);
            }
            break;
          }
          case " ": {
            e.preventDefault();
            if (currentIdx >= 0) {
              triggerSelection(flatNodes[currentIdx].id, e.ctrlKey || e.metaKey);
            }
            break;
          }
        }
      },
      [flatNodes, focusFlatNode, handleToggle, onKeyboardContextMenu, onRenameShortcut, onRowClick, resolveKeyboardFocusId, triggerSelection]
    );

    // Focus the matching DOM element when focusId changes
    useEffect(() => {
      if (!focusId) return;
      const focusElement = () => {
        const el = rowElementsRef.current.get(focusId);
        if (el instanceof HTMLElement) el.focus();
      };
      if (virtualEnabled) {
        const index = flatNodes.findIndex((flat) => flat.id === focusId);
        // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- Imperative virtualizer focus restoration; no parent callback or data handoff occurs.
        if (index >= 0) rowVirtualizer.scrollToIndex(index, { align: "auto" });
        requestAnimationFrame(focusElement);
      } else {
        focusElement();
      }
    }, [flatNodes, focusId, rowVirtualizer, virtualEnabled]);

    // ─── Mouse handlers ────────────────────────────────────────────

    const handleRowClick = useCallback(
      (nodeId: string, node: TreeNode, e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        dispatchTreeState({ type: "setFocusId", value: nodeId });
        onRowClick?.(nodeId, node);
      },
      [onRowClick]
    );

    const handleCheckboxClick = useCallback(
      (nodeId: string, e: MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        dispatchTreeState({ type: "setFocusId", value: nodeId });
        triggerSelection(nodeId, e.metaKey || e.ctrlKey);
      },
      [triggerSelection]
    );

    // ─── Render ─────────────────────────────────────────────────────

    const buildRowProps = useCallback(
      (flat: FlatNode): TreeRowDomProps => {
        const isSelected = selectedIds.includes(flat.id);
        const isDropTargetRow = dropTarget?.id === flat.id;
        const isInvalidDropTargetRow = invalidDropTarget?.id === flat.id;
        const activeDropPosition = isDropTargetRow
          ? dropTarget.position
          : isInvalidDropTargetRow
            ? invalidDropTarget.position
            : undefined;
        return {
          role: "treeitem",
          "aria-level": flat.depth + 1,
          "aria-setsize": flat.setSize,
          "aria-posinset": flat.posInSet,
          "aria-expanded": flat.isFolder ? flat.isExpanded : undefined,
          "aria-selected": selectable || isSelected ? isSelected : undefined,
          "aria-current": currentId === flat.id ? "page" : undefined,
          "aria-label": flat.node.ariaLabel,
          "aria-describedby": isInvalidDropTargetRow ? dropStatusId : undefined,
          tabIndex: effectiveFocusId === flat.id ? 0 : -1,
          draggable: dragActivation === "row" && isNodeDraggable(flat.node),
          ref: (element) => {
            if (element) {
              rowElementsRef.current.set(flat.id, element);
            } else {
              rowElementsRef.current.delete(flat.id);
            }
          },
          // U12 (UX-5): expose drag state to assistive tech. A grabbed source row
          // reads aria-grabbed=true; the row currently under the drag reads the
          // effect that would apply — "move" for an intra-tree reorder (a drag
          // source exists) or "copy" for an external insert (template/project source).
          "aria-grabbed": isNodeDraggable(flat.node) ? dragSourceId === flat.id : undefined,
          "aria-dropeffect": isDropTargetRow ? (dragSourceId ? "move" : "copy") : undefined,
          "data-tree-row": flat.id,
          "data-tree-drag-activation": dragActivation,
          "data-tree-drop-state": isDropTargetRow ? "valid" : isInvalidDropTargetRow ? "invalid" : undefined,
          "data-tree-drop-position": activeDropPosition,
          "data-tree-drop-reason": isInvalidDropTargetRow ? invalidDropTarget.reason : undefined,
          onClick: (event) => handleRowClick(flat.id, flat.node, event),
          onDoubleClick: onRowDoubleClick
            ? (event) => {
                event.stopPropagation();
                onRowDoubleClick(flat.id, flat.node);
              }
            : undefined,
          // No preventDefault here: wrapping the tree in a context-menu
          // primitive (e.g. Radix ContextMenuTrigger) must keep working, and
          // those primitives ignore already-prevented events.
          onContextMenu: onContextMenu
            ? (event) => onContextMenu(flat.id, flat.node, event)
            : undefined,
          onDragStart: (event) => {
            if (dragActivation !== "row") {
              event.preventDefault();
              return;
            }
            handleDragStart(flat, event);
          },
          onDragOver: (event) => handleDragOver(flat, event),
          onDragLeave: (event) => handleDragLeave(flat, event),
          onDrop: (event) => handleDrop(flat, event),
          onDragEnd: () => {
            if (dragActivation === "row") handleDragEnd(flat);
          },
        };
      },
      [
        selectedIds,
        selectable,
        currentId,
        effectiveFocusId,
        isNodeDraggable,
        dragActivation,
        dragSourceId,
        dropTarget,
        invalidDropTarget,
        dropStatusId,
        onContextMenu,
        onRowDoubleClick,
        handleRowClick,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
      ]
    );

    const buildDragHandleProps = useCallback(
      (flat: FlatNode): TreeDragHandleDomProps => {
        const disabledReason = getNodeDragDisabledReason(flat.node);
        const ariaLabel = disabledReason
          ? `Drag ${flat.node.label} unavailable: ${disabledReason}`
          : `Drag ${flat.node.label}`;
        return {
          "aria-label": ariaLabel,
          "aria-disabled": disabledReason ? true : undefined,
          draggable: dragActivation === "handle" && !disabledReason && isNodeDraggable(flat.node),
          "data-tree-drag-handle": flat.id,
          "data-tree-drag-disabled-reason": disabledReason ?? undefined,
          title: disabledReason ?? undefined,
          onClick: (event) => {
            event.stopPropagation();
          },
          onDragStart: (event) => {
            event.stopPropagation();
            if (dragActivation !== "handle" || disabledReason) {
              event.preventDefault();
              return;
            }
            handleDragStart(flat, event);
          },
          onDragEnd: (event) => {
            event.stopPropagation();
            if (dragActivation !== "handle" || disabledReason) return;
            handleDragEnd(flat);
          },
        };
      },
      [dragActivation, getNodeDragDisabledReason, isNodeDraggable, handleDragStart, handleDragEnd]
    );

    const buildItemState = useCallback(
      (flat: FlatNode): TreeItemState => {
        const isDropTargetRow = dropTarget?.id === flat.id;
        const isInvalidDropTargetRow = invalidDropTarget?.id === flat.id;
        return {
          node: flat.node,
          depth: flat.depth,
          isFolder: flat.isFolder,
          isExpanded: flat.isExpanded,
          isSelected: selectedSet.has(flat.id),
          isIndeterminate: indeterminateIds.has(flat.id),
          isCurrent: currentId === flat.id,
          isFocused: effectiveFocusId === flat.id,
          isDragSource: dragSourceId === flat.id,
          isDropTarget: isDropTargetRow,
          isInvalidDropTarget: isInvalidDropTargetRow,
          dropPosition: isDropTargetRow ? dropTarget?.position ?? null : isInvalidDropTargetRow ? invalidDropTarget.position : null,
          dropDisabledReason: isInvalidDropTargetRow ? invalidDropTarget.reason : null,
          setSize: flat.setSize,
          posInSet: flat.posInSet,
          toggle: () => handleToggle(flat.id),
        };
      },
      [dropTarget, invalidDropTarget, selectedSet, indeterminateIds, currentId, effectiveFocusId, dragSourceId, handleToggle]
    );

    const virtualEstimateRowHeight = virtualization?.estimateRowHeight ?? 28;
    const virtualOverscan = virtualization?.overscan ?? 8;
    const virtualInitialViewportHeight = virtualization?.initialViewportHeight ?? 480;
    const measuredVirtualRows = rowVirtualizer.getVirtualItems();
    const renderedVirtualRows = virtualEnabled && measuredVirtualRows.length === 0
      ? Array.from(
          {
            length: Math.min(
              flatNodes.length,
              Math.ceil(virtualInitialViewportHeight / virtualEstimateRowHeight) + virtualOverscan * 2
            ),
          },
          (_, index) => ({
            index,
            key: flatNodes[index]?.id ?? index,
            start: index * virtualEstimateRowHeight,
          })
        )
      : measuredVirtualRows;
    const dropStatusMessage = invalidDropTarget?.reason ?? null;

    return (
      <>
        <div
          ref={treeRootRef}
          role="tree"
          aria-label={ariaLabel}
          tabIndex={0}
          className={cn("group/tree overflow-auto outline-none", className)}
          onKeyDown={handleKeyDown}
          onClick={() => flatNodes.length > 0 && !focusId && dispatchTreeState({ type: "setFocusId", value: effectiveFocusId })}
        >
          {rootDropZonesEnabled && rootDropEdgeEnabled("top") && renderRootEdge("top")}
          {virtualEnabled ? (
            <div
              data-tree-virtualizer="true"
              data-tree-virtual-total-count={flatNodes.length}
              data-tree-virtual-mounted-count={renderedVirtualRows.length}
              style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}
            >
              {renderedVirtualRows.map((virtualRow) => {
                const flat = flatNodes[virtualRow.index];
                if (!flat) return null;
                return (
                  <div
                    key={virtualRow.key}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    data-tree-virtual-row={flat.id}
                    style={{
                      left: 0,
                      position: "absolute",
                      top: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: "100%",
                    }}
                  >
                    <TreeFlatRow
                      flat={flat}
                      buildItemState={buildItemState}
                      buildRowProps={buildRowProps}
                      buildDragHandleProps={buildDragHandleProps}
                      dragActivation={dragActivation}
                      draggable={draggable}
                      selectable={selectable}
                      expandable={expandable}
                      nodeDragHandleVisible={dragActivation === "handle" ? isNodeDragEligible(flat.node) : isNodeDraggable(flat.node)}
                      railsPinned={railsPinned || (selectable && selectedSet.size > 0)}
                      showSelectedBackground={showSelectedBackground}
                      indentStep={indentStep}
                      onCheckboxClick={handleCheckboxClick}
                      rowRenderer={renderRow}
                      itemRenderer={renderItem}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            flatNodes.map((flat) => (
              <TreeFlatRow
                key={flat.id}
                flat={flat}
                buildItemState={buildItemState}
                buildRowProps={buildRowProps}
                buildDragHandleProps={buildDragHandleProps}
                dragActivation={dragActivation}
                draggable={draggable}
                selectable={selectable}
                expandable={expandable}
                nodeDragHandleVisible={dragActivation === "handle" ? isNodeDragEligible(flat.node) : isNodeDraggable(flat.node)}
                railsPinned={railsPinned || (selectable && selectedSet.size > 0)}
                showSelectedBackground={showSelectedBackground}
                indentStep={indentStep}
                onCheckboxClick={handleCheckboxClick}
                rowRenderer={renderRow}
                itemRenderer={renderItem}
              />
            ))
          )}
          {rootDropZonesEnabled && rootDropEdgeEnabled("bottom") && renderRootEdge("bottom")}
          {nodes.length === 0 && (
            emptyState ?? (
              <div className="flex items-center justify-center py-8 text-[10px] text-muted">
                No items to display
              </div>
            )
          )}
        </div>
        {dropStatusMessage ? (
          <output
            id={dropStatusId}
            aria-live="polite"
            data-tree-drop-status
            className="block border-t border-hairline px-2 py-1 text-[9px] font-medium leading-3 text-danger"
          >
            {dropStatusMessage}
          </output>
        ) : null}
      </>
    );
}
