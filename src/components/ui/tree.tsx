"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  type RefCallback,
  type ReactNode,
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

/** Horizontal indent applied per depth level, in pixels. */
export const TREE_INDENT_STEP = 16;

/**
 * Canonical size for icons inside tree rows, in pixels. Every tree consumer
 * (sheets tree, components tree, templates tree) must pass this to its row
 * icons so the panels read at one scale.
 */
export const TREE_ROW_ICON_SIZE = 12;

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
  dropPosition: TreeDropPosition | null;
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
  "aria-grabbed"?: boolean;
  "aria-dropeffect"?: "move" | "copy";
  tabIndex: number;
  draggable: boolean;
  ref: RefCallback<HTMLElement>;
  "data-tree-row": string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDoubleClick?: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
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
  /**
   * Fires after the default drag payload (`text/plain` = node id, move
   * effect) is stamped, so consumers can replace the payload, effect, or
   * drag image — e.g. dragging library items out as copy with JSON data.
   */
  onNodeDragStart?: (nodeId: string, event: DragEvent<HTMLElement>) => void;
  onNodeDragEnd?: (nodeId: string) => void;
  onToggle?: (nodeId: string, expanded: boolean) => void;
  onContextMenu?: (nodeId: string, node: TreeNode, event: MouseEvent) => void;
  onRowClick?: (nodeId: string, node: TreeNode) => void;
  onRowDoubleClick?: (nodeId: string, node: TreeNode) => void;
  /** Controlled: currently expanded node IDs */
  expandedIds?: string[];
  /** Controlled: called when expandedIds should change */
  onExpandedChange?: (expandedIds: string[]) => void;
  /** Uncontrolled: initially expanded node IDs */
  defaultExpandedIds?: string[];
  draggable?: boolean;
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
  /** Custom content for the label area of the default row. */
  renderRow?: (node: TreeNode, depth: number, isSelected: boolean, isExpanded: boolean) => ReactNode;
  /** Horizontal indent applied per depth level. Defaults to `TREE_INDENT_STEP`. */
  indentStep?: number;
  /** Full row control: replaces the default row entirely. Spread `rowProps` onto your row element. */
  renderItem?: (state: TreeItemState, rowProps: TreeRowDomProps) => ReactNode;
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

/**
 * Apply a drop immutably to a plain `TreeNode[]`. For consumers without their
 * own reorder domain logic (and for Storybook): blocks self drops and
 * descendant cycles, returns the input array when the move is invalid.
 */
export function moveTreeNode(
  nodes: TreeNode[],
  draggedId: string,
  targetId: string,
  position: TreeDropPosition
): TreeNode[] {
  if (draggedId === targetId) return nodes;

  let dragged: TreeNode | null = null;
  const removeDragged = (list: TreeNode[]): TreeNode[] =>
    list.flatMap((node) => {
      if (node.id === draggedId) {
        dragged = node;
        return [];
      }
      if (node.children?.length) return [{ ...node, children: removeDragged(node.children) }];
      return [node];
    });

  const withoutDragged = removeDragged(nodes);
  if (!dragged) return nodes;
  if (containsDescendant(dragged, targetId)) return nodes;

  let placed = false;
  const insertDragged = (list: TreeNode[]): TreeNode[] => {
    const next: TreeNode[] = [];
    for (const node of list) {
      if (node.id === targetId) {
        placed = true;
        if (position === "before") {
          next.push(dragged!, node);
        } else if (position === "after") {
          next.push(node, dragged!);
        } else {
          next.push({ ...node, children: [...(node.children ?? []), dragged!] });
        }
        continue;
      }
      if (node.children?.length) {
        next.push({ ...node, children: insertDragged(node.children) });
        continue;
      }
      next.push(node);
    }
    return next;
  };

  const result = insertDragged(withoutDragged);
  return placed ? result : nodes;
}

// ─── Default row ─────────────────────────────────────────────────────

interface DefaultTreeRowProps {
  state: TreeItemState;
  rowProps: TreeRowDomProps;
  draggable: boolean;
  selectable: boolean;
  expandable: boolean;
  nodeDraggable: boolean;
  /** Keep the affordance rails open (e.g. while a selection exists). */
  railsPinned: boolean;
  indentStep: number;
  onCheckboxClick: (nodeId: string, event: MouseEvent<HTMLSpanElement>) => void;
  renderRow?: (node: TreeNode, depth: number, isSelected: boolean, isExpanded: boolean) => ReactNode;
}

