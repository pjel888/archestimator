import Link from "next/link";
import { ArrowRight, Buildings, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";

import type { Tables } from "@/lib/supabase/types";

type LiveProjectCardProps = {
  project: Tables<"projects">;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function LiveProjectCard({ project }: LiveProjectCardProps) {
  return (
    <Link
      href={`/workshop/projects/${project.id}`}
      className="group flex min-h-[184px] flex-col rounded-lg border border-hairline bg-white p-2 shadow-[0_14px_34px_-30px_rgba(17,17,17,0.42)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_22px_44px_-32px_rgba(17,17,17,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-dark">
          <Buildings size={17} weight="duotone" aria-hidden="true" />
        </div>
        <span className="rounded-full bg-surface-muted p-1 text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary ring-1 ring-hairline">
          {project.status}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[10px] font-medium text-tertiary">{project.client_name ?? "No client yet"}</p>
        <h2 className="mt-1 line-clamp-2 text-[12px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">{project.name}</h2>
        <p className="mt-2 text-[10px] leading-4 text-tertiary">{project.project_code ?? "No project code"}</p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3 text-[10px] text-tertiary">
        <div className="min-w-0 space-y-1">
          <p className="flex min-w-0 items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            <span className="truncate">{project.location ?? "No location"}</span>
          </p>
          <p className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            Updated {formatUpdatedAt(project.updated_at)}
          </p>
        </div>
        <ArrowRight size={15} className="shrink-0 text-ink transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}
