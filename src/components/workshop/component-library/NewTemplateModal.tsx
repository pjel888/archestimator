"use client";

import { useCallback, useMemo, useReducer, type ReactNode } from "react";
import { Circle } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import {
  createEstimateTemplate,
  createEstimateTemplateFromEstimateNode,
  createEstimateTemplateFromEstimateTab,
} from "@/lib/component-library/actions";
import type { EstimateTreeNode } from "../estimate-tree-data";
import type { EstimateTemplate } from "./templates";

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-1">
      <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass = "h-7 border border-hairline bg-white px-2 !text-[10px] font-medium text-ink outline-none transition placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40";

// U14: count line should read "1 group", not "1 groups".
function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function summarizeSourceNode(node: EstimateTreeNode) {
  // One node type: count every node as an "area", plus child sub-areas and
  // rows. The old group/area split is gone from this summary.
  const summary = { nodeCount: 0, subAreaCount: 0, rowCount: 0 };
  function visit(current: EstimateTreeNode, isRoot: boolean) {
    summary.nodeCount += 1;
    if (!isRoot) summary.subAreaCount += 1;
    summary.rowCount += current.estimateRowItems?.length ?? 0;
    current.children?.forEach((child) => visit(child, false));
  }
  visit(node, true);
  return summary;
}

type TemplateFormState = {
  name: string;
  category: string;
  description: string;
  error: string;
  pending: boolean;
};

type TemplateFormAction =
  | { type: "name"; value: string }
  | { type: "category"; value: string }
  | { type: "description"; value: string }
  | { type: "reset" }
  | { type: "validation:error"; message: string }
  | { type: "submit:start" }
  | { type: "submit:success" }
  | { type: "submit:error"; message: string };

function getInitialTemplateFormState(defaultCategory = ""): TemplateFormState {
  return {
    name: "",
    category: defaultCategory,
    description: "",
    error: "",
    pending: false,
  };
}

function templateFormReducer(state: TemplateFormState, action: TemplateFormAction): TemplateFormState {
  switch (action.type) {
    case "name":
      return { ...state, name: action.value, error: state.error ? "" : state.error };
    case "category":
      return { ...state, category: action.value };
    case "description":
      return { ...state, description: action.value };
    case "reset":
      return { ...state, name: "", category: "", description: "", error: "" };
    case "validation:error":
      return { ...state, error: action.message };
    case "submit:start":
      return { ...state, pending: true, error: "" };
    case "submit:success":
      return { name: "", category: "", description: "", error: "", pending: false };
    case "submit:error":
      return { ...state, error: action.message, pending: false };
    default:
      return state;
  }
}

export type NewTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  estimateId?: string;
  sourceNode: EstimateTreeNode | null;
  sourceTabId?: string;
  sourceTabName?: string;
  sourceDisplayName?: string;
  existingCategories: string[];
  defaultCategory?: string;
  onCreated: (template: EstimateTemplate) => void;
  mode?: "estimate-node" | "estimate-tab" | "scratch";
};

