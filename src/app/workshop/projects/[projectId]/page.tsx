import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
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
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

async function canEditProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_edit_project", { target_project_id: projectId });
  if (error) return false;
  return data === true;
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
        const [canEdit, estimateCount, recentEstimateSheets, projectActivityPage, projectLocation] = await Promise.all([
          canEditPromise,
          traced("project-dashboard.estimate-count", () => countProjectEstimateSheetsForProject(project.id)),
          traced("project-dashboard.recent-estimates", () => listRecentProjectEstimateSheets(project.id)),
          traced("project-dashboard.activity", () => listProjectActivityPage({ projectId: project.id, limit: 16 })),
          projectLocationPromise,
        ]);

        return {
          canEdit,
          estimateCount,
          recentEstimateSheets,
          projectActivityPage,
          projectLocation,
        };
      })
    : {
        canEdit: false,
        estimateCount: 0,
        recentEstimateSheets: [],
        projectActivityPage: createEmptyProjectActivityPage(),
        projectLocation: null,
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
    />
  );
}
