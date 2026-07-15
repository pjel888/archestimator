"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import {
  listEstimateInsertTargets,
  resolveEstimateTemplateInsertTarget,
  type EstimateTemplateInsertTargetResolution,
  type EstimateInsertTargetProject,
} from "@/lib/component-library/actions";
import { insertEstimateTemplateIntoEstimate } from "@/lib/estimates/actions";

type TargetsState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; projects: EstimateInsertTargetProject[] };

type ResolvedInsertTarget = {
  targetParentNodeId: string;
  targetParentNodeName: string;
  targetParentNodeKind: "group" | "area";
  targetParentNodePath: string[];
};

type TargetResolutionState =
  | { state: "idle" }
  | { state: "resolving" }
  | { state: "resolved"; target: ResolvedInsertTarget }
  | { state: "empty"; message: string }
  | { state: "error"; message: string };

type InsertPickerState = {
  targets: TargetsState;
  selectedProjectId: string;
  selectedEstimateId: string;
  targetResolutionRecord: {
    key: string;
    resolution: TargetResolutionState;
  };
  submitError: string;
  pending: boolean;
};

type InsertPickerAction =
  | { type: "targets:loading" }
  | { type: "targets:ready"; projects: EstimateInsertTargetProject[] }
  | { type: "targets:error"; message: string }
  | { type: "project"; projectId: string }
  | { type: "estimate"; estimateId: string }
  | { type: "resolution"; key: string; resolution: TargetResolutionState }
  | { type: "submit:error"; message: string }
  | { type: "submit:start" }
  | { type: "submit:finish" };

function getInitialInsertPickerState(): InsertPickerState {
  return {
    targets: { state: "loading" },
    selectedProjectId: "",
    selectedEstimateId: "",
    targetResolutionRecord: { key: "", resolution: { state: "idle" } },
    submitError: "",
    pending: false,
  };
}

function insertPickerReducer(state: InsertPickerState, action: InsertPickerAction): InsertPickerState {
  switch (action.type) {
    case "targets:loading":
      return { ...state, targets: { state: "loading" } };
    case "targets:ready":
      return { ...state, targets: { state: "ready", projects: action.projects } };
    case "targets:error":
      return { ...state, targets: { state: "error", message: action.message } };
    case "project":
      return { ...state, selectedProjectId: action.projectId, selectedEstimateId: "", submitError: "" };
    case "estimate":
      return { ...state, selectedEstimateId: action.estimateId, submitError: "" };
    case "resolution":
      return { ...state, targetResolutionRecord: { key: action.key, resolution: action.resolution } };
    case "submit:error":
      return { ...state, submitError: action.message };
    case "submit:start":
      return { ...state, pending: true, submitError: "" };
    case "submit:finish":
      return { ...state, pending: false };
    default:
      return state;
  }
}

export type InsertIntoEstimatePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EstimateTemplate;
  /** Fires after a successful insert with the chosen estimate's name. */
  onInserted: (estimateName: string) => void;
};

const STALE_TARGET_MESSAGE = "That estimate is no longer available. Choose another target.";
const retainedInsertIntentBySignature = new Map<string, string>();

function resolveRetainedInsertIntent(signature: string) {
  const retainedIntentId = retainedInsertIntentBySignature.get(signature);
  if (retainedIntentId) return retainedIntentId;
  const intentId = crypto.randomUUID();
  retainedInsertIntentBySignature.set(signature, intentId);
  if (retainedInsertIntentBySignature.size > 100) {
    retainedInsertIntentBySignature.delete(retainedInsertIntentBySignature.keys().next().value ?? "");
  }
  return intentId;
}

function normalizeResolvedTarget(result: EstimateTemplateInsertTargetResolution): ResolvedInsertTarget | null {
  if (!result.targetParentNodeId) return null;
  const kind = result.targetParentNodeKind ?? "group";
  const name = result.targetParentNodeName?.trim() || (kind === "area" ? "Selected area" : "First root group");
  return {
    targetParentNodeId: result.targetParentNodeId,
    targetParentNodeName: name,
    targetParentNodeKind: kind,
    targetParentNodePath: result.targetParentNodePath?.length ? result.targetParentNodePath : [name],
  };
}

function formatTargetLabel(target: ResolvedInsertTarget) {
  const prefix = target.targetParentNodeKind === "area" ? "Target area" : "Target group";
  return `${prefix}: ${target.targetParentNodePath.join(" / ")}`;
}

function formatInsertError(error: unknown, estimateName: string) {
  const message = error instanceof Error ? error.message : "Could not insert the template.";
  if (/edit access denied|permission|not authorized|cannot edit|access denied/i.test(message)) {
    return `You cannot edit ${estimateName}. Choose a target you can edit.`;
  }
  if (/not found|no group|no longer available|stale/i.test(message)) return STALE_TARGET_MESSAGE;
  return message;
}

/**
 * Project → estimate picker for inserting a template from the Library
 * browse view. Resolves the estimate's first root group via
 * `resolveEstimateTemplateInsertTarget`, then calls the existing
 * `insertEstimateTemplateIntoEstimate` action (the one insertion path).
 */
