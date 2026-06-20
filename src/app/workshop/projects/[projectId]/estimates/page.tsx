import { notFound } from "next/navigation";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { listCurrentUserEstimateFavoriteCreatedAtById } from "@/lib/repositories/estimate-favorites-repository";
import { ensureDefaultWorkspace, listMainSidebarFavoriteProjects, listProjectEstimates } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const { project, estimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId } =
    await withPerfTraceRequest("workshop.estimates-list", () =>
      traced("estimates-list.project-estimates", () => listProjectEstimates(projectId)),
    );

  if (!project) notFound();

  const estimateIds = estimates.map((estimate) => estimate.id);
  const [favoriteCreatedAtByEstimateId, editCapabilities, currentUser, workspaceBootstrap, sidebarFavoriteProjects] =
    await withPerfTraceRequest("workshop.estimates-list-tail", () =>
      Promise.all([
        traced("estimates-list.favorites", () => listCurrentUserEstimateFavoriteCreatedAtById(estimateIds)),
        traced("estimates-list.edit-capabilities", () => resolveEstimateListEditCapabilities(projectId, estimateIds)),
        traced("estimates-list.current-user", () => requireCurrentUserContext()),
        traced("estimates-list.workspace", () => ensureDefaultWorkspace()),
        traced("estimates-list.sidebar-favorites", () => listMainSidebarFavoriteProjects()),
      ]),
    );

  // isSidebarFavorite: membership in the scoped top-window favorites list (cached
  // read, no extra query). Drives the optimistic sidebar insert + the legibility cue.
  const isSidebarFavorite = sidebarFavoriteProjects.some((favorite) => favorite.id === project.id);
  const parentProject = {
    id: project.id,
    name: project.name,
    projectCode: project.project_code ?? null,
    href: `/workshop/projects/${project.id}`,
    isSidebarFavorite,
  };
  const scope = { workspaceId: workspaceBootstrap.workspace.id, userId: currentUser.userId };

  return (
    <ProjectEstimatesClient
      projectId={projectId}
      projectName={project.name}
      parentProject={parentProject}
      scope={scope}
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

  // The current-user read (`requireCurrentUserContext`) and the Supabase client
  // (`createSupabaseServerClient`) are both request-scoped via React `cache()`,
  // so the gate below reuses the same getUser/profile resolution and client the
  // rest of the render already triggered — no extra Supabase round-trip is made
  // here. The explicit `await` keeps the original auth short-circuit ordering
  // (redirect before any read) intact; on the hero path it resolves from cache.
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
