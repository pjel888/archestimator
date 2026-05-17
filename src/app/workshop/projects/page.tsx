import { Plus, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/workshop/ProjectCard";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";

export default function ProjectsPage() {
  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Work"
      description="Browse current estimate work by project. These are sample project cards only; persistence and project detail routes remain intentionally unbuilt until the workflow is approved."
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
          <span>{sampleProjects.length} sample projects</span>
          <span>No persistence connected</span>
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