export function NewTemplateModal({
  open,
  onOpenChange,
  projectId,
  estimateId,
  sourceNode,
  sourceTabId,
  sourceTabName,
  sourceDisplayName,
  existingCategories,
  defaultCategory,
  onCreated,
  mode = "estimate-node",
}: NewTemplateModalProps) {
  // Consumers mount this modal per open, so the default lands on first render.
  const [formState, dispatchForm] = useReducer(
    templateFormReducer,
    defaultCategory,
    getInitialTemplateFormState,
  );
  const { name, category, description, error, pending } = formState;

  const scratchMode = mode === "scratch";
  const tabMode = mode === "estimate-tab";
  const summary = useMemo(() => (sourceNode ? summarizeSourceNode(sourceNode) : null), [sourceNode]);
  const sourceLabel = sourceDisplayName ?? sourceNode?.name ?? "";
  const canSubmit = scratchMode
    ? !pending
    : tabMode
      ? Boolean(sourceNode && projectId && estimateId && sourceTabId && !pending)
      : Boolean(sourceNode && projectId && estimateId && !pending);

  const resetForm = useCallback(() => {
    dispatchForm({ type: "reset" });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (pending) return;
      if (!nextOpen) resetForm();
      onOpenChange(nextOpen);
    },
    [onOpenChange, pending, resetForm],
  );

  const handleSubmit = useCallback(async () => {
    if (pending) return;
    if (!scratchMode && (!sourceNode || !projectId || !estimateId)) return;
    if (tabMode && !sourceTabId) return;
    if (!name.trim()) {
      dispatchForm({ type: "validation:error", message: "Template name is required." });
      return;
    }

    dispatchForm({ type: "submit:start" });
    try {
      let result: { template: EstimateTemplate };
      const intentId = globalThis.crypto.randomUUID();
      if (scratchMode) {
        result = await createEstimateTemplate({ intentId, name, category, description });
      } else if (tabMode) {
        if (!sourceNode || !projectId || !estimateId || !sourceTabId) return;
        result = await createEstimateTemplateFromEstimateTab({
          intentId,
          projectId,
          estimateId,
          tabId: sourceTabId,
          tabName: sourceTabName ?? sourceNode.name,
          name,
          category,
          description,
        });
      } else {
        if (!sourceNode || !projectId || !estimateId) return;
        result = await createEstimateTemplateFromEstimateNode({
          intentId,
          projectId,
          estimateId,
          sourceNodeId: sourceNode.id,
          name,
          category,
          description,
        });
      }
      dispatchForm({ type: "submit:success" });
      onOpenChange(false);
      onCreated(result.template);
    } catch (submitError) {
      dispatchForm({
        type: "submit:error",
        message: submitError instanceof Error ? submitError.message : "Could not create the template.",
      });
    }
  }, [category, description, estimateId, name, onCreated, onOpenChange, pending, projectId, scratchMode, sourceNode, sourceTabId, sourceTabName, tabMode]);

  return (
    <Modal
      open={open}
      title="New template"
      description={
        scratchMode
          ? "Create an empty template in the library. Open it to build its structure."
          : tabMode
            ? "Save the selected project tab and everything inside it as a reusable template."
            : "Save the selected estimate node and everything inside it as a reusable template."
      }
      closeLabel="Cancel template creation"
      className="max-w-md"
      onOpenChange={handleOpenChange}
    >
      <div className="grid gap-3">
        {error ? <p className="border border-dangerSoft bg-dangerSoft p-2 text-[10px] font-medium text-danger">{error}</p> : null}

        {scratchMode ? null : sourceNode && summary ? (
          <div className="flex items-center gap-2 border border-hairline bg-surfaceMuted/30 p-2">
            <span className="flex size-6 shrink-0 items-center justify-center text-tertiary">
              <Circle size={14} weight="regular" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-ink">{sourceLabel}</p>
              <p className="text-[9px] leading-3 text-tertiary">
                {tabMode ? "Tab source" : "Area"} · {pluralize(summary.subAreaCount, "sub-area")} · {pluralize(summary.rowCount, "row")}
              </p>
            </div>
          </div>
        ) : (
          <p className="border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[10px] leading-4 text-tertiary">
            Select an Area in the estimate tree first — the template captures that Area and everything inside it.
          </p>
        )}

        <Field label="Template name" required>
          <ControlInput
            aria-label="Template name"
            className={inputClass}
            value={name}
            placeholder={sourceLabel ? `${sourceLabel} template` : "Template name"}
            onChange={(event) => {
              dispatchForm({ type: "name", value: event.target.value });
            }}
            autoFocus
          />
        </Field>
        <Field label="Category">
          <ControlInput
            aria-label="Template category"
            className={inputClass}
            value={category}
            placeholder="General"
            list="new-template-category-options"
            onChange={(event) => dispatchForm({ type: "category", value: event.target.value })}
          />
          <datalist id="new-template-category-options">
            {existingCategories.map((existingCategory) => (
              <option key={existingCategory} value={existingCategory}>
                {existingCategory}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Description">
          <ControlTextarea
            aria-label="Template description"
            className="min-h-14 border border-hairline bg-white px-2 py-1 !text-[10px] font-medium text-ink outline-none transition placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
            value={description}
            onChange={(event) => dispatchForm({ type: "description", value: event.target.value })}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            {pending ? "Saving template…" : "Save template"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
