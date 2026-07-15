"use client";

import { useMemo } from "react";
import type { TreeExternalDropOptions } from "@/components/ui/tree";
import { findEstimateNode, type EstimateTreeNode } from "../estimate-tree-data";
import { ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, INSERT_ESTIMATE_TEMPLATE_EVENT, INSERT_PROJECT_SOURCE_EVENT, PROJECT_SOURCE_DRAG_MIME_TYPE, readEstimateTemplateDragPayload, readProjectSourceDragPayload, type InsertEstimateTemplateEventDetail, type InsertProjectSourceEventDetail } from "../component-library/templates";
import { dispatchEstimateExternalDrop, REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, type RequestEstimateRowItemMoveEventDetail } from "../estimate-sheet/events";
import { ADD_LIBRARY_ITEM_EVENT, ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE, LIBRARY_ITEM_DRAG_MIME_TYPE, readEstimateLibraryItemDragPayload, readEstimateRowItemDragPayload, type AddLibraryItemEventDetail } from "../estimate-sheet/rows/constants";
import { endEstimateWorkshopDrag } from "../estimate-workshop-drag";

type Input = {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  canEditEstimate: boolean;
  localNodes: EstimateTreeNode[];
  suppressPrimaryActionAfterDrag: () => void;
  notifyRejectedDrop: (message: string) => void;
};

export function useEstimateTreeExternalDrops({
  projectId,
  estimateId,
  activeTabId,
  canEditEstimate,
  localNodes,
  suppressPrimaryActionAfterDrag,
  notifyRejectedDrop,
}: Input) {
  // P6 single-node model: a template, library item, or project source dropped "inside" any
  // node row inserts directly as a child of that node — every node can take
  // children now, so there is no group gate and no area-wrap path. (Drops are
  // still "inside" only — no root or between-row placement here.)
  const treeExternalDrop = useMemo<TreeExternalDropOptions>(() => ({
    types: [ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, PROJECT_SOURCE_DRAG_MIME_TYPE, ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE, LIBRARY_ITEM_DRAG_MIME_TYPE],
    dropEffect: (types) => types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE) ? "move" : "copy",
    canDrop: (types, targetId, position) => {
      if (!canEditEstimate) return false;
      if (position !== "inside") return false;
      if (isOptimisticEstimateNodeId(targetId)) return false;
      const targetNode = findEstimateNode(localNodes, targetId);
      if (!targetNode) return false;
      // Any existing node is a valid drop target for both templates and
      // project sources now; row-item drops append to the target node's rows.
      return types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)
        || types.includes(PROJECT_SOURCE_DRAG_MIME_TYPE)
        || types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE)
        || types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE);
    },
    onDrop: (event, targetId) => {
      if (!canEditEstimate) return;
      const targetNode = findEstimateNode(localNodes, targetId);
      if (!targetNode) return;
      const dispatchDrop = <T,>(eventName: string, payload: T) => dispatchEstimateExternalDrop({
        eventName,
        intentId: createExternalDropIntentId(),
        target: {
          projectId,
          estimateId,
          tabId: activeTabId ?? null,
          nodeId: targetId,
        },
        payload,
        onAcknowledged: (acknowledgement) => {
          if (!acknowledgement.accepted) {
            notifyRejectedDrop(acknowledgement.reason === "unhandled"
              ? "This drop target is no longer available."
              : acknowledgement.reason ?? "The item could not be added here.");
          }
        },
      });

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
        dispatchDrop<RequestEstimateRowItemMoveEventDetail>(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, detail);
        return;
      }

      const libraryItemPayload = readEstimateLibraryItemDragPayload(event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE));
      if (libraryItemPayload.ok) {
        endEstimateWorkshopDrag();
        suppressPrimaryActionAfterDrag();
        const detail: AddLibraryItemEventDetail = {
          libraryItem: libraryItemPayload.item,
          targetNodeId: targetId,
        };
        dispatchDrop<AddLibraryItemEventDetail>(ADD_LIBRARY_ITEM_EVENT, detail);
        return;
      }

      // The sheet owns insertion (tree update + action); hand the drop over via a
      // window event instead of duplicating that flow here.
      const templatePayload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
      if (templatePayload) {
        endEstimateWorkshopDrag();
        suppressPrimaryActionAfterDrag();
        const detail: InsertEstimateTemplateEventDetail = templatePayload.kind === "template-node"
          ? { targetParentNodeId: targetId, templateId: templatePayload.templateId, templateNodeId: templatePayload.templateNodeId }
          : { targetParentNodeId: targetId, templateIds: templatePayload.templateIds };
        dispatchDrop<InsertEstimateTemplateEventDetail>(INSERT_ESTIMATE_TEMPLATE_EVENT, detail);
        return;
      }

      const projectSourcePayload = readProjectSourceDragPayload(event.dataTransfer.getData(PROJECT_SOURCE_DRAG_MIME_TYPE));
      if (projectSourcePayload) {
        endEstimateWorkshopDrag();
        suppressPrimaryActionAfterDrag();
        dispatchDrop<InsertProjectSourceEventDetail>(INSERT_PROJECT_SOURCE_EVENT, {
          targetParentNodeId: targetId,
          source: {
            projectId: projectSourcePayload.projectId,
            estimateId: projectSourcePayload.estimateId,
            tabId: projectSourcePayload.tabId,
            nodeId: projectSourcePayload.kind === "project-node" ? projectSourcePayload.nodeId : null,
          },
        });
      }
    },
  }), [activeTabId, canEditEstimate, estimateId, localNodes, notifyRejectedDrop, projectId, suppressPrimaryActionAfterDrag]);

  return treeExternalDrop;
}

function isOptimisticEstimateNodeId(nodeId:string) { return nodeId.startsWith("optimistic-"); }

function createExternalDropIntentId() {
  return globalThis.crypto?.randomUUID?.() ?? `estimate-drop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
