"use client";

import Link from "next/link";
import { LiveProjectCard } from "./LiveProjectCard";
import { ProjectCard } from "./ProjectCard";
import { sampleProjects } from "./workshop-sample-projects";
import type { Tables } from "@/lib/supabase/types";

type WorkshopHomebaseClientProps = {
  liveProjects: Tables<"projects">[];
};

export function WorkshopHomebaseClient({ liveProjects }: WorkshopHomebaseClientProps) {
  const hasLiveProjects = liveProjects.length > 0;

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
          {hasLiveProjects ? "Recent Projects" : "Sample Projects"}
        </span>
        <Link
          href="/workshop/projects"
          className="text-[10px] font-medium text-ink hover:text-secondary"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hasLiveProjects
          ? liveProjects.map((project) => (
              <LiveProjectCard key={project.id} project={project} />
            ))
          : sampleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
      </div>
    </div>
  );
}
