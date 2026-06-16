import { notFound } from "next/navigation";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { listCurrentUserEstimateFavoriteCreatedAtById } from "@/lib/repositories/estimate-favorites-repository";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

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
  if (estimateIds.length === 0) {
    const { data, error } = await supabase.rpc("can_edit_project", { target_project_id: projectId });
    return {
      canCreateEstimates: error ? false : data === true,
      canEditEstimateById: {},
    };
  }

  const currentUser = await requireCurrentUserContext();
  const [projectEditResult, sheetMembershipsResult, sheetSettingsResult] = await Promise.all([
    supabase.rpc("can_edit_project", { target_project_id: projectId }),
    supabase
      .from("estimate_sheet_members")
      .select("estimate_id")
      .eq("user_id", currentUser.userId)
      .in("estimate_id", estimateIds)
      .in("role", ["owner", "admin", "editor"]),
    supabase
      .from("estimate_sheet_access_settings")
      .select("estimate_id, inherit_project_access")
      .in("estimate_id", estimateIds),
  ]);

  const canEditProject = projectEditResult.error ? false : projectEditResult.data === true;
  if (sheetMembershipsResult.error || sheetSettingsResult.error) {
    return {
      canCreateEstimates: canEditProject,
      canEditEstimateById: Object.fromEntries(estimateIds.map((estimateId) => [estimateId, false])),
    };
  }

  const editableMemberEstimateIds = new Set((sheetMembershipsResult.data ?? []).map((membership) => membership.estimate_id));
  const inheritsProjectAccessByEstimateId = new Map(
    (sheetSettingsResult.data ?? []).map((settings) => [settings.estimate_id, settings.inherit_project_access]),
  );

  return {
    canCreateEstimates: canEditProject,
    canEditEstimateById: Object.fromEntries(
      estimateIds.map((estimateId) => {
        const inheritsProjectAccess = inheritsProjectAccessByEstimateId.get(estimateId) ?? true;
        return [estimateId, editableMemberEstimateIds.has(estimateId) || (inheritsProjectAccess && canEditProject)];
      }),
    ),
  };
}
