import Link from "next/link";
import { ArrowRight, Buildings, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";

import type { WorkshopProject } from "./workshop-sample-projects";

const statusTone: Record<WorkshopProject["status"], string> = {
  Draft: "bg-surface-muted text-tertiary ring-hairline",
  Pricing: "bg-accent-soft text-accent-dark ring-accent/20",
  "For review": "bg-warning-soft text-warning ring-warning/20",
};

type ProjectCardProps = {
  project: WorkshopProject;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/workshop/projects/${project.id}`}
      className="group flex min-h-[248px] flex-col rounded-xl border border-hairline bg-white p-2 shadow-[0_16px_40px_-34px_rgba(17,17,17,0.45)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_24px_48px_-34px_rgba(17,17,17,0.58)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-dark">
          <Buildings size={20} weight="duotone" aria-hidden="true" />
        </div>
        <span className={`rounded-full p-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${statusTone[project.status]}`}>
          {project.status}
        </span>
      </div>

      <div className="mt-5 min-w-0">
        <p className="text-[10px] font-medium text-tertiary">{project.client}</p>
        <h2 className="mt-1 text-[12px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink">{project.name}</h2>
        <p className="mt-3 line-clamp-2 text-[10px] leading-4 text-tertiary">{project.scope}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-hairline py-2 text-[10px]">
        <div>
          <p className="font-semibold text-ink">{project.metrics.areas}</p>
          <p className="mt-0.5 text-tertiary">areas</p>
        </div>
        <div>
          <p className="font-semibold text-ink">{project.metrics.lineItems}</p>
          <p className="mt-0.5 text-tertiary">items</p>
        </div>
        <div>
          <p className="font-semibold text-ink">{project.metrics.revision}</p>
          <p className="mt-0.5 text-tertiary">revision</p>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-tertiary">Estimate</p>
          <p className="mt-1 font-mono text-[12px] font-semibold tracking-[-0.035em] text-ink">{project.estimateTotal}</p>
        </div>
        <div className="text-right text-[10px] text-tertiary">
          <p className="inline-flex items-center gap-1">
            <MapPin size={13} aria-hidden="true" />
            {project.location}
          </p>
          <p className="mt-1 inline-flex items-center gap-1">
            <Clock size={13} aria-hidden="true" />
            {project.updatedAt}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-2 text-[10px] font-medium text-ink">
        <span>Open project</span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}
