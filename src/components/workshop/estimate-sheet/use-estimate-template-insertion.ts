"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type Dispatch, type SetStateAction } from "react";

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
  type InsertEstimateTemplateEventDetail,
} from "../component-library/templates";
import { findEstimateNode, type EstimateTreeNode } from "../estimate-tree-data";
import { readEstimateExternalDropEnvelope } from "./events";
import { collectEditableRows, type EditableRowValue } from "./rows/editable-row-model";
import {
  appendTemplateNodesToParent,
  cloneTemplateNodesForEstimate,
  reconcileAuthoritativeInsertedRoots,
} from "./template-insertion-model";

type EstimateTreeUpdater = (updater: (current: EstimateTreeNode[]) => EstimateTreeNode[]) => number;
type RestoreEstimateState = (
  previousTree: EstimateTreeNode[],
  previousRows: Record<string, EditableRowValue>,
  expectedRevision?: number,
) => void;
type Toast = (input: { tone?: "neutral" | "loading" | "success" | "error"; message: string }) => string;

function resolveRetainedTemplateInsertIntent(
  retainedIntents: Map<string, string>,
  signature: string,
  requestedIntentId?: string,
) {
  const retainedIntentId = retainedIntents.get(signature);
  if (retainedIntentId) return retainedIntentId;
  const intentId = requestedIntentId ?? crypto.randomUUID();
  retainedIntents.set(signature, intentId);
  if (retainedIntents.size > 100) retainedIntents.delete(retainedIntents.keys().next().value ?? "");
  return intentId;
}

function useSavedTemplateSnapshotConfirmation() {
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [unavailableSourceCount, setUnavailableSourceCount] = useState<number | null>(null);

  const requestConfirmation = useCallback((count: number) => new Promise<boolean>((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setUnavailableSourceCount(count);
  }), []);
  const resolveConfirmation = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setUnavailableSourceCount(null);
    resolve?.(confirmed);
  }, []);

  useEffect(() => () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return { unavailableSourceCount, requestConfirmation, resolveConfirmation };
}

function useLinkedTemplateCopyFallbackConfirmation() {
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [requested, setRequested] = useState(false);

  const requestConfirmation = useCallback(() => new Promise<boolean>((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setRequested(true);
  }), []);
  const resolveConfirmation = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequested(false);
    resolve?.(confirmed);
  }, []);

  useEffect(() => () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return { requested, requestConfirmation, resolveConfirmation };
}

type TemplateInsertModeChoice = {
  templateName: string;
  canLink: boolean;
} | null;

