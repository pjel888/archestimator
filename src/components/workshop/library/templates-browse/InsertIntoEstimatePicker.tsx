"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import {
  listEstimateInsertTargets,
  resolveEstimateTemplateInsertTarget,
  type EstimateInsertTargetProject,
} from "@/lib/component-library/actions";
import { insertEstimateTemplateIntoEstimate } from "@/lib/estimates/actions";

type TargetsState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; projects: EstimateInsertTargetProject[] };

export type InsertIntoEstimatePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EstimateTemplate;
  /** Fires after a successful insert with the chosen estimate's name. */
  onInserted: (estimateName: string) => void;
};

/**
 * Project → estimate picker for inserting a template from the Library
 * browse view. Resolves the estimate's first root group via
 * `resolveEstimateTemplateInsertTarget`, then calls the existing
 * `insertEstimateTemplateIntoEstimate` action (the one insertion path).
 */
export function InsertIntoEstimatePicker({ open, onOpenChange, template, onInserted }: InsertIntoEstimatePickerProps) {
  const [targets, setTargets] = useState<TargetsState>({ state: "loading" });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  // U15 (UX-11): pre-validate group availability when an estimate is selected so
  // the user learns up front (not after clicking Insert) that a target group exists.
  const [insertAvailability, setInsertAvailability] = useState<"idle" | "checking" | "available" | "unavailable">("idle");

  // The fetch only sets state from its async callbacks; the initial state
  // already reads "loading", so the mount effect does not set state itself.
  const fetchTargets = useCallback(() => {
    listEstimateInsertTargets()
      .then(({ projects }) => setTargets({ state: "ready", projects }))
      .catch((error: unknown) => {
        setTargets({
          state: "error",
          message: error instanceof Error ? error.message : "Could not load projects.",
        });
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchTargets();
  }, [fetchTargets, open]);

  const retryLoadTargets = useCallback(() => {
    setTargets({ state: "loading" });
    fetchTargets();
  }, [fetchTargets]);

  // Keyed on the primitive ids (selectedEstimate is recomputed each render).
  // The "checking"/"idle" transitions are set by the dropdown handlers (events);
  // this effect only resolves the result in its async callbacks — never a
  // synchronous setState in the effect body.
  useEffect(() => {
    if (!selectedProjectId || !selectedEstimateId) return;
    let cancelled = false;
    resolveEstimateTemplateInsertTarget({ projectId: selectedProjectId, estimateId: selectedEstimateId })
      .then(({ targetParentNodeId }) => {
        if (!cancelled) setInsertAvailability(targetParentNodeId ? "available" : "unavailable");
      })
      .catch(() => {
        // Advisory only — don't block on a pre-check error; submit re-resolves authoritatively.
        if (!cancelled) setInsertAvailability("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, selectedEstimateId]);

  const projects = useMemo(() => (targets.state === "ready" ? targets.projects : []), [targets]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const estimates = useMemo(() => selectedProject?.estimates ?? [], [selectedProject]);
  const selectedEstimate = estimates.find((estimate) => estimate.id === selectedEstimateId) ?? null;

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })),
    [projects],
  );
  const estimateOptions = useMemo(
    () =>
      estimates.map((estimate) => ({
        value: estimate.id,
        label: estimate.sheetCode ? `${estimate.sheetCode} · ${estimate.name}` : estimate.name,
      })),
    [estimates],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (pending) return;
      onOpenChange(nextOpen);
    },
    [onOpenChange, pending],
  );

  const handleSubmit = useCallback(async () => {
    if (pending || !selectedProject || !selectedEstimate) return;
    setPending(true);
    setSubmitError("");
    try {
      const { targetParentNodeId } = await resolveEstimateTemplateInsertTarget({
        projectId: selectedProject.id,
        estimateId: selectedEstimate.id,
      });
      if (!targetParentNodeId) {
        setSubmitError("This estimate has no group to insert under. Add a group to the estimate first.");
        return;
      }
      await insertEstimateTemplateIntoEstimate({
        projectId: selectedProject.id,
        estimateId: selectedEstimate.id,
        targetParentNodeId,
        templateId: template.id,
      });
      onInserted(selectedEstimate.name);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not insert the template.");
    } finally {
      setPending(false);
    }
  }, [onInserted, onOpenChange, pending, selectedEstimate, selectedProject, template.id]);

  return (
    <Modal
      open={open}
      title="Insert into estimate"
      description={`Choose the estimate that receives "${template.name}".`}
      closeLabel="Cancel template insert"
      className="max-w-sm"
      onOpenChange={handleOpenChange}
    >
      <div className="grid gap-3" data-insert-into-estimate-picker="true">
        {submitError ? (
          <p className="border border-dangerSoft bg-dangerSoft p-2 text-[10px] font-medium text-danger">{submitError}</p>
        ) : null}

        {targets.state === "loading" ? (
          <p className="text-[10px] leading-4 text-tertiary" role="status">
            Loading projects…
          </p>
        ) : targets.state === "error" ? (
          <div className="grid gap-2">
            <p className="border border-dangerSoft bg-dangerSoft p-2 text-[10px] font-medium text-danger">{targets.message}</p>
            <Button type="button" variant="secondary" size="xs" className="min-w-0 justify-self-start px-2" onClick={retryLoadTargets}>
              Reload projects
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-[10px] leading-4 text-tertiary">
            No projects in this workspace yet. Create a project with an estimate first.
          </p>
        ) : (
          <>
            <label className="grid gap-1">
              <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Project</span>
              <DropdownSelect
                aria-label="Insert target project"
                options={projectOptions}
                value={selectedProjectId}
                placeholder="Select a project"
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setSelectedEstimateId("");
                  setSubmitError("");
                  setInsertAvailability("idle");
                }}
              />
            </label>

            {selectedProject ? (
              estimates.length > 0 ? (
                <label className="grid gap-1">
                  <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Estimate</span>
                  <DropdownSelect
                    aria-label="Insert target estimate"
                    options={estimateOptions}
                    value={selectedEstimateId}
                    placeholder="Select an estimate"
                    onValueChange={(value) => {
                      setSelectedEstimateId(value);
                      setSubmitError("");
                      setInsertAvailability(value ? "checking" : "idle");
                    }}
                  />
                </label>
              ) : (
                <p className="text-[10px] leading-4 text-tertiary">No estimates in this project yet.</p>
              )
            ) : null}

            {selectedEstimateId && insertAvailability === "checking" ? (
              <p className="text-[10px] leading-4 text-tertiary" role="status">Checking group availability…</p>
            ) : null}
            {selectedEstimateId && insertAvailability === "unavailable" ? (
              <p className="text-[10px] leading-4 text-warning" role="status">
                This estimate has no group to insert under. Add a group to the estimate first.
              </p>
            ) : null}
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!selectedEstimate || pending || insertAvailability === "unavailable"}
            aria-busy={pending ? "true" : undefined}
            onClick={handleSubmit}
          >
            {pending ? "Inserting template…" : "Insert template"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
