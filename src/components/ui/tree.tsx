"use client";

import { forwardRef, useState, useCallback, useMemo, useEffect, type ReactNode, type KeyboardEvent } from "react";
import {
  DotsSixVertical,
  CaretDown,
  CaretRight,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

// ─── Types ───────────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  draggable?: boolean;
  selectable?: boolean;
  icon?: ReactNode;
  isLeaf?: boolean;
  data?: Record<string, unknown>;
}

export interface TreeProps {
  nodes: TreeNode[];
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onDrop?: (draggedId: string, targetId: string, position: "before" | "after" | "inside") => void;
  onToggle?: (nodeId: string, expanded: boolean) => void;
  /** Controlled: currently expanded node IDs */
  expandedIds?: string[];
  /** Controlled: called when expandedIds should change */
  onExpandedChange?: (expandedIds: string[]) => void;
  /** Uncontrolled: initially expanded node IDs */
  defaultExpandedIds?: string[];
  draggable?: boolean;
  selectable?: boolean;
  expandable?: boolean;
  className?: string;
  renderRow?: (node: TreeNode, depth: number, isSelected: boolean, isExpanded: boolean) => ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface FlatNode {
  id: string;
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
}

/** Flatten tree into visible nodes (expanded children included) */
function flattenTree(
  nodes: TreeNode[],
  expandedIds: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    const isExpanded = expandedIds.has(node.id);
    result.push({ id: node.id, node, depth, isExpanded });
    if (node.children && node.children.length > 0 && isExpanded) {
      result.push(...flattenTree(node.children, expandedIds, depth + 1));
    }
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────

export const Tree = forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      nodes,
      selectedIds = [],
      onSelectionChange,
      onDrop,
      onToggle,
      expandedIds: controlledExpandedIds,
      onExpandedChange,
      defaultExpandedIds = [],
      draggable = false,
      selectable = false,
      expandable = true,
      className,
      renderRow,
    },
    ref
  ) => {
    const isControlled = controlledExpandedIds !== undefined;

    const [uncontrolledExpanded, setUncontrolledExpanded] = useState<Set<string>>(
      new Set(defaultExpandedIds)
    );

    const expandedSet = useMemo(
      () => (isControlled ? new Set(controlledExpandedIds!) : uncontrolledExpanded),
      [isControlled, controlledExpandedIds, uncontrolledExpanded]
    );

    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<"before" | "after" | "inside" | null>(null);
    const [focusId, setFocusId] = useState<string | null>(null);

    const flatNodes = useMemo(
      () => flattenTree(nodes, expandedSet),
      [nodes, expandedSet]
    );

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
        if (!selectable || !onSelectionChange) return;
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
      [selectable, selectedIds, onSelectionChange]
    );

    // ─── Keyboard Navigation ───────────────────────────────────────

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (!flatNodes.length) return;

        const currentIdx = focusId
          ? flatNodes.findIndex((fn) => fn.id === focusId)
          : -1;

        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            const nextIdx = Math.min(currentIdx + 1, flatNodes.length - 1);
            setFocusId(flatNodes[nextIdx]?.id ?? null);
            break;
          }
          case "ArrowUp": {
            e.preventDefault();
            const prevIdx = Math.max(currentIdx - 1, 0);
            setFocusId(flatNodes[prevIdx]?.id ?? null);
            break;
          }
          case "Home": {
            e.preventDefault();
            setFocusId(flatNodes[0]?.id ?? null);
            break;
          }
          case "End": {
            e.preventDefault();
            setFocusId(flatNodes[flatNodes.length - 1]?.id ?? null);
            break;
          }
          case "ArrowRight": {
            e.preventDefault();
            if (currentIdx >= 0) {
              const fn = flatNodes[currentIdx];
              const hasChildren = fn.node.children && fn.node.children.length > 0;
              if (hasChildren && !fn.isExpanded) {
                handleToggle(fn.id);
              }
            }
            break;
          }
          case "ArrowLeft": {
            e.preventDefault();
            if (currentIdx >= 0) {
              const fn = flatNodes[currentIdx];
              const hasChildren = fn.node.children && fn.node.children.length > 0;
              if (hasChildren && fn.isExpanded) {
                handleToggle(fn.id);
              }
            }
            break;
          }
          case "Enter":
          case " ": {
            e.preventDefault();
            if (currentIdx >= 0) {
              triggerSelection(flatNodes[currentIdx].id, e.ctrlKey || e.metaKey);
            }
            break;
          }
        }
      },
      [flatNodes, focusId, handleToggle, triggerSelection]
    );

    // Focus the matching DOM element when focusId changes
    useEffect(() => {
      if (focusId) {
        const el = document.querySelector(`[data-tree-row="${focusId}"]`);
        if (el instanceof HTMLElement) el.focus();
      }
    }, [focusId]);

    // ─── Mouse handlers ────────────────────────────────────────────

    const handleSelect = useCallback(
      (nodeId: string, e: React.MouseEvent) => {
        if (!selectable || !onSelectionChange) return;
        e.stopPropagation();
        setFocusId(nodeId);
        triggerSelection(nodeId, e.metaKey || e.ctrlKey);
      },
      [selectable, triggerSelection]
    );

    const handleDragStart = useCallback(
      (nodeId: string, e: React.DragEvent) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/plain", nodeId);
        e.dataTransfer.effectAllowed = "move";
      },
      [draggable]
    );

    const handleDragOver = useCallback(
      (nodeId: string, e: React.DragEvent) => {
        if (!draggable || !onDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverId(nodeId);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const third = rect.height / 3;
        if (y < third) setDragPosition("before");
        else if (y > rect.height - third) setDragPosition("after");
        else setDragPosition("inside");
      },
      [draggable, onDrop]
    );

    const handleDragLeave = useCallback(() => {
      setDragOverId(null);
      setDragPosition(null);
    }, []);

    const handleDrop = useCallback(
      (targetId: string, e: React.DragEvent) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== targetId && dragPosition && onDrop) {
          onDrop(draggedId, targetId, dragPosition);
        }
        setDragOverId(null);
        setDragPosition(null);
      },
      [dragPosition, onDrop]
    );

    // ─── Render ─────────────────────────────────────────────────────

    const renderNode = (flat: FlatNode): ReactNode => {
      const { node, depth, isExpanded } = flat;
      const isSelected = selectedIds.includes(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const isDragOver = dragOverId === node.id;
      const isFocused = focusId === node.id;

      return (
        <div key={node.id} className="select-none">
          <div
            data-tree-row={node.id}
            tabIndex={isFocused ? 0 : -1}
            draggable={draggable && node.draggable !== false}
            onDragStart={(e) => handleDragStart(node.id, e)}
            onDragOver={(e) => handleDragOver(node.id, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(node.id, e)}
            onClick={(e) => handleSelect(node.id, e)}
            className={cn(
              "group flex items-center h-9 text-[10px] text-ink tracking-normal transition-colors outline-none",
              "border border-transparent",
              isSelected && "bg-accentSoft",
              isFocused && "ring-1 ring-inset ring-focus",
              isDragOver && dragPosition === "inside" && "bg-surfaceMuted",
              isDragOver && dragPosition === "before" && "border-t-2 border-t-primary",
              isDragOver && dragPosition === "after" && "border-b-2 border-b-primary",
              "hover:bg-surfaceMuted cursor-pointer"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            role="treeitem"
            aria-level={depth + 1}
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            {/* Drag handle — leftmost, no indent, hover-only */}
            {draggable && node.draggable !== false && (
              <span
                className={cn(
                  "shrink-0 mr-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab",
                  "flex items-center justify-center w-4"
                )}
                style={{ marginLeft: -(depth * 16 + 8) + 4, marginRight: 4 }}
              >
                <DotsSixVertical weight="regular" className="h-3.5 w-3.5 text-muted" />
              </span>
            )}

            {/* Selection checkbox — no indent, hover-only */}
            {selectable && node.selectable !== false && (
              <span
                className={cn(
                  "shrink-0 mr-1.5 flex items-center justify-center w-4 h-4 rounded-xs border transition-all",
                  isSelected
                    ? "bg-primary border-primary opacity-100"
                    : "border-hairline opacity-0 group-hover:opacity-100",
                  "cursor-pointer"
                )}
              >
                {isSelected && <Check weight="regular" className="h-3 w-3 text-white" />}
              </span>
            )}

            {/* Expand/collapse caret */}
            {expandable && hasChildren && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(node.id);
                }}
                className="shrink-0 mr-1 flex items-center justify-center w-4 h-4 rounded-xs hover:bg-surfaceMuted transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <CaretDown weight="regular" className="h-3.5 w-3.5 text-tertiary" />
                ) : (
                  <CaretRight weight="regular" className="h-3.5 w-3.5 text-tertiary" />
                )}
              </button>
            )}

            {expandable && !hasChildren && <span className="w-5 shrink-0" />}

            {node.icon && (
              <span className="shrink-0 mr-1.5 flex items-center">{node.icon}</span>
            )}

            {renderRow ? (
              renderRow(node, depth, isSelected, isExpanded)
            ) : (
              <span className="truncate">{node.label}</span>
            )}
          </div>
        </div>
      );
    };

    return (
      <div
        ref={ref}
        role="tree"
        className={cn("overflow-auto outline-none", className)}
        aria-multiselectable={selectable}
        onKeyDown={handleKeyDown}
        onClick={() => flatNodes.length > 0 && !focusId && setFocusId(flatNodes[0].id)}
      >
        {flatNodes.map((fn) => renderNode(fn))}
        {nodes.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[10px] text-muted">
            No items to display
          </div>
        )}
      </div>
    );
  }
);

Tree.displayName = "Tree";
