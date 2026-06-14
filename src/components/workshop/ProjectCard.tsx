import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";

import type { WorkshopProject } from "./workshop-sample-projects";

type ProjectCardProps = {
  project: WorkshopProject;
  // P8 additive: optional activity badge for unseen shared-link activity (workshop project list)
  hasUnseenSharedLinkActivity?: boolean;
};

function getSampleMotif(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function ProjectCard({ project, hasUnseenSharedLinkActivity = false }: ProjectCardProps) {
  return (
    <Link
      href={`/workshop/projects/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-xs border border-hairline bg-white transition-colors duration-150 hover:border-tertiary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-hairline bg-surfaceMuted">
        <div className="flex h-full w-full items-center justify-center px-2">
          <span className="truncate text-[10px] font-medium tracking-normal text-tertiary">
            {getSampleMotif(project.name)}
          </span>
        </div>
        {hasUnseenSharedLinkActivity ? (
          <span className="absolute right-1.5 top-1.5 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-secondary">
            Activity
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-[8px] font-medium uppercase tracking-normal text-tertiary">{project.client}</p>
        <h2 className="mt-1 line-clamp-2 text-[12px] font-medium leading-[1.18] tracking-normal text-ink">{project.name}</h2>
        <p className="mt-1 line-clamp-2 text-[9px] leading-3 text-tertiary">{project.scope}</p>

        <div className="mt-2.5 grid grid-cols-3 gap-1 border-y border-hairline py-2 text-[10px]">
          <div>
            <p className="font-medium text-ink">{project.metrics.areas}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-normal text-tertiary">areas</p>
          </div>
          <div>
            <p className="font-medium text-ink">{project.metrics.lineItems}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-normal text-tertiary">items</p>
          </div>
          <div>
            <p className="font-medium text-ink">{project.metrics.revision}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-normal text-tertiary">revision</p>
          </div>
        </div>

        <div className="mt-2.5 space-y-1">
          <p className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary">
            <MapPin size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{project.location}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary">
            <Clock size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{project.updatedAt}</span>
          </p>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
          <span className="truncate font-sans text-[10px] font-medium tracking-normal text-ink">{project.estimateTotal}</span>
          <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-xs px-2.5 text-[10px] font-medium text-ink group-hover:bg-surfaceMuted">
            Open sample
            <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
