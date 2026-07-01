import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ProjectEstimatesClient } from "@/components/workshop/ProjectEstimatesClient";
import { ProjectEstimatesListRouteFallback } from "@/components/workshop/ProjectEstimatesListRouteFallback";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, canEditProjectInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { listCurrentUserEstimateFavoriteCreatedAtById } from "@/lib/repositories/estimate-favorites-repository";
import { ensureDefaultWorkspace, listMainSidebarFavoriteProjects, listProjectEstimates } from "@/lib/repositories/workspace-repository";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  return (
    <Suspense fallback={<ProjectEstimatesListRouteFallback />}>
      <ProjectEstimatesContent params={params} />
    </Suspense>
  );
}

async function ProjectEstimatesContent({ params }: ProjectEstimatesPageProps) {
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

  // Use the explicit project-favorite marker. The sidebar list can also contain
  // sheet-only project containers, and those must not be mistaken for a starred
  // parent project.
  const sidebarFavoriteProject = sidebarFavoriteProjects.find((favorite) => favorite.id === project.id);
  const projectFavoriteCreatedAt = sidebarFavoriteProject
    ? sidebarFavoriteProject.projectFavoriteCreatedAt === undefined
      ? sidebarFavoriteProject.favoriteCreatedAt
      : sidebarFavoriteProject.projectFavoriteCreatedAt
    : null;
  const isSidebarFavorite = projectFavoriteCreatedAt !== null;
  const parentProject = {
    id: project.id,
    name: project.name,
    projectCode: project.project_code ?? null,
    href: `/workshop/projects/${project.id}`,
    isSidebarFavorite,
    projectFavoriteCreatedAt,
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
  const [db, currentUser] = await Promise.all([
    getCloudflareD1Database(),
    requireCurrentUserContext(),
  ]);
  if (!db) {
    return {
      canCreateEstimates: false,
      canEditEstimateById: Object.fromEntries(estimateIds.map((estimateId) => [estimateId, false])),
    };
  }

  try {
    const [canEditProject, estimateEditPairs] = await Promise.all([
      canEditProjectInD1(db, projectId, currentUser),
      Promise.all(estimateIds.map(async (estimateId) => [
        estimateId,
        await canEditEstimateInD1(db, estimateId, currentUser),
      ] as const)),
    ]);

    return {
      canCreateEstimates: canEditProject,
      canEditEstimateById: Object.fromEntries(estimateEditPairs),
    };
  } catch {
    return {
      canCreateEstimates: false,
      canEditEstimateById: Object.fromEntries(estimateIds.map((estimateId) => [estimateId, false])),
    };
  }
}
