import { notFound } from "next/navigation";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

function getProjectBudget(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>).projectBudget;
  return typeof value === "number" ? value : null;
}

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const { project, estimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId } =
    await listProjectEstimates(projectId);

  if (!project) notFound();

  return (
    <ProjectEstimatesClient
      projectBudget={getProjectBudget(project.metadata)}
      projectId={projectId}
      projectName={project.name}
      estimates={estimates.map((estimate) => ({
        ...estimate,
        firstNodeId: firstNodeByEstimateId.get(estimate.id) ?? null,
        nodeCount: nodeCountByEstimateId.get(estimate.id) ?? 0,
        rowItemCount: rowCountByEstimateId.get(estimate.id) ?? 0,
        totalProjectCost: totalCostByEstimateId.get(estimate.id) ?? 0,
      }))}
    />
  );
}
