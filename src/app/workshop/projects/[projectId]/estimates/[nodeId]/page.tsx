import { notFound } from "next/navigation";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { ESTIMATE_SHEET_TREE_LOAD_LIMITS } from "@/lib/estimates/load-limits";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getEstimateTabs, resolveEstimateEditCapability, resolveEstimateTabRouteContext } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import type { Json } from "@/lib/supabase/types";

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

export default async function ProjectEstimateNodePage({ params, searchParams }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  assertRouteErrorSmoke({ routeLabel: "Estimate workspace", searchParams: await searchParams });

  // The component-library dataset intentionally stays out of this Promise.all:
  // the sheet client lazy-loads it through a server action so first paint is
  // not gated on library queries.
  const [estimateTreeResult, currentUser] = await withPerfTraceRequest("workshop.estimate-sheet", () =>
    Promise.all([
      traced("estimate-sheet.route-context", () => resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)),
      traced("estimate-sheet.current-user", () => requireCurrentUserContext()),
    ]),
  );
  const { project, estimate, selectedNodeId, tree, tab, tabs, loadLimitState } = estimateTreeResult;

  if (!project || !estimate) notFound();

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
  // U21: the resolver already returns the tab list on tab-present paths, so
  // prefer it and only fall back to a direct getEstimateTabs round-trip when it
  // wasn't provided. canEditEstimate (Add New Tabs U1) resolves in parallel —
  // `estimate.id` is only known after the route-context load, so it can't live
  // in that first Promise.all; here it adds no new sequential first-paint hop.
  // Server stays authoritative; the boolean only gates edit affordances in the UI.
  const [estimateTabs, canEditEstimate] = await withPerfTraceRequest("workshop.estimate-sheet-tail", () =>
    Promise.all([
      traced("estimate-sheet.tabs", async () => tabs ?? (tab ? await getEstimateTabs(project.id, estimate.id) : [])),
      // Only resolve edit capability on the tab path — on the legacy/no-tab path the
      // strip and tab affordances never render, so the boolean would go unused.
      traced("estimate-sheet.edit-capability", async () => tab ? await resolveEstimateEditCapability(estimate.id) : false),
    ]),
  );
  const estimateMetadata = {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    projectBudget: estimate.project_budget,
    canEditEstimate,
  };

  return (
    <>
      <ProjectEstimateMetadataPublisher metadata={estimateMetadata} />
      <EstimateWorkspaceClient
        projectId={project.id}
        estimateId={estimate.id}
        projectName={project.name}
        selectedNodeId={selectedNodeId}
        nodes={tree}
        estimateTabs={estimateTabs}
        activeTabId={tab?.id ?? null}
        loadLimitState={loadLimitState}
        canEditEstimate={canEditEstimate}
        collaborationUserId={currentUser.userId}
        collaborationDisplayName={currentUser.displayName}
        proposalExportMetadata={proposalExportMetadata}
        surfaceVariant="glass"
      />
    </>
  );
}
