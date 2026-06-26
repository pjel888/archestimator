"use client";

import { useCallback, useEffect, useEffectEvent, type Dispatch, type SetStateAction } from "react";

import { useStableCallback } from "@/hooks/use-stable-callback";
import {
  insertEstimateTemplateIntoEstimate,
  insertEstimateTemplateNodeIntoEstimate,
  insertEstimateTemplatesIntoEstimate,
} from "@/lib/estimates/actions";

import {
  INSERT_ESTIMATE_TEMPLATE_EVENT,
  readInsertEstimateTemplateEventDetail,
  type EstimateTemplate,
} from "../component-library/templates";
import { findEstimateNode, type EstimateTreeNode } from "../estimate-tree-data";
import { collectEditableRows, type EditableRowValue } from "./rows/editable-row-model";
import {
  appendTemplateNodesToParent,
  cloneTemplateNodesForEstimate,
} from "./template-insertion-model";

type EstimateTreeUpdater = (updater: (current: EstimateTreeNode[]) => EstimateTreeNode[]) => number;
type RestoreEstimateState = (
  previousTree: EstimateTreeNode[],
  previousRows: Record<string, EditableRowValue>,
  expectedRevision?: number,
) => void;
type Toast = (input: { tone?: "neutral" | "loading" | "success" | "error"; message: string }) => string;

type UseEstimateTemplateInsertionInput = {
  canEditEstimate: boolean;
  projectId?: string;
  estimateId?: string;
  dataTabId?: string;
  estimateTree: EstimateTreeNode[];
  editableRows: Record<string, EditableRowValue>;
  templateById: Map<string, EstimateTemplate>;
  templateTargetParentNode: EstimateTreeNode | null;
  setEstimateTree: EstimateTreeUpdater;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  setSelectedNodeId: (nodeId: string | null) => void;
  getEstimateTreeRevision: () => number;
  restoreEstimateState: RestoreEstimateState;
  recordReadOnlyLibraryMutationAttempt: (action: string) => void;
  toast: Toast;
};

