import { ProjectsPageClient } from "@/components/workshop/projects-page-client";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

export default async function ProjectsPage() {
  const { projects } = await listCurrentWorkspaceProjects();

  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
      contentClassName=""
      footer={
        <>
          <span>{projects.length} live projects</span>
          <span>{projects.length === 0 ? "Sample references visible" : "Supabase workspace connected"}</span>
        </>
      }
    >
      <ProjectsPageClient projects={projects} />
    </WorkshopPageShell>
  );
}
