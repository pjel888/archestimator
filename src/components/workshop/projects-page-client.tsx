"use client";

import { useMemo, useState } from "react";

import type { Tables } from "@/lib/supabase/types";

import { LiveProjectCard } from "./LiveProjectCard";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailsModal } from "./ProjectDetailsModal";
import { WorkshopCollectionLayout } from "./WorkshopCollectionLayout";
import { sampleProjects } from "./workshop-sample-projects";

type ProjectsPageClientProps = {
  projects: Tables<"projects">[];
};

export function ProjectsPageClient({ projects }: ProjectsPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProject, setExpandedProject] = useState<Tables<"projects"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.project_code?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q),
    );
  }, [projects, searchQuery]);

  const filteredSamples = useMemo(() => {
    if (!searchQuery.trim()) return sampleProjects;
    const q = searchQuery.toLowerCase();
    return sampleProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const hasLiveProjects = projects.length > 0;
  const displayProjects = hasLiveProjects ? filteredProjects : [];
  const displaySamples = filteredSamples;

  return (
    <WorkshopCollectionLayout
      searchLabel="Search projects"
      searchPlaceholder="Search projects"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      toolbarLabel="Project tools"
      toolbarPrefix="projects"
      onAdd={() => setIsModalOpen(true)}
      addVisibleLabel="Create Project"
    >
      {hasLiveProjects ? (
        displayProjects.length > 0 ? (
          <section aria-label="Live projects" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayProjects.map((project) => (
              <LiveProjectCard key={project.id} project={project} onExpand={setExpandedProject} />
            ))}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[11px] font-semibold text-ink">No projects match your search</p>
            <p className="mt-1 text-[10px] text-tertiary">Try adjusting your search terms</p>
          </div>
        )
      ) : (
        <section aria-label="Sample project references" className="space-y-2">
          <div className="rounded-lg border border-dashed border-hairline bg-white p-2 text-[10px] leading-4 text-tertiary">
            No live projects yet. Create the first project to get started; sample cards below are references only.
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displaySamples.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
      {expandedProject ? <ProjectDetailsModal project={expandedProject} onClose={() => setExpandedProject(null)} /> : null}
    </WorkshopCollectionLayout>
  );
}