export function useEstimateTemplateInsertion({
  canEditEstimate,
  projectId,
  estimateId,
  dataTabId,
  estimateTree,
  editableRows,
  templateById,
  templateTargetParentNode,
  setEstimateTree,
  setEditableRows,
  setSelectedNodeId,
  getEstimateTreeRevision,
  restoreEstimateState,
  recordReadOnlyLibraryMutationAttempt,
  toast,
}: UseEstimateTemplateInsertionInput) {
  const insertTemplateIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_template");
        return false;
      }
      // P6: a template inserts as a child of ANY existing node (no group gate).
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(template.nodes);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplateIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId: template.id,
          targetTabId: dataTabId,
        })
          .then((result) => {
            // INS-1: only reconcile when no later optimistic update superseded
            // ours, so a concurrent insert's stale snapshot can't clobber newer
            // state. INS-4: setEstimateTree bumps the editable-rows skip ref so
            // the server tree doesn't overwrite an in-flight cell edit.
            if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree);
          })
          .catch((error: unknown) => {
            console.error("[estimate] template insert failed", error);
            toast({ tone: "error", message: "Couldn't insert the template. Try again." });
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
          });
      }

      return true;
    },
  );

  // INS-1: insert one or many templates under a group through the batched
  // server action - one optimistic update + one round-trip - so a category
  // drop can't lose templates to a concurrent-insert tree-read race. A single
  // template still routes through the efficient single-insert path.
  const insertTemplatesIntoParent = useStableCallback(
    (targetParentNodeId: string, templates: EstimateTemplate[]) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_templates");
        return false;
      }
      if (templates.length === 0) return false;
      if (templates.length === 1) return insertTemplateIntoParent(targetParentNodeId, templates[0]);

      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(templates.flatMap((template) => template.nodes));
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplatesIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateIds: templates.map((template) => template.id),
          targetTabId: dataTabId,
        })
          .then((result) => {
            if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree);
          })
          .catch((error: unknown) => {
            console.error("[estimate] template batch insert failed", error);
            toast({ tone: "error", message: "Couldn't insert the templates. Try again." });
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
          });
      }

      return true;
    },
  );

  const insertTemplatesIntoParentById = useCallback(
    (targetParentNodeId: string, templateIds: string[]) => {
      const templates = templateIds
        .map((templateId) => templateById.get(templateId))
        .filter((template): template is EstimateTemplate => Boolean(template));
      if (templates.length === 0) return false;
      return insertTemplatesIntoParent(targetParentNodeId, templates);
    },
    [insertTemplatesIntoParent, templateById],
  );

  const insertTemplateIntoSelectedGroup = useCallback(
    (template: EstimateTemplate) => {
      // P6: insert directly into the selected node (any kind), no area-wrap.
      if (!templateTargetParentNode) return false;
      return insertTemplateIntoParent(templateTargetParentNode.id, template);
    },
    [insertTemplateIntoParent, templateTargetParentNode],
  );

  // Inserts ONE node of a template (any node inside it) with its subtree. Same
  // optimistic shape as whole-template insertion; the server recreates the
  // subtree through the history-aware node/row RPCs. P6: any node is a valid
  // target (no group gate).
  const insertTemplateNodeIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_template_node");
        return false;
      }
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate([templateNode]);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplateNodeIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId: template.id,
          templateNodeId: templateNode.id,
          targetTabId: dataTabId,
        })
          .then((result) => {
            // INS-1/INS-4: reconcile only when our optimistic revision still
            // stands, and via setEstimateTree so in-flight edits survive.
            if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree);
          })
          .catch((error: unknown) => {
            console.error("[estimate] template node insert failed", error);
            toast({ tone: "error", message: "Couldn't insert the template. Try again." });
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
          });
      }

      return true;
    },
  );

  const insertTemplateNodeIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string, templateNodeId: string) => {
      const template = templateById.get(templateId);
      if (!template) return false;
      const templateNode = findEstimateNode(template.nodes, templateNodeId);
      if (!templateNode) return false;
      return insertTemplateNodeIntoParent(targetParentNodeId, template, templateNode);
    },
    [insertTemplateNodeIntoParent, templateById],
  );
  const insertTemplatesIntoParentByIdFromEvent = useEffectEvent((targetParentNodeId: string, templateIds: string[]) => {
    insertTemplatesIntoParentById(targetParentNodeId, templateIds);
  });
  const insertTemplateNodeIntoParentByIdFromEvent = useEffectEvent(
    (targetParentNodeId: string, templateId: string, templateNodeId: string) => {
      insertTemplateNodeIntoParentById(targetParentNodeId, templateId, templateNodeId);
    },
  );

  const insertTemplateNodeIntoSelectedGroup = useCallback(
    (template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      // P6: insert directly into the selected node (any kind), no area-wrap.
      if (!templateTargetParentNode) return false;
      return insertTemplateNodeIntoParent(templateTargetParentNode.id, template, templateNode);
    },
    [insertTemplateNodeIntoParent, templateTargetParentNode],
  );

  // Template drops on the left estimate tree arrive here: that panel can target
  // ANY node row, but the optimistic insert + rollback flow lives in this hook.
  // Category drags carry several template ids; dragging a node from inside a
  // template carries that node's id. P6: every target inserts directly (no
  // area-wrap branch).
  useEffect(() => {
    function handleInsertTemplateEvent(event: Event) {
      const detail = readInsertEstimateTemplateEventDetail((event as CustomEvent<unknown>).detail);
      if (!detail) return;
      if ("templateId" in detail) {
        insertTemplateNodeIntoParentByIdFromEvent(detail.targetParentNodeId, detail.templateId, detail.templateNodeId);
        return;
      }
      insertTemplatesIntoParentByIdFromEvent(detail.targetParentNodeId, detail.templateIds);
    }
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
    return () => window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
  }, []);

  return {
    insertTemplateIntoSelectedGroup,
    insertTemplatesIntoParentById,
    insertTemplateNodeIntoParentById,
    insertTemplateNodeIntoSelectedGroup,
  };
}