export function InsertIntoEstimatePicker(props: InsertIntoEstimatePickerProps) {
  if (!props.open) return null;
  return <OpenInsertIntoEstimatePicker {...props} />;
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
function OpenInsertIntoEstimatePicker({ open, onOpenChange, template, onInserted }: InsertIntoEstimatePickerProps) {
  const [pickerState, dispatchPicker] = useReducer(insertPickerReducer, getInitialInsertPickerState());
  const snapshotConfirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [snapshotUnavailableSourceCount, setSnapshotUnavailableSourceCount] = useState<number | null>(null);
  const {
    targets,
    selectedProjectId,
    selectedEstimateId,
    targetResolutionRecord,
    submitError,
    pending,
  } = pickerState;

  // The fetch only sets state from its async callbacks; the initial state
  // already reads "loading", so the mount effect does not set state itself.
  const fetchTargets = useCallback(() => {
    listEstimateInsertTargets()
      .then(({ projects }) => dispatchPicker({ type: "targets:ready", projects }))
      .catch((error: unknown) => {
        dispatchPicker({
          type: "targets:error",
          message: error instanceof Error ? error.message : "Could not load projects.",
        });
      });
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  useEffect(() => () => {
    snapshotConfirmationResolverRef.current?.(false);
    snapshotConfirmationResolverRef.current = null;
  }, []);

  const requestSnapshotConfirmation = useCallback((count: number) => new Promise<boolean>((resolve) => {
    snapshotConfirmationResolverRef.current?.(false);
    snapshotConfirmationResolverRef.current = resolve;
    setSnapshotUnavailableSourceCount(count);
  }), []);
  const resolveSnapshotConfirmation = useCallback((confirmed: boolean) => {
    const resolve = snapshotConfirmationResolverRef.current;
    snapshotConfirmationResolverRef.current = null;
    setSnapshotUnavailableSourceCount(null);
    resolve?.(confirmed);
  }, []);

  const retryLoadTargets = useCallback(() => {
    dispatchPicker({ type: "targets:loading" });
    fetchTargets();
  }, [fetchTargets]);

  const projects = useMemo(() => (targets.state === "ready" ? targets.projects : []), [targets]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const estimates = useMemo(() => selectedProject?.estimates ?? [], [selectedProject]);
  const selectedEstimate = estimates.find((estimate) => estimate.id === selectedEstimateId) ?? null;
  const selectedProjectIdForResolution = selectedProject?.id ?? "";
  const selectedEstimateIdForResolution = selectedEstimate?.id ?? "";
  const selectedEstimateNameForResolution = selectedEstimate?.name ?? "";
  const selectedTargetKey =
    open && selectedProjectIdForResolution && selectedEstimateIdForResolution
      ? `${selectedProjectIdForResolution}:${selectedEstimateIdForResolution}`
      : "";
  const targetResolution =
    targetResolutionRecord.key === selectedTargetKey
      ? targetResolutionRecord.resolution
      : selectedTargetKey
        ? { state: "resolving" as const }
        : { state: "idle" as const };

  useEffect(() => {
    if (!selectedTargetKey || !selectedProjectIdForResolution || !selectedEstimateIdForResolution) return;

    let active = true;
    resolveEstimateTemplateInsertTarget({
      projectId: selectedProjectIdForResolution,
      estimateId: selectedEstimateIdForResolution,
    })
      .then((result) => {
        if (!active) return;
        const resolved = normalizeResolvedTarget(result);
        dispatchPicker({
          type: "resolution",
          key: selectedTargetKey,
          resolution: resolved
            ? { state: "resolved", target: resolved }
            : {
                state: "empty",
                message: "This estimate has no group to insert under. Add a group to the estimate first.",
              },
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatchPicker({
          type: "resolution",
          key: selectedTargetKey,
          resolution: { state: "error", message: formatInsertError(error, selectedEstimateNameForResolution) },
        });
      });

    return () => {
      active = false;
    };
  }, [
    selectedEstimateIdForResolution,
    selectedEstimateNameForResolution,
    selectedProjectIdForResolution,
    selectedTargetKey,
  ]);

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
    dispatchPicker({ type: "submit:start" });
    try {
      const resolvedTarget = normalizeResolvedTarget(await resolveEstimateTemplateInsertTarget({
        projectId: selectedProject.id,
        estimateId: selectedEstimate.id,
      }));
      if (!resolvedTarget) {
        dispatchPicker({
          type: "resolution",
          key: selectedTargetKey,
          resolution: { state: "empty", message: STALE_TARGET_MESSAGE },
        });
        return;
      }
      dispatchPicker({
        type: "resolution",
        key: selectedTargetKey,
        resolution: { state: "resolved", target: resolvedTarget },
      });
      const intentSignature = [
        selectedProject.id,
        selectedEstimate.id,
        resolvedTarget.targetParentNodeId,
        template.id,
      ].join(":");
      const intentId = resolveRetainedInsertIntent(intentSignature);
      const insert = (unavailableSourcePolicy: "cancel" | "use_saved_snapshot_unlinked") => insertEstimateTemplateIntoEstimate({
        projectId: selectedProject.id,
        estimateId: selectedEstimate.id,
        targetParentNodeId: resolvedTarget.targetParentNodeId,
        templateId: template.id,
        intentId,
        unavailableSourcePolicy,
      });
      let result = await insert("cancel");
      if (result.status === "requires_saved_snapshot_confirmation") {
        if (!await requestSnapshotConfirmation(result.unavailableSourceCount)) {
          retainedInsertIntentBySignature.delete(intentSignature);
          return;
        }
        result = await insert("use_saved_snapshot_unlinked");
      }
      if (result.status !== "inserted") return;
      retainedInsertIntentBySignature.delete(intentSignature);
      onInserted(selectedEstimate.name);
      onOpenChange(false);
    } catch (error) {
      dispatchPicker({ type: "submit:error", message: formatInsertError(error, selectedEstimate.name) });
    } finally {
      dispatchPicker({ type: "submit:finish" });
    }
  }, [
    onInserted,
    onOpenChange,
    pending,
    selectedEstimate,
    selectedProject,
    selectedTargetKey,
    template.id,
    requestSnapshotConfirmation,
  ]);

  const canSubmit = targetResolution.state === "resolved" && !pending;

  return (
    <>
      <Modal
      open={open}
      title="Insert into estimate"
      description={`Choose the estimate that receives "${template.name}".`}
      closeLabel="Cancel template insert"
      className="max-w-md"
      onOpenChange={handleOpenChange}
    >
      <div className="grid gap-3" data-insert-into-estimate-picker="true">
        {submitError ? (
          <p className="border border-dangerSoft bg-dangerSoft p-2 text-[10px] font-medium text-danger">{submitError}</p>
        ) : null}

        <div className="rounded-xs border border-hairline bg-surfaceMuted/60 p-2" aria-live="polite">
          {selectedProject && selectedEstimate ? (
            <>
              <p className="text-[10px] font-medium leading-4 text-ink">
                Inserting into {selectedEstimate.name} — {selectedProject.name}.
              </p>
              {targetResolution.state === "resolving" ? (
                <p className="mt-0.5 text-[9px] leading-3 text-tertiary">Resolving target group…</p>
              ) : targetResolution.state === "resolved" ? (
                <p className="mt-0.5 text-[9px] leading-3 text-tertiary">{formatTargetLabel(targetResolution.target)}</p>
              ) : targetResolution.state === "empty" || targetResolution.state === "error" ? (
                <p className="mt-0.5 text-[9px] leading-3 text-danger">{targetResolution.message}</p>
              ) : null}
            </>
          ) : (
            <p className="text-[10px] font-medium leading-4 text-tertiary">Select where to insert.</p>
          )}
        </div>

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
          <div className="grid gap-2">
            <p className="text-[10px] leading-4 text-tertiary">No open estimate to insert into.</p>
            <Link href="/workshop/projects" className="text-[10px] font-medium leading-4 text-accent underline-offset-2 hover:underline">
              Open or create an estimate
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-1">
              <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Project</span>
              <DropdownSelect
                aria-label="Insert target project"
                options={projectOptions}
                value={selectedProjectId}
                placeholder="Select a project"
                onValueChange={(value) => {
                  dispatchPicker({ type: "project", projectId: value });
                }}
              />
            </div>

            {selectedProject ? (
              estimates.length > 0 ? (
                <div className="grid gap-1">
                  <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Estimate</span>
                  <DropdownSelect
                    aria-label="Insert target estimate"
                    options={estimateOptions}
                    value={selectedEstimateId}
                    placeholder="Select an estimate"
                    onValueChange={(value) => {
                      dispatchPicker({ type: "estimate", estimateId: value });
                    }}
                  />
                </div>
              ) : (
                <p className="text-[10px] leading-4 text-tertiary">No open estimate to insert into.</p>
              )
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
            disabled={!canSubmit}
            aria-busy={pending ? "true" : undefined}
            onClick={handleSubmit}
          >
            {pending ? "Inserting template…" : "Insert template"}
          </Button>
        </div>
      </div>
      </Modal>
      <ConfirmDialog
        open={snapshotUnavailableSourceCount !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resolveSnapshotConfirmation(false);
        }}
        title="Use saved template values?"
        description={`${snapshotUnavailableSourceCount ?? 0} template source ${snapshotUnavailableSourceCount === 1 ? "is" : "are"} unavailable with the saved variant. The saved values can be inserted as unlinked project-specific rows.`}
        confirmLabel="Insert saved values"
        cancelLabel="Cancel insert"
        tone="warning"
        initialFocus="cancel"
        onConfirm={() => resolveSnapshotConfirmation(true)}
        onCancel={() => resolveSnapshotConfirmation(false)}
      />
    </>
  );
}
