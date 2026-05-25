"use client";

import { unstable_rethrow, usePathname, useRouter } from "next/navigation";
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
import { ArrowCounterClockwise, CaretDown, Check, Cube, FolderSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import type { ActionMenuGroup } from "@/components/ui/action-menu";
import { ControlInput } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getEstimateNodeDisplayKind, getEstimateNodeKindSortRank, isEstimateGroupNodeKind } from "@/lib/estimates/tree-hierarchy";
import { createEstimateNode, deleteEstimateNode, renameEstimateNode, reorderEstimateTreeNodes } from "@/lib/estimates/actions";
import { useEstimateAreaTreeQuery } from "@/hooks/use-estimate-query";
import { useEstimateWorkspaceExpansion, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import {
  WORKSHOP_TREE_ICON_SLOT_CLASS,
  WORKSHOP_TREE_INDENT_STEP,
  WORKSHOP_TREE_ROW_GAP_CLASS,
  WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS,
} from "./tree-visual-style";
import { WorkshopTreeRow, WorkshopTreeTabs } from "./workshop-tree";
import {
  ESTIMATE_TREE_ROOT_ITEM_ID,
  evaluateEstimateTreeDrop,
  getEstimateTreeContentSignature,
  mergeEstimateTreeStructureWithCachedNodes,
} from "@/lib/estimates/estimate-tree-reorder";
import { planEstimateTreeDelete, renameEstimateTreeNode } from "@/lib/estimates/estimate-tree-edit";
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
const ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE = "application/x-archestimator-estimate-tree-item";
const ESTIMATE_TREE_TABS = [{ id: "sheets", label: "Sheets" }] as const;

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

type RootDropEdge = "top" | "bottom";

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

function resolveConfirmedDeleteFallbackNodeId(tree: EstimateTreeNode[], fallbackNodeId: string | null) {
  if (fallbackNodeId && findEstimateNode(tree, fallbackNodeId)) return fallbackNodeId;
  return tree[0]?.id ?? null;
}

function getEstimateRouteNodeIdFromPathname(pathname: string | null, estimateId: string) {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  const estimatesSegmentIndex = segments.indexOf("estimates");
  const routeSegment = estimatesSegmentIndex >= 0 ? segments[estimatesSegmentIndex + 1] : null;
  if (!routeSegment || routeSegment === estimateId) return null;

  try {
    return decodeURIComponent(routeSegment);
  } catch {
    return routeSegment;
  }
}

export function EstimateSheetTree({ projectId, estimateId, projectName, selectedNodeId, nodes }: EstimateSheetTreeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast, dismissToast } = useToast();
  const {
    tree: localNodes,
    setTree: setLocalNodes,
    snapshot: snapshotLocalNodes,
    restore: restoreLocalNodes,
    getTreeRevision: getLocalTreeRevision,
    prepareOptimisticUpdate: prepareAreaTreeOptimisticUpdate,
  } = useEstimateAreaTreeQuery({ projectId, estimateId, initialNodes: nodes });
  const pendingReordersRef = useRef(0);
  const suppressPrimaryActionUntilRef = useRef(0);
  const draggedTreeItemRef = useRef<TreeItem<EstimateTreeItemData> | null>(null);
  const renameCommitInFlightRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const suppressContextMenuCloseAutoFocusRef = useRef(false);
  const ignoreRenameBlurDuringContextMenuCloseRef = useRef(false);
  const lastAcceptedPropSignatureRef = useRef(getEstimateTreeContentSignature(nodes));
  const lastObservedPropSignatureRef = useRef(getEstimateTreeContentSignature(nodes));
  const lastObservedPropNodesRef = useRef(nodes);
  const stalePropSignatureToIgnoreRef = useRef<string | null>(null);
  const pendingPropNodesRef = useRef<EstimateTreeNode[] | null>(null);
  const [reorderStatus, setReorderStatus] = useState<ReorderStatus>({ state: "idle" });
  const [nestIntentHint, setNestIntentHint] = useState<NestIntentHint | null>(null);
  const [activeRootDropEdge, setActiveRootDropEdge] = useState<RootDropEdge | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeName, setEditingNodeName] = useState("");
  const [editingNodeError, setEditingNodeError] = useState<string | null>(null);
  const [deleteTargetNode, setDeleteTargetNode] = useState<EstimateTreeNode | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const currentRouteNodeId = useMemo(
    () => getEstimateRouteNodeIdFromPathname(pathname, estimateId) ?? selectedNodeId,
    [estimateId, pathname, selectedNodeId],
  );
  const treeModel = useMemo(() => buildTreeModel(localNodes), [localNodes]);
  const allFolderItemIds = useMemo(() => Array.from(treeModel.folderIds).filter((itemId) => treeModel.items[itemId]), [treeModel.folderIds, treeModel.items]);
  const { expandedNodeIds, setExpandedNodeIds } = useEstimateWorkspaceExpansion(estimateId, allFolderItemIds);
  const [focusedOverride, setFocusedOverride] = useState<{ routeNodeId: string | null; item: TreeItemIndex } | null>(null);

  useEffect(() => {
    if (reorderStatus.state === "saving") {
      toast({
        id: "estimate-tree-mutation",
        message: reorderStatus.message,
        tone: "loading",
        durationMs: null,
      });
      return;
    }

    if (reorderStatus.state === "error") {
      toast({
        id: "estimate-tree-mutation",
        message: reorderStatus.message,
        tone: "error",
      });
      return;
    }

    if (reorderStatus.state === "saved") {
      toast({
        id: "estimate-tree-mutation",
        message: reorderStatus.message,
        tone: "success",
      });
      return;
    }

    dismissToast("estimate-tree-mutation");
  }, [dismissToast, reorderStatus, toast]);

  useEffect(() => {
    return () => dismissToast("estimate-tree-mutation");
  }, [dismissToast]);

  const selectedGroupId = useMemo(() => {
    const selectedNode = activeSelectedNodeId ? findEstimateNode(localNodes, activeSelectedNodeId) : undefined;
    return selectedNode && isEstimateGroupNodeKind(selectedNode.kind) ? selectedNode.id : null;
  }, [activeSelectedNodeId, localNodes]);

  const syncLocalNodesFromProps = useCallback((incomingNodes: EstimateTreeNode[]) => {
    const incomingSignature = getEstimateTreeContentSignature(incomingNodes);
    setLocalNodes((currentNodes) => {
      if (stalePropSignatureToIgnoreRef.current === incomingSignature) {
        stalePropSignatureToIgnoreRef.current = null;
        return currentNodes;
      }

      const currentSignature = getEstimateTreeContentSignature(currentNodes);
      if (currentSignature === incomingSignature) {
        lastAcceptedPropSignatureRef.current = incomingSignature;
        return currentNodes;
      }

      lastAcceptedPropSignatureRef.current = incomingSignature;
      stalePropSignatureToIgnoreRef.current = null;
      return incomingNodes;
    });
  }, [setLocalNodes]);

  const finishPendingReorder = useCallback(() => {
    pendingReordersRef.current = Math.max(0, pendingReordersRef.current - 1);
    if (pendingReordersRef.current > 0 || !pendingPropNodesRef.current) return;

    const pendingPropNodes = pendingPropNodesRef.current;
    pendingPropNodesRef.current = null;
    syncLocalNodesFromProps(pendingPropNodes);
  }, [syncLocalNodesFromProps]);

  useEffect(() => {
    const incomingSignature = getEstimateTreeContentSignature(nodes);
    if (nodes === lastObservedPropNodesRef.current && incomingSignature === lastObservedPropSignatureRef.current) return;
    lastObservedPropNodesRef.current = nodes;
    lastObservedPropSignatureRef.current = incomingSignature;

    if (pendingReordersRef.current > 0) {
      pendingPropNodesRef.current = nodes;
      return;
    }
    syncLocalNodesFromProps(nodes);
  }, [nodes, syncLocalNodesFromProps]);

  useEffect(() => {
    if (!editingNodeId) {
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
      return undefined;
    }
    let focusAnimationFrame: number | null = null;
    let focusTimeout: number | null = null;
    const focusRenameInput = () => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    };
    const menuCloseAnimationFrame = window.requestAnimationFrame(() => {
      focusAnimationFrame = window.requestAnimationFrame(() => {
        focusRenameInput();
        focusTimeout = window.setTimeout(() => {
          focusRenameInput();
          ignoreRenameBlurDuringContextMenuCloseRef.current = false;
        }, 0);
      });
    });
    return () => {
      window.cancelAnimationFrame(menuCloseAnimationFrame);
      if (focusAnimationFrame !== null) window.cancelAnimationFrame(focusAnimationFrame);
      if (focusTimeout !== null) window.clearTimeout(focusTimeout);
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    };
  }, [editingNodeId]);

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

  const isTreeMutationSaving = reorderStatus.state === "saving" || deletePending;
  const canReorderNow = !isTreeMutationSaving;
  const handleCanDrag = useCallback((items: TreeItem<EstimateTreeItemData>[]) => (
    canReorderNow && !editingNodeId && items.length === 1 && Boolean(items[0]?.data.node)
  ), [canReorderNow, editingNodeId]);

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

  const clearRootDropActive = useCallback(() => {
    setActiveRootDropEdge(null);
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

  const rootDropTargets = useMemo<Record<RootDropEdge, DraggingPosition>>(() => ({
    top: {
      targetType: "between-items",
      treeId: ESTIMATE_TREE_ID,
      parentItem: ESTIMATE_TREE_ROOT_ITEM_ID,
      childIndex: 0,
      linePosition: "top",
      linearIndex: 0,
      depth: 0,
    },
    bottom: {
      targetType: "between-items",
      treeId: ESTIMATE_TREE_ID,
      parentItem: ESTIMATE_TREE_ROOT_ITEM_ID,
      childIndex: localNodes.length,
      linePosition: "bottom",
      linearIndex: localNodes.length,
      depth: 0,
    },
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
    clearRootDropActive();
    if (!handleCanDrag(items)) return;

    const draggedItemIds = items.map((item) => item.index);
    const result = evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedItemIds,
      target,
    });
    if (!result.ok) return;

    pendingReordersRef.current += 1;
    setReorderStatus({ state: "saving", message: "Saving tree order" });

    void (async () => {
      let previousNodes = localNodes;
      let optimisticRevision: number | null = null;
      try {
        previousNodes = await prepareAreaTreeOptimisticUpdate();
        const freshResult = evaluateEstimateTreeDrop({
          nodes: previousNodes,
          draggedItemIds,
          target,
        });
        if (!freshResult.ok) {
          setReorderStatus({ state: "error", message: freshResult.message });
          return;
        }

        stalePropSignatureToIgnoreRef.current = lastAcceptedPropSignatureRef.current;
        setLocalNodes(freshResult.plan.nextNodes);
        optimisticRevision = getLocalTreeRevision();
        const confirmed = await reorderEstimateTreeNodes(projectId, estimateId, { updates: freshResult.plan.updates });
        if (getLocalTreeRevision() === optimisticRevision) {
          setLocalNodes((currentNodes) =>
            mergeEstimateTreeStructureWithCachedNodes({
              structureNodes: confirmed.tree,
              cachedNodes: currentNodes,
            }),
          );
        }
        setReorderStatus({ state: "saved", message: "Tree order saved" });
      } catch (error) {
        if (optimisticRevision === null) {
          setLocalNodes(previousNodes);
        } else {
          restoreLocalNodes(previousNodes, optimisticRevision);
        }
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not save tree order." });
      } finally {
        finishPendingReorder();
      }
    })();
  }, [
    clearNestIntentHint,
    clearRootDropActive,
    estimateId,
    finishPendingReorder,
    getLocalTreeRevision,
    handleCanDrag,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    restoreLocalNodes,
    setLocalNodes,
    suppressPrimaryActionAfterDrag,
  ]);

  const handleRootDropZoneDragOver = useCallback((edge: RootDropEdge, event: DragEvent<HTMLDivElement>) => {
    const draggedItem = getDraggedTreeItemFromEvent(event);
    const target = rootDropTargets[edge];
    if (!draggedItem || !handleCanDropAt([draggedItem], target)) {
      clearRootDropActive();
      return;
    }

    draggedTreeItemRef.current = draggedItem;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setActiveRootDropEdge(edge);
  }, [clearRootDropActive, getDraggedTreeItemFromEvent, handleCanDropAt, rootDropTargets]);

  const handleRootDropZoneDrop = useCallback((edge: RootDropEdge, event: DragEvent<HTMLDivElement>) => {
    const draggedItem = getDraggedTreeItemFromEvent(event);
    const target = rootDropTargets[edge];
    if (!draggedItem || !handleCanDropAt([draggedItem], target)) {
      clearRootDropActive();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleDrop([draggedItem], target);
    draggedTreeItemRef.current = null;
  }, [clearRootDropActive, getDraggedTreeItemFromEvent, handleCanDropAt, handleDrop, rootDropTargets]);

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
    selectedGroupId,
    setExpandedNodeIds,
    setLocalNodes,
  ]);

  const beginRenameNode = useCallback((node: EstimateTreeNode) => {
    if (isTreeMutationSaving) return;
    suppressContextMenuCloseAutoFocusRef.current = true;
    ignoreRenameBlurDuringContextMenuCloseRef.current = true;
    setEditingNodeId(node.id);
    setEditingNodeName(node.name);
    setEditingNodeError(null);
  }, [isTreeMutationSaving]);

  const cancelRenameNode = useCallback(() => {
    suppressContextMenuCloseAutoFocusRef.current = false;
    ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    setEditingNodeId(null);
    setEditingNodeName("");
    setEditingNodeError(null);
  }, []);

  const resetRenameNode = useCallback((node: EstimateTreeNode) => {
    setEditingNodeName(node.name);
    setEditingNodeError(null);
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
    window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, []);

  const commitRenameNode = useCallback((node: EstimateTreeNode) => {
    if (renameCommitInFlightRef.current) return;
    suppressContextMenuCloseAutoFocusRef.current = false;
    ignoreRenameBlurDuringContextMenuCloseRef.current = false;

    const nextName = editingNodeName.trim();
    if (!nextName) {
      setEditingNodeError("Name is required.");
      window.requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      });
      return;
    }
    if (nextName === node.name) {
      cancelRenameNode();
      return;
    }

    renameCommitInFlightRef.current = true;
    setEditingNodeId(null);
    setEditingNodeError(null);
    setReorderStatus({ state: "saving", message: "Renaming node" });

    void (async () => {
      let previousNodes = localNodes;
      try {
        previousNodes = await prepareAreaTreeOptimisticUpdate();
        const nextNodes = renameEstimateTreeNode(previousNodes, node.id, nextName);
        setLocalNodes(nextNodes);
        const confirmed = await renameEstimateNode(projectId, estimateId, node.id, nextName);
        if (confirmed.nodeId !== node.id || confirmed.name !== nextName) {
          setLocalNodes((currentNodes) => renameEstimateTreeNode(currentNodes, confirmed.nodeId, confirmed.name));
        }
        setReorderStatus({ state: "saved", message: "Node renamed" });
      } catch (error) {
        unstable_rethrow(error);
        const currentNodes = snapshotLocalNodes();
        const currentNode = findEstimateNode(currentNodes, node.id);
        if (currentNode?.name === nextName) {
          setLocalNodes(renameEstimateTreeNode(currentNodes, node.id, node.name));
          setEditingNodeId(node.id);
          setEditingNodeName(nextName);
          setEditingNodeError(error instanceof Error ? error.message : "Could not rename node.");
        } else {
          setEditingNodeId(null);
          setEditingNodeName("");
          setEditingNodeError(null);
        }
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not rename node." });
      } finally {
        renameCommitInFlightRef.current = false;
      }
    })();
  }, [
    cancelRenameNode,
    editingNodeName,
    estimateId,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    setLocalNodes,
    snapshotLocalNodes,
  ]);

  const replaceEstimateRoute = useCallback((nodeId: string | null) => {
    const href = nodeId
      ? `/workshop/projects/${projectId}/estimates/${nodeId}`
      : `/workshop/projects/${projectId}/estimates/${estimateId}`;
    startTransition(() => {
      router.replace(href);
    });
  }, [estimateId, projectId, router]);

  const handleConfirmDeleteNode = useCallback(() => {
    if (!deleteTargetNode || isTreeMutationSaving) return;

    const targetNode = deleteTargetNode;
    const previousSelectedNodeId = activeSelectedNodeId;
    const previousFocusedOverride = focusedOverride;
    const routeNodeIdBeforeDelete = currentRouteNodeId;
    let routeWasDeleted = false;

    setDeletePending(true);
    setDeleteTargetNode(null);
    setReorderStatus({ state: "saving", message: "Deleting node" });

    void (async () => {
      let previousNodes = localNodes;
      let optimisticRevision: number | null = null;
      let optimisticRouteNodeId = routeNodeIdBeforeDelete;
      try {
        previousNodes = await prepareAreaTreeOptimisticUpdate();
        const deletePlan = planEstimateTreeDelete(previousNodes, targetNode.id, activeSelectedNodeId);
        routeWasDeleted = routeNodeIdBeforeDelete ? deletePlan.deletedNodeIds.has(routeNodeIdBeforeDelete) : false;
        optimisticRouteNodeId = routeWasDeleted ? deletePlan.fallbackNodeId : routeNodeIdBeforeDelete;
        const activeSelectionWasDeleted = activeSelectedNodeId ? deletePlan.deletedNodeIds.has(activeSelectedNodeId) : false;

        setLocalNodes(deletePlan.nextNodes);
        optimisticRevision = getLocalTreeRevision();
        if (activeSelectionWasDeleted) {
          setSelectedNodeId(deletePlan.fallbackNodeId);
          setFocusedOverride(deletePlan.fallbackNodeId ? { routeNodeId: deletePlan.fallbackNodeId, item: deletePlan.fallbackNodeId } : null);
        }
        if (routeWasDeleted) replaceEstimateRoute(deletePlan.fallbackNodeId);

        const confirmed = await deleteEstimateNode(projectId, estimateId, targetNode.id);
        const confirmedDeletedNodeIds = new Set(confirmed.deletedNodeIds);
        const confirmedFallbackNodeId = resolveConfirmedDeleteFallbackNodeId(confirmed.tree, confirmed.fallbackNodeId);
        const confirmedActiveNodeStillExists = activeSelectedNodeId ? Boolean(findEstimateNode(confirmed.tree, activeSelectedNodeId)) : true;
        const confirmedRouteNodeStillExists = routeNodeIdBeforeDelete ? Boolean(findEstimateNode(confirmed.tree, routeNodeIdBeforeDelete)) : true;
        const activeSelectionWasDeletedOnServer = activeSelectedNodeId
          ? confirmedDeletedNodeIds.has(activeSelectedNodeId) || !confirmedActiveNodeStillExists
          : false;
        const routeWasDeletedOnServer = routeNodeIdBeforeDelete
          ? confirmedDeletedNodeIds.has(routeNodeIdBeforeDelete) || !confirmedRouteNodeStillExists
          : false;
        const serverRouteNodeId = routeWasDeletedOnServer ? confirmedFallbackNodeId : routeNodeIdBeforeDelete;

        setLocalNodes(confirmed.tree);
        if (activeSelectionWasDeletedOnServer) {
          setSelectedNodeId(confirmedFallbackNodeId);
          setFocusedOverride(confirmedFallbackNodeId ? { routeNodeId: confirmedFallbackNodeId, item: confirmedFallbackNodeId } : null);
        }
        if ((routeWasDeleted || routeWasDeletedOnServer) && optimisticRouteNodeId !== serverRouteNodeId) {
          replaceEstimateRoute(serverRouteNodeId);
        }
        setReorderStatus({ state: "saved", message: "Node deleted" });
      } catch (error) {
        unstable_rethrow(error);
        let didRestoreTree = true;
        if (optimisticRevision === null) {
          setLocalNodes(previousNodes);
        } else {
          didRestoreTree = restoreLocalNodes(previousNodes, optimisticRevision);
        }
        if (didRestoreTree) {
          setSelectedNodeId(previousSelectedNodeId);
          setFocusedOverride(previousFocusedOverride);
          if (routeWasDeleted && routeNodeIdBeforeDelete) replaceEstimateRoute(routeNodeIdBeforeDelete);
        }
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not delete node." });
      } finally {
        setDeletePending(false);
      }
    })();
  }, [
    activeSelectedNodeId,
    currentRouteNodeId,
    deleteTargetNode,
    estimateId,
    focusedOverride,
    getLocalTreeRevision,
    isTreeMutationSaving,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    replaceEstimateRoute,
    restoreLocalNodes,
    setSelectedNodeId,
    setLocalNodes,
  ]);

  const handleDeleteModalOpenChange = useCallback((open: boolean) => {
    if (!open && !deletePending) setDeleteTargetNode(null);
  }, [deletePending]);

  const deleteTargetDisplayKind = deleteTargetNode ? getEstimateNodeDisplayKind(deleteTargetNode.kind) : null;
  const deleteConfirmationDescription = deleteTargetNode
    ? deleteTargetDisplayKind === "group"
      ? "This removes the group, child groups, child areas, and descendant estimate rows."
      : "This removes the area and its estimate rows."
    : "";

  return (
    <>
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
          <WorkshopTreeTabs tabs={ESTIMATE_TREE_TABS} activeTab="sheets" ariaLabel="Estimate tree views" />
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
              renderDepthOffset={WORKSHOP_TREE_INDENT_STEP}
              onPrimaryAction={(item) => {
                if (Date.now() < suppressPrimaryActionUntilRef.current) {
                  return;
                }
                if (editingNodeId) return;
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
                  <ol {...itemsContainerProps} className={cn(WORKSHOP_TREE_ROW_GAP_CLASS, className)}>
                    {children}
                  </ol>
                );
              }}
              renderItemTitle={({ title, item }) => {
                const node = item.data.node;
                if (!node) return null;
                const isEditing = editingNodeId === node.id;
                const errorId = `estimate-tree-rename-error-${node.id}`;
                return (
                  <>
                    <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
                      <NodeIcon kind={node.kind} />
                    </span>
                    {isEditing ? (
                      <span className="relative flex min-w-0 flex-1 items-center gap-1">
                        <ControlInput
                          ref={renameInputRef}
                          value={editingNodeName}
                          aria-label={`Rename ${node.name}`}
                          aria-invalid={editingNodeError ? "true" : undefined}
                          aria-describedby={editingNodeError ? errorId : undefined}
                          draggable={false}
                          onChange={(event) => {
                            setEditingNodeName(event.currentTarget.value);
                            if (editingNodeError) setEditingNodeError(null);
                          }}
                          onBlur={(event) => {
                            if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest("[data-estimate-tree-rename-control='true']")) return;
                            if (ignoreRenameBlurDuringContextMenuCloseRef.current && editingNodeName === node.name) return;
                            commitRenameNode(node);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                          onDragStart={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitRenameNode(node);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelRenameNode();
                            }
                          }}
                          className={cn(
                            "h-5 min-h-0 flex-1 rounded-sm border-accent bg-white px-1 py-0 font-normal leading-5 shadow-[inset_0_0_0_1px_rgba(255,122,26,0.14)] hover:border-accent focus:border-accent focus:bg-white focus-visible:ring-2 focus-visible:ring-accentSoft",
                            editingNodeError ? "border-danger focus:border-danger focus-visible:ring-danger" : "",
                          )}
                        />
                        <button
                          type="button"
                          data-estimate-tree-rename-control="true"
                          aria-label={`Confirm rename ${node.name}`}
                          title="Confirm rename"
                          className="grid size-5 shrink-0 place-items-center rounded-sm border border-accent bg-white text-warning transition hover:bg-accentSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            commitRenameNode(node);
                          }}
                        >
                          <Check size={12} weight="bold" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          data-estimate-tree-rename-control="true"
                          aria-label={`Reset rename ${node.name}`}
                          title="Reset name"
                          className="grid size-5 shrink-0 place-items-center rounded-sm border border-accent/70 bg-white text-warning transition hover:bg-accentSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            resetRenameNode(node);
                          }}
                        >
                          <ArrowCounterClockwise size={12} weight="bold" aria-hidden="true" />
                        </button>
                        {editingNodeError ? (
                          <span
                            id={errorId}
                            role="alert"
                            className="absolute left-0 top-[22px] z-20 max-w-[180px] truncate rounded-sm border border-dangerSoft bg-white px-1 py-0.5 text-[9px] font-semibold leading-3 text-danger shadow-sm"
                          >
                            {editingNodeError}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="min-w-0 truncate text-left">{title}</span>
                    )}
                  </>
                );
              }}
              renderItemArrow={({ item, context }) => {
                const node = item.data.node;
                const { className, ...arrowProps } = context.arrowProps as HTMLAttributes<HTMLSpanElement>;
                if (!item.isFolder || !node) return <span className="size-4" aria-hidden="true" />;
                return (
                  <span
                    {...arrowProps}
                    className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "cursor-pointer transition hover:bg-surface-muted", className)}
                  >
                    <CaretDown size={11} aria-hidden="true" className={context.isExpanded ? "" : "-rotate-90"} />
                  </span>
                );
              }}
              renderItem={({ item, depth, children, title, arrow, context }) => {
                const node = item.data.node;
                if (!node) return null;

                const { className: liClassName, ...liProps } = context.itemContainerWithChildrenProps as HTMLAttributes<HTMLLIElement>;
                const { className: rowClassName, style: rowStyle, onDragOver: rowOnDragOver, onDrop: rowOnDrop, ...rowProps } = context.itemContainerWithoutChildrenProps as HTMLAttributes<HTMLDivElement>;
                const {
                  className: buttonClassName,
                  onDragStart,
                  onDragOver,
                  onDrop,
                  onDragEnd,
                  onContextMenu,
                  ...interactiveProps
                } = context.interactiveElementProps as ButtonHTMLAttributes<HTMLButtonElement>;
                const isRouteSelected = activeSelectedNodeId === node.id;
                const isEditing = editingNodeId === node.id;
                const nodeActionGroups: ActionMenuGroup[] = [
                  {
                    id: "node-actions",
                    items: [
                      {
                        id: "rename",
                        label: "Rename",
                        disabled: isTreeMutationSaving,
                        disabledReason: "Finish the current tree save before renaming another node.",
                        onSelect: () => beginRenameNode(node),
                      },
                      {
                        id: "delete",
                        label: "Delete",
                        tone: "destructive",
                        disabled: isTreeMutationSaving,
                        disabledReason: "Finish the current tree save before deleting another node.",
                        onSelect: () => setDeleteTargetNode(node),
                      },
                    ],
                  },
                ];
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
                const nodeInteractiveClassName = cn(
                  "relative justify-start gap-0 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2",
                  buttonClassName,
                );
                const nodeContextMenuContentProps = {
                  "data-estimate-tree-context-menu": "true",
                  alignOffset: 4,
                  onCloseAutoFocus: (event: Event) => {
                    if (suppressContextMenuCloseAutoFocusRef.current) {
                      event.preventDefault();
                      window.setTimeout(() => {
                        renameInputRef.current?.focus();
                        renameInputRef.current?.select();
                        suppressContextMenuCloseAutoFocusRef.current = false;
                        ignoreRenameBlurDuringContextMenuCloseRef.current = false;
                      }, 0);
                    }
                  },
                };
                const nodeTitleContent = (
                  <span
                    data-estimate-tree-title-offset
                    className="flex h-full min-w-0 flex-1 items-center"
                  >
                    {title}
                  </span>
                );
                const nodeContent = (
                  <>
                    {arrow}
                    {nodeTitleContent}
                  </>
                );
                const nodeButton = isEditing ? (
                  <WorkshopTreeRow
                    as="div"
                    aria-current={isRouteSelected ? "page" : undefined}
                    data-estimate-tree-active-node={isRouteSelected ? "true" : undefined}
                    data-estimate-tree-node-id={node.id}
                    draggable={false}
                    depth={depth}
                    selected={isRouteSelected}
                    editing
                    intent={isNestIntentTarget}
                    contextMenuGroups={nodeActionGroups}
                    contextMenuContentProps={nodeContextMenuContentProps}
                    onContextMenu={(event) => {
                      event.stopPropagation();
                    }}
                    onDragStart={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                    }}
                    onDragEnd={() => {
                      clearNestIntentHint();
                      clearRootDropActive();
                      window.setTimeout(() => {
                        draggedTreeItemRef.current = null;
                      }, 0);
                    }}
                    className={nodeInteractiveClassName}
                  >
                    {nodeContent}
                  </WorkshopTreeRow>
                ) : (
                  <WorkshopTreeRow
                    {...interactiveProps}
                    type="button"
                    aria-current={isRouteSelected ? "page" : undefined}
                    data-estimate-tree-active-node={isRouteSelected ? "true" : undefined}
                    data-estimate-tree-node-id={node.id}
                    draggable={interactiveProps.draggable}
                    depth={depth}
                    selected={isRouteSelected}
                    intent={isNestIntentTarget}
                    contextMenuGroups={nodeActionGroups}
                    contextMenuContentProps={nodeContextMenuContentProps}
                    onContextMenu={(event) => {
                      onContextMenu?.(event);
                      event.stopPropagation();
                    }}
                    onDragStart={(event) => {
                      if (isEditing) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      clearNestIntentHint();
                      draggedTreeItemRef.current = item;
                      event.dataTransfer.setData(ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE, String(item.index));
                      suppressPrimaryActionAfterDrag();
                      onDragStart?.(event);
                    }}
                    onDragOver={(event) => {
                      if (isEditing) return;
                      if (handleDirectFolderNestDragOver(event)) return;
                      onDragOver?.(event);
                    }}
                    onDrop={(event) => {
                      if (isEditing) return;
                      if (handleDirectFolderNestDrop(event)) return;
                      onDrop?.(event);
                    }}
                    onDragEnd={(event) => {
                      onDragEnd?.(event);
                      clearNestIntentHint();
                      clearRootDropActive();
                      window.setTimeout(() => {
                        draggedTreeItemRef.current = null;
                      }, 0);
                    }}
                    className={nodeInteractiveClassName}
                  >
                    {nodeContent}
                  </WorkshopTreeRow>
                );

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
                      data-estimate-tree-row="true"
                      className={cn(
                        "relative flex items-center gap-0.5 py-0",
                        WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS,
                        rowClassName,
                      )}
                      style={rowStyle}
                    >
                      <div className="min-w-0 flex-1">{nodeButton}</div>
                      {isNestIntentTarget ? (
                        <div
                          role="status"
                          aria-live="polite"
                          className="pointer-events-none absolute right-7 top-1/2 z-10 max-w-[62%] -translate-y-1/2 truncate rounded-sm border border-[#8bbce8] bg-white px-1.5 py-0.5 text-[9px] leading-3 text-[#155f9f] shadow-sm"
                        >
                          Nest inside {nestIntentHint.targetName}
                        </div>
                      ) : null}
                    </div>
                    {children}
                  </li>
                );
              }}
            >
              <>
                <div
                  aria-hidden="true"
                  data-estimate-tree-root-top-drop="true"
                  data-estimate-tree-root-top-drop-active={activeRootDropEdge === "top" ? "true" : undefined}
                  onDragOver={(event) => handleRootDropZoneDragOver("top", event)}
                  onDrop={(event) => handleRootDropZoneDrop("top", event)}
                  onDragLeave={clearRootDropActive}
                  className={cn(
                    "relative h-8 px-1 py-2 transition-colors",
                    activeRootDropEdge === "top" ? "rounded-md bg-[#eef7ff]" : "bg-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute left-1 right-6 top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-colors",
                      activeRootDropEdge === "top" ? "bg-[#1976d2] shadow-[0_0_0_1px_rgba(25,118,210,0.15)]" : "bg-transparent",
                    )}
                  />
                </div>
                <Tree treeId={ESTIMATE_TREE_ID} rootItem={ESTIMATE_TREE_ROOT_ITEM_ID} treeLabel={`${projectName} estimate areas`} />
                <div
                  aria-hidden="true"
                  data-estimate-tree-root-bottom-drop="true"
                  data-estimate-tree-root-bottom-drop-active={activeRootDropEdge === "bottom" ? "true" : undefined}
                  onDragOver={(event) => handleRootDropZoneDragOver("bottom", event)}
                  onDrop={(event) => handleRootDropZoneDrop("bottom", event)}
                  onDragLeave={clearRootDropActive}
                  className={cn(
                    "relative h-8 px-1 py-2 transition-colors",
                    activeRootDropEdge === "bottom" ? "rounded-md bg-[#eef7ff]" : "bg-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute left-1 right-6 top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-colors",
                      activeRootDropEdge === "bottom" ? "bg-[#1976d2] shadow-[0_0_0_1px_rgba(25,118,210,0.15)]" : "bg-transparent",
                    )}
                  />
                </div>
              </>
            </ControlledTreeEnvironment>
          )}
        </div>
        </div>
      </ResizableSidePanel>
      <Modal
        open={Boolean(deleteTargetNode)}
        title={deleteTargetNode ? `Delete ${deleteTargetNode.name}` : "Delete node"}
        description={deleteConfirmationDescription}
        onOpenChange={handleDeleteModalOpenChange}
        closeLabel="Cancel delete"
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] font-semibold leading-4 text-ink">
            {deleteTargetNode ? (
              <>
                Delete <span className="font-bold">{deleteTargetNode.name}</span>? This action updates the tree immediately and can be undone only if the server rejects it.
              </>
            ) : null}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deletePending}
              onClick={() => setDeleteTargetNode(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deletePending}
              onClick={handleConfirmDeleteNode}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
