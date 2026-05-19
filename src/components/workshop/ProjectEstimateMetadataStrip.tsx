"use client";

import { useEffect, useSyncExternalStore } from "react";

import { EstimateCenterColumnBoundary } from "./EstimateCenterColumnBoundary";
import { ProjectWorkspaceProjectCode } from "./ProjectWorkspaceProjectCode";

export const PROJECT_ESTIMATE_METADATA_CHANGE_EVENT = "archestimator:project-estimate-metadata-change";

export type ProjectEstimateMetadata = {
  estimateName: string;
  estimateSheetCode: string;
  versionLabel: string;
};

type ProjectEstimateMetadataPublisherProps = {
  metadata: ProjectEstimateMetadata;
};

type ProjectEstimateMetadataStripProps = {
  projectCode: string;
};

type ProjectEstimateMetadataStripBoundaryProps = {
  projectCode: string;
  metadata: ProjectEstimateMetadata | null;
};

type ProjectEstimateMetadataStripGridProps = {
  projectCode: string;
  metadata: ProjectEstimateMetadata | null;
};

type EstimateMetadataLeftClusterProps = {
  projectCode: string;
  estimateSheetCode: string;
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
  const { estimateName, estimateSheetCode, versionLabel } = metadata;

  useEffect(() => {
    dispatchProjectEstimateMetadataChange({ estimateName, estimateSheetCode, versionLabel });
    return () => dispatchProjectEstimateMetadataChange(null);
  }, [estimateName, estimateSheetCode, versionLabel]);

  return null;
}

export function ProjectEstimateMetadataStrip({ projectCode }: ProjectEstimateMetadataStripProps) {
  const metadata = useProjectEstimateMetadata();

  return <ProjectEstimateMetadataStripBoundary projectCode={projectCode} metadata={metadata} />;
}

function ProjectEstimateMetadataStripBoundary({ projectCode, metadata }: ProjectEstimateMetadataStripBoundaryProps) {
  return (
    <EstimateCenterColumnBoundary
      id="project-estimate-metadata-strip"
      scope="project-workspace-row"
      className="pointer-events-none bg-white"
      data-estimate-center-column="metadata-strip"
    >
      <ProjectEstimateMetadataStripGrid projectCode={projectCode} metadata={metadata} />
    </EstimateCenterColumnBoundary>
  );
}

function ProjectEstimateMetadataStripGrid({ projectCode, metadata }: ProjectEstimateMetadataStripGridProps) {
  return (
    <div className="grid h-full grid-cols-[1fr_minmax(0,2fr)_1fr] items-center px-3 text-[9px] font-normal uppercase tracking-[0.14em] text-tertiary">
      <EstimateMetadataLeftCluster projectCode={projectCode} estimateSheetCode={metadata?.estimateSheetCode ?? ""} />
      <EstimateSheetNameCell value={metadata?.estimateName ?? ""} />
      <EstimateVersionCell value={metadata?.versionLabel ?? ""} />
    </div>
  );
}

function EstimateMetadataLeftCluster({ projectCode, estimateSheetCode }: EstimateMetadataLeftClusterProps) {
  return (
    <div className="flex min-w-0 items-center gap-4 text-left">
      <ProjectWorkspaceProjectCode projectCode={projectCode} className="min-w-0 flex-1" textClassName="font-normal" />
      <EstimateSheetCodeCell value={estimateSheetCode} />
    </div>
  );
}

function EstimateSheetCodeCell({ value }: { value: string }) {
  return <span className="min-w-0 flex-1 truncate text-left">{value}</span>;
}

function EstimateSheetNameCell({ value }: { value: string }) {
  return <span className="truncate text-center text-ink">{value}</span>;
}

function EstimateVersionCell({ value }: { value: string }) {
  return <span className="truncate text-right">{value}</span>;
}
