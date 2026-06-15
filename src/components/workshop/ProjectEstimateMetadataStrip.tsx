"use client";

import { useCallback, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useLayoutEffect, useSyncExternalStore } from "react";

import { dispatchProjectBudgetChange } from "@/components/workshop/ProjectTotalHeader";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { updateEstimateDetails } from "@/lib/estimates/actions";
import { cn } from "@/lib/ui/cn";

export const PROJECT_ESTIMATE_METADATA_CHANGE_EVENT = "archestimator:project-estimate-metadata-change";
const PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE = "--project-mini-sidebar-width";

export type ProjectEstimateMetadata = {
  projectId: string;
  estimateId: string;
  projectName: string;
  estimateName: string;
  estimateSheetCode: string;
  projectBudget: number | null;
  canEditEstimate: boolean;
};

type ProjectEstimateMetadataPublisherProps = {
  metadata: ProjectEstimateMetadata;
};

type ProjectEstimateMetadataStripGridProps = {
  metadata: ProjectEstimateMetadata | null;
};

declare global {
  interface Window {
    __archestimatorProjectEstimateMetadata?: ProjectEstimateMetadata | null;
  }
}

export function dispatchProjectEstimateMetadataChange(metadata: ProjectEstimateMetadata | null) {
  if (typeof window === "undefined") return;
  window.__archestimatorProjectEstimateMetadata = metadata;
  window.dispatchEvent(new CustomEvent<ProjectEstimateMetadata | null>(PROJECT_ESTIMATE_METADATA_CHANGE_EVENT, { detail: metadata }));
}

function getProjectEstimateMetadataSnapshot() {
  return typeof window === "undefined" ? null : window.__archestimatorProjectEstimateMetadata ?? null;
}

function subscribeToProjectEstimateMetadata(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROJECT_ESTIMATE_METADATA_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(PROJECT_ESTIMATE_METADATA_CHANGE_EVENT, onStoreChange);
}

function useProjectEstimateMetadata() {
  return useSyncExternalStore(subscribeToProjectEstimateMetadata, getProjectEstimateMetadataSnapshot, () => null);
}

export function ProjectEstimateMetadataPublisher({ metadata }: ProjectEstimateMetadataPublisherProps) {
  const { projectId, estimateId, projectName, estimateName, estimateSheetCode, projectBudget, canEditEstimate } = metadata;

  useLayoutEffect(() => {
    const workshopCanvas = document.querySelector<HTMLElement>("[data-workshop-page-shell-canvas]");
    const previousProjectMiniSidebarWidth = workshopCanvas?.style.getPropertyValue(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE);
    const previousEstimateSheetRoute = workshopCanvas?.dataset.estimateSheetRoute;

    if (workshopCanvas) workshopCanvas.dataset.estimateSheetRoute = "true";
    workshopCanvas?.style.setProperty(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE, "0px");
    dispatchProjectEstimateMetadataChange({ projectId, estimateId, projectName, estimateName, estimateSheetCode, projectBudget, canEditEstimate });
    dispatchProjectBudgetChange(projectBudget ?? 0);

    return () => {
      if (previousEstimateSheetRoute) {
        if (workshopCanvas) workshopCanvas.dataset.estimateSheetRoute = previousEstimateSheetRoute;
      } else if (workshopCanvas) {
        delete workshopCanvas.dataset.estimateSheetRoute;
      }

      if (previousProjectMiniSidebarWidth) {
        workshopCanvas?.style.setProperty(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE, previousProjectMiniSidebarWidth);
      } else {
        workshopCanvas?.style.removeProperty(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE);
      }
      dispatchProjectEstimateMetadataChange(null);
      dispatchProjectBudgetChange(0);
    };
  }, [projectId, estimateId, projectName, estimateName, estimateSheetCode, projectBudget, canEditEstimate]);

  return null;
}

export function ProjectEstimateMetadataStrip() {
  const metadata = useProjectEstimateMetadata();

  return <ProjectEstimateMetadataStripGrid metadata={metadata} />;
}

function ProjectEstimateMetadataStripGrid({ metadata }: ProjectEstimateMetadataStripGridProps) {
  return (
    <div
      className="grid h-full place-items-center bg-white px-2 text-[10px] font-medium tracking-normal text-ink"
      data-workshop-layout="project-estimate-metadata-row"
    >
      <EstimateSheetNameCell metadata={metadata} />
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not rename estimate sheet.";
}

function EstimateSheetNameCell({ metadata }: { metadata: ProjectEstimateMetadata | null }) {
  const router = useNavigationRouter();
  const errorId = useId();
  const savedName = metadata?.estimateName ?? "";
  const [draft, setDraft] = useState(savedName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const skipNextBlurCommitRef = useRef(false);

  useLayoutEffect(() => {
    setDraft(savedName);
    setStatus("idle");
    setErrorMessage(null);
  }, [savedName]);

  const commitDraft = useCallback(() => {
    if (!metadata || !metadata.canEditEstimate) return;
    const nextName = draft.trim();
    if (nextName === savedName.trim()) {
      setDraft(savedName);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    if (!nextName) {
      setStatus("error");
      setErrorMessage("Estimate sheet name is required.");
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    startTransition(() => {
      void updateEstimateDetails({
        projectId: metadata.projectId,
        estimateId: metadata.estimateId,
        name: nextName,
      })
        .then((updatedEstimate) => {
          setDraft(updatedEstimate.name);
          setStatus("saved");
          dispatchProjectEstimateMetadataChange({
            ...metadata,
            estimateName: updatedEstimate.name,
          });
          router.refresh();
        })
        .catch((error: unknown) => {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        });
    });
  }, [draft, metadata, router, savedName]);

  function handleBlur() {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false;
      return;
    }
    commitDraft();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      skipNextBlurCommitRef.current = true;
      setDraft(savedName);
      setStatus("idle");
      setErrorMessage(null);
      event.currentTarget.blur();
    }
  }

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1">
      <input
        aria-describedby={errorMessage ? errorId : undefined}
        aria-invalid={status === "error" ? "true" : undefined}
        aria-label="Estimate sheet name"
        className={cn(
          "h-7 min-w-0 max-w-[320px] rounded-xs border border-transparent bg-transparent px-2 text-center !text-[10px] font-medium leading-none text-ink outline-none transition placeholder:text-tertiary hover:border-hairline focus:border-accent focus:bg-accentSoft disabled:opacity-60",
          status === "error" && "border-danger bg-dangerSoft/40",
        )}
        disabled={!metadata || !metadata.canEditEstimate || isPending}
        onBlur={handleBlur}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          if (status !== "idle") setStatus("idle");
          if (errorMessage) setErrorMessage(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Estimate sheet name"
        title={metadata?.canEditEstimate ? "Rename estimate sheet. Press Enter or leave the field to save. Press Esc to cancel." : "View-only estimate sheet name."}
        value={draft}
      />
      {status === "saving" ? <span className="shrink-0 text-[8px] font-medium uppercase tracking-normal text-tertiary">Saving</span> : null}
      {status === "saved" ? <span className="shrink-0 text-[8px] font-medium uppercase tracking-normal text-success">Saved</span> : null}
      {status === "error" ? (
        <span className="grid size-4 shrink-0 place-items-center rounded-xs bg-dangerSoft text-[9px] font-medium text-danger" title={errorMessage ?? "Update failed"}>
          !
        </span>
      ) : null}
      {errorMessage ? (
        <p id={errorId} className="sr-only">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
