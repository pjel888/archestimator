"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CaretDown, FilePlus, FolderPlus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { NewProjectModal } from "@/components/workshop/NewProjectModal";
import { cn } from "@/lib/ui/cn";

import { projectEstimatesHref, type WorkshopProjectSummary } from "./lib";

type CreateActionsProps = {
  recentProjects: WorkshopProjectSummary[];
  /** When true, drop the card's own glass surface so it composes inside a shared
   * panel (the combined Continue+Create action block). */
  bare?: boolean;
};

const MAX_RECENT = 5;

/**
 * HERO #2 — the working-desk "create" cell. Fills its bento cell as a warm-glass
 * hero with two prominent actions. "New project" opens the real create-project
 * flow. "New estimate sheet" never fabricates a project-less sheet: it toggles a
 * disclosure of recent projects to add the sheet to, or is disabled (with helper
 * copy) when there are no projects yet.
 *
 * The dashboard dir is design-system-exempt, so the warm gradient/glass classes
 * are used directly. Meta/helper copy uses --secondary (AA-safe over warm frost),
 * never --tertiary.
 */
export function CreateActions({ recentProjects, bare = false }: CreateActionsProps) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerId = useId();

  const projects = recentProjects.slice(0, MAX_RECENT);
  const hasProjects = projects.length > 0;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col gap-2 p-2",
        bare ? "" : "dashboard-glass-warm dashboard-hero-create h-full rounded-xs",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[12px] font-medium text-ink">Create</h2>
        <span className="font-numeric text-[9px] text-secondary">Start something new</span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Button variant="primary" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <FolderPlus size={16} weight="regular" aria-hidden="true" />
          New project
        </Button>

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={!hasProjects}
            aria-expanded={hasProjects ? pickerOpen : undefined}
            aria-controls={hasProjects && pickerOpen ? pickerId : undefined}
            onClick={() => setPickerOpen((value) => !value)}
          >
            <FilePlus size={16} weight="regular" aria-hidden="true" />
            New estimate sheet
            {hasProjects ? (
              <CaretDown
                size={12}
                weight="regular"
                aria-hidden="true"
                className={cn("transition-transform motion-reduce:transition-none", pickerOpen && "rotate-180")}
              />
            ) : null}
          </Button>

          {hasProjects ? (
            pickerOpen ? (
              <ul id={pickerId} className="flex flex-col gap-0.5">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={projectEstimatesHref(project.id)}
                      className={cn(
                        "block truncate rounded-xs px-2 py-2 font-numeric text-[11px] text-secondary",
                        "hover:bg-white/40 hover:text-ink",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      )}
                    >
                      {project.name}
                    </Link>
                  </li>
                ))}
              </ul>
              ) : null
          ) : (
            <p className="font-numeric text-[9px] text-secondary">Create a project first</p>
          )}
        </div>
      </div>

      {open ? <NewProjectModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
