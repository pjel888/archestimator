import { SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { LiveProjectCard } from "@/components/workshop/LiveProjectCard";
import { NewProjectForm } from "@/components/workshop/NewProjectForm";
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
      description={`Workspace: ${workspace.name}. Create and open live Supabase project records from this protected workspace.`}
      actions={
        <Button variant="secondary" size="md" className="hidden h-9 shadow-[0_1px_0_rgba(17,17,17,0.04)] sm:inline-flex">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filter
        </Button>
      }
      footer={
        <>
          <span>{projects.length} live projects</span>
          <span>{projects.length === 0 ? `${sampleProjects.length} sample references visible` : "Supabase workspace connected"}</span>
        </>
      }
    >
      <div className="space-y-2">
        <NewProjectForm />

        {projects.length > 0 ? (
          <section aria-label="Live projects" className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {projects.map((project) => (
              <LiveProjectCard key={project.id} project={project} />
            ))}
          </section>
        ) : (
          <section aria-label="Sample project references" className="space-y-2">
            <div className="rounded-md border border-dashed border-hairline bg-white p-2 text-[10px] leading-4 text-tertiary">
              No live projects yet. Create the first project above; sample cards below are references only.
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {sampleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        )}
      </div>
    </WorkshopPageShell>
  );
}
