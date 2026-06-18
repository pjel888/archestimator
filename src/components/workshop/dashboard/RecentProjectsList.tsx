/**
 * Recent projects — tall, dense white-paper ledger for the bento working desk.
 * Legibility first: plain white surface, hairline dividers, no frost/blur.
 * The card fills its bento cell and scrolls internally when rows overflow.
 */
import Link from "next/link";
import { Folder, Star } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import {
  WORKSHOP_ROUTES,
  formatShortDate,
  projectHref,
  type WorkshopProjectSummary,
} from "./lib";

type RecentProjectsListProps = {
  projects: WorkshopProjectSummary[];
};

const ROW_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

export function RecentProjectsList({ projects }: RecentProjectsListProps) {
  const rows = projects.slice(0, 6);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xs border border-hairline bg-white">
      <div className="flex shrink-0 items-end justify-between gap-2 px-2 py-1.5">
        <div className="min-w-0">
          <p className="font-numeric text-[9px] text-secondary">Workspace</p>
          <h2 className="text-[12px] font-medium text-ink">Recent projects</h2>
        </div>
        <Link
          href={WORKSHOP_ROUTES.projects}
          aria-label="View all projects"
          className={cn(
            "shrink-0 rounded-xs font-numeric text-[10px] text-secondary hover:text-ink",
            ROW_FOCUS,
          )}
        >
          View all
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="border-t border-hairline px-2 py-1.5 text-[10px] text-secondary">
            No recent projects yet
          </p>
        ) : (
          <ul>
            {rows.map((project) => {
              const meta = project.client_name ?? project.location;
              return (
                <li key={project.id} className="border-t border-hairline">
                  <Link
                    href={projectHref(project.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 hover:bg-surface-muted",
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
