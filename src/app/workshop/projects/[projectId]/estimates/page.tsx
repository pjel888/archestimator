import { notFound } from "next/navigation";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import { listCurrentUserEstimateFavoriteCreatedAtById } from "@/lib/repositories/estimate-favorites-repository";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

const ESTIMATE_EDIT_CAPABILITY_RPC_CONCURRENCY = 4;

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const { project, estimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId } =
    await listProjectEstimates(projectId);

  if (!project) notFound();

  const estimateIds = estimates.map((estimate) => estimate.id);
  const [favoriteCreatedAtByEstimateId, editCapabilities] = await Promise.all([
    listCurrentUserEstimateFavoriteCreatedAtById(estimateIds),
    resolveEstimateListEditCapabilities(projectId, estimateIds),
  ]);

  return (
    <ProjectEstimatesClient
      projectId={projectId}
      projectName={project.name}
      canCreateEstimates={editCapabilities.canCreateEstimates}
      canEditEstimateById={editCapabilities.canEditEstimateById}
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

async function resolveEstimateListEditCapabilities(projectId: string, estimateIds: string[]) {
  const supabase = await createSupabaseServerClient();
  const [{ data: canEditProject, error: projectEditError }, estimateEntries] = await Promise.all([
    supabase.rpc("can_edit_project", { target_project_id: projectId }),
    mapWithConcurrency(estimateIds, ESTIMATE_EDIT_CAPABILITY_RPC_CONCURRENCY, async (estimateId) => {
      const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimateId });
      return [estimateId, error ? false : data === true] as const;
    }),
  ]);

  return {
    canCreateEstimates: projectEditError ? false : canEditProject === true,
    canEditEstimateById: Object.fromEntries(estimateEntries),
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (inputs.length === 0) return [];

  const results = new Array<TOutput>(inputs.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), inputs.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < inputs.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(inputs[currentIndex]!, currentIndex);
      }
    }),
  );

  return results;
}