const DefaultTreeRow = memo(function DefaultTreeRow({
  state,
  rowProps,
  draggable,
  selectable,
  expandable,
  nodeDraggable,
  railsPinned,
  indentStep,
  onCheckboxClick,
  renderRow,
}: DefaultTreeRowProps) {
  const { node, depth, isFolder, isExpanded, isSelected, isIndeterminate, isCurrent, isDropTarget, dropPosition } = state;

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
          (isSelected || isCurrent) && "bg-accentSoft",
          state.isFocused && "border-l-focus bg-surfaceMuted",
          isDropTarget && dropPosition === "inside" && "bg-surfaceMuted",
          isDropTarget && dropPosition === "before" && "border-t-2 border-t-primary",
          isDropTarget && dropPosition === "after" && "border-b-2 border-b-primary",
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
            {nodeDraggable && (
              <span
                onClick={(e) => e.stopPropagation()}
                className="flex cursor-grab items-center justify-center opacity-0 transition-opacity group-hover/tree-row:opacity-100"
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

        {renderRow ? (
          renderRow(node, depth, isSelected, isExpanded)
        ) : (
          <span className="truncate">{node.label}</span>
        )}
      </div>
    </div>
  );
});

// ─── Component ───────────────────────────────────────────────────────

export function Tree({
      nodes,
      ariaLabel,
      selectedIds = [],
      onSelectionChange,
      onCheckboxToggle,
      currentId,
      onDrop,
      canDrop,
      canDrag,
      onNodeDragStart,
      onNodeDragEnd,
      onToggle,
      onContextMenu,
      onRowClick,
      onRowDoubleClick,
      expandedIds: controlledExpandedIds,
      onExpandedChange,
      defaultExpandedIds = [],
      draggable = false,
      selectable = false,
      expandable = true,
      allowInsideOnLeaves = false,
      dragDataType,
      externalDrop,
      rootDropZones,
      className,
      emptyState,
      railsPinned = false,
      renderRow,
      indentStep = TREE_INDENT_STEP,
      renderItem,
      virtualization,
      ref,
}: TreeProps) {
    const isControlled = controlledExpandedIds !== undefined;
    const treeRootRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(ref, () => treeRootRef.current as HTMLDivElement, []);

    const [uncontrolledExpanded, setUncontrolledExpanded] = useState<Set<string>>(
      new Set(defaultExpandedIds)
    );

    const expandedSet = useMemo(
      () => (isControlled ? new Set(controlledExpandedIds!) : uncontrolledExpanded),
      [isControlled, controlledExpandedIds, uncontrolledExpanded]
    );

    const [dragSourceId, setDragSourceId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; position: TreeDropPosition } | null>(null);
    const [activeRootDropEdge, setActiveRootDropEdge] = useState<TreeRootDropEdge | null>(null);
    const [focusId, setFocusId] = useState<string | null>(null);
    const rowElementsRef = useRef<Map<string, HTMLElement>>(null!);
    if (rowElementsRef.current === null) rowElementsRef.current = new Map();

    const flatNodes = useMemo(
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
        setFocusId(nextId);
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
          setUncontrolledExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
              next.delete(nodeId);
              onToggle?.(nodeId, false);
            } else {
              next.add(nodeId);
              onToggle?.(nodeId, true);
            }
            return next;
          });
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

    const isNodeDraggable = useCallback(
      (node: TreeNode) => {
        if (!draggable || node.draggable === false) return false;
        return canDrag ? canDrag(node) : true;
      },
      [draggable, canDrag]
    );

    const readDraggedId = useCallback(
      (event: DragEvent<HTMLElement>) => {
        if (dragSourceId) return dragSourceId;
        const fromCustomType = dragDataType ? event.dataTransfer?.getData(dragDataType) : "";
        return fromCustomType || event.dataTransfer?.getData("text/plain") || null;
      },
      [dragSourceId, dragDataType]
    );

    const isDropAllowed = useCallback(
      (draggedId: string, targetId: string, position: TreeDropPosition) => {
        if (draggedId === targetId) return false;
        const draggedNode = nodeIndex.get(draggedId);
        if (!draggedNode || !nodeIndex.has(targetId)) return false;
        if (containsDescendant(draggedNode, targetId)) return false;
        return canDrop ? canDrop(draggedId, targetId, position) : true;
      },
      [nodeIndex, canDrop]
    );

    const clearDragState = useCallback(() => {
      setDragSourceId(null);
      setDropTarget(null);
      setActiveRootDropEdge(null);
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
        setDropTarget(null);
        setActiveRootDropEdge(null);
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
        setDragSourceId(flat.id);
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
            setDropTarget((current) => (isDropIntentForRow(current, flat) ? null : current));
            return;
          }
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
          setDropTarget((current) =>
            current?.id === intent.id && current.position === intent.position ? current : intent
          );
          setActiveRootDropEdge(null);
          return;
        }
        if (!draggable || !onDrop) return;
        const draggedId = readDraggedId(event);
        if (!draggedId) return;
        const intent = resolveDropIntent(flat, event);
        if (!isDropAllowed(draggedId, intent.id, intent.position)) {
          setDropTarget((current) => (isDropIntentForRow(current, flat) ? null : current));
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        setDropTarget((current) =>
          current?.id === intent.id && current.position === intent.position
            ? current
            : intent
        );
        setActiveRootDropEdge(null);
      },
      [draggable, onDrop, readDraggedId, readExternalDragTypes, resolveDropIntent, resolveExternalDropIntent, isDropAllowed, isDropIntentForRow]
    );

    const handleDragLeave = useCallback(
      (flat: FlatNode, event: DragEvent<HTMLElement>) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
        setDropTarget((current) => (isDropIntentForRow(current, flat) ? null : current));
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
          setActiveRootDropEdge((current) => (current === edge ? null : current));
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        setActiveRootDropEdge(edge);
        setDropTarget(null);
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
            onDragLeave={() => setActiveRootDropEdge((current) => (current === edge ? null : current))}
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

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (!flatNodes.length) return;

        const currentIdx = effectiveFocusId
          ? flatNodes.findIndex((fn) => fn.id === effectiveFocusId)
          : -1;

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
            }
            break;
          }
          case "ArrowLeft": {
            e.preventDefault();
            if (currentIdx >= 0) {
              const fn = flatNodes[currentIdx];
              if (fn.isFolder && fn.isExpanded) handleToggle(fn.id);
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
      [flatNodes, effectiveFocusId, focusFlatNode, handleToggle, onRowClick, triggerSelection]
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
        setFocusId(nodeId);
        onRowClick?.(nodeId, node);
      },
      [onRowClick]
    );

    const handleCheckboxClick = useCallback(
      (nodeId: string, e: MouseEvent<HTMLSpanElement>) => {
        e.stopPropagation();
        setFocusId(nodeId);
        triggerSelection(nodeId, e.metaKey || e.ctrlKey);
      },
      [triggerSelection]
    );

    // ─── Render ─────────────────────────────────────────────────────

    const buildRowProps = useCallback(
      (flat: FlatNode): TreeRowDomProps => {
        const isSelected = selectedIds.includes(flat.id);
        return {
          role: "treeitem",
          "aria-level": flat.depth + 1,
          "aria-setsize": flat.setSize,
          "aria-posinset": flat.posInSet,
          "aria-expanded": flat.isFolder ? flat.isExpanded : undefined,
          "aria-selected": selectable || isSelected ? isSelected : undefined,
          "aria-current": currentId === flat.id ? "page" : undefined,
          "aria-label": flat.node.ariaLabel,
          tabIndex: effectiveFocusId === flat.id ? 0 : -1,
          draggable: isNodeDraggable(flat.node),
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
          "aria-dropeffect": dropTarget?.id === flat.id ? (dragSourceId ? "move" : "copy") : undefined,
          "data-tree-row": flat.id,
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
          onDragStart: (event) => handleDragStart(flat, event),
          onDragOver: (event) => handleDragOver(flat, event),
          onDragLeave: (event) => handleDragLeave(flat, event),
          onDrop: (event) => handleDrop(flat, event),
          onDragEnd: () => handleDragEnd(flat),
        };
      },
      [
        selectedIds,
        selectable,
        currentId,
        effectiveFocusId,
        isNodeDraggable,
        dragSourceId,
        dropTarget,
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

    const buildItemState = useCallback(
      (flat: FlatNode): TreeItemState => {
        const isDropTargetRow = dropTarget?.id === flat.id;
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
          dropPosition: isDropTargetRow ? dropTarget?.position ?? null : null,
          setSize: flat.setSize,
          posInSet: flat.posInSet,
          toggle: () => handleToggle(flat.id),
        };
      },
      [dropTarget, selectedSet, indeterminateIds, currentId, effectiveFocusId, dragSourceId, handleToggle]
    );

    const renderFlatRow = useCallback(
      (flat: FlatNode) => {
        const state = buildItemState(flat);
        const rowProps = buildRowProps(flat);
        if (renderItem) {
          return <Fragment key={flat.id}>{renderItem(state, rowProps)}</Fragment>;
        }
        return (
          <DefaultTreeRow
            key={flat.id}
            state={state}
            rowProps={rowProps}
            draggable={draggable}
            selectable={selectable}
            expandable={expandable}
            nodeDraggable={isNodeDraggable(flat.node)}
            railsPinned={railsPinned || (selectable && selectedSet.size > 0)}
            indentStep={indentStep}
            onCheckboxClick={handleCheckboxClick}
            renderRow={renderRow}
          />
        );
      },
      [
        buildItemState,
        buildRowProps,
        draggable,
        expandable,
        handleCheckboxClick,
        indentStep,
        isNodeDraggable,
        railsPinned,
        renderItem,
        renderRow,
        selectable,
        selectedSet.size,
      ]
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

    return (
      <div
        ref={treeRootRef}
        role="tree"
        aria-label={ariaLabel}
        tabIndex={0}
        className={cn("group/tree overflow-auto outline-none", className)}
        onKeyDown={handleKeyDown}
        onClick={() => flatNodes.length > 0 && !focusId && setFocusId(effectiveFocusId)}
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
                  {renderFlatRow(flat)}
                </div>
              );
            })}
          </div>
        ) : (
          flatNodes.map((flat) => renderFlatRow(flat))
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
    );
}
