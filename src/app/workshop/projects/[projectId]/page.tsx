import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { canEditProjectInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import {
  createEmptyProjectActivityPage,
  listProjectActivityPage,
} from "@/lib/repositories/project-activity-repository";
import {
  countProjectEstimateSheetsForProject,
  listRecentProjectEstimateSheets,
} from "@/lib/repositories/project-estimate-sheets-repository";
import { getProjectLocation } from "@/lib/repositories/project-location-repository";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getCurrentWorkspaceProject, listCurrentWorkspaceProjectClientNames } from "@/lib/repositories/workspace-repository";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

async function canEditProject(projectId: string) {
  const [db, currentUser] = await Promise.all([
    getCloudflareD1Database(),
    requireCurrentUserContext(),
  ]);
  if (!db) return false;
  try {
    return await canEditProjectInD1(db, projectId, currentUser);
  } catch {
    return false;
  }
}

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const { project } = await getCurrentWorkspaceProject(projectId);
  const sampleProject = sampleProjects.find((item) => item.id === projectId);

  if (!project && !sampleProject) {
    if (isUuid(projectId)) redirect(`/workshop?removedProject=${encodeURIComponent(projectId)}`);
    notFound();
  }

  const fallback = {
    id: projectId,
    name: sampleProject?.name ?? "Project",
    client: sampleProject?.client ?? "No client yet",
    location: sampleProject?.location ?? "No location",
    projectCode: "No project code",
    currencyCode: "PHP",
  };

  const dashboardData = project
    ? await withPerfTraceRequest("workshop.project-dashboard", async () => {
        const canEditPromise = traced("project-dashboard.can-edit", () => canEditProject(project.id));
        const projectLocationPromise = canEditPromise.then((canEdit) => (
          canEdit ? traced("project-dashboard.location", () => getProjectLocation(project.id)) : null
        ));
        const [canEdit, estimateCount, recentEstimateSheets, projectActivityPage, projectLocation, clientOptions] = await Promise.all([
          canEditPromise,
          traced("project-dashboard.estimate-count", () => countProjectEstimateSheetsForProject(project.id)),
          traced("project-dashboard.recent-estimates", () => listRecentProjectEstimateSheets(project.id)),
          traced("project-dashboard.activity", () => listProjectActivityPage({ projectId: project.id, limit: 16 })),
          projectLocationPromise,
          traced("project-dashboard.client-options", () => listCurrentWorkspaceProjectClientNames()),
        ]);

        return {
          canEdit,
          estimateCount,
          recentEstimateSheets,
          projectActivityPage,
          projectLocation,
          clientOptions,
        };
      })
    : {
        canEdit: false,
        estimateCount: 0,
        recentEstimateSheets: [],
        projectActivityPage: createEmptyProjectActivityPage(),
        projectLocation: null,
        clientOptions: [],
      };
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const googleMapsMapId = process.env.GOOGLE_MAPS_MAP_ID ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? null;

  return (
    <ProjectDashboardClient
      project={project}
      fallback={fallback}
      estimateCount={dashboardData.estimateCount}
      recentEstimateSheets={dashboardData.recentEstimateSheets}
      canEditProject={dashboardData.canEdit}
      projectLocation={dashboardData.projectLocation}
      projectActivityPage={dashboardData.projectActivityPage}
      googleMapsApiKey={googleMapsApiKey}
      googleMapsMapId={googleMapsMapId}
      clientOptions={dashboardData.clientOptions}
    />
  );
}
