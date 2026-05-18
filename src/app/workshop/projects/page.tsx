import { Plus, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/workshop/ProjectCard";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

export default async function ProjectsPage() {
  const { workspace, projects } = await listCurrentWorkspaceProjects();

  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Work"
      description={`Workspace: ${workspace.name}. Live Supabase project records are connected; sample cards remain visible until the project creation form is approved.`}
      actions={
        <>
          <Button variant="secondary" size="md" className="hidden h-9 shadow-[0_1px_0_rgba(17,17,17,0.04)] sm:inline-flex">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filter
          </Button>
          <Button variant="primary" size="md" className="h-9 shadow-[0_10px_24px_-18px_rgba(255,122,26,0.9)]">
            <Plus size={16} weight="bold" aria-hidden="true" />
            New project
          </Button>
        </>
      }
      footer={
        <>
          <span>{projects.length} live projects</span>
          <span>{sampleProjects.length} sample cards visible</span>
        </>
      }
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {sampleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </WorkshopPageShell>
  );
}
