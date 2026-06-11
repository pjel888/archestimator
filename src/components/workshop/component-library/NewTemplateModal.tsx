"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Cube, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { createEstimateTemplate, createEstimateTemplateFromEstimateNode } from "@/lib/component-library/actions";
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

function summarizeSourceNode(node: EstimateTreeNode) {
  const summary = { groupCount: 0, areaCount: 0, rowCount: 0 };
  function visit(current: EstimateTreeNode) {
    if (current.kind === "group") summary.groupCount += 1;
    else summary.areaCount += 1;
    summary.rowCount += current.estimateRowItems?.length ?? 0;
    current.children?.forEach(visit);
  }
  visit(node);
  return summary;
}

export type NewTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  estimateId?: string;
  /** The estimate node whose subtree the template captures. */
  sourceNode: EstimateTreeNode | null;
  existingCategories: string[];
  /** Pre-filled category, e.g. when creating from a category's context menu. */
  defaultCategory?: string;
  onCreated: (template: EstimateTemplate) => void;
  /**
   * "estimate-node" (default) saves a selected estimate node's subtree;
   * "scratch" creates an empty template with no estimate context (the
   * Templates browse flow) — its structure is built in the template editor.
   */
  mode?: "estimate-node" | "scratch";
};

/**
 * Saves the currently selected estimate node (group or area) as a reusable
 * template. Mirrors the user model: a template *is* a group node or an area
 * node at its top level, with everything nested inside it. In "scratch" mode
 * it instead creates an empty template straight in the library.
 */
export function NewTemplateModal({
  open,
  onOpenChange,
  projectId,
  estimateId,
  sourceNode,
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
  const canSubmit = scratchMode ? !pending : Boolean(sourceNode && projectId && estimateId && !pending);

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
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const { template } = scratchMode
        ? await createEstimateTemplate({ name, category, description })
        : await createEstimateTemplateFromEstimateNode({
            projectId: projectId!,
            estimateId: estimateId!,
            sourceNodeId: sourceNode!.id,
            name,
            category,
            description,
          });
      resetForm();
      onOpenChange(false);
      onCreated(template);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create the template.");
    } finally {
      setPending(false);
    }
  }, [category, description, estimateId, name, onCreated, onOpenChange, pending, projectId, resetForm, scratchMode, sourceNode]);

  return (
    <Modal
      open={open}
      title="New template"
      description={
        scratchMode
          ? "Create an empty template in the library. Open it to build its structure."
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
              {sourceNode.kind === "group" ? (
                <FolderSimple size={14} weight="regular" aria-hidden="true" />
              ) : (
                <Cube size={14} weight="regular" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-ink">{sourceNode.name}</p>
              <p className="text-[9px] leading-3 text-tertiary">
                {sourceNode.kind === "group" ? "Group node" : "Area node"} · {summary.groupCount} groups · {summary.areaCount} areas · {summary.rowCount} rows
              </p>
            </div>
          </div>
        ) : (
          <p className="border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[10px] leading-4 text-tertiary">
            Select a Group or Area Node in the estimate tree first — the template captures that node and everything inside it.
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
        <Field label="Group">
          <ControlInput
            aria-label="Template group"
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
