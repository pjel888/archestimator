import { notFound } from "next/navigation";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import { listCurrentUserEstimateFavoriteCreatedAtById } from "@/lib/repositories/estimate-favorites-repository";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const { project, estimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId } =
    await listProjectEstimates(projectId);

  if (!project) notFound();

  const favoriteCreatedAtByEstimateId = await listCurrentUserEstimateFavoriteCreatedAtById(
    estimates.map((estimate) => estimate.id),
  );

  return (
    <ProjectEstimatesClient
      projectId={projectId}
      projectName={project.name}
      estimates={estimates.map((estimate) => {
        const favoriteCreatedAt = favoriteCreatedAtByEstimateId.get(estimate.id) ?? null;
        return {
          ...estimate,
          firstNodeId: firstNodeByEstimateId.get(estimate.id) ?? null,
          nodeCount: nodeCountByEstimateId.get(estimate.id) ?? 0,
          rowItemCount: rowCountByEstimateId.get(estimate.id) ?? 0,
          totalProjectCost: totalCostByEstimateId.get(estimate.id) ?? 0,
          isFavorite: favoriteCreatedAt !== null,
          favoriteCreatedAt,
        };
      })}
    />
  );
}
