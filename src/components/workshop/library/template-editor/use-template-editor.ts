"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  addEstimateTemplateRowItems,
  createEstimateTemplateAllowanceRow,
  createEstimateTemplateNode,
  deleteEstimateTemplateNode,
  insertTemplateIntoTemplate,
  moveEstimateTemplateNode,
  previewEstimateTemplateMutation,
  removeEstimateTemplateRowItem,
  renameEstimateTemplateNode,
  resolveEstimateTemplateMutationIntent,
  updateEstimateTemplateRowItem,
  type TemplateEditorRowPatch,
  type TemplateNodeKind,
} from "@/lib/component-library/template-editor-actions";
import type {
  EstimateTemplateMutationConfirmation,
  EstimateTemplateMutationImpact,
} from "@/lib/component-library/template-link-impact-d1";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { EstimateTemplate } from "../../component-library/templates";
import {
  appendTemplateChildNode,
  appendTemplateRowToNode,
  recomputeTemplateRow,
  removeTemplateNodeFromNodes,
  removeTemplateRowFromNodes,
  renameTemplateNodeInNodes,
  updateTemplateRowInNodes,
} from "./template-editor-model";

export type TemplateEditorSaveState =
  | { state: "saved" }
  | { state: "saving" }
  | { state: "error"; message: string };

export type PendingTemplateSharedMutation = {
  actionLabel: string;
  impact: EstimateTemplateMutationImpact;
};

export type TemplateMutationOutcomeUnknown = {
  actionLabel: string;
  intentId: string;
};

type RefreshMode = "immediate" | "deferred" | "none";

const TEMPLATE_EDITOR_DEFERRED_REFRESH_MS = 450;

