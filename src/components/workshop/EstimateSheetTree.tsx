"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowsOutCardinal,
  Check,
  FunnelSimple,
  Log,
  PencilSimple,
  StackPlus,
  Trash,
  X,
} from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { FilterPopover } from "@/components/ui/overlays/popover";
import { Button } from "@/components/ui/button";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Tree, type TreeDropPosition, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import {
  dedupeSelectedRoots,
  pruneSelection,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "@/lib/bulk-selection/tree-selection";
import { useEstimateAreaTreeQuery, useEstimateTabTreeQuery } from "@/hooks/use-estimate-query";
import { useEstimateWorkspaceExpansion, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import { estimateSurfaceClass } from "./estimate-surface-class";
import { useEstimateSurfaceVariant } from "./estimate-surface-variant";
import { validateEstimateTreeDrop } from "@/lib/estimates/estimate-tree-reorder";
import type {
  EstimateTreeHydrationState,
  EstimateTreeSubtreeLoadState,
} from "@/lib/estimates/estimate-tree-lazy";
import type { EstimateTreeLoadLimitState } from "@/lib/estimates/types";
import {
  CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT,
  type CreateEstimateTemplateFromNodeEventDetail,
} from "./component-library/templates";
import { findEstimateNode, type EstimateTreeNode } from "./estimate-tree-data";
import { ESTIMATE_TREE_DRAG_MIME_TYPE } from "./estimate-sheet/drag-types";
import { ResizableSidePanel } from "./ResizableSidePanel";
import { EstimateTreeMoveDialog } from "./estimate-tree/EstimateTreeMoveDialog";
import {
  buildEstimateTreeMoveOptions,
  type EstimateTreeMoveSelection,
} from "./estimate-tree/estimate-tree-node-options";
import {
  useEstimateTreeReorder,
  type EstimateTreeReorderStatus,
} from "./estimate-tree/use-estimate-tree-reorder";
import { useEstimateTreeSubtreeHydration } from "./estimate-tree/use-estimate-tree-subtree-hydration";
import { useEstimateTreeRenameEditor } from "./estimate-tree/use-estimate-tree-rename-editor";
import { useEstimateTreeCrud } from "./estimate-tree/use-estimate-tree-crud";
import { useEstimateTreeExternalDrops } from "./estimate-tree/use-estimate-tree-external-drops";

type EstimateSheetTreeProps = {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  initialTabId?: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
  loadLimitState?: EstimateTreeLoadLimitState;
  canEditEstimate?: boolean;
  disableRouteSync?: boolean;
};

const ESTIMATE_TREE_LEFT_EXTENSION_WIDTH = 104;
const ESTIMATE_TREE_TABS = [{ id: "sheets", label: "Estimate Tree" }] as const;
const VIEW_ONLY_ESTIMATE_REASON = "View-only estimate.";

// Same icon scale as the right-sidebar trees: every tree panel renders row
// icons at the shared TREE_ROW_ICON_SIZE so no panel reads "bigger". One
// neutral node glyph for every node — containment is shown by the disclosure
// caret (rendered only when the node has children), not by a folder-vs-pin
// distinction that no longer exists under the single-node model.
function AddTreeActionIcon() {
  return <Log size={13} weight="regular" aria-hidden="true" />;
}

function isOptimisticEstimateNodeId(nodeId: string) {
  return nodeId.startsWith("optimistic-");
}

type UiTreeModel = {
  uiNodes: UiTreeNode[];
  folderIds: Set<string>;
};

function buildUiTreeModel(nodes: EstimateTreeNode[], hydrationState: EstimateTreeHydrationState = {}): UiTreeModel {
  const folderIds = new Set<string>();

  function toUiNode(node: EstimateTreeNode): UiTreeNode {
    // Leaf vs container is derived from CHILDREN, not kind: a node that has
    // child sub-areas is expandable; a node with none is a leaf. On all-area
    // trees this matches the old kind-based result, and it stays correct once
    // any node can nest (single-node model).
    const hasRemoteChildren = node.childrenLoaded === false;
    const isFolder = Boolean(node.children?.length) || hasRemoteChildren;
    if (isFolder) folderIds.add(node.id);
    // "Occupied" = the area directly holds components (row items). The orange
    // accent now lives on the disclosure caret (folders) or a static caret
    // marker (leaves) instead of a separate node icon — see ui/tree.tsx.
    const occupied = (node.estimateRowItems?.length ?? 0) > 0;
    return {
      id: node.id,
      label: node.name,
      isLeaf: !isFolder,
      accent: occupied,
      children: node.children?.map(toUiNode),
      data: { node, subtreeLoadState: hydrationState[node.id] },
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

type EstimateTreeStructureFilter = { hideEmptyAreas: boolean };
type StateUpdater<T> = T | ((current: T) => T);

function getTreeRowSelectorValue(nodeId: string) {
  return typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(nodeId)
    : nodeId.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function findRenderedTreeRow(nodeId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const rowElement = document.querySelector(`[data-tree-row="${getTreeRowSelectorValue(nodeId)}"]`);
  return rowElement instanceof HTMLElement ? rowElement : null;
}

function scrollRenderedTreeRowIntoView(nodeId: string) {
  if (typeof window === "undefined") return;
  const scrollRow = () => {
    findRenderedTreeRow(nodeId)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  };
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(scrollRow);
  } else {
    window.setTimeout(scrollRow, 0);
  }
}

type EstimateSheetTreeState = {
  reorderStatus: EstimateTreeReorderStatus;
  editingNodeId: string | null;
  editingNodeName: string;
  editingNodeError: string | null;
  renamingNodeId: string | null;
  deleteTargetNode: EstimateTreeNode | null;
  moveTargetNode: EstimateTreeNode | null;
  moveSelection: EstimateTreeMoveSelection | null;
  deletePending: boolean;
  bulkDeleteConfirmOpen: boolean;
  bulkDeletePending: boolean;
  bulkSelectedNodeIds: Set<string>;
  contextMenuNode: EstimateTreeNode | null;
  contextMenuOpen: boolean;
  treeSearchQuery: string;
  treeFilter: EstimateTreeStructureFilter;
};

type EstimateSheetTreeAction =
  | { type: "reorderStatusChanged"; reorderStatus: EstimateTreeReorderStatus }
  | { type: "editingNodeIdChanged"; editingNodeId: StateUpdater<string | null> }
  | { type: "editingNodeNameChanged"; editingNodeName: string }
  | { type: "editingNodeErrorChanged"; editingNodeError: string | null }
  | { type: "renamingNodeIdChanged"; renamingNodeId: string | null }
  | { type: "deleteTargetNodeChanged"; deleteTargetNode: EstimateTreeNode | null }
  | { type: "moveTargetNodeChanged"; moveTargetNode: EstimateTreeNode | null }
  | { type: "moveSelectionChanged"; moveSelection: EstimateTreeMoveSelection | null }
  | { type: "deletePendingChanged"; deletePending: boolean }
  | { type: "bulkDeleteConfirmOpenChanged"; bulkDeleteConfirmOpen: boolean }
  | { type: "bulkDeletePendingChanged"; bulkDeletePending: boolean }
  | { type: "bulkSelectedNodeIdsChanged"; bulkSelectedNodeIds: StateUpdater<Set<string>> }
  | { type: "contextMenuNodeChanged"; contextMenuNode: EstimateTreeNode | null }
  | { type: "contextMenuOpenChanged"; contextMenuOpen: boolean }
  | { type: "treeSearchQueryChanged"; treeSearchQuery: string }
  | { type: "treeFilterChanged"; treeFilter: StateUpdater<EstimateTreeStructureFilter> };

function resolveStateUpdater<T>(current: T, updater: StateUpdater<T>): T {
  return typeof updater === "function" ? (updater as (current: T) => T)(current) : updater;
}

function createEstimateSheetTreeState(): EstimateSheetTreeState {
  return {
    reorderStatus: { state: "idle" },
    editingNodeId: null,
    editingNodeName: "",
    editingNodeError: null,
    renamingNodeId: null,
    deleteTargetNode: null,
    moveTargetNode: null,
    moveSelection: null,
    deletePending: false,
    bulkDeleteConfirmOpen: false,
    bulkDeletePending: false,
    bulkSelectedNodeIds: new Set(),
    contextMenuNode: null,
    contextMenuOpen: false,
    treeSearchQuery: "",
    treeFilter: { hideEmptyAreas: false },
  };
}

function estimateSheetTreeReducer(
  state: EstimateSheetTreeState,
  action: EstimateSheetTreeAction,
): EstimateSheetTreeState {
  switch (action.type) {
    case "reorderStatusChanged":
      return { ...state, reorderStatus: action.reorderStatus };
    case "editingNodeIdChanged":
      return { ...state, editingNodeId: resolveStateUpdater(state.editingNodeId, action.editingNodeId) };
    case "editingNodeNameChanged":
      return { ...state, editingNodeName: action.editingNodeName };
    case "editingNodeErrorChanged":
      return { ...state, editingNodeError: action.editingNodeError };
    case "renamingNodeIdChanged":
      return { ...state, renamingNodeId: action.renamingNodeId };
    case "deleteTargetNodeChanged":
      return { ...state, deleteTargetNode: action.deleteTargetNode };
    case "moveTargetNodeChanged":
      return { ...state, moveTargetNode: action.moveTargetNode };
    case "moveSelectionChanged":
      return { ...state, moveSelection: action.moveSelection };
    case "deletePendingChanged":
      return { ...state, deletePending: action.deletePending };
    case "bulkDeleteConfirmOpenChanged":
      return { ...state, bulkDeleteConfirmOpen: action.bulkDeleteConfirmOpen };
    case "bulkDeletePendingChanged":
      return { ...state, bulkDeletePending: action.bulkDeletePending };
    case "bulkSelectedNodeIdsChanged":
      return {
        ...state,
        bulkSelectedNodeIds: resolveStateUpdater(state.bulkSelectedNodeIds, action.bulkSelectedNodeIds),
      };
    case "contextMenuNodeChanged":
      return { ...state, contextMenuNode: action.contextMenuNode };
    case "contextMenuOpenChanged":
      return { ...state, contextMenuOpen: action.contextMenuOpen };
    case "treeSearchQueryChanged":
      return { ...state, treeSearchQuery: action.treeSearchQuery };
    case "treeFilterChanged":
      return { ...state, treeFilter: resolveStateUpdater(state.treeFilter, action.treeFilter) };
    default:
      return state;
  }
}

/**
 * Structural filter: prune subtrees that contain zero estimate items anywhere.
 * A node is kept iff it has direct items OR any descendant has direct items.
 * When no filter option is active, returns `nodes` unchanged (identity preserved).
 */
function filterEstimateTreeByStructure(
  nodes: EstimateTreeNode[],
  filter: EstimateTreeStructureFilter,
): EstimateTreeNode[] {
  if (!filter.hideEmptyAreas) return nodes;

  function hasItems(node: EstimateTreeNode): boolean {
    if ((node.estimateRowItems?.length ?? 0) > 0) return true;
    return (node.children ?? []).some(hasItems);
  }

  function visit(node: EstimateTreeNode): EstimateTreeNode | null {
    if (!hasItems(node)) return null;
    const children = (node.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    return { ...node, children };
  }

  return nodes.map(visit).filter((node): node is EstimateTreeNode => node !== null);
}

function collectEstimateFolderIds(nodes: EstimateTreeNode[], into: string[] = []): string[] {
  for (const node of nodes) {
    // Expandable === has children (kind-agnostic), matching buildUiTreeModel.
    if (node.children?.length || node.childrenLoaded === false) into.push(node.id);
    if (node.children?.length) collectEstimateFolderIds(node.children, into);
  }
  return into;
}

function markTerminalEstimateNodesForLazyHydration(nodes: EstimateTreeNode[]): EstimateTreeNode[] {
  let didChange = false;
  const nextNodes = nodes.map((node) => {
    if (node.children?.length) {
      const nextChildren = markTerminalEstimateNodesForLazyHydration(node.children);
      if (nextChildren === node.children) return node;
      didChange = true;
      return { ...node, children: nextChildren };
    }
    if (node.childrenLoaded !== undefined) return node;
    didChange = true;
    return { ...node, childrenLoaded: false };
  });
  return didChange ? nextNodes : nodes;
}

function buildEstimateTreeSelectionNodes(nodes: EstimateTreeNode[]): TreeSelectionNode[] {
  return nodes.map((node) => ({
    id: node.id,
    selectable: true,
    children: node.children?.length ? buildEstimateTreeSelectionNodes(node.children) : undefined,
  }));
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function EstimateSheetTree({ projectId, estimateId, activeTabId, initialTabId, projectName, selectedNodeId, nodes, loadLimitState, canEditEstimate = true, disableRouteSync = false }: EstimateSheetTreeProps) {
  const surfaceVariant = useEstimateSurfaceVariant();
  const routeParams = useParams<{ nodeId?: string | string[] }>();
  const routeNodeIdParam = Array.isArray(routeParams?.nodeId) ? routeParams.nodeId[0] : routeParams?.nodeId;
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
  const suppressPrimaryActionUntilRef = useRef(0);
  const [treeState, dispatchTreeState] = useReducer(
    estimateSheetTreeReducer,
    undefined,
    createEstimateSheetTreeState,
  );
  const {
    reorderStatus,
    editingNodeId,
    editingNodeName,
    editingNodeError,
    renamingNodeId,
    deleteTargetNode,
    moveTargetNode,
    moveSelection,
    deletePending,
    bulkDeleteConfirmOpen,
    bulkDeletePending,
    bulkSelectedNodeIds,
    contextMenuNode,
    contextMenuOpen,
    treeSearchQuery,
    treeFilter,
  } = treeState;
  const setReorderStatus = useCallback((reorderStatus: EstimateTreeReorderStatus) => {
    dispatchTreeState({ type: "reorderStatusChanged", reorderStatus });
  }, []);
  const setEditingNodeId = useCallback((editingNodeId: StateUpdater<string | null>) => {
    dispatchTreeState({ type: "editingNodeIdChanged", editingNodeId });
  }, []);
  const setEditingNodeName = useCallback((editingNodeName: string) => {
    dispatchTreeState({ type: "editingNodeNameChanged", editingNodeName });
  }, []);
  const setEditingNodeError = useCallback((editingNodeError: string | null) => {
    dispatchTreeState({ type: "editingNodeErrorChanged", editingNodeError });
  }, []);
  const setRenamingNodeId = useCallback((renamingNodeId: string | null) => {
    dispatchTreeState({ type: "renamingNodeIdChanged", renamingNodeId });
  }, []);
  const setDeleteTargetNode = useCallback((deleteTargetNode: EstimateTreeNode | null) => {
    dispatchTreeState({ type: "deleteTargetNodeChanged", deleteTargetNode });
  }, []);
  const setMoveTargetNode = (moveTargetNode: EstimateTreeNode | null) =>
    dispatchTreeState({ type: "moveTargetNodeChanged", moveTargetNode });
  const setMoveSelection = (moveSelection: EstimateTreeMoveSelection | null) =>
    dispatchTreeState({ type: "moveSelectionChanged", moveSelection });
  const setDeletePending = useCallback((deletePending: boolean) => {
    dispatchTreeState({ type: "deletePendingChanged", deletePending });
  }, []);
  const setBulkDeleteConfirmOpen = useCallback((bulkDeleteConfirmOpen: boolean) => {
    dispatchTreeState({ type: "bulkDeleteConfirmOpenChanged", bulkDeleteConfirmOpen });
  }, []);
  const setBulkDeletePending = useCallback((bulkDeletePending: boolean) => {
    dispatchTreeState({ type: "bulkDeletePendingChanged", bulkDeletePending });
  }, []);
  const setBulkSelectedNodeIds = useCallback((bulkSelectedNodeIds: StateUpdater<Set<string>>) => {
    dispatchTreeState({ type: "bulkSelectedNodeIdsChanged", bulkSelectedNodeIds });
  }, []);
  const setContextMenuNode = (contextMenuNode: EstimateTreeNode | null) =>
    dispatchTreeState({ type: "contextMenuNodeChanged", contextMenuNode });
  const setContextMenuOpen = (contextMenuOpen: boolean) =>
    dispatchTreeState({ type: "contextMenuOpenChanged", contextMenuOpen });
  const setTreeSearchQuery = (treeSearchQuery: string) =>
    dispatchTreeState({ type: "treeSearchQueryChanged", treeSearchQuery });
  const setTreeFilter = (treeFilter: StateUpdater<EstimateTreeStructureFilter>) =>
    dispatchTreeState({ type: "treeFilterChanged", treeFilter });
  // D3 (Req 10 left): structured filter. No group-by (D6 — the Area hierarchy IS
  // the grouping).
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId, activeTabId);
  const currentRouteNodeId = useMemo(
    () => (routeNodeIdParam && routeNodeIdParam !== estimateId ? routeNodeIdParam : null) ?? selectedNodeId,
    [estimateId, routeNodeIdParam, selectedNodeId],
  );
  const treeSearchActive = treeSearchQuery.trim().length > 0;
  const shouldMarkTruncatedLeavesForHydration = Boolean(
    loadLimitState?.didExceedNodeLimit && (!activeTabId || activeTabId === initialTabId),
  );
  const treeViewNodes = useMemo(
    () => shouldMarkTruncatedLeavesForHydration ? markTerminalEstimateNodesForLazyHydration(localNodes) : localNodes,
    [localNodes, shouldMarkTruncatedLeavesForHydration],
  );
  const { subtreeHydrationState, handleTreeToggle } = useEstimateTreeSubtreeHydration({
    projectId,
    estimateId,
    activeTabId,
    treeViewNodes,
    setLocalNodes,
    toast,
  });
  // Structured filter runs first (identity-stable when inactive), then the search
  // prune — so both compose and an inactive filter preserves the localNodes memo.
  const structurallyFilteredNodes = useMemo(
    () => filterEstimateTreeByStructure(treeViewNodes, treeFilter),
    [treeFilter, treeViewNodes],
  );
  const displayedNodes = useMemo(
    () =>
      treeSearchActive
        ? filterEstimateTreeNodes(structurallyFilteredNodes, treeSearchQuery)
        : structurallyFilteredNodes,
    [structurallyFilteredNodes, treeSearchActive, treeSearchQuery],
  );
  const treeHasNoMatches = localNodes.length > 0
    && displayedNodes.length === 0
    && (treeSearchActive || treeFilter.hideEmptyAreas);
  const { uiNodes: uiTreeNodes } = useMemo(
    () => buildUiTreeModel(displayedNodes, subtreeHydrationState),
    [displayedNodes, subtreeHydrationState],
  );
  const folderIds = useMemo(() => new Set(collectEstimateFolderIds(treeViewNodes)), [treeViewNodes]);
  const treeSelectionNodes = useMemo(() => buildEstimateTreeSelectionNodes(treeViewNodes), [treeViewNodes]);
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
  }, [setBulkSelectedNodeIds, treeSelectionNodes]);

  const reportReorderStatus = useEffectEvent((status: EstimateTreeReorderStatus) => {
    if (status.state === "error") {
      toast({
        id: "estimate-tree-mutation",
        message: status.message,
        tone: "error",
      });
      return;
    }

    dismissToast("estimate-tree-mutation");
  });

  useEffect(() => {
    reportReorderStatus(reorderStatus);
  }, [reorderStatus]);

  useEffect(() => {
    return () => dismissToast("estimate-tree-mutation");
  }, [dismissToast]);

  // P6 single-node model: clicking a branch makes it the next create parent,
  // while blank tree-panel space resets creation to the root without changing
  // the displayed branch. No group-kind gate — every node can take a sub-area.
  const [creationParentNodeId, setCreationParentNodeId] = useState<string | null>(activeSelectedNodeId);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setCreationParentNodeId(activeSelectedNodeId);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSelectedNodeId]);

  const isTreeMutationSaving = reorderStatus.state === "saving" || deletePending || bulkDeletePending;
  const canReorderNow = !isTreeMutationSaving;
  const {
    armContextMenuRenameHandoff,
    attachRenameInputRef,
    beginRenameForCreatedNode,
    beginRenameNode,
    cancelRenameNode,
    focusAndSelectRenameInput,
    handleContextMenuCloseAutoFocus,
    markRenameDraftDirty,
    remapEditingNodeId,
    resetContextMenuRenameHandoff,
    shouldIgnoreRenameBlur,
  } = useEstimateTreeRenameEditor({
    editingNodeId,
    canEditEstimate,
    isTreeMutationSaving,
    setEditingNodeId,
    setEditingNodeName,
    setEditingNodeError,
  });
  const suppressPrimaryActionAfterDrag = useCallback(() => {
    suppressPrimaryActionUntilRef.current = Date.now() + 500;
  }, []);
  const { handleTreeDrop } = useEstimateTreeReorder({
    projectId,
    estimateId,
    activeTabId,
    nodes,
    localNodes,
    canEditEstimate,
    canReorderNow,
    editingNodeId,
    treeSearchActive,
    setLocalNodes,
    restoreLocalNodes,
    getLocalTreeRevision,
    prepareOptimisticUpdate: prepareAreaTreeOptimisticUpdate,
    setReorderStatus,
    isOptimisticNodeId: isOptimisticEstimateNodeId,
    suppressPrimaryActionAfterDrag,
  });

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
  }, [setBulkSelectedNodeIds]);
  // Selection is client state: syncing the URL with replaceState keeps deep
  // links shareable without re-running the server route, which would remount
  // the whole workspace just to change the middle sheet.
  const syncEstimateRouteUrl = useCallback((nodeId: string | null) => {
    if (disableRouteSync) return;
    if (typeof window === "undefined") return;
    const routeNodeId = nodeId && !isOptimisticEstimateNodeId(nodeId) ? nodeId : null;
    const href = routeNodeId
      ? `/workshop/projects/${projectId}/estimates/${routeNodeId}`
      : `/workshop/projects/${projectId}/estimates/${estimateId}`;
    if (window.location.pathname === href) return;
    window.history.replaceState(null, "", href);
  }, [disableRouteSync, estimateId, projectId]);
  const {
    handleAddTreeNode,
    handleAddArea,
    commitRenameNode,
    handleConfirmDeleteNode,
    handleDeleteModalOpenChange,
    handleConfirmBulkDeleteNodes,
  } = useEstimateTreeCrud({
    projectId, estimateId, activeTabId, localNodes, activeSelectedNodeId, creationParentNodeId,
    expandedItems, canEditEstimate, isTreeMutationSaving, currentRouteNodeId, editingNodeName,
    deleteTargetNode, deletePending, bulkDeletePending, bulkDeleteRootNodeIds, bulkSelectedNodeIds,
    setLocalNodes, snapshotLocalNodes, restoreLocalNodes, getLocalTreeRevision,
    prepareAreaTreeOptimisticUpdate, setExpandedNodeIds, setSelectedNodeId, setEditingNodeId,
    setEditingNodeName, setEditingNodeError, setRenamingNodeId, setDeleteTargetNode, setDeletePending,
    setBulkDeleteConfirmOpen, setBulkDeletePending, setBulkSelectedNodeIds, setReorderStatus,
    syncEstimateRouteUrl, beginRenameForCreatedNode, remapEditingNodeId, cancelRenameNode,
    focusAndSelectRenameInput, resetContextMenuRenameHandoff, scrollRenderedTreeRowIntoView, toast,
  });

  // Reordering pauses while a search filters the tree: visible sibling order
  // no longer matches the real tree, so drops would land unpredictably.
  // Nodes whose create has not settled yet cannot be dragged: the server
  // does not know their id.
  const handleTreeCanDrag = useCallback(
    (treeNode: UiTreeNode) => canEditEstimate && canReorderNow && !editingNodeId && !treeSearchActive && !isOptimisticEstimateNodeId(treeNode.id),
    [canEditEstimate, canReorderNow, editingNodeId, treeSearchActive],
  );

  const getTreeDragDisabledReason = useCallback(
    (treeNode: UiTreeNode) => {
      if (!canEditEstimate) return VIEW_ONLY_ESTIMATE_REASON;
      if (treeSearchActive) return "Clear tree search before dragging nodes.";
      if (editingNodeId) return "Finish renaming before dragging nodes.";
      if (!canReorderNow) return "Finish the current tree save before dragging nodes.";
      if (isOptimisticEstimateNodeId(treeNode.id)) return "Wait for this new node to finish saving first.";
      return null;
    },
    [canEditEstimate, canReorderNow, editingNodeId, treeSearchActive],
  );

  const handleTreeCanDrop = useCallback((draggedId: string, targetId: string, position: TreeDropPosition) => {
    if (!canEditEstimate || !canReorderNow || editingNodeId || treeSearchActive) return false;
    if (isOptimisticEstimateNodeId(draggedId) || isOptimisticEstimateNodeId(targetId)) return false;
    const result = validateEstimateTreeDrop({
      nodes: localNodes,
      draggedNodeIds: [draggedId],
      target: { targetNodeId: targetId, position },
    });
    return result.ok || result.code === "no-op";
  }, [canEditEstimate, canReorderNow, editingNodeId, localNodes, treeSearchActive]);


  const treeExternalDrop = useEstimateTreeExternalDrops({ canEditEstimate, localNodes, suppressPrimaryActionAfterDrag });

  // Selecting a node only swaps the middle sheet: state + shallow URL sync,
  // never a router navigation, which would re-render the entire route.
  const handlePrimaryAction = useCallback((nodeId: string) => {
    if (Date.now() < suppressPrimaryActionUntilRef.current) return;
    if (editingNodeId) return;
    const node = findEstimateNode(localNodes, nodeId);
    if (!node) return;
    setCreationParentNodeId(node.id);
    setSelectedNodeId(node.id);
    syncEstimateRouteUrl(node.id);
  }, [editingNodeId, localNodes, setSelectedNodeId, syncEstimateRouteUrl]);

  const handleCheckboxToggle = useCallback((nodeId: string, checked: boolean) => {
    if (!canEditEstimate || isTreeMutationSaving) return;
    setBulkSelectedNodeIds((current) => toggleCascadeSelection(treeSelectionNodes, current, nodeId, checked));
  }, [canEditEstimate, isTreeMutationSaving, setBulkSelectedNodeIds, treeSelectionNodes]);

  const handleTreeContextMenu = useCallback((nodeId: string) => {
    setContextMenuNode(findEstimateNode(localNodes, nodeId) ?? null);
  }, [localNodes]);

  const handleTreeRenameShortcut = useCallback((nodeId: string) => {
    if (!canEditEstimate) return;
    const node = findEstimateNode(localNodes, nodeId);
    if (!node) return;
    beginRenameNode(node, { fromContextMenu: false });
  }, [beginRenameNode, canEditEstimate, localNodes]);

  const handleTreeKeyboardContextMenu = useCallback((nodeId: string) => {
    const node = findEstimateNode(localNodes, nodeId);
    if (!node) return;
    setContextMenuNode(node);
    const rowElement = findRenderedTreeRow(nodeId);
    if (rowElement) {
      const rect = rowElement.getBoundingClientRect();
      rowElement.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          cancelable: true,
          clientX: rect.left + 12,
          clientY: rect.top + Math.max(8, Math.min(24, rect.height / 2)),
        }),
      );
      return;
    }
    setContextMenuOpen(true);
  }, [localNodes]);

  const openTreeMoveDialog = useCallback((node: EstimateTreeNode) => {
    if (!canEditEstimate) return;
    setMoveTargetNode(node);
    setMoveSelection(null);
  }, [canEditEstimate]);

  const treeMoveDestinationOptions = useMemo(() => {
    if (!moveTargetNode) return [];
    return buildEstimateTreeMoveOptions({
      nodes: localNodes,
      sourceNodeId: moveTargetNode.id,
      canReorderNow: canEditEstimate && canReorderNow,
      editingNodeActive: Boolean(editingNodeId),
      treeSearchActive,
      isOptimisticNodeId: isOptimisticEstimateNodeId,
    });
  }, [canEditEstimate, canReorderNow, editingNodeId, localNodes, moveTargetNode, treeSearchActive]);

  const selectedMoveDestination = useMemo(
    () => (moveSelection ? treeMoveDestinationOptions.find((option) => option.id === moveSelection.id) ?? null : null),
    [moveSelection, treeMoveDestinationOptions],
  );

  const closeTreeMoveDialog = useCallback((sourceNodeId?: string) => {
    setMoveTargetNode(null);
    setMoveSelection(null);
    if (sourceNodeId) {
      window.setTimeout(() => findRenderedTreeRow(sourceNodeId)?.focus(), 0);
    }
  }, []);

  const confirmTreeMove = useCallback(() => {
    if (!moveTargetNode || !selectedMoveDestination || selectedMoveDestination.disabled) return;
    const sourceNodeId = moveTargetNode.id;
    handleTreeDrop(sourceNodeId, selectedMoveDestination.selection.targetNodeId, selectedMoveDestination.selection.position);
    closeTreeMoveDialog(sourceNodeId);
  }, [closeTreeMoveDialog, handleTreeDrop, moveTargetNode, selectedMoveDestination]);

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    if (!contextMenuNode) return [];
    const nodeIsPendingCreate = isOptimisticEstimateNodeId(contextMenuNode.id);
    const editDisabledReason = canEditEstimate ? undefined : VIEW_ONLY_ESTIMATE_REASON;

    return [
      // P6 single-node model: "Add area inside" is UNCONDITIONAL on every node —
      // any node can now parent a sub-area, so the affordance never throws
      // server-side. It creates an `area` child of the right-clicked node.
      {
        id: "create-nodes",
        items: [
          {
            id: "add-area-inside",
            label: "Add area inside",
            icon: <Log size={12} weight="regular" aria-hidden="true" />,
            disabled: !canEditEstimate,
            disabledReason: editDisabledReason,
            onSelect: () => {
              armContextMenuRenameHandoff();
              handleAddTreeNode(contextMenuNode.id);
            },
          },
        ],
      },
      {
        id: "node-actions",
        items: [
          {
            id: "save-as-template",
            label: "Save as template",
            icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
            disabled: !canEditEstimate || nodeIsPendingCreate,
            disabledReason: editDisabledReason ?? "Wait for this node to finish saving first.",
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
            disabled: !canEditEstimate || isTreeMutationSaving,
            disabledReason: editDisabledReason ?? "Finish the current tree save before renaming another node.",
            onSelect: () => beginRenameNode(contextMenuNode, { fromContextMenu: true }),
          },
          {
            id: "move",
            label: "Move...",
            icon: <ArrowsOutCardinal size={12} weight="regular" aria-hidden="true" />,
            disabled: !canEditEstimate || isTreeMutationSaving || treeSearchActive || nodeIsPendingCreate,
            disabledReason: editDisabledReason ?? (treeSearchActive
              ? "Clear tree search before moving areas."
              : nodeIsPendingCreate
                ? "Wait for this area to finish saving first."
                : isTreeMutationSaving
                  ? "Finish the current tree save before moving another area."
                  : undefined),
            onSelect: () => openTreeMoveDialog(contextMenuNode),
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
            disabled: !canEditEstimate || isTreeMutationSaving,
            disabledReason: editDisabledReason ?? "Finish the current tree save before deleting another node.",
            onSelect: () => setDeleteTargetNode(contextMenuNode),
          },
        ],
      },
    ];
  }, [armContextMenuRenameHandoff, beginRenameNode, canEditEstimate, contextMenuNode, handleAddTreeNode, isTreeMutationSaving, openTreeMoveDialog, setDeleteTargetNode, treeSearchActive]);

  const renderEstimateTreeRowLabel = useCallback((treeNode: UiTreeNode) => {
    const node = (treeNode.data?.node as EstimateTreeNode | undefined) ?? findEstimateNode(localNodes, treeNode.id);
    if (!node) return null;
    const subtreeLoadState = treeNode.data?.subtreeLoadState as EstimateTreeSubtreeLoadState | undefined;

    if (editingNodeId !== node.id) {
      return (
        <span className="flex min-w-0 flex-1 items-center gap-1 text-left">
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          {subtreeLoadState?.status === "loading" ? (
            <output aria-live="polite" className="shrink-0 text-[9px] font-medium leading-3 text-tertiary">
              Loading...
            </output>
          ) : null}
          {subtreeLoadState?.status === "error" ? (
            <output aria-live="polite" className="shrink-0 text-[9px] font-medium leading-3 text-danger">
              Load failed
            </output>
          ) : null}
        </span>
      );
    }

    const errorId = `estimate-tree-rename-error-${node.id}`;
    const savingId = `estimate-tree-rename-saving-${node.id}`;
    const renameSavePending = renamingNodeId === node.id;
    const describedBy = [
      editingNodeError ? errorId : null,
      renameSavePending ? savingId : null,
    ].filter(Boolean).join(" ") || undefined;
    return (
      <span className="relative flex min-w-0 flex-1 items-center gap-1">
        <input
          ref={attachRenameInputRef}
          value={editingNodeName}
          aria-label={`Rename ${node.name}`}
          aria-invalid={editingNodeError ? "true" : undefined}
          aria-describedby={describedBy}
          aria-busy={renameSavePending ? "true" : undefined}
          disabled={renameSavePending}
          draggable={false}
          placeholder="Area name"
          onChange={(event) => {
            if (renameSavePending) return;
            markRenameDraftDirty();
            setEditingNodeName(event.currentTarget.value);
            if (editingNodeError) setEditingNodeError(null);
          }}
          onBlur={(event) => {
            if (renameSavePending) return;
            if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest("[data-estimate-tree-rename-control='true']")) return;
            if (shouldIgnoreRenameBlur(editingNodeName, node.name)) return;
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
            if (renameSavePending) return;
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
            "h-5 min-h-0 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[10px] font-normal leading-5 tracking-normal text-ink outline-none shadow-none placeholder:text-tertiary focus:outline-none focus-visible:outline-none disabled:cursor-default disabled:opacity-70",
            editingNodeError ? "text-danger placeholder:text-danger" : "",
          )}
        />
        <button
          type="button"
          data-estimate-tree-rename-control="true"
          aria-label={`Confirm rename ${node.name}`}
          title="Confirm rename"
          disabled={renameSavePending}
          className="grid size-5 shrink-0 place-items-center rounded-xs border-0 bg-transparent text-tertiary opacity-70 transition-[color,opacity] hover:text-ink hover:opacity-100 focus-visible:outline-none focus-visible:text-ink disabled:cursor-not-allowed disabled:opacity-35"
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
          aria-label={`Cancel rename ${node.name}`}
          title="Cancel rename"
          disabled={renameSavePending}
          className="grid size-5 shrink-0 place-items-center rounded-xs border-0 bg-transparent text-tertiary opacity-70 transition-[color,opacity] hover:text-ink hover:opacity-100 focus-visible:outline-none focus-visible:text-ink disabled:cursor-not-allowed disabled:opacity-35"
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
            cancelRenameNode();
          }}
        >
          <X size={12} weight="regular" aria-hidden="true" />
        </button>
        {renameSavePending ? (
          <output
            id={savingId}
            aria-live="polite"
            className="shrink-0 text-[9px] font-medium leading-3 text-tertiary"
          >
            Saving...
          </output>
        ) : null}
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
    markRenameDraftDirty,
    renamingNodeId,
    setEditingNodeError,
    setEditingNodeName,
    shouldIgnoreRenameBlur,
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
        persistWidth={!disableRouteSync}
      >
        {/* group/tree on the panel widens the rail-reveal scope: rows keep
            their drag/select space while the pointer or focus is anywhere in
            this sidebar (header tools included), so reaching for Add Area or
            search no longer shifts the tree back and forth. */}
        <div className={cn("group/tree flex h-full flex-col overflow-hidden", estimateSurfaceClass(surfaceVariant, "treeRail"))}>
        <TreePanelHeader
          className={estimateSurfaceClass(surfaceVariant, "railPanelHeader")}
          toolbarClassName={estimateSurfaceClass(surfaceVariant, "chromeToolbar")}
          ariaLabel="Tree tools"
          labelPrefix="tree"
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          startActionsLabel="Tree search"
          searchValue={treeSearchQuery}
          onSearchValueChange={setTreeSearchQuery}
          searchPlaceholder="Search Tree"
          searchLabel="Search Tree"
          filterSlot={
            <FilterPopover
              trigger={<FunnelSimple size={12} weight="regular" aria-hidden="true" />}
              triggerLabel="Filter tree"
              triggerPressed={treeFilter.hideEmptyAreas}
              triggerVariant="ghost"
              triggerSize="icon-sm"
              triggerClassName={cn(
                "size-6 rounded-xs p-0",
                treeFilter.hideEmptyAreas ? "bg-surfaceMuted text-ink" : "text-tertiary",
              )}
              title="Filters"
            >
              <label className="flex cursor-pointer items-center gap-2 text-[10px] font-medium leading-none text-ink">
                <input
                  type="checkbox"
                  checked={treeFilter.hideEmptyAreas}
                  onChange={(event) => {
                    const hideEmptyAreas = event.currentTarget.checked;
                    setTreeFilter((current) => ({ ...current, hideEmptyAreas }));
                  }}
                  className="size-3 rounded-xs accent-brand-orange"
                />
                Hide empty areas
              </label>
            </FilterPopover>
          }
          addActions={[
            {
              label: "Add Branch",
              icon: <AddTreeActionIcon />,
              onClick: () => handleAddArea(),
              disabled: !canEditEstimate,
              className: ADD_BUTTON_CLASSNAME,
            },
          ]}
          tabs={ESTIMATE_TREE_TABS}
          activeTab="sheets"
          tabVariant="tabs"
          tabsAriaLabel="Estimate sheets"
          showBottomBorder={false}
          showToolbarBottomBorder
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            className="min-h-0 flex-1 overflow-auto"
            data-estimate-tree-blank-space
            onPointerDown={(event) => {
              if (event.target instanceof Element && event.target.closest("[data-tree-row], [data-tree-root-drop-edge]")) return;
              setCreationParentNodeId(null);
            }}
          >
            <div className={cn("px-2 pt-0", bulkSelectionCount > 0 ? "pb-16" : "pb-1")}>
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
                        onToggle={handleTreeToggle}
                        selectedIds={bulkSelectedIds}
                        onCheckboxToggle={handleCheckboxToggle}
                        selectionCheckboxTone="blue"
                        currentId={activeSelectedNodeId}
                        railsPinned={contextMenuOpen}
                        draggable
                        dragActivation="handle"
                        selectable={canEditEstimate}
                        allowInsideOnLeaves
                        dragDataType={ESTIMATE_TREE_DRAG_MIME_TYPE}
                        canDrag={handleTreeCanDrag}
                        getDragDisabledReason={getTreeDragDisabledReason}
                        canDrop={handleTreeCanDrop}
                        onDrop={handleTreeDrop}
                        externalDrop={treeExternalDrop}
                        onNodeDragStart={suppressPrimaryActionAfterDrag}
                        onRowClick={handlePrimaryAction}
                        onContextMenu={handleTreeContextMenu}
                        onRenameShortcut={handleTreeRenameShortcut}
                        onKeyboardContextMenu={handleTreeKeyboardContextMenu}
                        rootDropZones={{ edges: ["bottom"] }}
                        renderRow={renderEstimateTreeRowLabel}
                        virtualization={WORKSHOP_TREE_VIRTUALIZATION}
                        emptyState={
                          <div className="flex min-h-28 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium leading-4 text-ink">
                                {treeHasNoMatches ? "No areas match" : "No areas yet"}
                              </p>
                              <p className="max-w-[190px] text-[10px] leading-4 text-tertiary">
                                {treeHasNoMatches
                                  ? "Try another search or clear the active filters."
                                  : "Add an area to start organizing this estimate."}
                              </p>
                            </div>
                            {!treeHasNoMatches ? (
                              <Button
                                variant="secondary"
                                size="xs"
                                className="min-w-0 gap-1 px-2"
                                disabled={!canEditEstimate}
                                title={canEditEstimate ? undefined : VIEW_ONLY_ESTIMATE_REASON}
                                onClick={() => handleAddArea()}
                              >
                                <AddTreeActionIcon />
                                Add Area
                              </Button>
                            ) : null}
                          </div>
                        }
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
                disabled: !canEditEstimate || isTreeMutationSaving || bulkDeleteRootNodeIds.length === 0,
                title: canEditEstimate ? undefined : VIEW_ONLY_ESTIMATE_REASON,
                onClick: () => {
                  if (canEditEstimate) setBulkDeleteConfirmOpen(true);
                },
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
              disabled={!canEditEstimate || bulkDeletePending || bulkDeleteRootNodeIds.length === 0}
              onClick={handleConfirmBulkDeleteNodes}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <EstimateTreeMoveDialog
        sourceNode={moveTargetNode}
        options={treeMoveDestinationOptions}
        selection={moveSelection}
        onSelectionChange={setMoveSelection}
        onCancel={closeTreeMoveDialog}
        onConfirm={confirmTreeMove}
      />
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
                Delete <span className="font-medium">{deleteTargetNode.name}</span>? This action updates the tree immediately. Use Undo after deletion to restore it.
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
              disabled={!canEditEstimate || deletePending}
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
