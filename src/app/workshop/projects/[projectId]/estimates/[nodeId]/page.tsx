import { notFound } from "next/navigation";

import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { EstimateRightSidebar, EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { getProjectEstimateTreeByNode } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
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

export default async function ProjectEstimateNodePage({ params }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  const { project, estimate, selectedNodeId, tree } = await getProjectEstimateTreeByNode(projectId, nodeId);

  if (!project || !estimate) notFound();

  const estimateMetadata = {
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    versionLabel: readEstimateVersionLabel(estimate.metadata),
  };

  return (
    <>
      <ProjectEstimateMetadataPublisher metadata={estimateMetadata} />
      <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label={`${project.name} estimates`}>
        <EstimateSheetTree projectId={project.id} estimateId={estimate.id} projectName={project.name} selectedNodeId={selectedNodeId} nodes={tree} />
        <EstimateSheetContent selectedNodeId={selectedNodeId} nodes={tree} projectId={project.id} estimateId={estimate.id} />
        <EstimateRightSidebar />
      </section>
    </>
  );
}
