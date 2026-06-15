import { notFound } from "next/navigation";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCurrentWorkspaceComponentLibrary } from "@/lib/repositories/component-library-repository";
import { getProjectEstimateTreeByNode } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const [estimateTreeResult, componentLibrary, currentUser] = await Promise.all([
    getProjectEstimateTreeByNode(projectId, nodeId),
    getCurrentWorkspaceComponentLibrary(),
    requireCurrentUserContext(),
  ]);
  const { project, estimate, selectedNodeId, tree } = estimateTreeResult;

  if (!project || !estimate) notFound();

  const estimateVersionLabel = readEstimateVersionLabel(estimate.metadata);
  const supabase = await createSupabaseServerClient();
  const { data: canEditEstimate } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimate.id });
  const estimateMetadata = {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    projectBudget: estimate.project_budget,
    canEditEstimate: canEditEstimate === true,
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

  return (
    <>
      <ProjectEstimateMetadataPublisher metadata={estimateMetadata} />
      <EstimateWorkspaceClient
        projectId={project.id}
        estimateId={estimate.id}
        projectName={project.name}
        selectedNodeId={selectedNodeId}
        nodes={tree}
        collaborationUserId={currentUser.userId}
        collaborationDisplayName={currentUser.displayName}
        proposalExportMetadata={proposalExportMetadata}
        libraryItems={componentLibrary.libraryItems}
        libraryTemplates={componentLibrary.templates}
        libraryCategoryTree={componentLibrary.categoryTree}
        librarySuppliers={componentLibrary.suppliers}
        libraryBrands={componentLibrary.brands}
      />
    </>
  );
}
