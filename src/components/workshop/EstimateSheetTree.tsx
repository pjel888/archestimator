"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type DragEvent, type HTMLAttributes } from "react";
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree,
  type TreeItem,
  type TreeItemIndex,
  type TreeViewState,
  type DraggingPosition,
} from "react-complex-tree";
import { useQueryClient } from "@tanstack/react-query";
import { CaretDown, Cube, FolderSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { getEstimateNodeDisplayKind, getEstimateNodeKindSortRank, isEstimateGroupNodeKind } from "@/lib/estimates/tree-hierarchy";
import { createEstimateNode, reorderEstimateTreeNodes } from "@/lib/estimates/actions";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { useEstimateWorkspaceExpansion, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import {
  ESTIMATE_TREE_ROOT_ITEM_ID,
  evaluateEstimateTreeDrop,
  getEstimateTreeStructureSignature,
} from "@/lib/estimates/estimate-tree-reorder";
import { findEstimateNode, type EstimateTreeNode } from "./estimate-tree-data";
import { ResizableSidePanel } from "./ResizableSidePanel";

type EstimateSheetTreeProps = {
  projectId: string;
  estimateId: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
};

const ESTIMATE_TREE_LEFT_EXTENSION_WIDTH = 104;
const ESTIMATE_TREE_ID = "estimate-sheet-tree";
const TREE_INDENT_STEP = 20;
const TREE_MAX_INDENT = 140;
const ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE = "application/x-archestimator-estimate-tree-item";

type EstimateTreeItemData = {
  node: EstimateTreeNode | null;
};

type EstimateTreeModel = {
  items: Record<TreeItemIndex, TreeItem<EstimateTreeItemData>>;
  folderIds: Set<string>;
};

type ReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

type NestIntentHint = {
  targetId: string;
  targetName: string;
  sourceName: string;
};

function NodeIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (getEstimateNodeDisplayKind(kind) === "group") return <FolderSimple size={12} weight="bold" aria-hidden="true" />;
  return <Cube size={12} weight="bold" aria-hidden="true" />;
}

function AddTreeActionIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  const Icon = getEstimateNodeDisplayKind(kind) === "group" ? FolderSimple : Cube;
  return (
    <span className="relative flex size-4 items-center justify-center" aria-hidden="true">
      <Icon size={13} weight="bold" className="absolute left-0 top-1/2 -translate-y-1/2" />
      <Plus size={8} weight="bold" className="absolute right-0 top-0" />
    </span>
  );
}

function cloneEstimateTreeNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneEstimateTreeNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}

function sortLocalEstimateTreeSiblings(nodes: EstimateTreeNode[]) {
  return nodes
    .map((node, index) => ({ node, index }))
    .sort((left, right) => getEstimateNodeKindSortRank(left.node.kind) - getEstimateNodeKindSortRank(right.node.kind) || left.index - right.index)
    .map(({ node }) => node);
}

function insertLocalEstimateTreeNode(nodes: EstimateTreeNode[], parentId: string | null, nodeToInsert: EstimateTreeNode): EstimateTreeNode[] {
  if (parentId === null) {
    return sortLocalEstimateTreeSiblings([...nodes.map(cloneEstimateTreeNode), cloneEstimateTreeNode(nodeToInsert)]);
  }

  return nodes.map((node) => {
    const cloned = cloneEstimateTreeNode(node);
    if (cloned.id === parentId && isEstimateGroupNodeKind(cloned.kind)) {
      return {
        ...cloned,
        children: sortLocalEstimateTreeSiblings([...(cloned.children ?? []), cloneEstimateTreeNode(nodeToInsert)]),
      };
    }
    if (cloned.children?.length) return { ...cloned, children: insertLocalEstimateTreeNode(cloned.children, parentId, nodeToInsert) };
    return cloned;
  });
}

