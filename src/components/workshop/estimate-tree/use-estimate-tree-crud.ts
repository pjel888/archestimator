"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { useToast } from "@/components/ui/toast";
import { findEstimateNode, type EstimateTreeNode } from "../estimate-tree-data";
import { useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { createEstimateNode, deleteEstimateNode, deleteEstimateNodesBulk, renameEstimateNode, restoreDeletedEstimateNodes } from "@/lib/estimates/actions";
import { planEstimateTreeDelete, renameEstimateTreeNode } from "@/lib/estimates/estimate-tree-edit";
import { REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, type RequestEstimateTreeNodeCreateEventDetail } from "../estimate-sheet/events";
import type { EstimateTreeReorderStatus } from "./use-estimate-tree-reorder";

type StateUpdater<T> = T | ((current: T) => T);
type TreeUpdater = EstimateTreeNode[] | ((current: EstimateTreeNode[]) => EstimateTreeNode[]);
type Input = {
  projectId:string; estimateId:string; activeTabId?:string; localNodes:EstimateTreeNode[];
  activeSelectedNodeId:string|null; creationParentNodeId:string|null; expandedItems:string[];
  canEditEstimate:boolean; isTreeMutationSaving:boolean; currentRouteNodeId:string|null;
  editingNodeName:string; deleteTargetNode:EstimateTreeNode|null; deletePending:boolean;
  bulkDeletePending:boolean; bulkDeleteRootNodeIds:string[]; bulkSelectedNodeIds:Set<string>;
  setLocalNodes:(next:TreeUpdater)=>number; snapshotLocalNodes:()=>EstimateTreeNode[];
  restoreLocalNodes:(tree:EstimateTreeNode[], revision?:number)=>boolean; getLocalTreeRevision:()=>number;
  prepareAreaTreeOptimisticUpdate:()=>Promise<EstimateTreeNode[]>; setExpandedNodeIds:(ids:string[])=>void;
  setSelectedNodeId:(id:string|null)=>void; setEditingNodeId:(id:StateUpdater<string|null>)=>void;
  setEditingNodeName:(name:string)=>void; setEditingNodeError:(error:string|null)=>void;
  setRenamingNodeId:(id:string|null)=>void; setDeleteTargetNode:(node:EstimateTreeNode|null)=>void;
  setDeletePending:(value:boolean)=>void; setBulkDeleteConfirmOpen:(value:boolean)=>void;
  setBulkDeletePending:(value:boolean)=>void; setBulkSelectedNodeIds:(ids:StateUpdater<Set<string>>)=>void;
  setReorderStatus:(status:EstimateTreeReorderStatus)=>void; syncEstimateRouteUrl:(id:string|null)=>void;
  beginRenameForCreatedNode:(id:string,name:string)=>void; remapEditingNodeId:(from:string,to:string)=>void;
  cancelRenameNode:()=>void; focusAndSelectRenameInput:()=>void; resetContextMenuRenameHandoff:()=>void;
  scrollRenderedTreeRowIntoView:(id:string)=>void; toast:ReturnType<typeof useToast>["toast"];
};

export function useEstimateTreeCrud(input: Input) {
  const { projectId, estimateId, activeTabId, localNodes, activeSelectedNodeId, creationParentNodeId,
    expandedItems, canEditEstimate, isTreeMutationSaving, currentRouteNodeId, editingNodeName,
    deleteTargetNode, deletePending, bulkDeletePending, bulkDeleteRootNodeIds, bulkSelectedNodeIds,
    setLocalNodes, snapshotLocalNodes, restoreLocalNodes, getLocalTreeRevision,
    prepareAreaTreeOptimisticUpdate, setExpandedNodeIds, setSelectedNodeId, setEditingNodeId,
    setEditingNodeName, setEditingNodeError, setRenamingNodeId, setDeleteTargetNode, setDeletePending,
    setBulkDeleteConfirmOpen, setBulkDeletePending, setBulkSelectedNodeIds, setReorderStatus,
    syncEstimateRouteUrl, beginRenameForCreatedNode, remapEditingNodeId, cancelRenameNode,
    focusAndSelectRenameInput, resetContextMenuRenameHandoff, scrollRenderedTreeRowIntoView, toast } = input;
  const renameCommitInFlightRef = useRef(false);
  const pendingNodeCreatesRef = useRef<Map<string, Promise<string>>>(null!);
  if (pendingNodeCreatesRef.current === null) pendingNodeCreatesRef.current = new Map();
  const resolvedNodeIdsRef = useRef<Map<string, string>>(null!);
  if (resolvedNodeIdsRef.current === null) resolvedNodeIdsRef.current = new Map();

  /** Maps an optimistic node id to its server id, awaiting an in-flight create when needed. */
  const resolveServerNodeId = useCallback((nodeId: string): Promise<string> => {
    if (!isOptimisticEstimateNodeId(nodeId)) return Promise.resolve(nodeId);
    const resolvedNodeId = resolvedNodeIdsRef.current.get(nodeId);
    if (resolvedNodeId) return Promise.resolve(resolvedNodeId);
    const pendingCreate = pendingNodeCreatesRef.current.get(nodeId);
    if (pendingCreate) return pendingCreate;
    return Promise.reject(new Error("This node is still being created. Try again in a moment."));
  }, []);

  // P6 single create flow: "Add Area" makes a child area of the given parent
  // (or a root area when no parent). There is no kind choice and no
  // "select a group first" guard — every node can parent an area, so every
  // create succeeds. Internal `kind` is always "area" (the surviving label);
  // the user only ever sees "Area".
  const handleAddTreeNode = useCallback((parentNodeIdOverride?: string) => {
    if (!canEditEstimate) return;

    const targetParentNodeId = parentNodeIdOverride ?? creationParentNodeId;

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
    beginRenameForCreatedNode(optimisticNodeId, nodeName);
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
        remapEditingNodeId(optimisticNodeId, serverNodeId);
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
    beginRenameForCreatedNode,
    canEditEstimate,
    estimateId,
    expandedItems,
    localNodes,
    projectId,
    remapEditingNodeId,
    resolveServerNodeId,
    scrollRenderedTreeRowIntoView,
    setBulkSelectedNodeIds,
    setEditingNodeId,
    setReorderStatus,
    creationParentNodeId,
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

  const commitRenameNode = useCallback((node: EstimateTreeNode) => {
    if (!canEditEstimate || renameCommitInFlightRef.current) return;
    resetContextMenuRenameHandoff();

    const nextName = editingNodeName.trim();
    if (!nextName) {
      setEditingNodeError("Name is required.");
      window.requestAnimationFrame(focusAndSelectRenameInput);
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
    canEditEstimate,
    editingNodeName,
    estimateId,
    focusAndSelectRenameInput,
    localNodes,
    prepareAreaTreeOptimisticUpdate,
    projectId,
    resetContextMenuRenameHandoff,
    resolveServerNodeId,
    setEditingNodeError,
    setEditingNodeId,
    setEditingNodeName,
    setLocalNodes,
    setRenamingNodeId,
    setReorderStatus,
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
    if (!canEditEstimate || !deleteTargetNode || isTreeMutationSaving) return;

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
    canEditEstimate,
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
    setDeletePending,
    setDeleteTargetNode,
    setReorderStatus,
    setSelectedNodeId,
    setLocalNodes,
    showDeletedNodesUndoToast,
  ]);

  const handleDeleteModalOpenChange = useCallback((open: boolean) => {
    if (!open && !deletePending) setDeleteTargetNode(null);
  }, [deletePending, setDeleteTargetNode]);

  const handleConfirmBulkDeleteNodes = useCallback(() => {
    if (!canEditEstimate || bulkDeletePending || isTreeMutationSaving || bulkDeleteRootNodeIds.length === 0) return;

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
    canEditEstimate,
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
    setBulkDeleteConfirmOpen,
    setBulkDeletePending,
    setBulkSelectedNodeIds,
    setLocalNodes,
    setReorderStatus,
    setSelectedNodeId,
    showDeletedNodesUndoToast,
  ]);


  return { handleAddTreeNode, handleAddArea, commitRenameNode, handleConfirmDeleteNode, handleDeleteModalOpenChange, handleConfirmBulkDeleteNodes };
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


function resolveConfirmedDeleteFallbackNodeId(tree: EstimateTreeNode[], fallbackNodeId: string | null) {
  if (fallbackNodeId && findEstimateNode(tree, fallbackNodeId)) return fallbackNodeId;
  return tree[0]?.id ?? null;
}

function isOptimisticEstimateNodeId(nodeId: string) {
  return nodeId.startsWith("optimistic-");
}
