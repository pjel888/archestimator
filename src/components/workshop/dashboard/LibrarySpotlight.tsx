/**
 * Library spotlight — a "start from a template" panel on a neutral frosted-glass
 * bento cell. Counts shown are real library totals; up to four recent templates
 * deep-link straight into the template editor. Degrades gracefully to nothing
 * when the overview call failed.
 */
import Link from "next/link";

import { cn } from "@/lib/ui/cn";

import { WORKSHOP_ROUTES, type DashboardLibrarySpotlight } from "./lib";

type LibrarySpotlightProps = {
  spotlight: DashboardLibrarySpotlight | null;
};

const ROW_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

function templateHref(id: string): string {
  return `${WORKSHOP_ROUTES.libraryTemplates}/${id}`;
}

export function LibrarySpotlight({ spotlight }: LibrarySpotlightProps) {
  // Graceful degradation: the library overview call failed, so render nothing.
  if (!spotlight) return null;

  const templates = spotlight.recentTemplates.slice(0, 4);

  return (
    <section
      className={cn(
        "dashboard-glass relative flex h-full min-h-0 flex-col gap-2 rounded-xs p-3",
      )}
      aria-labelledby="dashboard-library-spotlight-heading"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-numeric text-[9px] text-secondary">Templates</span>
        <h2
          id="dashboard-library-spotlight-heading"
          className="text-[12px] font-medium text-ink"
        >
          Start from a template
        </h2>
        <span className="font-numeric text-[10px] text-secondary">
          {spotlight.componentCount} components · {spotlight.templateCount} templates
        </span>
      </div>

      {templates.length === 0 ? (
        <p className="text-[10px] text-secondary">
          No templates yet —{" "}
          <Link
            href={WORKSHOP_ROUTES.libraryTemplates}
            className={cn("rounded-xs text-secondary hover:text-ink", ROW_FOCUS)}
          >
            create one in the Library.
          </Link>
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={templateHref(template.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xs px-2 py-1.5 hover:bg-white/40",
                  ROW_FOCUS,
                )}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[11px] text-ink"
                    title={template.name}
                  >
                    {template.name}
                  </span>
                  <span className="block truncate text-[9px] text-secondary">
                    {template.category}
                  </span>
                </span>
                <span className="shrink-0 font-numeric text-[9px] text-secondary">
                  {template.rowCount} items
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
