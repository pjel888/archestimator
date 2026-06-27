"use client";

import { unstable_rethrow, useParams } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowsOutCardinal,
  Check,
  FunnelSimple,
  Log,
  PencilSimple,
  StackPlus,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { FilterPopover } from "@/components/ui/overlays/popover";
import { Button } from "@/components/ui/button";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ControlInput } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Tree, type TreeDropPosition, type TreeExternalDropOptions, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import {
  createEstimateNode,
  deleteEstimateNode,
  deleteEstimateNodesBulk,
  renameEstimateNode,
  reorderEstimateTreeNodes,
  restoreDeletedEstimateNodes,
} from "@/lib/estimates/actions";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import {
  dedupeSelectedRoots,
  pruneSelection,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "@/lib/bulk-selection/tree-selection";
import { useEstimateAreaTreeQuery, useEstimateTabTreeQuery } from "@/hooks/use-estimate-query";
import { useEstimateWorkspaceExpansion, useEstimateWorkspaceSelection, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { cn } from "@/lib/ui/cn";
import { estimateSurfaceClass } from "./estimate-surface-class";
import { useEstimateSurfaceVariant } from "./estimate-surface-variant";
import {
  evaluateEstimateTreeDrop,
  getEstimateTreeContentSignature,
  mergeEstimateTreeStructureWithCachedNodes,
  validateEstimateTreeDrop,
} from "@/lib/estimates/estimate-tree-reorder";
import {
  beginEstimateTreeSubtreeLoad,
  completeEstimateTreeSubtreeLoad,
  failEstimateTreeSubtreeLoad,
  mergeEstimateTreeSubtreePayload,
  shouldAcceptEstimateTreeSubtreeResponse,
  shouldHydrateEstimateTreeSubtree,
  type EstimateTreeHydrationState,
  type EstimateTreeSubtreeLoadState,
} from "@/lib/estimates/estimate-tree-lazy";
import { loadEstimateNodeSubtree } from "@/lib/estimates/subtree-client";
import type { EstimateTreeLoadLimitState } from "@/lib/estimates/types";
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
import {
  REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT,
  REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT,
  type RequestEstimateRowItemMoveEventDetail,
  type RequestEstimateTreeNodeCreateEventDetail,
} from "./estimate-sheet/events";
import {
  ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE,
  readEstimateRowItemDragPayload,
} from "./estimate-sheet/rows/constants";
import { endEstimateWorkshopDrag } from "./estimate-workshop-drag";
import { ResizableSidePanel } from "./ResizableSidePanel";

type EstimateSheetTreeProps = {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  initialTabId?: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
  loadLimitState?: EstimateTreeLoadLimitState;
  disableRouteSync?: boolean;
};

const ESTIMATE_TREE_LEFT_EXTENSION_WIDTH = 104;
const ESTIMATE_TREE_TABS = [{ id: "sheets", label: "Estimate Tree" }] as const;

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
function AddTreeActionIcon() {
  return <Log size={13} weight="regular" aria-hidden="true" />;
}

function cloneEstimateTreeNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneEstimateTreeNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}

// New nodes append after their siblings — the same slot the server assigns
// (max sibling sort_order + the sparse tree sort step) — so the optimistic tree and the settled tree
// agree without any kind-based re-sorting.
function insertLocalEstimateTreeNode(nodes: EstimateTreeNode[], parentId: string | null, nodeToInsert: EstimateTreeNode): EstimateTreeNode[] {
  if (parentId === null) {
    return [...nodes.map(cloneEstimateTreeNode), cloneEstimateTreeNode(nodeToInsert)];
  }

  return nodes.map((node) => {
    const cloned = cloneEstimateTreeNode(node);
    // P6 single-node model: any node may parent any node, so the optimistic
    // insert lands under whichever node matches the target id — no kind gate.
    if (cloned.id === parentId) {
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

function makeOptimisticTreeNodeId() {
  // P6 single-node model: every new node is an "area" (the surviving label).
  return `optimistic-area-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

function createOptimisticEstimateTreeNode(id: string, name: string): EstimateTreeNode {
  // P6 single-node model: every new node is an "area" that can hold both rows
  // and child sub-areas, so it always carries an (empty) estimateRowItems slot.
  return {
    id,
    name,
    kind: "area",
    total: "₱0.00",
    children: [],
    estimateRowItems: [],
  };
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
  reorderStatus: ReorderStatus;
  editingNodeId: string | null;
  editingNodeName: string;
  editingNodeError: string | null;
  renamingNodeId: string | null;
  deleteTargetNode: EstimateTreeNode | null;
  moveTargetNode: EstimateTreeNode | null;
  moveDestinationNodeId: string;
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
  | { type: "reorderStatusChanged"; reorderStatus: ReorderStatus }
  | { type: "editingNodeIdChanged"; editingNodeId: StateUpdater<string | null> }
  | { type: "editingNodeNameChanged"; editingNodeName: string }
  | { type: "editingNodeErrorChanged"; editingNodeError: string | null }
  | { type: "renamingNodeIdChanged"; renamingNodeId: string | null }
  | { type: "deleteTargetNodeChanged"; deleteTargetNode: EstimateTreeNode | null }
  | { type: "moveTargetNodeChanged"; moveTargetNode: EstimateTreeNode | null }
  | { type: "moveDestinationNodeIdChanged"; moveDestinationNodeId: string }
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
    moveDestinationNodeId: "",
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
    case "moveDestinationNodeIdChanged":
      return { ...state, moveDestinationNodeId: action.moveDestinationNodeId };
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

function resolveConfirmedDeleteFallbackNodeId(tree: EstimateTreeNode[], fallbackNodeId: string | null) {
  if (fallbackNodeId && findEstimateNode(tree, fallbackNodeId)) return fallbackNodeId;
  return tree[0]?.id ?? null;
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function EstimateSheetTree({ projectId, estimateId, activeTabId, initialTabId, projectName, selectedNodeId, nodes, loadLimitState, disableRouteSync = false }: EstimateSheetTreeProps) {
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
  const pendingReordersRef = useRef(0);
  const suppressPrimaryActionUntilRef = useRef(0);
  const renameCommitInFlightRef = useRef(false);
  // Optimistic node ids resolve to server ids here; mutations fired before the
  // create settles await the pending promise instead of erroring server-side.
  const pendingNodeCreatesRef = useRef<Map<string, Promise<string>>>(null!);
  if (pendingNodeCreatesRef.current === null) pendingNodeCreatesRef.current = new Map();
  const resolvedNodeIdsRef = useRef<Map<string, string>>(null!);
  if (resolvedNodeIdsRef.current === null) resolvedNodeIdsRef.current = new Map();
  const skipRenameAutoSelectRef = useRef(false);
  const renameDraftDirtyRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const suppressContextMenuCloseAutoFocusRef = useRef(false);
  const ignoreRenameBlurDuringContextMenuCloseRef = useRef(false);
  const lastAcceptedPropSignatureRef = useRef<string>(null!);
  if (lastAcceptedPropSignatureRef.current === null) lastAcceptedPropSignatureRef.current = getEstimateTreeContentSignature(nodes);
  const lastObservedPropSignatureRef = useRef<string>(null!);
  if (lastObservedPropSignatureRef.current === null) lastObservedPropSignatureRef.current = getEstimateTreeContentSignature(nodes);
  const lastObservedPropNodesRef = useRef(nodes);
  const stalePropSignatureToIgnoreRef = useRef<string | null>(null);
  const pendingPropNodesRef = useRef<EstimateTreeNode[] | null>(null);
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
    moveDestinationNodeId,
    deletePending,
    bulkDeleteConfirmOpen,
    bulkDeletePending,
    bulkSelectedNodeIds,
    contextMenuNode,
    contextMenuOpen,
    treeSearchQuery,
    treeFilter,
  } = treeState;
  const [subtreeHydrationState, setSubtreeHydrationState] = useState<EstimateTreeHydrationState>({});
  const subtreeHydrationStateRef = useRef<EstimateTreeHydrationState>({});
  const subtreeHydrationRequestCounterRef = useRef(0);
  const setReorderStatus = (reorderStatus: ReorderStatus) =>
    dispatchTreeState({ type: "reorderStatusChanged", reorderStatus });
  const setEditingNodeId = (editingNodeId: StateUpdater<string | null>) =>
    dispatchTreeState({ type: "editingNodeIdChanged", editingNodeId });
  const setEditingNodeName = (editingNodeName: string) =>
    dispatchTreeState({ type: "editingNodeNameChanged", editingNodeName });
  const setEditingNodeError = (editingNodeError: string | null) =>
    dispatchTreeState({ type: "editingNodeErrorChanged", editingNodeError });
  const setRenamingNodeId = useCallback((renamingNodeId: string | null) => {
    dispatchTreeState({ type: "renamingNodeIdChanged", renamingNodeId });
  }, []);
  const setDeleteTargetNode = (deleteTargetNode: EstimateTreeNode | null) =>
    dispatchTreeState({ type: "deleteTargetNodeChanged", deleteTargetNode });
  const setMoveTargetNode = (moveTargetNode: EstimateTreeNode | null) =>
    dispatchTreeState({ type: "moveTargetNodeChanged", moveTargetNode });
  const setMoveDestinationNodeId = (moveDestinationNodeId: string) =>
    dispatchTreeState({ type: "moveDestinationNodeIdChanged", moveDestinationNodeId });
  const setDeletePending = (deletePending: boolean) =>
    dispatchTreeState({ type: "deletePendingChanged", deletePending });
  const setBulkDeleteConfirmOpen = (bulkDeleteConfirmOpen: boolean) =>
    dispatchTreeState({ type: "bulkDeleteConfirmOpenChanged", bulkDeleteConfirmOpen });
  const setBulkDeletePending = (bulkDeletePending: boolean) =>
    dispatchTreeState({ type: "bulkDeletePendingChanged", bulkDeletePending });
  const setBulkSelectedNodeIds = (bulkSelectedNodeIds: StateUpdater<Set<string>>) =>
    dispatchTreeState({ type: "bulkSelectedNodeIdsChanged", bulkSelectedNodeIds });
  const setContextMenuNode = (contextMenuNode: EstimateTreeNode | null) =>
    dispatchTreeState({ type: "contextMenuNodeChanged", contextMenuNode });
  const setContextMenuOpen = (contextMenuOpen: boolean) =>
    dispatchTreeState({ type: "contextMenuOpenChanged", contextMenuOpen });
  const setTreeSearchQuery = (treeSearchQuery: string) =>
    dispatchTreeState({ type: "treeSearchQueryChanged", treeSearchQuery });
  const setTreeFilter = (treeFilter: StateUpdater<EstimateTreeStructureFilter>) =>
    dispatchTreeState({ type: "treeFilterChanged", treeFilter });
  useEffect(() => {
    subtreeHydrationStateRef.current = subtreeHydrationState;
  }, [subtreeHydrationState]);
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
  }, [treeSelectionNodes]);

  const reportReorderStatus = useEffectEvent((status: ReorderStatus) => {
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

  // P6 single-node model: ANY selected node is a valid create parent (an "Add
  // Area" targets the selection as a child, or a root when nothing/an unknown
  // node is selected). No group-kind gate — every node can take a sub-area.
  const selectedParentNodeId = useMemo(() => {
    const selectedNode = activeSelectedNodeId ? findEstimateNode(treeViewNodes, activeSelectedNodeId) : undefined;
    return selectedNode ? selectedNode.id : null;
  }, [activeSelectedNodeId, treeViewNodes]);

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
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- Local tree reconciliation from incoming props; no parent callback or upward data handoff occurs.
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
  const hydrateEstimateTreeSubtree = useCallback((nodeId: string) => {
    const node = findEstimateNode(treeViewNodes, nodeId);
    if (!shouldHydrateEstimateTreeSubtree(node, subtreeHydrationStateRef.current)) return;

    const requestId = `${estimateId}:${activeTabId ?? "legacy"}:${nodeId}:${++subtreeHydrationRequestCounterRef.current}`;
    setSubtreeHydrationState((current) => {
      const next = beginEstimateTreeSubtreeLoad(current, nodeId, requestId);
      subtreeHydrationStateRef.current = next;
      return next;
    });

    void loadEstimateNodeSubtree({
      projectId,
      estimateId,
      tabId: activeTabId ?? null,
      nodeId,
      requestId,
    })
      .then((payload) => {
        if (!shouldAcceptEstimateTreeSubtreeResponse(subtreeHydrationStateRef.current, nodeId, requestId)) return;

        let didMerge = false;
        setLocalNodes((currentNodes) => {
          const result = mergeEstimateTreeSubtreePayload(currentNodes, payload);
          didMerge = result.merged;
          return result.nodes;
        });

        setSubtreeHydrationState((current) => {
          const next = didMerge
            ? completeEstimateTreeSubtreeLoad(current, nodeId, requestId, payload.fetchedAt)
            : failEstimateTreeSubtreeLoad(current, nodeId, requestId, "The loaded branch no longer exists.");
          subtreeHydrationStateRef.current = next;
          return next;
        });
      })
      .catch((error: unknown) => {
        unstable_rethrow(error);
        const message = error instanceof Error ? error.message : "Could not load this area.";
        setSubtreeHydrationState((current) => {
          const next = failEstimateTreeSubtreeLoad(current, nodeId, requestId, message);
          subtreeHydrationStateRef.current = next;
          return next;
        });
        toast({
          id: "estimate-tree-subtree-load",
          message,
          tone: "error",
        });
      });
  }, [activeTabId, estimateId, projectId, setLocalNodes, toast, treeViewNodes]);
  const handleTreeToggle = useCallback((nodeId: string, expanded: boolean) => {
    if (expanded) hydrateEstimateTreeSubtree(nodeId);
  }, [hydrateEstimateTreeSubtree]);
  const clearBulkSelection = useCallback(() => {
    setBulkSelectedNodeIds(new Set());
  }, []);
  const isTreeMutationSaving = reorderStatus.state === "saving" || deletePending || bulkDeletePending;
  const canReorderNow = !isTreeMutationSaving;
  const treeMutationStatusMessage = reorderStatus.state === "saving" || reorderStatus.state === "saved"
    ? reorderStatus.message
    : "";

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
    if (disableRouteSync) return;
    if (typeof window === "undefined") return;
    const routeNodeId = nodeId && !isOptimisticEstimateNodeId(nodeId) ? nodeId : null;
    const href = routeNodeId
      ? `/workshop/projects/${projectId}/estimates/${routeNodeId}`
      : `/workshop/projects/${projectId}/estimates/${estimateId}`;
    if (window.location.pathname === href) return;
    window.history.replaceState(null, "", href);
  }, [disableRouteSync, estimateId, projectId]);

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
    return validateEstimateTreeDrop({
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
        const confirmed = await reorderEstimateTreeNodes(projectId, estimateId, { updates: freshResult.plan.updates, targetTabId: activeTabId });
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
    activeTabId,
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

  // P6 single-node model: a template OR a project source dropped "inside" any
  // node row inserts directly as a child of that node — every node can take
  // children now, so there is no group gate and no area-wrap path. (Drops are
  // still "inside" only — no root or between-row placement here.)
  const treeExternalDrop = useMemo<TreeExternalDropOptions>(() => ({
    types: [ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, PROJECT_SOURCE_DRAG_MIME_TYPE, ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE],
    dropEffect: (types) => types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE) ? "move" : "copy",
    canDrop: (types, targetId, position) => {
      if (position !== "inside") return false;
      if (isOptimisticEstimateNodeId(targetId)) return false;
      const targetNode = findEstimateNode(localNodes, targetId);
      if (!targetNode) return false;
      // Any existing node is a valid drop target for both templates and
      // project sources now; row-item drops append to the target node's rows.
      return types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)
        || types.includes(PROJECT_SOURCE_DRAG_MIME_TYPE)
        || types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE);
    },
    onDrop: (event, targetId) => {
      const targetNode = findEstimateNode(localNodes, targetId);
      if (!targetNode) return;

      const rowItemPayload = readEstimateRowItemDragPayload(event.dataTransfer.getData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE));
      if (rowItemPayload) {
        endEstimateWorkshopDrag();
        suppressPrimaryActionAfterDrag();
        const detail: RequestEstimateRowItemMoveEventDetail = {
          rowItemId: rowItemPayload.rowItemId,
          targetNodeId: targetId,
          targetIndex: targetNode.estimateRowItems?.length ?? 0,
          targetPlacement: "end",
        };
        window.dispatchEvent(new CustomEvent<RequestEstimateRowItemMoveEventDetail>(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, { detail }));
        return;
      }

      // The sheet owns insertion (tree update + action); hand the drop over via a
      // window event instead of duplicating that flow here.
      const templatePayload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
      if (templatePayload) {
        suppressPrimaryActionAfterDrag();
        const detail: InsertEstimateTemplateEventDetail = templatePayload.kind === "template-node"
          ? { targetParentNodeId: targetId, templateId: templatePayload.templateId, templateNodeId: templatePayload.templateNodeId }
          : { targetParentNodeId: targetId, templateIds: templatePayload.templateIds };
        window.dispatchEvent(new CustomEvent<InsertEstimateTemplateEventDetail>(INSERT_ESTIMATE_TEMPLATE_EVENT, { detail }));
        return;
      }

      const projectSourcePayload = readProjectSourceDragPayload(event.dataTransfer.getData(PROJECT_SOURCE_DRAG_MIME_TYPE));
      if (projectSourcePayload) {
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

  // P6 single create flow: "Add Area" makes a child area of the given parent
  // (or a root area when no parent). There is no kind choice and no
  // "select a group first" guard — every node can parent an area, so every
  // create succeeds. Internal `kind` is always "area" (the surviving label);
  // the user only ever sees "Area".
  const handleAddTreeNode = useCallback((parentNodeIdOverride?: string) => {
    const targetParentNodeId = parentNodeIdOverride ?? selectedParentNodeId;

    const nodeName = "New Area";
    const optimisticNodeId = makeOptimisticTreeNodeId();
    const optimisticNode = createOptimisticEstimateTreeNode(optimisticNodeId, nodeName);
    const nextNodes = insertLocalEstimateTreeNode(localNodes, targetParentNodeId, optimisticNode);
    const previousSelectedNodeId = activeSelectedNodeId;

    setLocalNodes(nextNodes);
    if (targetParentNodeId) {
      setExpandedNodeIds(Array.from(new Set([...expandedItems, targetParentNodeId])));
    }
    // The node is usable immediately: select it and open inline rename while
    // the create settles in the background.
    setSelectedNodeId(optimisticNodeId);
    renameDraftDirtyRef.current = false;
    setEditingNodeId(optimisticNodeId);
    setEditingNodeName(nodeName);
    setEditingNodeError(null);
    setReorderStatus({ state: "saving", message: "Adding area" });
    scrollRenderedTreeRowIntoView(optimisticNodeId);

    function createOnServer(serverParentId: string | null) {
      const formData = new FormData();
      formData.set("kind", "area");
      formData.set("name", nodeName);
      if (serverParentId) formData.set("parentId", serverParentId);
      if (activeTabId) formData.set("estimateTabId", activeTabId);
      return createEstimateNode(projectId, estimateId, formData).then((result) => result.nodeId);
    }

    // A parent created moments ago may still carry an optimistic id; chain
    // this create behind the parent's create instead of sending an id the
    // server has never seen.
    const knownParentId = targetParentNodeId ? resolvedNodeIdsRef.current.get(targetParentNodeId) ?? targetParentNodeId : null;
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
    selectedParentNodeId,
    setExpandedNodeIds,
    setLocalNodes,
    setSelectedNodeId,
    syncEstimateRouteUrl,
  ]);

  // The single "Add Area" affordance: a child area of the selected node, or a
  // root area when nothing is selected. One name, one flow — every node can now
  // parent an area (P6), so there is no kind choice and no "select a group
  // first" guard.
  const handleAddArea = useCallback((parentNodeIdOverride?: string) => {
    handleAddTreeNode(parentNodeIdOverride);
  }, [handleAddTreeNode]);

  useEffect(() => {
    function handleRequestedTreeNodeCreate(event: Event) {
      const detail = (event as CustomEvent<Partial<RequestEstimateTreeNodeCreateEventDetail>>).detail;
      // Legacy create event still carries a kind ("group"/"area" from the
      // empty-tab "Add Area" button → root create). Route any of them through
      // the single create flow as a root area.
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

  const beginRenameNode = useCallback((node: EstimateTreeNode, options?: { fromContextMenu?: boolean }) => {
    if (isTreeMutationSaving) return;
    if (options?.fromContextMenu) {
      armContextMenuRenameHandoff();
    } else {
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    }
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
    setRenamingNodeId(node.id);
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
        if (serverNodeId !== node.id) setRenamingNodeId(serverNodeId);
        const confirmed = await renameEstimateNode(projectId, estimateId, serverNodeId, nextName);
        if (confirmed.nodeId !== node.id || confirmed.name !== nextName) {
          setLocalNodes((currentNodes) => renameEstimateTreeNode(currentNodes, confirmed.nodeId, confirmed.name));
        }
        setEditingNodeId(null);
        setEditingNodeName("");
        setEditingNodeError(null);
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
        setRenamingNodeId(null);
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
    setRenamingNodeId,
    snapshotLocalNodes,
  ]);

  const replaceEstimateRoute = syncEstimateRouteUrl;

  const showDeletedNodesUndoToast = useCallback((input: {
    sourceEventId: string;
    nodeIds: string[];
    preferredRestoreNodeId: string | null;
    message: string;
    restoredMessage: string;
  }) => {
    toast({
      id: `estimate-tree-delete-${input.sourceEventId}`,
      tone: "neutral",
      message: input.message,
      durationMs: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          const restoreToastId = `estimate-tree-restore-${input.sourceEventId}`;
          toast({
            id: restoreToastId,
            tone: "loading",
            message: "Restoring tree...",
            durationMs: null,
          });
          void (async () => {
            try {
              const restoreResult = await restoreDeletedEstimateNodes({
                projectId,
                estimateId,
                sourceEventId: input.sourceEventId,
                nodeIds: input.nodeIds,
                targetTabId: activeTabId,
              });
              setLocalNodes(restoreResult.tree);
              if (input.preferredRestoreNodeId && restoreResult.restoredNodeIds.includes(input.preferredRestoreNodeId)) {
                setSelectedNodeId(input.preferredRestoreNodeId);
                replaceEstimateRoute(input.preferredRestoreNodeId);
              }
              toast({
                id: restoreToastId,
                tone: "success",
                message: input.restoredMessage,
              });
            } catch (error) {
              unstable_rethrow(error);
              toast({
                id: restoreToastId,
                tone: "error",
                message: "Couldn't restore the deleted Areas. Try again.",
              });
            }
          })();
        },
      },
    });
  }, [
    activeTabId,
    estimateId,
    projectId,
    replaceEstimateRoute,
    setLocalNodes,
    setSelectedNodeId,
    toast,
  ]);

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
        const confirmed = await deleteEstimateNode(projectId, estimateId, serverTargetNodeId, activeTabId);
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
        const preferredRestoreNodeId = (routeWasDeleted || routeWasDeletedOnServer)
          ? routeNodeIdBeforeDelete
          : activeSelectionWasDeletedOnServer
            ? previousSelectedNodeId
            : null;

        setLocalNodes(confirmed.tree);
        if (activeSelectionWasDeletedOnServer) {
          setSelectedNodeId(confirmedFallbackNodeId);
        }
        if ((routeWasDeleted || routeWasDeletedOnServer) && optimisticRouteNodeId !== serverRouteNodeId) {
          replaceEstimateRoute(serverRouteNodeId);
        }
        setReorderStatus({ state: "saved", message: "Node deleted" });
        showDeletedNodesUndoToast({
          sourceEventId: confirmed.eventId,
          nodeIds: confirmed.deletedNodeIds,
          preferredRestoreNodeId,
          message: "Area deleted.",
          restoredMessage: "Area restored.",
        });
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
    activeTabId,
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
    showDeletedNodesUndoToast,
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
        const confirmed = await deleteEstimateNodesBulk(projectId, estimateId, serverRootNodeIds, activeTabId);
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
        const preferredRestoreNodeId = (routeWasDeleted || routeWasDeletedOnServer)
          ? routeNodeIdBeforeDelete
          : activeSelectionWasDeletedOnServer
            ? previousSelectedNodeId
            : null;

        setLocalNodes(confirmed.tree);
        if (activeSelectionWasDeletedOnServer) {
          setSelectedNodeId(confirmedFallbackNodeId);
        }
        if ((routeWasDeleted || routeWasDeletedOnServer) && optimisticRouteNodeId !== serverRouteNodeId) {
          replaceEstimateRoute(serverRouteNodeId);
        }
        setReorderStatus({ state: "saved", message: "Selected nodes deleted" });
        showDeletedNodesUndoToast({
          sourceEventId: confirmed.eventId,
          nodeIds: confirmed.deletedNodeIds,
          preferredRestoreNodeId,
          message: `${confirmed.deletedNodeIds.length} ${confirmed.deletedNodeIds.length === 1 ? "Area" : "Areas"} deleted.`,
          restoredMessage: `${confirmed.deletedNodeIds.length} ${confirmed.deletedNodeIds.length === 1 ? "Area" : "Areas"} restored.`,
        });
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
    activeTabId,
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
    showDeletedNodesUndoToast,
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

  const handleTreeRenameShortcut = useCallback((nodeId: string) => {
    const node = findEstimateNode(localNodes, nodeId);
    if (!node) return;
    beginRenameNode(node, { fromContextMenu: false });
  }, [beginRenameNode, localNodes]);

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
    setMoveTargetNode(node);
    setMoveDestinationNodeId("");
  }, []);

  const treeMoveDestinationOptions = useMemo(() => {
    if (!moveTargetNode) return [];
    const sourceNodeId = moveTargetNode.id;
    const options: Array<{
      id: string;
      name: string;
      depth: number;
      path: string;
      disabled: boolean;
      reason: string;
    }> = [];
    const globalDisabled = !canReorderNow || Boolean(editingNodeId) || treeSearchActive || isOptimisticEstimateNodeId(sourceNodeId);
    const globalReason = treeSearchActive
      ? "Clear tree search before moving areas."
      : editingNodeId
        ? "Finish renaming before moving areas."
        : !canReorderNow
          ? "Finish the current tree save before moving areas."
          : isOptimisticEstimateNodeId(sourceNodeId)
            ? "Wait for this new area to finish saving first."
            : "";

    function visit(nodesToVisit: EstimateTreeNode[], depth: number, parentPath: string[]) {
      nodesToVisit.forEach((node) => {
        const validation = validateEstimateTreeDrop({
          nodes: localNodes,
          draggedNodeIds: [sourceNodeId],
          target: { targetNodeId: node.id, position: "inside" },
        });
        const nodeIsPendingCreate = isOptimisticEstimateNodeId(node.id);
        options.push({
          id: node.id,
          name: node.name,
          depth,
          path: [...parentPath, node.name].join(" / "),
          disabled: globalDisabled || nodeIsPendingCreate || !validation.ok,
          reason: globalReason || (nodeIsPendingCreate ? "Wait for this area to finish saving first." : validation.ok ? "" : validation.message),
        });
        visit(node.children ?? [], depth + 1, [...parentPath, node.name]);
      });
    }

    visit(localNodes, 0, []);
    return options;
  }, [canReorderNow, editingNodeId, localNodes, moveTargetNode, treeSearchActive]);

  const selectedMoveDestination = useMemo(
    () => treeMoveDestinationOptions.find((option) => option.id === moveDestinationNodeId) ?? null,
    [moveDestinationNodeId, treeMoveDestinationOptions],
  );

  const closeTreeMoveDialog = useCallback((sourceNodeId?: string) => {
    setMoveTargetNode(null);
    setMoveDestinationNodeId("");
    if (sourceNodeId) {
      window.setTimeout(() => findRenderedTreeRow(sourceNodeId)?.focus(), 0);
    }
  }, []);

  const confirmTreeMove = useCallback(() => {
    if (!moveTargetNode || !selectedMoveDestination || selectedMoveDestination.disabled) return;
    const sourceNodeId = moveTargetNode.id;
    handleTreeDrop(sourceNodeId, selectedMoveDestination.id, "inside");
    closeTreeMoveDialog(sourceNodeId);
  }, [closeTreeMoveDialog, handleTreeDrop, moveTargetNode, selectedMoveDestination]);

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
    const nodeIsPendingCreate = isOptimisticEstimateNodeId(contextMenuNode.id);

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
            onSelect: () => beginRenameNode(contextMenuNode, { fromContextMenu: true }),
          },
          {
            id: "move",
            label: "Move...",
            icon: <ArrowsOutCardinal size={12} weight="regular" aria-hidden="true" />,
            disabled: isTreeMutationSaving || treeSearchActive || nodeIsPendingCreate,
            disabledReason: treeSearchActive
              ? "Clear tree search before moving areas."
              : nodeIsPendingCreate
                ? "Wait for this area to finish saving first."
                : isTreeMutationSaving
                  ? "Finish the current tree save before moving another area."
                  : undefined,
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
            disabled: isTreeMutationSaving,
            disabledReason: "Finish the current tree save before deleting another node.",
            onSelect: () => setDeleteTargetNode(contextMenuNode),
          },
        ],
      },
    ];
  }, [armContextMenuRenameHandoff, beginRenameNode, contextMenuNode, handleAddTreeNode, isTreeMutationSaving, openTreeMoveDialog, treeSearchActive]);

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
        <ControlInput
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
            renameDraftDirtyRef.current = true;
            setEditingNodeName(event.currentTarget.value);
            if (editingNodeError) setEditingNodeError(null);
          }}
          onBlur={(event) => {
            if (renameSavePending) return;
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
            "h-5 min-h-0 flex-1 rounded-xs border-focus bg-white px-1 py-0 font-normal leading-5 shadow-[inset_0_0_0_1px_rgba(61,61,61,0.08)] hover:border-focus focus:border-focus focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/50",
            editingNodeError ? "border-danger focus:border-danger focus-visible:ring-danger/40" : "",
          )}
        />
        <button
          type="button"
          data-estimate-tree-rename-control="true"
          aria-label={`Confirm rename ${node.name}`}
          title="Confirm rename"
          disabled={renameSavePending}
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
          disabled={renameSavePending}
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
    renamingNodeId,
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
          {treeMutationStatusMessage ? (
            <output
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
              data-estimate-tree-mutation-status
            >
              {treeMutationStatusMessage}
            </output>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">
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
                        currentId={activeSelectedNodeId}
                        railsPinned={contextMenuOpen}
                        draggable
                        selectable
                        allowInsideOnLeaves
                        dragDataType={ESTIMATE_TREE_DRAG_MIME_TYPE}
                        canDrag={handleTreeCanDrag}
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
                              <p className="text-[10px] font-medium leading-4 text-ink">No areas yet</p>
                              <p className="max-w-[190px] text-[10px] leading-4 text-tertiary">Add an area to start organizing this estimate.</p>
                            </div>
                            <Button
                              variant="secondary"
                              size="xs"
                              className="min-w-0 gap-1 px-2"
                              onClick={() => handleAddArea()}
                            >
                              <AddTreeActionIcon />
                              Add Area
                            </Button>
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
        open={Boolean(moveTargetNode)}
        title={moveTargetNode ? `Move ${moveTargetNode.name}` : "Move Area"}
        description="Choose the area that should contain this area. Invalid targets stay visible with a reason."
        onOpenChange={(open) => {
          if (!open) closeTreeMoveDialog(moveTargetNode?.id);
        }}
        closeLabel="Cancel move"
        className="max-w-md"
      >
        <div className="space-y-3">
          <fieldset className="space-y-1">
            <legend className="text-[10px] font-medium leading-4 text-ink">Destination area</legend>
            <div className="max-h-72 overflow-auto rounded-xs border border-hairline bg-white">
              {treeMoveDestinationOptions.length > 0 ? (
                treeMoveDestinationOptions.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-8 cursor-pointer items-start gap-2 border-b border-hairline px-2 py-1.5 last:border-b-0",
                      option.disabled ? "cursor-not-allowed opacity-60" : "hover:bg-surfaceMuted",
                    )}
                    style={{ paddingLeft: `${8 + option.depth * 14}px` }}
                  >
                    <input
                      type="radio"
                      name="estimate-tree-move-destination"
                      value={option.id}
                      checked={moveDestinationNodeId === option.id}
                      disabled={option.disabled}
                      onChange={() => setMoveDestinationNodeId(option.id)}
                      className="mt-0.5 size-3"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-medium leading-4 text-ink">{option.name}</span>
                      <span className="block truncate text-[9px] leading-3 text-tertiary">
                        {option.disabled ? option.reason : option.path}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="px-2 py-3 text-[10px] leading-4 text-tertiary">No destination areas are available.</p>
              )}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => closeTreeMoveDialog(moveTargetNode?.id)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!selectedMoveDestination || selectedMoveDestination.disabled}
              onClick={confirmTreeMove}
            >
              Move
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
