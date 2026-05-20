"use client";

import { useRouter } from "next/navigation";
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
import { CaretDown, Cube, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { getEstimateNodeDisplayKind, isEstimateGroupNodeKind } from "@/lib/estimates/tree-hierarchy";
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

function NodeIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (getEstimateNodeDisplayKind(kind) === "group") return <FolderSimple size={12} weight="bold" aria-hidden="true" />;
  return <Cube size={12} weight="bold" aria-hidden="true" />;
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

  const isMiddleRowDrop = useCallback((event: DragEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    return relativeY > 0.25 && relativeY < 0.75;
  }, []);

  const handleDrop = useCallback((items: TreeItem<EstimateTreeItemData>[], target: Parameters<typeof evaluateEstimateTreeDrop>[0]["target"]) => {
    suppressPrimaryActionAfterDrag();
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
  }, [estimateId, handleCanDrag, localNodes, projectId, queryClient, suppressPrimaryActionAfterDrag]);

  const handleAddTreeNode = useCallback((kind: EstimateTreeNode["kind"]) => {
    if (kind === "area" && !selectedGroupId) {
      setReorderStatus({ state: "error", message: "you must select a group first before adding an area node" });
      return;
    }

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("name", kind === "group" ? "New Group" : "New Area Node");
    if (selectedGroupId) formData.set("parentId", selectedGroupId);

    setReorderStatus({ state: "idle" });
    startTransition(async () => {
      await createEstimateNode(projectId, estimateId, formData);
    });
  }, [estimateId, projectId, selectedGroupId]);

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
                visibleLabel: "Add Group",
                icon: <FolderSimple size={12} weight="bold" aria-hidden="true" />,
                onClick: () => handleAddTreeNode("group"),
              },
              {
                label: "Add Node",
                visibleLabel: "Add Node",
                icon: <Cube size={12} weight="bold" aria-hidden="true" />,
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
          {nodes.length === 0 ? (
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

                return (
                  <li {...liProps} className={cn("list-none", liClassName)}>
                    <div
                      {...rowProps}
                      onDragOver={(event) => {
                        rowOnDragOver?.(event);
                        const draggedItem = draggedTreeItemRef.current;
                        if (!draggedItem || !directFolderDropTarget || !isMiddleRowDrop(event)) return;
                        if (!handleCanDropAt([draggedItem], directFolderDropTarget)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        rowOnDrop?.(event);
                        const draggedItem = draggedTreeItemRef.current;
                        if (!draggedItem || !directFolderDropTarget || !isMiddleRowDrop(event)) return;
                        if (!handleCanDropAt([draggedItem], directFolderDropTarget)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        handleDrop([draggedItem], directFolderDropTarget);
                        draggedTreeItemRef.current = null;
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
                          draggedTreeItemRef.current = item;
                          suppressPrimaryActionAfterDrag();
                          onDragStart?.(event);
                        }}
                        onDragOver={(event) => {
                          onDragOver?.(event);
                          const draggedItem = draggedTreeItemRef.current;
                          if (!draggedItem || !directFolderDropTarget || !isMiddleRowDrop(event)) return;
                          if (!handleCanDropAt([draggedItem], directFolderDropTarget)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          onDrop?.(event);
                          const draggedItem = draggedTreeItemRef.current;
                          if (!draggedItem || !directFolderDropTarget || !isMiddleRowDrop(event)) return;
                          if (!handleCanDropAt([draggedItem], directFolderDropTarget)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          handleDrop([draggedItem], directFolderDropTarget);
                          draggedTreeItemRef.current = null;
                        }}
                        onDragEnd={(event) => {
                          onDragEnd?.(event);
                          window.setTimeout(() => {
                            draggedTreeItemRef.current = null;
                          }, 0);
                        }}
                        className={cn(
                          "relative inline-flex h-7 min-w-0 items-center justify-start gap-0 overflow-hidden rounded-md p-1 !text-[10px] !font-normal leading-none text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2",
                          isRouteSelected ? "bg-surface-muted ring-1 ring-[#d7dee8]" : "hover:bg-surface-muted",
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

                      {arrow}
                    </div>
                    {children}
                  </li>
                );
              }}
            >
              <Tree treeId={ESTIMATE_TREE_ID} rootItem={ESTIMATE_TREE_ROOT_ITEM_ID} treeLabel={`${projectName} estimate areas`} />
            </ControlledTreeEnvironment>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}
