import Link from "next/link";
import { ArrowRight, Clock, ImageSquare, MapPin } from "@phosphor-icons/react/dist/ssr";

import type { WorkshopProject } from "./workshop-sample-projects";

type ProjectCardProps = {
  project: WorkshopProject;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/workshop/projects/${project.id}`}
      className="group flex min-h-[276px] flex-col overflow-hidden rounded-xs border border-dashed border-hairline bg-white shadow-[0_16px_38px_-34px_rgba(17,17,17,0.45)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_24px_48px_-36px_rgba(17,17,17,0.54)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="flex h-32 flex-col items-center justify-center gap-2 border-b border-hairline bg-[linear-gradient(135deg,#fff0e5_0%,#f4f7fa_55%,#ffffff_100%)] text-tertiary">
        <ImageSquare size={24} weight="regular" aria-hidden="true" />
        <span className="text-[8px] font-medium uppercase tracking-normal">Sample project image</span>
      </div>

      <div className="flex flex-1 flex-col p-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium text-tertiary">{project.client}</p>
          <h2 className="mt-1 line-clamp-2 text-[12px] font-medium leading-[1.12] tracking-normal text-ink">{project.name}</h2>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-tertiary">{project.scope}</p>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1 border-y border-hairline py-2 text-[10px]">
          <div>
            <p className="font-medium text-ink">{project.metrics.areas}</p>
            <p className="mt-0.5 text-tertiary">areas</p>
          </div>
          <div>
            <p className="font-medium text-ink">{project.metrics.lineItems}</p>
            <p className="mt-0.5 text-tertiary">items</p>
          </div>
          <div>
            <p className="font-medium text-ink">{project.metrics.revision}</p>
            <p className="mt-0.5 text-tertiary">revision</p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Estimate</p>
            <p className="mt-1 font-sans text-[10px] font-medium tracking-normal text-ink">{project.estimateTotal}</p>
          </div>
          <div className="text-right text-[10px] text-tertiary">
            <p className="inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" />
              {project.location}
            </p>
            <p className="mt-1 inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" />
              {project.updatedAt}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2 text-[10px] font-medium text-ink">
          <span>Open sample</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
