"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import { dispatchProjectBudgetChange } from "@/components/workshop/ProjectTotalHeader";

export const PROJECT_ESTIMATE_METADATA_CHANGE_EVENT = "archestimator:project-estimate-metadata-change";
const PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE = "--project-mini-sidebar-width";

export type ProjectEstimateMetadata = {
  projectName: string;
  estimateName: string;
  estimateSheetCode: string;
  projectBudget: number | null;
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
  const { projectName, estimateName, estimateSheetCode, projectBudget } = metadata;

  useLayoutEffect(() => {
    const workshopCanvas = document.querySelector<HTMLElement>("[data-workshop-page-shell-canvas]");
    const workshopTitleBlock = document.querySelector<HTMLElement>("[data-workshop-title-block]");
    const previousProjectMiniSidebarWidth = workshopCanvas?.style.getPropertyValue(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE);
    const previousEstimateSheetRoute = workshopCanvas?.dataset.estimateSheetRoute;
    const previousWorkshopTitleBlockHidden = workshopTitleBlock?.hidden ?? false;

    if (workshopCanvas) workshopCanvas.dataset.estimateSheetRoute = "true";
    if (workshopTitleBlock) workshopTitleBlock.hidden = true;
    workshopCanvas?.style.setProperty(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE, "0px");
    dispatchProjectEstimateMetadataChange({ projectName, estimateName, estimateSheetCode, projectBudget });
    dispatchProjectBudgetChange(projectBudget ?? 0);

    return () => {
      if (workshopTitleBlock) workshopTitleBlock.hidden = previousWorkshopTitleBlockHidden;

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
  }, [projectName, estimateName, estimateSheetCode, projectBudget]);

  return null;
}

export function ProjectEstimateMetadataStrip() {
  const metadata = useProjectEstimateMetadata();

  return <ProjectEstimateMetadataStripGrid metadata={metadata} />;
}

function ProjectEstimateMetadataStripGrid({ metadata }: ProjectEstimateMetadataStripGridProps) {
  return (
    <div
      className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 bg-white px-2 text-[9px] font-normal uppercase tracking-normal text-tertiary"
      data-workshop-layout="project-estimate-metadata-row"
    >
      <EstimateSheetCodeCell value={metadata?.estimateSheetCode ?? ""} />
      <EstimateProjectTitleCell value={metadata?.projectName ?? ""} />
      <EstimateSheetNameCell value={metadata?.estimateName ?? ""} />
    </div>
  );
}

function EstimateSheetCodeCell({ value }: { value: string }) {
  return <span className="min-w-0 flex-1 truncate text-left">{value}</span>;
}

function EstimateProjectTitleCell({ value }: { value: string }) {
  return <span className="min-w-0 truncate text-center text-ink">{value}</span>;
}

function EstimateSheetNameCell({ value }: { value: string }) {
  return <span className="min-w-0 truncate text-right text-ink">{value}</span>;
}
