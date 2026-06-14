"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
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

const inputClass = "h-7 border border-hairline bg-white px-2 !text-[10px] font-medium text-ink outline-none transition focus:border-accent";

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

export type NewTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  estimateId?: string;
  sourceNode: EstimateTreeNode | null;
  sourceTabId?: string;
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
  existingCategories,
  defaultCategory,
  onCreated,
  mode = "estimate-node",
}: NewTemplateModalProps) {
  const [name, setName] = useState("");
  // Consumers mount this modal per open, so the default lands on first render.
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const summary = useMemo(() => (sourceNode ? summarizeSourceNode(sourceNode) : null), [sourceNode]);
  const scratchMode = mode === "scratch";
  const tabMode = mode === "estimate-tab";
  const canSubmit = scratchMode
    ? !pending
    : tabMode
      ? Boolean(sourceNode && projectId && estimateId && sourceTabId && !pending)
      : Boolean(sourceNode && projectId && estimateId && !pending);

  const resetForm = useCallback(() => {
    setName("");
    setCategory("");
    setDescription("");
    setError("");
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
      setError("Template name is required.");
      return;
    }

    setPending(true);
    setError("");
    try {
      let result: { template: EstimateTemplate };
      if (scratchMode) {
        result = await createEstimateTemplate({ name, category, description });
      } else if (tabMode) {
        if (!sourceNode || !projectId || !estimateId || !sourceTabId) return;
        result = await createEstimateTemplateFromEstimateTab({
          projectId,
          estimateId,
          tabId: sourceTabId,
          tabName: sourceNode.name,
          name,
          category,
          description,
        });
      } else {
        if (!sourceNode || !projectId || !estimateId) return;
        result = await createEstimateTemplateFromEstimateNode({
          projectId,
          estimateId,
          sourceNodeId: sourceNode.id,
          name,
          category,
          description,
        });
      }
      resetForm();
      onOpenChange(false);
      onCreated(result.template);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create the template.");
    } finally {
      setPending(false);
    }
  }, [category, description, estimateId, name, onCreated, onOpenChange, pending, projectId, resetForm, scratchMode, sourceNode, sourceTabId, tabMode]);

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
              <p className="truncate text-[10px] font-medium text-ink">{sourceNode.name}</p>
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
            placeholder={sourceNode ? `${sourceNode.name} template` : "Template name"}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
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
            onChange={(event) => setCategory(event.target.value)}
          />
          <datalist id="new-template-category-options">
            {existingCategories.map((existingCategory) => (
              <option key={existingCategory} value={existingCategory} />
            ))}
          </datalist>
        </Field>
        <Field label="Description">
          <ControlTextarea
            aria-label="Template description"
            className="min-h-14 border border-hairline bg-white px-2 py-1 !text-[10px] font-medium text-ink outline-none transition focus:border-accent"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
