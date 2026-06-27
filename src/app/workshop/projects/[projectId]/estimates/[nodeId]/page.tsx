import { Suspense } from "react";
import { notFound } from "next/navigation";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { EstimateSheetRouteSkeleton } from "@/components/workshop/EstimateSheetRouteSkeleton";
import type { EstimateSheetAdjustment } from "@/lib/estimates/types";
import { ESTIMATE_SHEET_TREE_LOAD_LIMITS } from "@/lib/estimates/load-limits";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { resolveEstimateEditCapability, resolveEstimateTabRouteContext } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import type { Json } from "@/lib/supabase/types";

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type EstimateRouteContext = Awaited<ReturnType<typeof resolveEstimateTabRouteContext>>;

type EstimateWorkspaceResolvedProps = {
  project: NonNullable<EstimateRouteContext["project"]>;
  estimate: NonNullable<EstimateRouteContext["estimate"]>;
  selectedNodeId: EstimateRouteContext["selectedNodeId"];
  tree: EstimateRouteContext["tree"];
  tab: EstimateRouteContext["tab"];
  tabs: EstimateRouteContext["tabs"];
  prefetchedCanEditEstimate: EstimateRouteContext["canEditEstimate"];
  loadLimitState: EstimateRouteContext["loadLimitState"];
  sheetAdjustment?: EstimateSheetAdjustment;
  proposalExportMetadata: {
    projectId: string;
    estimateId: string;
    projectName: string;
    projectCode: string | null;
    projectAddress: string | null;
    estimateName: string;
    estimateSheetCode: string;
    versionLabel: string;
    currency: string;
  };
};

function readEstimateVersionLabel(metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "V1";
  const record = metadata as Record<string, Json>;
  const value = record.versionNumber ?? record.version_number ?? record.version ?? record.revisionNumber ?? record.revision_number;
  if (typeof value === "number" && Number.isFinite(value)) return `V${value}`;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim();
    return normalized.toLowerCase().startsWith("v") ? normalized : `V${normalized}`;
  }
  return "V1";
}

export default function ProjectEstimateNodePage({ params, searchParams }: ProjectEstimateNodePageProps) {
  return (
    <Suspense fallback={<EstimateSheetRouteSkeleton />}>
      <EstimateRouteContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EstimateRouteContent({ params, searchParams }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  assertRouteErrorSmoke({ routeLabel: "Estimate workspace", searchParams: await searchParams });

  // The component-library dataset stays lazy-loaded through a server action, so
  // first paint is not gated on library queries.
  const estimateTreeResult = await withPerfTraceRequest("workshop.estimate-sheet", () =>
    traced("estimate-sheet.route-context", () => resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)),
  );
  const { project, estimate, selectedNodeId, tree, tab, tabs, canEditEstimate: prefetchedCanEditEstimate, loadLimitState, sheetAdjustment } = estimateTreeResult;

  if (!project || !estimate) notFound();
  const resolvedCanEditEstimate = prefetchedCanEditEstimate === true
    ? true
    : await traced("estimate-sheet.edit-capability", () => resolveEstimateEditCapability(estimate.id));

  const estimateVersionLabel = readEstimateVersionLabel(estimate.metadata);
  const proposalExportMetadata = {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    projectCode: project.project_code,
    projectAddress: project.location,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    versionLabel: estimateVersionLabel,
    currency: estimate.currency_code || project.currency_code || "PHP",
  };

  return (
    <EstimateWorkspaceResolved
      project={project}
      estimate={estimate}
      selectedNodeId={selectedNodeId}
      tree={tree}
      tab={tab}
      tabs={tabs}
      prefetchedCanEditEstimate={resolvedCanEditEstimate}
      loadLimitState={loadLimitState}
      sheetAdjustment={sheetAdjustment}
      proposalExportMetadata={proposalExportMetadata}
    />
  );
}

function EstimateWorkspaceResolved({
  project,
  estimate,
  selectedNodeId,
  tree,
  tab,
  tabs,
  prefetchedCanEditEstimate,
  loadLimitState,
  sheetAdjustment,
  proposalExportMetadata,
}: EstimateWorkspaceResolvedProps) {
  // The route-context resolver already returns the tab list on the dominant
  // tab-present path. Missing tab/edit affordance data fails closed on first
  // paint and hydrates through client queries so the sheet itself can stream.
  const estimateTabs = tabs ?? [];

  return (
    <EstimateWorkspaceClient
      projectId={project.id}
      workspaceId={project.workspace_id}
      estimateId={estimate.id}
      projectName={project.name}
      estimateName={estimate.name}
      estimateSheetCode={estimate.sheet_code}
      projectBudget={estimate.project_budget}
      selectedNodeId={selectedNodeId}
      nodes={tree}
      estimateTabs={estimateTabs}
      activeTabId={tab?.id ?? null}
      loadLimitState={loadLimitState}
      sheetAdjustment={sheetAdjustment}
      canEditEstimate={prefetchedCanEditEstimate === true}
      proposalExportMetadata={proposalExportMetadata}
      surfaceVariant="glass"
    />
  );
}