function removeLocalEstimateTreeNode(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode[] {
  return nodes.flatMap((node) => {
    if (node.id === nodeId) return [];
    const cloned = cloneEstimateTreeNode(node);
    if (cloned.children?.length) return [{ ...cloned, children: removeLocalEstimateTreeNode(cloned.children, nodeId) }];
    return [cloned];
  });
}

function makeOptimisticTreeNodeId(kind: EstimateTreeNode["kind"]) {
  return `optimistic-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createOptimisticEstimateTreeNode(kind: EstimateTreeNode["kind"], id: string, name: string): EstimateTreeNode {
  return {
    id,
    name,
    kind,
    total: "₱0.00",
    children: [],
    ...(kind === "area" ? { estimateRowItems: [] } : {}),
  };
}

function buildTreeModel(nodes: EstimateTreeNode[]): EstimateTreeModel {
  const items: Record<TreeItemIndex, TreeItem<EstimateTreeItemData>> = {
    [ESTIMATE_TREE_ROOT_ITEM_ID]: {
      index: ESTIMATE_TREE_ROOT_ITEM_ID,
      isFolder: true,
      canMove: false,
      children: nodes.map((node) => node.id),
      data: { node: null },
    },
  };
  const folderIds = new Set<string>();

  function visit(node: EstimateTreeNode) {
    const children = node.children?.map((child) => child.id) ?? [];
    const isFolder = isEstimateGroupNodeKind(node.kind);
    if (isFolder) folderIds.add(node.id);

    items[node.id] = {
      index: node.id,
      isFolder,
      children: isFolder ? children : undefined,
      data: { node },
    };

    node.children?.forEach((child) => visit(child));
  }

  nodes.forEach((node) => visit(node));
  return { items, folderIds };
}

export function EstimateSheetTree({ projectId, estimateId, projectName, selectedNodeId, nodes }: EstimateSheetTreeProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingReordersRef = useRef(0);
  const suppressPrimaryActionUntilRef = useRef(0);
  const draggedTreeItemRef = useRef<TreeItem<EstimateTreeItemData> | null>(null);
  const lastAcceptedPropStructureRef = useRef(getEstimateTreeStructureSignature(nodes));
  const [localNodes, setLocalNodes] = useState<EstimateTreeNode[]>(nodes);
  const [reorderStatus, setReorderStatus] = useState<ReorderStatus>({ state: "idle" });
  const [nestIntentHint, setNestIntentHint] = useState<NestIntentHint | null>(null);
  const [isRootBottomDropActive, setIsRootBottomDropActive] = useState(false);
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const treeModel = useMemo(() => buildTreeModel(localNodes), [localNodes]);
  const allFolderItemIds = useMemo(() => Array.from(treeModel.folderIds).filter((itemId) => treeModel.items[itemId]), [treeModel.folderIds, treeModel.items]);
  const { expandedNodeIds, setExpandedNodeIds } = useEstimateWorkspaceExpansion(estimateId, allFolderItemIds);
  const [focusedOverride, setFocusedOverride] = useState<{ routeNodeId: string | null; item: TreeItemIndex } | null>(null);
  const selectedGroupId = useMemo(() => {
    const selectedNode = activeSelectedNodeId ? findEstimateNode(localNodes, activeSelectedNodeId) : undefined;
    return selectedNode && isEstimateGroupNodeKind(selectedNode.kind) ? selectedNode.id : null;
  }, [activeSelectedNodeId, localNodes]);

  useEffect(() => {
    if (pendingReordersRef.current > 0) return;
    setLocalNodes((currentNodes) => {
      const incomingStructure = getEstimateTreeStructureSignature(nodes);
      const currentStructure = getEstimateTreeStructureSignature(currentNodes);
      if (currentStructure === incomingStructure) {
        lastAcceptedPropStructureRef.current = incomingStructure;
        return currentNodes;
      }
      if (incomingStructure === lastAcceptedPropStructureRef.current) return currentNodes;
      lastAcceptedPropStructureRef.current = incomingStructure;
      return nodes;
    });
  }, [nodes]);

  const expandedItems = useMemo(() => {
    return expandedNodeIds.filter((itemId) => treeModel.items[itemId]);
  }, [expandedNodeIds, treeModel.items]);

  const routeSelectedItems = useMemo<TreeItemIndex[]>(
    () => (activeSelectedNodeId && treeModel.items[activeSelectedNodeId] ? [activeSelectedNodeId] : []),
    [activeSelectedNodeId, treeModel.items],
  );
  const focusedItem = useMemo<TreeItemIndex | undefined>(() => {
    if (focusedOverride?.routeNodeId === activeSelectedNodeId && treeModel.items[focusedOverride.item]) return focusedOverride.item;
    return routeSelectedItems[0];
  }, [activeSelectedNodeId, focusedOverride, routeSelectedItems, treeModel.items]);
  const handleExpandAll = useCallback(() => {
    setExpandedNodeIds(allFolderItemIds);
  }, [allFolderItemIds, setExpandedNodeIds]);
  const handleCollapseAll = useCallback(() => {
    setExpandedNodeIds([]);
  }, [setExpandedNodeIds]);

  const viewState = useMemo<TreeViewState>(() => ({
    [ESTIMATE_TREE_ID]: {
      expandedItems,
      selectedItems: routeSelectedItems,
      focusedItem,
    },
  }), [expandedItems, focusedItem, routeSelectedItems]);

  const canReorderNow = reorderStatus.state !== "saving";
  const handleCanDrag = useCallback((items: TreeItem<EstimateTreeItemData>[]) => (
    canReorderNow && items.length === 1 && Boolean(items[0]?.data.node)
  ), [canReorderNow]);

  const handleCanDropAt = useCallback((items: TreeItem<EstimateTreeItemData>[], target: Parameters<typeof evaluateEstimateTreeDrop>[0]["target"]) => {
    if (!handleCanDrag(items)) return false;
    return evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedItemIds: items.map((item) => item.index),
      target,
    }).ok;
  }, [handleCanDrag, localNodes]);

  const clearNestIntentHint = useCallback(() => {
    setNestIntentHint(null);
  }, []);

  const clearRootBottomDropActive = useCallback(() => {
    setIsRootBottomDropActive(false);
  }, []);

  const getDraggedTreeItemFromEvent = useCallback((event: DragEvent<HTMLElement>) => {
    const draggedItemId = event.dataTransfer.getData(ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE);
    return draggedTreeItemRef.current ?? (draggedItemId ? treeModel.items[draggedItemId] : null);
  }, [treeModel.items]);

  const markNestIntentHint = useCallback((targetNode: EstimateTreeNode, draggedItem: TreeItem<EstimateTreeItemData>) => {
    const sourceName = draggedItem.data.node?.name ?? "item";
    setNestIntentHint((current) => {
      if (current?.targetId === targetNode.id && current.sourceName === sourceName) return current;
      return { targetId: targetNode.id, targetName: targetNode.name, sourceName };
    });
  }, []);

  const clearNestIntentHintForTarget = useCallback((targetNode: EstimateTreeNode) => {
    setNestIntentHint((current) => (current?.targetId === targetNode.id ? null : current));
  }, []);

  const suppressPrimaryActionAfterDrag = useCallback(() => {
    suppressPrimaryActionUntilRef.current = Date.now() + 500;
  }, []);

  const createDirectFolderDropTarget = useCallback((node: EstimateTreeNode, depth: number): DraggingPosition => ({
    targetType: "item",
    treeId: ESTIMATE_TREE_ID,
    targetItem: node.id,
    parentItem: ESTIMATE_TREE_ROOT_ITEM_ID,
    depth,
    linearIndex: 0,
  }), []);

  const rootBottomDropTarget = useMemo<DraggingPosition>(() => ({
    targetType: "between-items",
    treeId: ESTIMATE_TREE_ID,
    parentItem: ESTIMATE_TREE_ROOT_ITEM_ID,
    childIndex: localNodes.length,
    linePosition: "bottom",
    linearIndex: localNodes.length,
    depth: 0,
  }), [localNodes.length]);

  const isMiddleRowDrop = useCallback((event: DragEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return false;
    const clientY = Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2;
    const relativeY = (clientY - rect.top) / rect.height;
    return relativeY > 0.25 && relativeY < 0.75;
  }, []);

  const handleDrop = useCallback((items: TreeItem<EstimateTreeItemData>[], target: Parameters<typeof evaluateEstimateTreeDrop>[0]["target"]) => {
    suppressPrimaryActionAfterDrag();
    clearNestIntentHint();
    clearRootBottomDropActive();
    if (!handleCanDrag(items)) return;

    const result = evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedItemIds: items.map((item) => item.index),
      target,
    });
    if (!result.ok) return;

    const previousNodes = localNodes;
    const nextNodes = result.plan.nextNodes;
    pendingReordersRef.current += 1;
    setLocalNodes(nextNodes);
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nextNodes);
    setReorderStatus({ state: "saving", message: "Saving tree order" });

    void (async () => {
      try {
        const confirmed = await reorderEstimateTreeNodes(projectId, estimateId, { updates: result.plan.updates });
        pendingReordersRef.current = Math.max(0, pendingReordersRef.current - 1);
        setLocalNodes(confirmed.tree);
        queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), confirmed.tree);
        setReorderStatus({ state: "saved", message: "Tree order saved" });
      } catch (error) {
        pendingReordersRef.current = Math.max(0, pendingReordersRef.current - 1);
        setLocalNodes(previousNodes);
        queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), previousNodes);
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not save tree order." });
      }
    })();
  }, [clearNestIntentHint, clearRootBottomDropActive, estimateId, handleCanDrag, localNodes, projectId, queryClient, suppressPrimaryActionAfterDrag]);

  const handleRootBottomDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    const draggedItem = getDraggedTreeItemFromEvent(event);
    if (!draggedItem || !handleCanDropAt([draggedItem], rootBottomDropTarget)) {
      clearRootBottomDropActive();
      return;
    }

    draggedTreeItemRef.current = draggedItem;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setIsRootBottomDropActive(true);
  }, [clearRootBottomDropActive, getDraggedTreeItemFromEvent, handleCanDropAt, rootBottomDropTarget]);

  const handleRootBottomDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    const draggedItem = getDraggedTreeItemFromEvent(event);
    if (!draggedItem || !handleCanDropAt([draggedItem], rootBottomDropTarget)) {
      clearRootBottomDropActive();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleDrop([draggedItem], rootBottomDropTarget);
    draggedTreeItemRef.current = null;
  }, [clearRootBottomDropActive, getDraggedTreeItemFromEvent, handleCanDropAt, handleDrop, rootBottomDropTarget]);

  const handleAddTreeNode = useCallback((kind: EstimateTreeNode["kind"]) => {
    if (kind === "area" && !selectedGroupId) {
      setReorderStatus({ state: "error", message: "you must select a group first before adding an area node" });
      return;
    }

    const nodeName = kind === "group" ? "New Group" : "New Area Node";
    const optimisticNodeId = makeOptimisticTreeNodeId(kind);
    const optimisticNode = createOptimisticEstimateTreeNode(kind, optimisticNodeId, nodeName);
    const nextNodes = insertLocalEstimateTreeNode(localNodes, selectedGroupId, optimisticNode);

    setLocalNodes(nextNodes);
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nextNodes);
    if (selectedGroupId) {
      setExpandedNodeIds(Array.from(new Set([...expandedItems.map(String), selectedGroupId])));
    }
    setReorderStatus({ state: "saving", message: kind === "group" ? "Adding Group" : "Adding Node" });

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("name", nodeName);
    if (selectedGroupId) formData.set("parentId", selectedGroupId);

    startTransition(() => {
      function handleCreateFailure(error: unknown) {
        unstable_rethrow(error);
        setLocalNodes((currentNodes) => {
          const rolledBackNodes = removeLocalEstimateTreeNode(currentNodes, optimisticNodeId);
          queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), rolledBackNodes);
          return rolledBackNodes;
        });
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not add estimate tree node." });
      }

      try {
        const result = createEstimateNode(projectId, estimateId, formData) as Promise<unknown> | undefined;
        if (!result || typeof result.then !== "function") {
          setReorderStatus({ state: "saved", message: kind === "group" ? "Group added" : "Node added" });
          return;
        }
        void result
          .then(() => {
            setReorderStatus({ state: "saved", message: kind === "group" ? "Group added" : "Node added" });
          })
          .catch(handleCreateFailure);
      } catch (error) {
        handleCreateFailure(error);
      }
    });
  }, [
    estimateId,
    expandedItems,
    localNodes,
    projectId,
    queryClient,
    selectedGroupId,
    setExpandedNodeIds,
  ]);

  return (
    <ResizableSidePanel
      side="left"
      ariaLabel="Tree"
      storageKey="estimate_sheet_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={ESTIMATE_TREE_LEFT_EXTENSION_WIDTH}
    >
      <div className="flex h-full flex-col overflow-hidden border-r border-hairline bg-white">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <div className="flex h-[38px] items-center">
            <SearchInput
              wrapperClassName="w-full"
              placeholder="Search Tree"
              aria-label="Search Tree"
            />
          </div>
          <HeaderIconToolbar
            ariaLabel="Tree tools"
            labelPrefix="tree"
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            addActions={[
              {
                label: "Add Group",
                icon: <AddTreeActionIcon kind="group" />,
                onClick: () => handleAddTreeNode("group"),
              },
              {
                label: "Add Node",
                icon: <AddTreeActionIcon kind="area" />,
                onClick: () => handleAddTreeNode("area"),
              },
            ]}
          />
          {reorderStatus.state !== "idle" ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "border-t border-hairline px-2 py-1 text-[10px] leading-4",
                reorderStatus.state === "error" ? "text-red-700" : "text-tertiary",
              )}
            >
              {reorderStatus.message}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {localNodes.length === 0 ? (
            <div className="rounded-md border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
              This estimate has no tree nodes yet. Add a Group Node or Area Node to begin rebuilding the estimate structure.
            </div>
          ) : (
            <ControlledTreeEnvironment<EstimateTreeItemData>
              items={treeModel.items}
              getItemTitle={(item) => item.data.node?.name ?? projectName}
              viewState={viewState}
              defaultInteractionMode={InteractionMode.ClickArrowToExpand}
              canInvokePrimaryActionOnItemContainer
              canSearch={false}
              canDragAndDrop
              canReorderItems
              canDropOnFolder
              canDropOnNonFolder={false}
              canDropBelowOpenFolders
              canDrag={handleCanDrag}
              canDropAt={handleCanDropAt}
              onDrop={handleDrop}
              renderDepthOffset={TREE_INDENT_STEP}
              onPrimaryAction={(item) => {
                if (Date.now() < suppressPrimaryActionUntilRef.current) {
                  return;
                }
                const node = item.data.node;
                if (!node) return;
                setSelectedNodeId(node.id);
                setFocusedOverride({ routeNodeId: node.id, item: node.id });
                startTransition(() => {
                  router.push(`/workshop/projects/${projectId}/estimates/${node.id}`);
                });
              }}
              onExpandItem={(item) => {
                const itemId = String(item.index);
                setExpandedNodeIds(expandedItems.includes(itemId) ? expandedItems.map(String) : [...expandedItems.map(String), itemId]);
              }}
              onCollapseItem={(item) => {
                const itemId = String(item.index);
                setExpandedNodeIds(expandedItems.map(String).filter((expandedItemId) => expandedItemId !== itemId));
              }}
              onFocusItem={(item) => setFocusedOverride({ routeNodeId: activeSelectedNodeId, item: item.index })}
              renderTreeContainer={({ children, containerProps }) => {
                const { className, ...treeContainerProps } = containerProps as HTMLAttributes<HTMLDivElement>;
                return (
                  <nav aria-label={`${projectName} estimate areas`}>
                    <div {...treeContainerProps} className={cn("relative min-h-7 outline-none", className)}>
                      {children}
                    </div>
                  </nav>
                );
              }}
              renderItemsContainer={({ children, containerProps }) => {
                const { className, ...itemsContainerProps } = containerProps as HTMLAttributes<HTMLOListElement>;
                return (
                  <ol {...itemsContainerProps} className={cn("space-y-0", className)}>
                    {children}
                  </ol>
                );
              }}
              renderItemTitle={({ title, item }) => {
                const node = item.data.node;
                if (!node) return null;
                return (
                  <>
                    <span className="mr-1 flex size-4 shrink-0 items-center justify-center text-tertiary" aria-hidden="true">
                      <NodeIcon kind={node.kind} />
                    </span>
                    <span className="min-w-0 truncate text-left">{title}</span>
                  </>
                );
              }}
              renderItemArrow={({ item, context }) => {
                const node = item.data.node;
                const { className, ...arrowProps } = context.arrowProps as HTMLAttributes<HTMLSpanElement>;
                if (!item.isFolder || !node) return <span className="size-5" aria-hidden="true" />;
                return (
                  <span
                    {...arrowProps}
                    className={cn("flex size-5 cursor-pointer items-center justify-center rounded-sm text-tertiary transition hover:bg-surface-muted", className)}
                  >
                    <CaretDown size={12} aria-hidden="true" className={context.isExpanded ? "" : "-rotate-90"} />
                  </span>
                );
              }}
              renderItem={({ item, depth, children, title, arrow, context }) => {
                const node = item.data.node;
                if (!node) return null;

                const { className: liClassName, ...liProps } = context.itemContainerWithChildrenProps as HTMLAttributes<HTMLLIElement>;
                const { className: rowClassName, onDragOver: rowOnDragOver, onDrop: rowOnDrop, ...rowProps } = context.itemContainerWithoutChildrenProps as HTMLAttributes<HTMLDivElement>;
                const {
                  className: buttonClassName,
                  onDragStart,
                  onDragOver,
                  onDrop,
                  onDragEnd,
                  ...interactiveProps
                } = context.interactiveElementProps as ButtonHTMLAttributes<HTMLButtonElement>;
                const isRouteSelected = activeSelectedNodeId === node.id;
                const directFolderDropTarget = isEstimateGroupNodeKind(node.kind) ? createDirectFolderDropTarget(node, depth) : null;
                const isNestIntentTarget = nestIntentHint?.targetId === node.id;
                const handleDirectFolderNestDragOver = (event: DragEvent<HTMLElement>) => {
                  const draggedItem = getDraggedTreeItemFromEvent(event);
                  if (!draggedItem || !directFolderDropTarget || !isMiddleRowDrop(event) || !handleCanDropAt([draggedItem], directFolderDropTarget)) {
                    if (directFolderDropTarget) clearNestIntentHintForTarget(node);
                    return false;
                  }
                  draggedTreeItemRef.current = draggedItem;
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                  markNestIntentHint(node, draggedItem);
                  return true;
                };
                const handleDirectFolderNestDrop = (event: DragEvent<HTMLElement>) => {
                  const draggedItem = getDraggedTreeItemFromEvent(event);
                  if (!draggedItem || !directFolderDropTarget || !isMiddleRowDrop(event) || !handleCanDropAt([draggedItem], directFolderDropTarget)) return false;
                  event.preventDefault();
                  event.stopPropagation();
                  clearNestIntentHint();
                  handleDrop([draggedItem], directFolderDropTarget);
                  draggedTreeItemRef.current = null;
                  return true;
                };

                return (
                  <li {...liProps} className={cn("list-none", liClassName)}>
                    <div
                      {...rowProps}
                      onDragOver={(event) => {
                        if (handleDirectFolderNestDragOver(event)) return;
                        rowOnDragOver?.(event);
                      }}
                      onDrop={(event) => {
                        if (handleDirectFolderNestDrop(event)) return;
                        rowOnDrop?.(event);
                      }}
                      className={cn(
                        "relative grid h-8 grid-cols-[minmax(0,1fr)_20px] items-center gap-1 py-0.5",
                        rowClassName,
                      )}
                    >
                      <button
                        {...interactiveProps}
                        type="button"
                        aria-current={isRouteSelected ? "page" : undefined}
                        data-estimate-tree-active-node={isRouteSelected ? "true" : undefined}
                        data-estimate-tree-node-id={node.id}
                        onDragStart={(event) => {
                          clearNestIntentHint();
                          draggedTreeItemRef.current = item;
                          event.dataTransfer.setData(ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE, String(item.index));
                          suppressPrimaryActionAfterDrag();
                          onDragStart?.(event);
                        }}
                        onDragOver={(event) => {
                          if (handleDirectFolderNestDragOver(event)) return;
                          onDragOver?.(event);
                        }}
                        onDrop={(event) => {
                          if (handleDirectFolderNestDrop(event)) return;
                          onDrop?.(event);
                        }}
                        onDragEnd={(event) => {
                          onDragEnd?.(event);
                          clearNestIntentHint();
                          clearRootBottomDropActive();
                          window.setTimeout(() => {
                            draggedTreeItemRef.current = null;
                          }, 0);
                        }}
                        className={cn(
                          "relative inline-flex h-7 min-w-0 items-center justify-start gap-0 overflow-hidden rounded-md p-1 !text-[10px] !font-normal leading-none text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2",
                          isRouteSelected ? "bg-surface-muted ring-1 ring-[#d7dee8]" : "hover:bg-surface-muted",
                          isNestIntentTarget ? "bg-[#eef7ff] ring-1 ring-[#8bbce8] shadow-[inset_0_0_0_1px_rgba(44,120,180,0.18)]" : "",
                          buttonClassName,
                        )}
                      >
                        <span
                          data-estimate-tree-title-offset
                          className="flex h-full min-w-0 flex-1 items-center"
                          style={{ paddingLeft: `${Math.min(depth * TREE_INDENT_STEP, TREE_MAX_INDENT)}px` }}
                        >
                          {title}
                        </span>
                      </button>
                      {isNestIntentTarget ? (
                        <div
                          role="status"
                          aria-live="polite"
                          className="pointer-events-none absolute right-7 top-1/2 z-10 max-w-[62%] -translate-y-1/2 truncate rounded-sm border border-[#8bbce8] bg-white px-1.5 py-0.5 text-[9px] leading-3 text-[#155f9f] shadow-sm"
                        >
                          Nest inside {nestIntentHint.targetName}
                        </div>
                      ) : null}

                      {arrow}
                    </div>
                    {children}
                  </li>
                );
              }}
            >
              <>
                <Tree treeId={ESTIMATE_TREE_ID} rootItem={ESTIMATE_TREE_ROOT_ITEM_ID} treeLabel={`${projectName} estimate areas`} />
                <div
                  aria-hidden="true"
                  data-estimate-tree-root-bottom-drop="true"
                  data-estimate-tree-root-bottom-drop-active={isRootBottomDropActive ? "true" : undefined}
                  onDragOver={handleRootBottomDragOver}
                  onDrop={handleRootBottomDrop}
                  onDragLeave={clearRootBottomDropActive}
                  className="relative h-4 px-1"
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute left-1 right-6 top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-colors",
                      isRootBottomDropActive ? "bg-[#1976d2]" : "bg-transparent",
                    )}
                  />
                </div>
              </>
            </ControlledTreeEnvironment>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}