function createTemporaryId() {
  return `temp-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function createMutationIntentId() {
  return globalThis.crypto.randomUUID();
}

function outcomeSessionKey(templateId: string) {
  return `template-mutation-outcome:${templateId}`;
}

/**
 * Optimistic template editing: every mutation patches the local tree first,
 * runs the server action, then router.refresh() pulls the canonical tree
 * (temp ids resolve there). Failures roll the local tree back and surface
 * the error in the save indicator.
 */
export function useTemplateEditor(template: EstimateTemplate) {
  const router = useNavigationRouter();
  const deferredRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSharedMutationRef = useRef<null | (() => Promise<boolean>)>(null);
  const sharedMutationInFlightRef = useRef(false);
  const [templateState, setTemplateState] = useState({ source: template, value: template });
  const [saveState, setSaveState] = useState<TemplateEditorSaveState>({ state: "saved" });
  const [pendingSharedMutation, setPendingSharedMutation] = useState<PendingTemplateSharedMutation | null>(null);
  const [outcomeUnknown, setOutcomeUnknown] = useState<TemplateMutationOutcomeUnknown | null>(null);
  const [outcomeUnknownCollapsed, setOutcomeUnknownCollapsed] = useState(false);
  const [resolvingOutcome, setResolvingOutcome] = useState(false);

  // Server refreshes re-seed the optimistic copy (render-time prop sync).
  if (templateState.source !== template) {
    setTemplateState({ source: template, value: template });
  }
  const value = templateState.source !== template ? template : templateState.value;
  const templateValueRef = useRef(value);

  useEffect(() => {
    templateValueRef.current = value;
  }, [value]);

  const applyNodes = useCallback((updater: (nodes: EstimateTreeNode[]) => EstimateTreeNode[]) => {
    setTemplateState((current) => ({
      ...current,
      value: { ...current.value, nodes: updater(current.value.nodes) },
    }));
  }, []);

  const clearDeferredRefresh = useCallback(() => {
    if (!deferredRefreshRef.current) return;
    clearTimeout(deferredRefreshRef.current);
    deferredRefreshRef.current = null;
  }, []);

  const refreshNow = useCallback(() => {
    clearDeferredRefresh();
    router.refresh();
  }, [clearDeferredRefresh, router]);

  const scheduleRefresh = useCallback(() => {
    clearDeferredRefresh();
    deferredRefreshRef.current = setTimeout(() => {
      deferredRefreshRef.current = null;
      router.refresh();
    }, TEMPLATE_EDITOR_DEFERRED_REFRESH_MS);
  }, [clearDeferredRefresh, router]);

  useEffect(() => clearDeferredRefresh, [clearDeferredRefresh]);

  useEffect(() => {
    const raw = globalThis.sessionStorage?.getItem(outcomeSessionKey(template.id));
    if (!raw) return;
    let active = true;
    try {
      const parsed = JSON.parse(raw) as Partial<TemplateMutationOutcomeUnknown>;
      if (typeof parsed.intentId === "string" && typeof parsed.actionLabel === "string") {
        queueMicrotask(() => {
          if (active) setOutcomeUnknown({ intentId: parsed.intentId!, actionLabel: parsed.actionLabel! });
        });
      }
    } catch {
      globalThis.sessionStorage?.removeItem(outcomeSessionKey(template.id));
    }
    return () => {
      active = false;
    };
  }, [template.id]);

  const run = useCallback(
    async (
      optimistic: ((nodes: EstimateTreeNode[]) => EstimateTreeNode[]) | null,
      mutation: () => Promise<unknown>,
      refreshMode: RefreshMode = "immediate",
      retainedIntent?: TemplateMutationOutcomeUnknown,
    ) => {
      const previous = templateValueRef.current;
      setTemplateState((current) => {
        if (!optimistic) return current;
        const next = { ...current, value: { ...current.value, nodes: optimistic(current.value.nodes) } };
        templateValueRef.current = next.value;
        return next;
      });
      setSaveState({ state: "saving" });
      try {
        await mutation();
        setSaveState({ state: "saved" });
        if (refreshMode === "immediate") refreshNow();
        if (refreshMode === "deferred") scheduleRefresh();
        return true;
      } catch (error) {
        templateValueRef.current = previous;
        setTemplateState((current) => ({ ...current, value: previous }));
        const message = error instanceof Error ? error.message : "Could not save the change.";
        if (retainedIntent && message.includes("couldn't confirm whether the linked Template updated")) {
          setOutcomeUnknown(retainedIntent);
          setOutcomeUnknownCollapsed(false);
          globalThis.sessionStorage?.setItem(outcomeSessionKey(template.id), JSON.stringify(retainedIntent));
        }
        setSaveState({ state: "error", message });
        return false;
      }
    },
    [refreshNow, scheduleRefresh, template.id],
  );

  const requestSharedMutation = useCallback(async (
    actionLabel: string,
    intentId: string,
    optimistic: ((nodes: EstimateTreeNode[]) => EstimateTreeNode[]) | null,
    mutation: (confirmation?: EstimateTemplateMutationConfirmation) => Promise<unknown>,
    refreshMode: RefreshMode = "immediate",
  ) => {
    if (sharedMutationInFlightRef.current) {
      setSaveState({ state: "error", message: "Wait for the current linked Template update to finish." });
      return false;
    }
    if (outcomeUnknown) {
      setOutcomeUnknownCollapsed(false);
      setSaveState({ state: "error", message: "Resolve the retained Template update before starting another shared change." });
      return false;
    }
    const retainedIntent = { actionLabel, intentId } satisfies TemplateMutationOutcomeUnknown;
    setSaveState({ state: "saving" });
    try {
      const impact = await previewEstimateTemplateMutation({ templateId: template.id });
      if (impact.activeInstanceCount === 0) {
        return run(optimistic, () => mutation(), refreshMode, retainedIntent);
      }
      const confirmation = {
        expectedVersionNumber: impact.currentVersionNumber,
        impactFingerprint: impact.fingerprint,
      } satisfies EstimateTemplateMutationConfirmation;
      pendingSharedMutationRef.current = () => run(optimistic, () => mutation(confirmation), refreshMode, retainedIntent);
      setPendingSharedMutation({ actionLabel, impact });
      setSaveState({ state: "saved" });
      return false;
    } catch (error) {
      setSaveState({
        state: "error",
        message: error instanceof Error ? error.message : "Could not load linked Template impact.",
      });
      return false;
    }
  }, [outcomeUnknown, run, template.id]);

  const checkUnknownOutcome = useCallback(async () => {
    if (!outcomeUnknown || resolvingOutcome) return;
    setResolvingOutcome(true);
    try {
      const result = await resolveEstimateTemplateMutationIntent({
        templateId: template.id,
        intentId: outcomeUnknown.intentId,
      });
      if (result.state === "pending") {
        setOutcomeUnknownCollapsed(false);
        setSaveState({ state: "error", message: "The Template update outcome is still unknown. Check again shortly." });
        return;
      }
      globalThis.sessionStorage?.removeItem(outcomeSessionKey(template.id));
      setOutcomeUnknown(null);
      setOutcomeUnknownCollapsed(false);
      if (result.state === "committed") {
        setSaveState({ state: "saved" });
        refreshNow();
      } else {
        setSaveState({ state: "error", message: "The retained Template update did not apply. Your draft is still available." });
      }
    } catch (error) {
      setOutcomeUnknownCollapsed(false);
      setSaveState({ state: "error", message: error instanceof Error ? error.message : "Could not check the retained Template update." });
    } finally {
      setResolvingOutcome(false);
    }
  }, [outcomeUnknown, refreshNow, resolvingOutcome, template.id]);

  useEffect(() => {
    if (!outcomeUnknown) return;
    const check = () => void checkUnknownOutcome();
    globalThis.addEventListener("online", check);
    globalThis.addEventListener("focus", check);
    return () => {
      globalThis.removeEventListener("online", check);
      globalThis.removeEventListener("focus", check);
    };
  }, [checkUnknownOutcome, outcomeUnknown]);

  const confirmSharedMutation = useCallback(async () => {
    const pending = pendingSharedMutationRef.current;
    if (!pending) return false;
    pendingSharedMutationRef.current = null;
    setPendingSharedMutation(null);
    sharedMutationInFlightRef.current = true;
    try {
      return await pending();
    } finally {
      sharedMutationInFlightRef.current = false;
    }
  }, []);

  const cancelSharedMutation = useCallback(() => {
    if (sharedMutationInFlightRef.current) return;
    pendingSharedMutationRef.current = null;
    setPendingSharedMutation(null);
    setSaveState({ state: "saved" });
  }, []);

  const addNode = useCallback(
    (parentId: string | null, kind: TemplateNodeKind, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return Promise.resolve(false);
      const tempNode: EstimateTreeNode = {
        id: createTemporaryId(),
        name: trimmed,
        kind,
        total: "",
        children: [],
        estimateRowItems: [],
      };
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        `Add ${kind}`,
        intentId,
        (nodes) => appendTemplateChildNode(nodes, parentId, tempNode),
        (confirmation) => createEstimateTemplateNode({ intentId, templateId: template.id, parentId, kind, name: trimmed, ...(confirmation ? { confirmation } : {}) }),
      );
    },
    [requestSharedMutation, template.id],
  );

  const renameNode = useCallback(
    (nodeId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return Promise.resolve(false);
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        `Rename ${trimmed}`,
        intentId,
        (nodes) => renameTemplateNodeInNodes(nodes, nodeId, trimmed),
        (confirmation) => renameEstimateTemplateNode({ intentId, templateId: template.id, nodeId, name: trimmed, ...(confirmation ? { confirmation } : {}) }),
      );
    },
    [requestSharedMutation, template.id],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        "Delete structure",
        intentId,
        (nodes) => removeTemplateNodeFromNodes(nodes, nodeId),
        (confirmation) => deleteEstimateTemplateNode({ intentId, templateId: template.id, nodeId, ...(confirmation ? { confirmation } : {}) }),
      );
    },
    [requestSharedMutation, template.id],
  );

  const moveNode = useCallback(
    (nodeId: string, parentId: string | null, orderedSiblingIds: string[]) => {
      const intentId = createMutationIntentId();
      return (
      // Tree moves re-shape sibling arrays; the refreshed server tree is the
      // source of truth, so skip the local transform and show saving state.
      requestSharedMutation(
        "Move structure",
        intentId,
        null,
        (confirmation) => moveEstimateTemplateNode({ intentId, templateId: template.id, nodeId, parentId, orderedSiblingIds, ...(confirmation ? { confirmation } : {}) }),
      ));
    },
    [requestSharedMutation, template.id],
  );

  const updateRow = useCallback(
    (rowId: string, patch: TemplateEditorRowPatch) => {
      const localPatch: Partial<EstimateRowItem> = {};
      if (patch.material !== undefined) localPatch.material = patch.material;
      if (patch.description !== undefined) localPatch.description = patch.description;
      if (patch.unit !== undefined) localPatch.unit = patch.unit;
      if (patch.quantity !== undefined) localPatch.quantity = patch.quantity;
      if (patch.unitCost !== undefined) localPatch.itemCost = patch.unitCost;
      if (patch.miscCost !== undefined) localPatch.miscCost = patch.miscCost;
      if (patch.contingencyPercentage !== undefined) localPatch.adjustmentPercentage = patch.contingencyPercentage;
      if (patch.adjustmentPercentage !== undefined) localPatch.adjustmentPercentage = patch.adjustmentPercentage;
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        "Update row",
        intentId,
        (nodes) => updateTemplateRowInNodes(nodes, rowId, localPatch),
        (confirmation) => updateEstimateTemplateRowItem({ intentId, templateId: template.id, rowId, patch, ...(confirmation ? { confirmation } : {}) }),
        "deferred",
      );
    },
    [requestSharedMutation, template.id],
  );

  const removeRow = useCallback(
    (rowId: string) => {
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        "Remove row",
        intentId,
        (nodes) => removeTemplateRowFromNodes(nodes, rowId),
        (confirmation) => removeEstimateTemplateRowItem({ intentId, templateId: template.id, rowId, ...(confirmation ? { confirmation } : {}) }),
      );
    },
    [requestSharedMutation, template.id],
  );

  const addAllowanceRow = useCallback(
    (nodeId: string, material: string) => {
      const trimmed = material.trim();
      if (!trimmed) return Promise.resolve(false);
      const tempRow: EstimateRowItem = recomputeTemplateRow({
        id: createTemporaryId(),
        material: trimmed,
        description: "",
        supplier: "",
        source: "project",
        unit: "unit",
        itemCost: 0,
        quantity: 1,
        subTotal: 0,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        totalItemCosts: 0,
        category: "Unassigned",
        linkState: "unlinked",
        pricingSource: "Template allowance row",
        pricingDate: "",
      });
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        "Add allowance row",
        intentId,
        (nodes) => appendTemplateRowToNode(nodes, nodeId, tempRow),
        (confirmation) => createEstimateTemplateAllowanceRow({ intentId, templateId: template.id, nodeId, material: trimmed, ...(confirmation ? { confirmation } : {}) }),
      );
    },
    [requestSharedMutation, template.id],
  );

  const addLibraryItems = useCallback(
    (nodeId: string, items: EstimateRowItem[]) => {
      if (items.length === 0) return Promise.resolve(false);
      const tempRows = items.map((item) =>
        recomputeTemplateRow({
          ...item,
          id: createTemporaryId(),
          sourceLibraryItemId: item.sourceLibraryItemId ?? (item.source === "library" ? item.id : null),
          quantity: item.quantity > 0 ? item.quantity : 1,
          linkState: "linked-clean",
        }),
      );
      const intentId = createMutationIntentId();
      return requestSharedMutation(
        `Add ${items.length === 1 ? "Component" : `${items.length} Components`}`,
        intentId,
        (nodes) => tempRows.reduce((acc, row) => appendTemplateRowToNode(acc, nodeId, row), nodes),
        (confirmation) => addEstimateTemplateRowItems({ intentId, templateId: template.id, nodeId, libraryItems: items, ...(confirmation ? { confirmation } : {}) }),
      );
    },
    [requestSharedMutation, template.id],
  );

  const insertTemplate = useCallback(
    (sourceTemplateId: string, targetNodeId: string | null, sourceNodeId?: string | null) =>
      (() => {
        const intentId = createMutationIntentId();
        return requestSharedMutation("Insert Template structure", intentId, null, (() => {
        return (confirmation?: EstimateTemplateMutationConfirmation) =>
        insertTemplateIntoTemplate({
          intentId,
          targetTemplateId: template.id,
          targetNodeId,
          sourceTemplateId,
          sourceNodeId,
          ...(confirmation ? { confirmation } : {}),
        });
        })());
      })(),
    [requestSharedMutation, template.id],
  );

  return {
    template: value,
    saveState,
    pendingSharedMutation,
    outcomeUnknown,
    outcomeUnknownCollapsed,
    resolvingOutcome,
    confirmSharedMutation,
    cancelSharedMutation,
    checkUnknownOutcome,
    collapseUnknownOutcome: () => setOutcomeUnknownCollapsed(true),
    expandUnknownOutcome: () => setOutcomeUnknownCollapsed(false),
    applyNodes,
    addNode,
    renameNode,
    deleteNode,
    moveNode,
    updateRow,
    removeRow,
    addAllowanceRow,
    addLibraryItems,
    insertTemplate,
  };
}
