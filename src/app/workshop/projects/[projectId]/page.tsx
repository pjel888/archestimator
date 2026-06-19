import { notFound, redirect } from "next/navigation";

import { ProjectDashboardClient } from "@/components/workshop/ProjectDashboardClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { isUuid } from "@/lib/ids";
import {
  listProjectEstimateSheetsForProject,
  listRecentProjectEstimateSheets,
} from "@/lib/repositories/project-estimate-sheets-repository";
import { getProjectLocation } from "@/lib/repositories/project-location-repository";
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

  const [canEdit, projectEstimateSheets, recentEstimateSheets] = project
    ? await Promise.all([
        canEditProject(project.id),
        listProjectEstimateSheetsForProject(project.id),
        listRecentProjectEstimateSheets(project.id),
      ])
    : ([false, [], []] as const);
  const projectLocation = project && canEdit ? await getProjectLocation(project.id) : null;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const googleMapsMapId = process.env.GOOGLE_MAPS_MAP_ID ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? null;

  return (
    <ProjectDashboardClient
      project={project}
      fallback={fallback}
      estimateCount={projectEstimateSheets.length}
      recentEstimateSheets={recentEstimateSheets}
      canEditProject={canEdit}
      projectLocation={projectLocation}
      googleMapsApiKey={googleMapsApiKey}
      googleMapsMapId={googleMapsMapId}
    />
  );
}
