import { notFound } from "next/navigation";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getEstimateTabs, resolveEstimateEditCapability, resolveEstimateTabRouteContext } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import type { EstimateTabSummary } from "@/lib/estimates/types";
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
  const [estimateTreeResult, currentUser] = await Promise.all([
    resolveEstimateTabRouteContext(projectId, nodeId),
    requireCurrentUserContext(),
  ]);
  const { project, estimate, selectedNodeId, tree, tab } = estimateTreeResult;

  if (!project || !estimate) notFound();

  const estimateVersionLabel = readEstimateVersionLabel(estimate.metadata);
  const estimateMetadata = {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    projectBudget: estimate.project_budget,
  };
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
  // `estimate.id` is only known after the route-context load above, so the
  // edit-capability RPC cannot live in that first Promise.all. Instead it runs
  // in parallel with the `getEstimateTabs` round-trip the page already makes,
  // adding no new sequential first-paint hop. Server stays authoritative; this
  // boolean only gates edit affordances in the UI (see plan U1).
  const [estimateTabs, canEditEstimate] = await Promise.all([
    tab ? getEstimateTabs(project.id, estimate.id) : Promise.resolve<EstimateTabSummary[]>([]),
    resolveEstimateEditCapability(estimate.id),
  ]);

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
        canEditEstimate={canEditEstimate}
        collaborationUserId={currentUser.userId}
        collaborationDisplayName={currentUser.displayName}
        proposalExportMetadata={proposalExportMetadata}
      />
    </>
  );
}
