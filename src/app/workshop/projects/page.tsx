import { ProjectsPageClient } from "@/components/workshop/projects-page-client";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

export default async function ProjectsPage() {
  const { projects, favoriteProjectIds } = await listCurrentWorkspaceProjects();

  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
      contentClassName=""
    >
      <ProjectsPageClient
        projects={projects}
        favoriteProjectIds={favoriteProjectIds}
      />
    </WorkshopPageShell>
  );
}