function useTemplateInsertModeChoice() {
  const resolverRef = useRef<((mode: "linked" | "copy" | null) => void) | null>(null);
  const [choice, setChoice] = useState<TemplateInsertModeChoice>(null);
  const requestChoice = useCallback((template: EstimateTemplate) => new Promise<"linked" | "copy" | null>((resolve) => {
    resolverRef.current?.(null);
    resolverRef.current = resolve;
    setChoice({ templateName: template.name, canLink: template.nodes.length > 0 });
  }), []);
  const resolveChoice = useCallback((mode: "linked" | "copy" | null) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setChoice(null);
    resolve?.(mode);
  }, []);
  useEffect(() => () => {
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);
  return { choice, requestChoice, resolveChoice };
}

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
  templateById,
  templateTargetParentNode,
  setEstimateTree,
  setEditableRows,
  setSelectedNodeId,
  recordReadOnlyLibraryMutationAttempt,
  toast,
}: UseEstimateTemplateInsertionInput) {
  const {
    unavailableSourceCount: templateSnapshotUnavailableSourceCount,
    requestConfirmation: requestTemplateSnapshotConfirmation,
    resolveConfirmation: resolveTemplateSnapshotConfirmation,
  } = useSavedTemplateSnapshotConfirmation();
  const {
    requested: templateCopyFallbackRequested,
    requestConfirmation: requestTemplateCopyFallbackConfirmation,
    resolveConfirmation: resolveTemplateCopyFallbackConfirmation,
  } = useLinkedTemplateCopyFallbackConfirmation();
  const {
    choice: templateInsertModeChoice,
    requestChoice: requestTemplateInsertModeChoice,
    resolveChoice: resolveTemplateInsertModeChoice,
  } = useTemplateInsertModeChoice();
  const retainedTemplateInsertIntentsRef = useRef<Map<string, string> | null>(null);
  if (retainedTemplateInsertIntentsRef.current === null) retainedTemplateInsertIntentsRef.current = new Map();
  const pendingTargetCountsRef = useRef<Map<string, number> | null>(null);
  if (pendingTargetCountsRef.current === null) pendingTargetCountsRef.current = new Map();
  const [templateInsertPendingNodeIds, setTemplateInsertPendingNodeIds] = useState<ReadonlySet<string>>(new Set());
  const setTemplateTargetPending = useCallback((targetNodeId: string, pending: boolean) => {
    const counts = pendingTargetCountsRef.current!;
    const nextCount = Math.max(0, (counts.get(targetNodeId) ?? 0) + (pending ? 1 : -1));
    if (nextCount > 0) counts.set(targetNodeId, nextCount);
    else counts.delete(targetNodeId);
    setTemplateInsertPendingNodeIds(new Set(counts.keys()));
  }, []);
  const insertTemplateIntoParent = useStableCallback(
    async (targetParentNodeId: string, template: EstimateTemplate, requestedIntentId?: string) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_template");
        return false;
      }
      // P6: a template inserts as a child of ANY existing node (no group gate).
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        const insertMode = await requestTemplateInsertModeChoice(template);
        if (!insertMode) return false;
        const intentSignature = ["template", projectId, estimateId, targetParentNodeId, template.id, insertMode].join(":");
        const intentId = resolveRetainedTemplateInsertIntent(
          retainedTemplateInsertIntentsRef.current!,
          intentSignature,
          requestedIntentId,
        );
        const persist = (
          mode: "linked" | "copy",
          persistIntentId: string,
          unavailableSourcePolicy: "cancel" | "use_saved_snapshot_unlinked",
        ) => insertEstimateTemplateIntoEstimate({
            projectId,
            estimateId,
            targetParentNodeId,
            templateId: template.id,
            intentId: persistIntentId,
            targetTabId: dataTabId,
            unavailableSourcePolicy,
            mode,
          });
        setTemplateTargetPending(targetParentNodeId, true);
        try {
          let result = await persist(insertMode, intentId, "cancel");
          let copyIntentSignature: string | null = null;
          if (result.status === "requires_saved_snapshot_confirmation") {
            if (!await requestTemplateSnapshotConfirmation(result.unavailableSourceCount)) {
              retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
              return false;
            }
            if (insertMode === "linked") {
              copyIntentSignature = `${intentSignature}:copy`;
              const copyIntentId = resolveRetainedTemplateInsertIntent(
                retainedTemplateInsertIntentsRef.current!,
                copyIntentSignature,
              );
              result = await persist("copy", copyIntentId, "use_saved_snapshot_unlinked");
            } else {
              result = await persist("copy", intentId, "use_saved_snapshot_unlinked");
            }
          }
          if (insertMode === "linked" && result.status === "requires_active_tab") {
            if (!await requestTemplateCopyFallbackConfirmation()) {
              retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
              return false;
            }
            copyIntentSignature ??= `${intentSignature}:copy`;
            const copyIntentId = resolveRetainedTemplateInsertIntent(
              retainedTemplateInsertIntentsRef.current!,
              copyIntentSignature,
            );
            result = await persist("copy", copyIntentId, "cancel");
            if (result.status === "requires_saved_snapshot_confirmation") {
              if (!await requestTemplateSnapshotConfirmation(result.unavailableSourceCount)) {
                retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
                retainedTemplateInsertIntentsRef.current!.delete(copyIntentSignature);
                return false;
              }
              result = await persist("copy", copyIntentId, "use_saved_snapshot_unlinked");
            }
          }
          if (result.status !== "inserted") {
            retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
            if (copyIntentSignature) retainedTemplateInsertIntentsRef.current!.delete(copyIntentSignature);
            return false;
          }
          setEstimateTree((currentTree) => reconcileAuthoritativeInsertedRoots({
            currentTree,
            authoritativeTree: result.tree,
            targetParentNodeId,
            authoritativeRootNodeIds: result.insertedRootNodeIds,
          }));
          setEditableRows((current) => ({ ...current, ...collectEditableRows(result.tree) }));
          retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
          if (copyIntentSignature) retainedTemplateInsertIntentsRef.current!.delete(copyIntentSignature);
          return true;
        } catch (error: unknown) {
          console.error("[estimate] template insert failed", error);
          toast({ tone: "error", message: "Couldn't insert the template. Try again." });
          return false;
        } finally {
          setTemplateTargetPending(targetParentNodeId, false);
        }
      }

      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(template.nodes);
      setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...collectEditableRows(optimisticTemplateNodes) }));
      return true;
    },
  );

  // INS-1: insert one or many templates under a group through the batched
  // server action - one optimistic update + one round-trip - so a category
  // drop can't lose templates to a concurrent-insert tree-read race. A single
  // template still routes through the efficient single-insert path.
  const insertTemplatesIntoParent = useStableCallback(
    async (targetParentNodeId: string, templates: EstimateTemplate[], requestedIntentId?: string) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_templates");
        return false;
      }
      if (templates.length === 0) return false;
      if (templates.length === 1) return insertTemplateIntoParent(targetParentNodeId, templates[0], requestedIntentId);

      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        const templateIds = templates.map((template) => template.id);
        const intentSignature = ["templates", projectId, estimateId, targetParentNodeId, ...templateIds].join(":");
        const intentId = resolveRetainedTemplateInsertIntent(
          retainedTemplateInsertIntentsRef.current!,
          intentSignature,
          requestedIntentId,
        );
        const persist = (unavailableSourcePolicy: "cancel" | "use_saved_snapshot_unlinked") => insertEstimateTemplatesIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateIds,
          intentId,
          targetTabId: dataTabId,
          unavailableSourcePolicy,
        });
        setTemplateTargetPending(targetParentNodeId, true);
        try {
          let result = await persist("cancel");
          if (result.status === "requires_saved_snapshot_confirmation") {
            if (!await requestTemplateSnapshotConfirmation(result.unavailableSourceCount)) {
              retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
              return false;
            }
            result = await persist("use_saved_snapshot_unlinked");
          }
          if (result.status !== "inserted") {
            retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
            return false;
          }
          setEstimateTree((currentTree) => reconcileAuthoritativeInsertedRoots({
            currentTree,
            authoritativeTree: result.tree,
            targetParentNodeId,
            authoritativeRootNodeIds: result.insertedRootNodeIds,
          }));
          setEditableRows((current) => ({ ...current, ...collectEditableRows(result.tree) }));
          retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
          return true;
        } catch (error: unknown) {
          console.error("[estimate] template batch insert failed", error);
          toast({ tone: "error", message: "Couldn't insert the templates. Try again." });
          return false;
        } finally {
          setTemplateTargetPending(targetParentNodeId, false);
        }
      }

      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(templates.flatMap((template) => template.nodes));
      setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...collectEditableRows(optimisticTemplateNodes) }));
      return true;
    },
  );

  const insertTemplatesIntoParentById = useCallback(
    (targetParentNodeId: string, templateIds: string[], requestedIntentId?: string) => {
      const templates = templateIds
        .map((templateId) => templateById.get(templateId))
        .filter((template): template is EstimateTemplate => Boolean(template));
      if (templates.length === 0) return false;
      return insertTemplatesIntoParent(targetParentNodeId, templates, requestedIntentId);
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
    async (
      targetParentNodeId: string,
      templateId: string,
      templateNodeId: string,
      templateNode?: EstimateTreeNode,
      requestedIntentId?: string,
    ) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_template_node");
        return false;
      }
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        const intentSignature = [
          "template-node",
          projectId,
          estimateId,
          targetParentNodeId,
          templateId,
          templateNodeId,
        ].join(":");
        const intentId = resolveRetainedTemplateInsertIntent(
          retainedTemplateInsertIntentsRef.current!,
          intentSignature,
          requestedIntentId,
        );
        const persist = (unavailableSourcePolicy: "cancel" | "use_saved_snapshot_unlinked") => insertEstimateTemplateNodeIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId,
          templateNodeId,
          intentId,
          targetTabId: dataTabId,
          unavailableSourcePolicy,
        });
        setTemplateTargetPending(targetParentNodeId, true);
        try {
          let result = await persist("cancel");
          if (result.status === "requires_saved_snapshot_confirmation") {
            if (!await requestTemplateSnapshotConfirmation(result.unavailableSourceCount)) {
              retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
              return false;
            }
            result = await persist("use_saved_snapshot_unlinked");
          }
          if (result.status !== "inserted") {
            retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
            return false;
          }
          setEstimateTree((currentTree) => reconcileAuthoritativeInsertedRoots({
            currentTree,
            authoritativeTree: result.tree,
            targetParentNodeId,
            authoritativeRootNodeIds: [result.insertedRootNodeId],
          }));
          setEditableRows((current) => ({ ...current, ...collectEditableRows(result.tree) }));
          retainedTemplateInsertIntentsRef.current!.delete(intentSignature);
          return true;
        } catch (error: unknown) {
          console.error("[estimate] template node insert failed", error);
          toast({ tone: "error", message: "Couldn't insert the template. Try again." });
          return false;
        } finally {
          setTemplateTargetPending(targetParentNodeId, false);
        }
      }

      if (!templateNode) return false;
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate([templateNode]);
      setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...collectEditableRows(optimisticTemplateNodes) }));
      return true;
    },
  );

  const insertTemplateNodeIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string, templateNodeId: string, requestedIntentId?: string) => {
      const template = templateById.get(templateId);
      const templateNode = template ? findEstimateNode(template.nodes, templateNodeId) : undefined;
      return insertTemplateNodeIntoParent(
        targetParentNodeId,
        templateId,
        templateNodeId,
        templateNode,
        requestedIntentId,
      );
    },
    [insertTemplateNodeIntoParent, templateById],
  );
  const insertTemplatesIntoParentByIdFromEvent = useEffectEvent((
    targetParentNodeId: string,
    templateIds: string[],
    intentId?: string,
  ) => {
    return insertTemplatesIntoParentById(targetParentNodeId, templateIds, intentId);
  });
  const insertTemplateNodeIntoParentByIdFromEvent = useEffectEvent(
    (targetParentNodeId: string, templateId: string, templateNodeId: string, intentId?: string) => {
      return insertTemplateNodeIntoParentById(targetParentNodeId, templateId, templateNodeId, intentId);
    },
  );

  const insertTemplateNodeIntoSelectedGroup = useCallback(
    (template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      // P6: insert directly into the selected node (any kind), no area-wrap.
      if (!templateTargetParentNode) return false;
      return insertTemplateNodeIntoParent(
        templateTargetParentNode.id,
        template.id,
        templateNode.id,
        templateNode,
      );
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
      const rawDetail = (event as CustomEvent<unknown>).detail;
      const envelope = projectId && estimateId
        ? readEstimateExternalDropEnvelope<InsertEstimateTemplateEventDetail>(rawDetail, {
            projectId,
            estimateId,
            tabId: dataTabId ?? null,
          })
        : null;
      const detail = readInsertEstimateTemplateEventDetail(envelope?.payload ?? rawDetail);
      if (!detail || (envelope && detail.targetParentNodeId !== envelope.target.nodeId)) {
        envelope?.acknowledge({ accepted: false, reason: "The template drop target is invalid." });
        return;
      }
      void (async () => {
        try {
          const accepted = "templateId" in detail
            ? await insertTemplateNodeIntoParentByIdFromEvent(
                detail.targetParentNodeId,
                detail.templateId,
                detail.templateNodeId,
                envelope?.intentId,
              )
            : await insertTemplatesIntoParentByIdFromEvent(
                detail.targetParentNodeId,
                detail.templateIds,
                envelope?.intentId,
              );
          envelope?.acknowledge({
            accepted,
            ...(!accepted ? { reason: "The selected template is no longer available." } : {}),
          });
        } catch (error: unknown) {
          console.error("[estimate] template drop insert failed", error);
          envelope?.acknowledge({ accepted: false, reason: "The template could not be inserted." });
        }
      })();
    }
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
    return () => window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
  }, [dataTabId, estimateId, projectId]);

  return {
    insertTemplateIntoSelectedGroup,
    insertTemplatesIntoParentById,
    insertTemplateNodeIntoParentById,
    insertTemplateNodeIntoSelectedGroup,
    templateInsertPendingNodeIds,
    templateInsertModeChoice,
    templateCopyFallbackRequested,
    templateSnapshotUnavailableSourceCount,
    resolveTemplateCopyFallbackConfirmation,
    resolveTemplateInsertModeChoice,
    resolveTemplateSnapshotConfirmation,
  };
}
