"use client";

import { unstable_rethrow, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  Check,
  Circle,
  PencilSimple,
  StackPlus,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { Button } from "@/components/ui/button";
import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ControlInput } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { TREE_ROW_ICON_SIZE, Tree, type TreeDropPosition, type TreeExternalDropOptions, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import { isEstimateGroupNodeKind } from "@/lib/estimates/tree-hierarchy";
import { createEstimateNode, deleteEstimateNode, deleteEstimateNodesBulk, renameEstimateNode, reorderEstimateTreeNodes } from "@/lib/estimates/actions";
import {
  dedupeSelectedRoots,
  pruneSelection,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "@/lib/bulk-selection/tree-selection";
import { useEstimateAreaTreeQuery, useEstimateTabTreeQuery } from "@/hooks/use-estimate-query";
import { useEstimateWorkspaceExpansion, useEstimateWorkspaceSelection, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import {
  evaluateEstimateTreeDrop,
  getEstimateTreeContentSignature,
  mergeEstimateTreeStructureWithCachedNodes,
} from "@/lib/estimates/estimate-tree-reorder";
import { planEstimateTreeDelete, renameEstimateTreeNode } from "@/lib/estimates/estimate-tree-edit";
import {
  CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT,
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  INSERT_ESTIMATE_TEMPLATE_EVENT,
  INSERT_PROJECT_SOURCE_EVENT,
  PROJECT_SOURCE_DRAG_MIME_TYPE,
  readEstimateTemplateDragPayload,
  readProjectSourceDragPayload,
  type CreateEstimateTemplateFromNodeEventDetail,
  type InsertEstimateTemplateEventDetail,
  type InsertProjectSourceEventDetail,
} from "./component-library/templates";
import { findEstimateNode, type EstimateTreeNode } from "./estimate-tree-data";
import { ESTIMATE_TREE_DRAG_MIME_TYPE } from "./estimate-sheet/drag-types";
import { REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, type RequestEstimateTreeNodeCreateEventDetail } from "./estimate-sheet/events";
import { ResizableSidePanel } from "./ResizableSidePanel";

type EstimateSheetTreeProps = {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  initialTabId?: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
};

const ESTIMATE_TREE_LEFT_EXTENSION_WIDTH = 104;
const ESTIMATE_TREE_TABS = [{ id: "sheets", label: "Sheets" }] as const;

type ReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

// Same icon scale as the right-sidebar trees: every tree panel renders row
// icons at the shared TREE_ROW_ICON_SIZE so no panel reads "bigger". One
// neutral node glyph for every node — containment is shown by the disclosure
// caret (rendered only when the node has children), not by a folder-vs-pin
// distinction that no longer exists under the single-node model.
function NodeIcon() {
  return <Circle size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function AddTreeActionIcon() {
  return <Circle size={13} weight="regular" aria-hidden="true" />;
}

function cloneEstimateTreeNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneEstimateTreeNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}

// New nodes append after their siblings — the same slot the server assigns
// (max sibling sort_order + 1) — so the optimistic tree and the settled tree
// agree without any kind-based re-sorting.
function insertLocalEstimateTreeNode(nodes: EstimateTreeNode[], parentId: string | null, nodeToInsert: EstimateTreeNode): EstimateTreeNode[] {
  if (parentId === null) {
    return [...nodes.map(cloneEstimateTreeNode), cloneEstimateTreeNode(nodeToInsert)];
  }

  return nodes.map((node) => {
    const cloned = cloneEstimateTreeNode(node);
    if (cloned.id === parentId && isEstimateGroupNodeKind(cloned.kind)) {
      return {
        ...cloned,
        children: [...(cloned.children ?? []), cloneEstimateTreeNode(nodeToInsert)],
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

function isOptimisticEstimateNodeId(nodeId: string) {
  return nodeId.startsWith("optimistic-");
}

/** Swaps an optimistic node id for its server-confirmed id without touching the rest of the node. */
function replaceLocalEstimateTreeNodeId(nodes: EstimateTreeNode[], fromId: string, toId: string): EstimateTreeNode[] {
  return nodes.map((node) => {
    const cloned = cloneEstimateTreeNode(node);
    if (cloned.id === fromId) return { ...cloned, id: toId };
    if (cloned.children?.length) return { ...cloned, children: replaceLocalEstimateTreeNodeId(cloned.children, fromId, toId) };
    return cloned;
  });
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

type UiTreeModel = {
  uiNodes: UiTreeNode[];
  folderIds: Set<string>;
};

function buildUiTreeModel(nodes: EstimateTreeNode[]): UiTreeModel {
  const folderIds = new Set<string>();

  function toUiNode(node: EstimateTreeNode): UiTreeNode {
    // Leaf vs container is derived from CHILDREN, not kind: a node that has
    // child sub-areas is expandable; a node with none is a leaf. On all-area
    // trees this matches the old kind-based result, and it stays correct once
    // any node can nest (single-node model).
    const isFolder = Boolean(node.children?.length);
    if (isFolder) folderIds.add(node.id);
    return {
      id: node.id,
      label: node.name,
      isLeaf: !isFolder,
      icon: <NodeIcon />,
      children: node.children?.map(toUiNode),
      data: { node },
    };
  }

  return { uiNodes: nodes.map(toUiNode), folderIds };
}

/** Name-match filter keeping matching nodes with their full subtree, and the ancestors of matches. */
function filterEstimateTreeNodes(nodes: EstimateTreeNode[], query: string): EstimateTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return nodes;

  function visit(node: EstimateTreeNode): EstimateTreeNode | null {
    if (node.name.toLowerCase().includes(normalizedQuery)) return node;
    const children = (node.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    if (children.length > 0) return { ...node, children };
    return null;
  }

  return nodes.map(visit).filter((node): node is EstimateTreeNode => node !== null);
}

function collectEstimateFolderIds(nodes: EstimateTreeNode[], into: string[] = []): string[] {
  for (const node of nodes) {
    // Expandable === has children (kind-agnostic), matching buildUiTreeModel.
    if (node.children?.length) into.push(node.id);
    if (node.children?.length) collectEstimateFolderIds(node.children, into);
  }
  return into;
}

function buildEstimateTreeSelectionNodes(nodes: EstimateTreeNode[]): TreeSelectionNode[] {
  return nodes.map((node) => ({
    id: node.id,
    selectable: true,
    children: node.children?.length ? buildEstimateTreeSelectionNodes(node.children) : undefined,
  }));
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

export function EstimateSheetTree({ projectId, estimateId, activeTabId, initialTabId, projectName, selectedNodeId, nodes }: EstimateSheetTreeProps) {
  const pathname = usePathname();
  const { toast, dismissToast } = useToast();
  const tabInitialNodes = activeTabId && activeTabId === initialTabId ? nodes : [];
  const legacyTreeQuery = useEstimateAreaTreeQuery({ projectId, estimateId, initialNodes: nodes, enabled: !activeTabId });
  const tabTreeQuery = useEstimateTabTreeQuery({ projectId, estimateId, tabId: activeTabId, initialNodes: tabInitialNodes, enabled: Boolean(activeTabId) });
  const {
    tree: localNodes,
    setTree: setLocalNodes,
    snapshot: snapshotLocalNodes,
    restore: restoreLocalNodes,
    getTreeRevision: getLocalTreeRevision,
    prepareOptimisticUpdate: prepareAreaTreeOptimisticUpdate,
  } = activeTabId ? tabTreeQuery : legacyTreeQuery;
  const pendingReordersRef = useRef(0);
  const suppressPrimaryActionUntilRef = useRef(0);
  const renameCommitInFlightRef = useRef(false);
  // Optimistic node ids resolve to server ids here; mutations fired before the
  // create settles await the pending promise instead of erroring server-side.
  const pendingNodeCreatesRef = useRef<Map<string, Promise<string>>>(new Map());
  const resolvedNodeIdsRef = useRef<Map<string, string>>(new Map());
  const skipRenameAutoSelectRef = useRef(false);
  const renameDraftDirtyRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const suppressContextMenuCloseAutoFocusRef = useRef(false);
  const ignoreRenameBlurDuringContextMenuCloseRef = useRef(false);
  const lastAcceptedPropSignatureRef = useRef(getEstimateTreeContentSignature(nodes));
  const lastObservedPropSignatureRef = useRef(getEstimateTreeContentSignature(nodes));
  const lastObservedPropNodesRef = useRef(nodes);
  const stalePropSignatureToIgnoreRef = useRef<string | null>(null);
  const pendingPropNodesRef = useRef<EstimateTreeNode[] | null>(null);
  const [reorderStatus, setReorderStatus] = useState<ReorderStatus>({ state: "idle" });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeName, setEditingNodeName] = useState("");
  const [editingNodeError, setEditingNodeError] = useState<string | null>(null);
  const [deleteTargetNode, setDeleteTargetNode] = useState<EstimateTreeNode | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [bulkSelectedNodeIds, setBulkSelectedNodeIds] = useState<Set<string>>(() => new Set());
  const [contextMenuNode, setContextMenuNode] = useState<EstimateTreeNode | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId, activeTabId);
  const currentRouteNodeId = useMemo(
    () => getEstimateRouteNodeIdFromPathname(pathname, estimateId) ?? selectedNodeId,
    [estimateId, pathname, selectedNodeId],
  );
  const treeSearchActive = treeSearchQuery.trim().length > 0;
  const displayedNodes = useMemo(
    () => (treeSearchActive ? filterEstimateTreeNodes(localNodes, treeSearchQuery) : localNodes),
    [localNodes, treeSearchActive, treeSearchQuery],
  );
  const { uiNodes: uiTreeNodes } = useMemo(() => buildUiTreeModel(displayedNodes), [displayedNodes]);
  const folderIds = useMemo(() => new Set(collectEstimateFolderIds(localNodes)), [localNodes]);
  const treeSelectionNodes = useMemo(() => buildEstimateTreeSelectionNodes(localNodes), [localNodes]);
  const bulkSelectionCount = bulkSelectedNodeIds.size;
  const bulkSelectedIds = useMemo(() => Array.from(bulkSelectedNodeIds), [bulkSelectedNodeIds]);
  const bulkDeleteRootNodeIds = useMemo(
    () => dedupeSelectedRoots(treeSelectionNodes, bulkSelectedNodeIds),
    [bulkSelectedNodeIds, treeSelectionNodes],
  );
  const allFolderItemIds = useMemo(() => Array.from(folderIds), [folderIds]);
  const { expandedNodeIds, setExpandedNodeIds } = useEstimateWorkspaceExpansion(estimateId, allFolderItemIds, activeTabId);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBulkSelectedNodeIds((current) => {
        const next = pruneSelection(treeSelectionNodes, current);
        if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [treeSelectionNodes]);

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
    if (skipRenameAutoSelectRef.current) {
      // The editing id was remapped to the server id mid-edit and the row
      // remounted. Untouched drafts get the select-all back so typing still
      // replaces the placeholder; in-progress typing keeps its caret at the
      // end instead of being re-selected and clobbered.
      skipRenameAutoSelectRef.current = false;
      const input = renameInputRef.current;
      if (input) {
        if (document.activeElement !== input) input.focus();
        if (renameDraftDirtyRef.current) {
          const caretPosition = input.value.length;
          input.setSelectionRange(caretPosition, caretPosition);
        } else {
          input.select();
        }
      }
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
    return expandedNodeIds.filter((itemId) => folderIds.has(itemId));
  }, [expandedNodeIds, folderIds]);

  // Active searches reveal every match; stored expansion resumes when cleared.
  const treeExpandedIds = useMemo(
    () => (treeSearchActive ? collectEstimateFolderIds(displayedNodes) : expandedItems),
    [displayedNodes, expandedItems, treeSearchActive],
  );

  const handleExpandAll = useCallback(() => {
    setExpandedNodeIds(allFolderItemIds);
  }, [allFolderItemIds, setExpandedNodeIds]);
  const handleCollapseAll = useCallback(() => {
    setExpandedNodeIds([]);
  }, [setExpandedNodeIds]);
  const clearBulkSelection = useCallback(() => {
    setBulkSelectedNodeIds(new Set());
  }, []);
  const isTreeMutationSaving = reorderStatus.state === "saving" || deletePending || bulkDeletePending;
  const canReorderNow = !isTreeMutationSaving;

  /** Maps an optimistic node id to its server id, awaiting an in-flight create when needed. */
  const resolveServerNodeId = useCallback((nodeId: string): Promise<string> => {
    if (!isOptimisticEstimateNodeId(nodeId)) return Promise.resolve(nodeId);
    const resolvedNodeId = resolvedNodeIdsRef.current.get(nodeId);
    if (resolvedNodeId) return Promise.resolve(resolvedNodeId);
    const pendingCreate = pendingNodeCreatesRef.current.get(nodeId);
    if (pendingCreate) return pendingCreate;
    return Promise.reject(new Error("This node is still being created. Try again in a moment."));
  }, []);

  // Selection is client state: syncing the URL with replaceState keeps deep
  // links shareable without re-running the server route, which would remount
  // the whole workspace just to change the middle sheet.
  const syncEstimateRouteUrl = useCallback((nodeId: string | null) => {
    if (typeof window === "undefined") return;
    const routeNodeId = nodeId && !isOptimisticEstimateNodeId(nodeId) ? nodeId : null;
    const href = routeNodeId
      ? `/workshop/projects/${projectId}/estimates/${routeNodeId}`
      : `/workshop/projects/${projectId}/estimates/${estimateId}`;
    if (window.location.pathname === href) return;
    window.history.replaceState(null, "", href);
  }, [estimateId, projectId]);

  // Reordering pauses while a search filters the tree: visible sibling order
  // no longer matches the real tree, so drops would land unpredictably.
  // Nodes whose create has not settled yet cannot be dragged: the server
  // does not know their id.
  const handleTreeCanDrag = useCallback(
    (treeNode: UiTreeNode) => canReorderNow && !editingNodeId && !treeSearchActive && !isOptimisticEstimateNodeId(treeNode.id),
    [canReorderNow, editingNodeId, treeSearchActive],
  );

  const handleTreeCanDrop = useCallback((draggedId: string, targetId: string, position: TreeDropPosition) => {
    if (!canReorderNow || editingNodeId || treeSearchActive) return false;
    if (isOptimisticEstimateNodeId(draggedId) || isOptimisticEstimateNodeId(targetId)) return false;
    return evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedNodeIds: [draggedId],
      target: { targetNodeId: targetId, position },
    }).ok;
  }, [canReorderNow, editingNodeId, localNodes, treeSearchActive]);

  const suppressPrimaryActionAfterDrag = useCallback(() => {
    suppressPrimaryActionUntilRef.current = Date.now() + 500;
  }, []);

  const handleTreeDrop = useCallback((draggedId: string, targetId: string, position: TreeDropPosition) => {
    suppressPrimaryActionAfterDrag();
    if (!canReorderNow || editingNodeId || treeSearchActive) return;
    if (isOptimisticEstimateNodeId(draggedId) || isOptimisticEstimateNodeId(targetId)) return;

    const target = { targetNodeId: targetId, position };
    const result = evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedNodeIds: [draggedId],
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
          draggedNodeIds: [draggedId],
          target,
        });
        if (!freshResult.ok) {
          setReorderStatus({ state: "error", message: freshResult.message });
          return;
        }
        const touchesPendingCreate = freshResult.plan.updates.some(
          (update) => isOptimisticEstimateNodeId(update.id) || (update.parentId ? isOptimisticEstimateNodeId(update.parentId) : false),
        );
        if (touchesPendingCreate) {
          setReorderStatus({ state: "error", message: "A nearby node is still being created. Try the move again in a moment." });
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
    canReorderNow,
    editingNodeId,
    estimateId,
    finishPendingReorder,
    getLocalTreeRevision,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    restoreLocalNodes,
    setLocalNodes,
    suppressPrimaryActionAfterDrag,
    treeSearchActive,
  ]);

  // Templates dragged from the right sidebar drop "inside" group and area
  // rows (no root or between-row placement). Group targets insert directly;
  // area targets cannot take child nodes, so the sheet wraps the area and
  // the template in a new group occupying the area's slot.
  const treeExternalDrop = useMemo<TreeExternalDropOptions>(() => ({
    types: [ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, PROJECT_SOURCE_DRAG_MIME_TYPE],
    canDrop: (types, targetId, position) => {
      if (position !== "inside") return false;
      if (isOptimisticEstimateNodeId(targetId)) return false;
      const targetNode = findEstimateNode(localNodes, targetId);
      if (!targetNode) return false;
      // Templates drop on groups (direct) or areas (wrap). Project sources insert
      // under a GROUP only in this pass (area-wrap parity is a follow-up, U2).
      if (types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return true;
      if (types.includes(PROJECT_SOURCE_DRAG_MIME_TYPE)) return isEstimateGroupNodeKind(targetNode.kind);
      return false;
    },
    onDrop: (event, targetId) => {
      const targetNode = findEstimateNode(localNodes, targetId);
      if (!targetNode) return;
      const isGroupTarget = isEstimateGroupNodeKind(targetNode.kind);

      // The sheet owns insertion (tree update + action); hand the drop over via a
      // window event instead of duplicating that flow here.
      const templatePayload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
      if (templatePayload) {
        suppressPrimaryActionAfterDrag();
        const detail: InsertEstimateTemplateEventDetail = templatePayload.kind === "template-node"
          ? isGroupTarget
            ? { targetParentNodeId: targetId, templateId: templatePayload.templateId, templateNodeId: templatePayload.templateNodeId }
            : { wrapAreaNodeId: targetId, templateId: templatePayload.templateId, templateNodeId: templatePayload.templateNodeId }
          : isGroupTarget
            ? { targetParentNodeId: targetId, templateIds: templatePayload.templateIds }
            : { wrapAreaNodeId: targetId, templateIds: templatePayload.templateIds };
        window.dispatchEvent(new CustomEvent<InsertEstimateTemplateEventDetail>(INSERT_ESTIMATE_TEMPLATE_EVENT, { detail }));
        return;
      }

      const projectSourcePayload = readProjectSourceDragPayload(event.dataTransfer.getData(PROJECT_SOURCE_DRAG_MIME_TYPE));
      if (projectSourcePayload && isGroupTarget) {
        suppressPrimaryActionAfterDrag();
        window.dispatchEvent(new CustomEvent<InsertProjectSourceEventDetail>(INSERT_PROJECT_SOURCE_EVENT, {
          detail: {
            targetParentNodeId: targetId,
            source: {
              projectId: projectSourcePayload.projectId,
              estimateId: projectSourcePayload.estimateId,
              tabId: projectSourcePayload.tabId,
              nodeId: projectSourcePayload.kind === "project-node" ? projectSourcePayload.nodeId : null,
            },
          },
        }));
      }
    },
  }), [localNodes, suppressPrimaryActionAfterDrag]);

  const handleAddTreeNode = useCallback((kind: EstimateTreeNode["kind"], parentGroupIdOverride?: string) => {
    // Context-menu creates target the right-clicked group; header buttons
    // fall back to the current selection. Callers (handleAddArea / the
    // context menu) only ever pass a write-valid (kind, parent) pair — an
    // `area` always with a group parent, a root create always as `group` —
    // so the old "select a group first" error path is gone: every create
    // succeeds. Internal `kind` stays the write-path discriminant; the user
    // only ever sees "Area".
    const targetParentGroupId = parentGroupIdOverride ?? selectedGroupId;

    // One user-facing name for every node. The internal kind still drives the
    // write path, but the placeholder the user names is always "New Area".
    const nodeName = "New Area";
    const optimisticNodeId = makeOptimisticTreeNodeId(kind);
    const optimisticNode = createOptimisticEstimateTreeNode(kind, optimisticNodeId, nodeName);
    const nextNodes = insertLocalEstimateTreeNode(localNodes, targetParentGroupId, optimisticNode);
    const previousSelectedNodeId = activeSelectedNodeId;

    setLocalNodes(nextNodes);
    if (targetParentGroupId) {
      setExpandedNodeIds(Array.from(new Set([...expandedItems, targetParentGroupId])));
    }
    // The node is usable immediately: select it and open inline rename while
    // the create settles in the background.
    setSelectedNodeId(optimisticNodeId);
    renameDraftDirtyRef.current = false;
    setEditingNodeId(optimisticNodeId);
    setEditingNodeName(nodeName);
    setEditingNodeError(null);
    setReorderStatus({ state: "saving", message: "Adding area" });

    function createOnServer(serverParentId: string | null) {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("name", nodeName);
      if (serverParentId) formData.set("parentId", serverParentId);
      if (activeTabId) formData.set("estimateTabId", activeTabId);
      return createEstimateNode(projectId, estimateId, formData).then((result) => result.nodeId);
    }

    // A parent created moments ago may still carry an optimistic id; chain
    // this create behind the parent's create instead of sending an id the
    // server has never seen.
    const knownParentId = targetParentGroupId ? resolvedNodeIdsRef.current.get(targetParentGroupId) ?? targetParentGroupId : null;
    const createPromise = knownParentId && isOptimisticEstimateNodeId(knownParentId)
      ? resolveServerNodeId(knownParentId).then(createOnServer)
      : createOnServer(knownParentId);
    pendingNodeCreatesRef.current.set(optimisticNodeId, createPromise);

    void createPromise
      .then((serverNodeId) => {
        resolvedNodeIdsRef.current.set(optimisticNodeId, serverNodeId);
        pendingNodeCreatesRef.current.delete(optimisticNodeId);
        setLocalNodes((currentNodes) => replaceLocalEstimateTreeNodeId(currentNodes, optimisticNodeId, serverNodeId));
        const workspaceState = useEstimateWorkspaceState.getState();
        const expandedForScope = activeTabId ? workspaceState.expandedNodeIdsByTabId[activeTabId] : workspaceState.expandedNodeIdsByEstimateId[estimateId];
        if (expandedForScope?.includes(optimisticNodeId)) {
          setExpandedNodeIds(expandedForScope.map((nodeId) => (nodeId === optimisticNodeId ? serverNodeId : nodeId)));
        }
        setBulkSelectedNodeIds((current) => {
          if (!current.has(optimisticNodeId)) return current;
          const next = new Set(current);
          next.delete(optimisticNodeId);
          next.add(serverNodeId);
          return next;
        });
        setEditingNodeId((current) => {
          if (current !== optimisticNodeId) return current;
          skipRenameAutoSelectRef.current = true;
          return serverNodeId;
        });
        const selectedNodeIdForScope = activeTabId
          ? useEstimateWorkspaceState.getState().selectedNodeIdByTabId[activeTabId]
          : useEstimateWorkspaceState.getState().selectedNodeIdByEstimateId[estimateId];
        if (selectedNodeIdForScope === optimisticNodeId) {
          setSelectedNodeId(serverNodeId);
          syncEstimateRouteUrl(serverNodeId);
        }
        setReorderStatus({ state: "saved", message: "Area added" });
      })
      .catch((error: unknown) => {
        unstable_rethrow(error);
        pendingNodeCreatesRef.current.delete(optimisticNodeId);
        setLocalNodes((currentNodes) => removeLocalEstimateTreeNode(currentNodes, optimisticNodeId));
        setEditingNodeId((current) => (current === optimisticNodeId ? null : current));
        const selectedNodeIdForScope = activeTabId
          ? useEstimateWorkspaceState.getState().selectedNodeIdByTabId[activeTabId]
          : useEstimateWorkspaceState.getState().selectedNodeIdByEstimateId[estimateId];
        if (selectedNodeIdForScope === optimisticNodeId) {
          setSelectedNodeId(previousSelectedNodeId);
        }
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not add estimate tree node." });
      });
  }, [
    activeSelectedNodeId,
    activeTabId,
    estimateId,
    expandedItems,
    localNodes,
    projectId,
    resolveServerNodeId,
    selectedGroupId,
    setExpandedNodeIds,
    setLocalNodes,
    setSelectedNodeId,
    syncEstimateRouteUrl,
  ]);

  // The single "Add Area" affordance. Type no longer exists for the user, but
  // the write path is unchanged in P4: an `area` requires a group parent and a
  // root create must be a `group`. So this routes to the write-valid internal
  // kind for the current selection — a child `area` when a group is selected,
  // a root `group` otherwise — while the user only ever sees "Area". Removing
  // the kind choice (and the create flow being able to add under any node)
  // ships with the write-enable in P6.
  const handleAddArea = useCallback((parentGroupIdOverride?: string) => {
    const targetParentGroupId = parentGroupIdOverride ?? selectedGroupId;
    handleAddTreeNode(targetParentGroupId ? "area" : "group", targetParentGroupId ?? undefined);
  }, [handleAddTreeNode, selectedGroupId]);

  useEffect(() => {
    function handleRequestedTreeNodeCreate(event: Event) {
      const detail = (event as CustomEvent<Partial<RequestEstimateTreeNodeCreateEventDetail>>).detail;
      // Legacy create event still carries a kind ("group" from the empty-tab
      // "Add Area" button → root create). Route it through the single flow.
      if (detail?.kind !== "group" && detail?.kind !== "area") return;
      handleAddArea();
    }

    window.addEventListener(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, handleRequestedTreeNodeCreate);
    return () => window.removeEventListener(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, handleRequestedTreeNodeCreate);
  }, [handleAddArea]);

  // Focus from the ref callback: the rename editor for a just-created node
  // mounts a render after the focus effect fires, so timer-based focusing
  // misses it. Untouched drafts select the whole placeholder; dirty drafts
  // keep their caret at the end across the optimistic-id remount.
  const attachRenameInputRef = useCallback((input: HTMLInputElement | null) => {
    renameInputRef.current = input;
    if (!input || document.activeElement === input) return;
    // Context-menu renames are focused by the menu-close dance instead:
    // grabbing focus while the Radix menu is still closing makes its focus
    // return win and the editor ends up blurred.
    if (suppressContextMenuCloseAutoFocusRef.current || ignoreRenameBlurDuringContextMenuCloseRef.current) return;
    input.focus();
    if (renameDraftDirtyRef.current) {
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    } else {
      input.select();
    }
  }, []);

  /**
   * Menu-triggered flows that open the inline rename editor must survive the
   * Radix close-auto-focus: without these refs the menu's focus return blurs
   * the just-mounted editor and silently commits the untouched name.
   */
  const armContextMenuRenameHandoff = useCallback(() => {
    suppressContextMenuCloseAutoFocusRef.current = true;
    ignoreRenameBlurDuringContextMenuCloseRef.current = true;
  }, []);

  const beginRenameNode = useCallback((node: EstimateTreeNode) => {
    if (isTreeMutationSaving) return;
    armContextMenuRenameHandoff();
    renameDraftDirtyRef.current = false;
    setEditingNodeId(node.id);
    setEditingNodeName(node.name);
    setEditingNodeError(null);
  }, [armContextMenuRenameHandoff, isTreeMutationSaving]);

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
        // A rename right after create targets the optimistic id; wait for the
        // in-flight create to hand back the server id instead of erroring.
        const serverNodeId = await resolveServerNodeId(node.id);
        const confirmed = await renameEstimateNode(projectId, estimateId, serverNodeId, nextName);
        if (confirmed.nodeId !== node.id || confirmed.name !== nextName) {
          setLocalNodes((currentNodes) => renameEstimateTreeNode(currentNodes, confirmed.nodeId, confirmed.name));
        }
        setReorderStatus({ state: "saved", message: "Node renamed" });
      } catch (error) {
        unstable_rethrow(error);
        const localNodeId = resolvedNodeIdsRef.current.get(node.id) ?? node.id;
        const currentNodes = snapshotLocalNodes();
        const currentNode = findEstimateNode(currentNodes, localNodeId);
        if (currentNode?.name === nextName) {
          setLocalNodes(renameEstimateTreeNode(currentNodes, localNodeId, node.name));
          setEditingNodeId(localNodeId);
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
    resolveServerNodeId,
    setLocalNodes,
    snapshotLocalNodes,
  ]);

  const replaceEstimateRoute = syncEstimateRouteUrl;

  const handleConfirmDeleteNode = useCallback(() => {
    if (!deleteTargetNode || isTreeMutationSaving) return;

    const targetNode = deleteTargetNode;
    const previousSelectedNodeId = activeSelectedNodeId;
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
        }
        if (routeWasDeleted) replaceEstimateRoute(deletePlan.fallbackNodeId);

        const serverTargetNodeId = await resolveServerNodeId(targetNode.id);
        const confirmed = await deleteEstimateNode(projectId, estimateId, serverTargetNodeId);
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
    getLocalTreeRevision,
    isTreeMutationSaving,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    replaceEstimateRoute,
    resolveServerNodeId,
    restoreLocalNodes,
    setSelectedNodeId,
    setLocalNodes,
  ]);

  const handleDeleteModalOpenChange = useCallback((open: boolean) => {
    if (!open && !deletePending) setDeleteTargetNode(null);
  }, [deletePending]);

  const handleConfirmBulkDeleteNodes = useCallback(() => {
    if (bulkDeletePending || isTreeMutationSaving || bulkDeleteRootNodeIds.length === 0) return;

    const previousSelectedNodeId = activeSelectedNodeId;
    const previousBulkSelection = new Set(bulkSelectedNodeIds);
    const routeNodeIdBeforeDelete = currentRouteNodeId;
    let routeWasDeleted = false;

    setBulkDeletePending(true);
    setBulkDeleteConfirmOpen(false);
    setReorderStatus({ state: "saving", message: "Deleting selected nodes" });

    void (async () => {
      let previousNodes = localNodes;
      let optimisticRevision: number | null = null;
      let optimisticRouteNodeId = routeNodeIdBeforeDelete;
      try {
        previousNodes = await prepareAreaTreeOptimisticUpdate();
        let optimisticNodes = previousNodes;
        let fallbackNodeId: string | null = routeNodeIdBeforeDelete;
        const optimisticDeletedNodeIds = new Set<string>();

        for (const rootNodeId of bulkDeleteRootNodeIds) {
          const deletePlan = planEstimateTreeDelete(optimisticNodes, rootNodeId, fallbackNodeId);
          deletePlan.deletedNodeIds.forEach((deletedNodeId) => optimisticDeletedNodeIds.add(deletedNodeId));
          optimisticNodes = deletePlan.nextNodes;
          fallbackNodeId = deletePlan.fallbackNodeId;
        }

        routeWasDeleted = routeNodeIdBeforeDelete ? optimisticDeletedNodeIds.has(routeNodeIdBeforeDelete) : false;
        optimisticRouteNodeId = routeWasDeleted ? fallbackNodeId : routeNodeIdBeforeDelete;
        const activeSelectionWasDeleted = activeSelectedNodeId ? optimisticDeletedNodeIds.has(activeSelectedNodeId) : false;

        setLocalNodes(optimisticNodes);
        setBulkSelectedNodeIds(new Set());
        optimisticRevision = getLocalTreeRevision();
        if (activeSelectionWasDeleted) {
          setSelectedNodeId(fallbackNodeId);
        }
        if (routeWasDeleted) replaceEstimateRoute(fallbackNodeId);

        const serverRootNodeIds = await Promise.all(bulkDeleteRootNodeIds.map(resolveServerNodeId));
        const confirmed = await deleteEstimateNodesBulk(projectId, estimateId, serverRootNodeIds);
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
        }
        if ((routeWasDeleted || routeWasDeletedOnServer) && optimisticRouteNodeId !== serverRouteNodeId) {
          replaceEstimateRoute(serverRouteNodeId);
        }
        setReorderStatus({ state: "saved", message: "Selected nodes deleted" });
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
          setBulkSelectedNodeIds(previousBulkSelection);
          if (routeWasDeleted && routeNodeIdBeforeDelete) replaceEstimateRoute(routeNodeIdBeforeDelete);
        }
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not delete selected nodes." });
      } finally {
        setBulkDeletePending(false);
      }
    })();
  }, [
    activeSelectedNodeId,
    bulkDeletePending,
    bulkDeleteRootNodeIds,
    bulkSelectedNodeIds,
    currentRouteNodeId,
    estimateId,
    getLocalTreeRevision,
    isTreeMutationSaving,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    replaceEstimateRoute,
    resolveServerNodeId,
    restoreLocalNodes,
    setLocalNodes,
    setSelectedNodeId,
  ]);

  // Selecting a node only swaps the middle sheet: state + shallow URL sync,
  // never a router navigation, which would re-render the entire route.
  const handlePrimaryAction = useCallback((nodeId: string) => {
    if (Date.now() < suppressPrimaryActionUntilRef.current) return;
    if (editingNodeId) return;
    const node = findEstimateNode(localNodes, nodeId);
    if (!node) return;
    setSelectedNodeId(node.id);
    syncEstimateRouteUrl(node.id);
  }, [editingNodeId, localNodes, setSelectedNodeId, syncEstimateRouteUrl]);

  const handleCheckboxToggle = useCallback((nodeId: string, checked: boolean) => {
    if (isTreeMutationSaving) return;
    setBulkSelectedNodeIds((current) => toggleCascadeSelection(treeSelectionNodes, current, nodeId, checked));
  }, [isTreeMutationSaving, treeSelectionNodes]);

  const handleTreeContextMenu = useCallback((nodeId: string) => {
    setContextMenuNode(findEstimateNode(localNodes, nodeId) ?? null);
  }, [localNodes]);

  const handleContextMenuCloseAutoFocus = useCallback((event: Event) => {
    if (suppressContextMenuCloseAutoFocusRef.current) {
      event.preventDefault();
      window.setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
        suppressContextMenuCloseAutoFocusRef.current = false;
        ignoreRenameBlurDuringContextMenuCloseRef.current = false;
      }, 0);
    }
  }, []);

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    if (!contextMenuNode) return [];
    const nodeIsGroup = isEstimateGroupNodeKind(contextMenuNode.kind);
    const nodeIsPendingCreate = isOptimisticEstimateNodeId(contextMenuNode.id);

    return [
      // One unconditional-looking "Add area inside" replaces the old
      // New Group/New Area pair. It stays gated to nodes that can take a child
      // under the CURRENT write model (a group) so the affordance is never
      // shown where it would throw server-side; making it appear on every node
      // ships with the write-enable (P6). The item creates an `area` child.
      ...(nodeIsGroup
        ? [
            {
              id: "create-nodes",
              items: [
                {
                  id: "add-area-inside",
                  label: "Add area inside",
                  icon: <Circle size={12} weight="regular" aria-hidden="true" />,
                  onSelect: () => {
                    armContextMenuRenameHandoff();
                    handleAddTreeNode("area", contextMenuNode.id);
                  },
                },
              ],
            },
          ]
        : []),
      {
        id: "node-actions",
        items: [
          {
            id: "save-as-template",
            label: "Save as template",
            icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
            disabled: nodeIsPendingCreate,
            disabledReason: "Wait for this node to finish saving first.",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent<CreateEstimateTemplateFromNodeEventDetail>(CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT, {
                  detail: { sourceNodeId: contextMenuNode.id },
                }),
              );
            },
          },
          {
            id: "rename",
            label: "Rename",
            icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
            disabled: isTreeMutationSaving,
            disabledReason: "Finish the current tree save before renaming another node.",
            onSelect: () => beginRenameNode(contextMenuNode),
          },
        ],
      },
      {
        id: "node-danger",
        items: [
          {
            id: "delete",
            label: "Delete",
            icon: <Trash size={12} weight="regular" aria-hidden="true" />,
            tone: "destructive" as const,
            disabled: isTreeMutationSaving,
            disabledReason: "Finish the current tree save before deleting another node.",
            onSelect: () => setDeleteTargetNode(contextMenuNode),
          },
        ],
      },
    ];
  }, [armContextMenuRenameHandoff, beginRenameNode, contextMenuNode, handleAddTreeNode, isTreeMutationSaving]);

  const renderEstimateTreeRowLabel = useCallback((treeNode: UiTreeNode) => {
    const node = (treeNode.data?.node as EstimateTreeNode | undefined) ?? findEstimateNode(localNodes, treeNode.id);
    if (!node) return null;

    if (editingNodeId !== node.id) {
      return <span className="min-w-0 flex-1 truncate text-left">{node.name}</span>;
    }

    const errorId = `estimate-tree-rename-error-${node.id}`;
    return (
      <span className="relative flex min-w-0 flex-1 items-center gap-1">
        <ControlInput
          ref={attachRenameInputRef}
          value={editingNodeName}
          aria-label={`Rename ${node.name}`}
          aria-invalid={editingNodeError ? "true" : undefined}
          aria-describedby={editingNodeError ? errorId : undefined}
          draggable={false}
          onChange={(event) => {
            renameDraftDirtyRef.current = true;
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
            "h-5 min-h-0 flex-1 rounded-xs border-accent bg-white px-1 py-0 font-normal leading-5 shadow-[inset_0_0_0_1px_rgba(255,122,26,0.14)] hover:border-accent focus:border-accent focus:bg-white focus-visible:ring-2 focus-visible:ring-accentSoft",
            editingNodeError ? "border-danger focus:border-danger focus-visible:ring-danger" : "",
          )}
        />
        <button
          type="button"
          data-estimate-tree-rename-control="true"
          aria-label={`Confirm rename ${node.name}`}
          title="Confirm rename"
          className="grid size-5 shrink-0 place-items-center rounded-xs border border-accent bg-white text-warning transition hover:bg-accentSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft"
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
          <Check size={12} weight="regular" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-estimate-tree-rename-control="true"
          aria-label={`Reset rename ${node.name}`}
          title="Reset name"
          className="grid size-5 shrink-0 place-items-center rounded-xs border border-accent/70 bg-white text-warning transition hover:bg-accentSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft"
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
          <ArrowCounterClockwise size={12} weight="regular" aria-hidden="true" />
        </button>
        {editingNodeError ? (
          <span
            id={errorId}
            role="alert"
            className="absolute left-0 top-[22px] z-20 max-w-[180px] truncate rounded-xs border border-dangerSoft bg-white px-1 py-0.5 text-[9px] font-medium leading-3 text-danger shadow-sm"
          >
            {editingNodeError}
          </span>
        ) : null}
      </span>
    );
  }, [
    attachRenameInputRef,
    cancelRenameNode,
    commitRenameNode,
    editingNodeError,
    editingNodeId,
    editingNodeName,
    localNodes,
    resetRenameNode,
  ]);

  const deleteConfirmationDescription = deleteTargetNode
    ? "This removes the Area, every Area inside it, and all their cost rows."
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
        {/* group/tree on the panel widens the rail-reveal scope: rows keep
            their drag/select space while the pointer or focus is anywhere in
            this sidebar (header tools included), so reaching for Add Area or
            search no longer shifts the tree back and forth. */}
        <div className="group/tree flex h-full flex-col overflow-hidden border-r border-hairline bg-white">
        <TreePanelHeader
          ariaLabel="Tree tools"
          labelPrefix="tree"
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          startActionsLabel="Tree search"
          searchValue={treeSearchQuery}
          onSearchValueChange={setTreeSearchQuery}
          searchPlaceholder="Search Tree"
          searchLabel="Search Tree"
          addActions={[
            {
              label: "Add Area",
              icon: <AddTreeActionIcon />,
              onClick: () => handleAddArea(),
            },
          ]}
          tabs={ESTIMATE_TREE_TABS}
          activeTab="sheets"
          tabVariant="tabs"
          tabsAriaLabel="Estimate sheets"
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className={cn("px-2 pb-2 pt-0", bulkSelectionCount > 0 && "pb-16")}>
          {localNodes.length === 0 ? (
            <div className="rounded-xs border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
              This estimate is empty. Add an area to begin.
            </div>
          ) : uiTreeNodes.length === 0 ? (
            <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
              No tree nodes match &quot;{treeSearchQuery}&quot;.
            </div>
          ) : (
            <nav aria-label={`${projectName} estimate areas`}>
              <ContextMenu onOpenChange={setContextMenuOpen}>
                <ContextMenuTrigger asChild>
                  <div
                    className="block w-full"
                    onContextMenu={(event) => {
                      // Only rows open the node menu; right-clicks on empty
                      // tree space keep the menu closed.
                      if (!(event.target instanceof Element) || !event.target.closest("[data-tree-row]")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <Tree
                      nodes={uiTreeNodes}
                      ariaLabel={`${projectName} estimate areas`}
                      className="relative min-h-7 overflow-visible"
                      expandedIds={treeExpandedIds}
                      onExpandedChange={setExpandedNodeIds}
                      selectedIds={bulkSelectedIds}
                      onCheckboxToggle={handleCheckboxToggle}
                      currentId={activeSelectedNodeId}
                      railsPinned={contextMenuOpen}
                      draggable
                      selectable
                      dragDataType={ESTIMATE_TREE_DRAG_MIME_TYPE}
                      canDrag={handleTreeCanDrag}
                      canDrop={handleTreeCanDrop}
                      onDrop={handleTreeDrop}
                      externalDrop={treeExternalDrop}
                      onNodeDragStart={suppressPrimaryActionAfterDrag}
                      onRowClick={handlePrimaryAction}
                      onContextMenu={handleTreeContextMenu}
                      rootDropZones
                      renderRow={renderEstimateTreeRowLabel}
                    />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent
                  data-estimate-tree-context-menu="true"
                  alignOffset={4}
                  onCloseAutoFocus={handleContextMenuCloseAutoFocus}
                >
                  <ContextActionMenuContent groups={contextMenuGroups} />
                </ContextMenuContent>
              </ContextMenu>
            </nav>
          )}
          </div>
        </div>
        <BulkActionToolbar
          placement="bottom-dock"
          dockTo="container"
          selectedCount={bulkSelectionCount}
          selectedLabel={bulkSelectionCount === 1 ? "Area selected" : "Areas selected"}
          onClear={clearBulkSelection}
          actions={[
            {
              label: "Delete selected",
              icon: <Trash size={12} weight="regular" />,
              variant: "danger",
              disabled: isTreeMutationSaving || bulkDeleteRootNodeIds.length === 0,
              onClick: () => setBulkDeleteConfirmOpen(true),
            },
          ]}
        />
        </div>
        </div>
      </ResizableSidePanel>
      <Modal
        open={bulkDeleteConfirmOpen}
        title={`Delete ${bulkSelectionCount} selected ${bulkSelectionCount === 1 ? "Area" : "Areas"}`}
        description="This removes the selected Areas, every Area inside them, and all their cost rows."
        onOpenChange={(open) => {
          if (!open && !bulkDeletePending) setBulkDeleteConfirmOpen(false);
        }}
        closeLabel="Cancel bulk delete"
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-tertiary">
            {bulkSelectionCount} {bulkSelectionCount === 1 ? "Area is" : "Areas are"} selected. Overlapping child selections are deduplicated before deletion.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={bulkDeletePending}
              onClick={() => setBulkDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={bulkDeletePending || bulkDeleteRootNodeIds.length === 0}
              onClick={handleConfirmBulkDeleteNodes}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={Boolean(deleteTargetNode)}
        title={deleteTargetNode ? `Delete ${deleteTargetNode.name}` : "Delete Area"}
        description={deleteConfirmationDescription}
        onOpenChange={handleDeleteModalOpenChange}
        closeLabel="Cancel delete"
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] font-medium leading-4 text-ink">
            {deleteTargetNode ? (
              <>
                Delete <span className="font-medium">{deleteTargetNode.name}</span>? This action updates the tree immediately and can be undone only if the server rejects it.
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
