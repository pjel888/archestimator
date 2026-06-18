/**
 * Projects — tall, dense white-paper ledger for the bento working desk.
 * Legibility first: plain white surface, hairline dividers, no frost/blur.
 * The card fills its bento cell and scrolls internally when rows overflow.
 */
import Link from "next/link";
import { Folder, Star } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import {
  formatShortDate,
  projectHref,
  type WorkshopProjectSummary,
} from "./lib";

type RecentProjectsListProps = {
  projects: WorkshopProjectSummary[];
  embedded?: boolean;
};

const ROW_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

export function RecentProjectsList({ projects, embedded = false }: RecentProjectsListProps) {
  const rows = projects.slice(0, 6);

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        embedded ? "bg-transparent" : "bg-white",
        embedded ? "" : "rounded-xs border border-hairline",
      )}
    >
      <div className="flex h-12 shrink-0 items-center border-b border-hairline px-2">
        <h2 className="text-[12px] font-medium text-ink">Projects</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="px-2 py-2 text-[10px] text-secondary">
            No recent projects yet
          </p>
        ) : (
          <ul>
            {rows.map((project) => {
              const meta = project.client_name ?? project.location;
              return (
                <li key={project.id}>
                  <Link
                    href={projectHref(project.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 hover:bg-surface-muted",
                      ROW_FOCUS,
                    )}
                  >
                    <Folder size={12} weight="regular" className="shrink-0 text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] text-ink" title={project.name}>
                          {project.name}
                        </span>
                        {project.isFavorite ? (
                          <Star
                            size={12}
                            weight="regular"
                            className="shrink-0 text-orange-600"
                          />
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {project.project_code ? (
                          <span className="font-numeric text-[9px] text-secondary">
                            {project.project_code}
                          </span>
                        ) : null}
                        {meta ? (
                          <span className="truncate text-[10px] text-secondary">{meta}</span>
                        ) : null}
                      </span>
                    </span>
                    <time className="shrink-0 font-numeric text-[9px] text-secondary">
                      {formatShortDate(project.updated_at)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
