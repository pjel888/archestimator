/**
 * Favorites tree — favorite PROJECTS as parent nodes with each project's
 * favorite ESTIMATE SHEETS nested beneath. Real, keyboard-navigable,
 * screen-reader-sane ARIA tree (role=tree / treeitem / group). Plain white
 * surface for legibility; the rows never sit on a blurred layer.
 */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CaretDown,
  CaretRight,
  FileText,
  Folder,
  Star,
} from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import type {
  MainSidebarFavoriteProject,
} from "@/components/sidebar/sidebar-types";

type FavoritesTreeProps = {
  favoriteProjects: MainSidebarFavoriteProject[];
  embedded?: boolean;
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

const ROW_LINK =
  "flex min-w-0 flex-1 items-center gap-2 rounded-xs px-2 py-2 hover:bg-surface-muted";

export function FavoritesTree({ favoriteProjects, embedded = false }: FavoritesTreeProps) {
  // Default: expand every project that actually has favorite sheets, so the
  // tree is useful on first paint.
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const project of favoriteProjects) {
      if (project.favoriteEstimateSheets.length > 0) {
        initial.add(project.id);
      }
    }
    return initial;
  });

  // Roving tabindex: one focusable item at a time; arrow keys move between the
  // flattened set of visible focus targets (project toggles/links + open
  // sheets). Tab still reaches the active item and leaves the tree.
  const [activeIndex, setActiveIndex] = useState(0);
  const treeRef = useRef<HTMLDivElement>(null);

  // Flattened list of currently-visible treeitems for roving focus + arrow nav.
  // Plain derived value (the React Compiler memoizes it) — declared before the
  // handlers that read it so the compiler can track the dependency cleanly.
  const flatItems: { key: string; level: number }[] = [];
  for (const project of favoriteProjects) {
    flatItems.push({ key: `project:${project.id}`, level: 1 });
    if (openIds.has(project.id)) {
      for (const sheet of project.favoriteEstimateSheets) {
        flatItems.push({ key: `sheet:${sheet.id}`, level: 2 });
      }
    }
  }

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Keep the roving focus on the toggled project row so collapsing never strands
    // the active index on a now-hidden sheet (the project's own index is stable).
    const projectIndex = flatItems.findIndex((item) => item.key === `project:${id}`);
    if (projectIndex >= 0) setActiveIndex(projectIndex);
  };

  const focusItemAt = (index: number) => {
    const clamped = Math.max(0, Math.min(index, flatItems.length - 1));
    setActiveIndex(clamped);
    const item = flatItems[clamped];
    if (!item || !treeRef.current) return;
    const el = treeRef.current.querySelector<HTMLElement>(
      `[data-tree-key="${item.key}"]`,
    );
    el?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItemAt(activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItemAt(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItemAt(0);
        break;
      case "End":
        event.preventDefault();
        focusItemAt(flatItems.length - 1);
        break;
      case "ArrowRight": {
        // Expand the focused project (tree convention). Sheets are not expandable.
        const item = flatItems[activeIndex];
        if (item?.key.startsWith("project:")) {
          const id = item.key.slice("project:".length);
          const project = favoriteProjects.find((candidate) => candidate.id === id);
          if (project && project.favoriteEstimateSheets.length > 0 && !openIds.has(id)) {
            event.preventDefault();
            toggle(id);
          }
        }
        break;
      }
      case "ArrowLeft": {
        // Collapse the focused project.
        const item = flatItems[activeIndex];
        if (item?.key.startsWith("project:")) {
          const id = item.key.slice("project:".length);
          if (openIds.has(id)) {
            event.preventDefault();
            toggle(id);
          }
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        embedded ? "bg-transparent" : "bg-white",
        embedded ? "" : "rounded-xs border border-hairline",
      )}
      aria-labelledby="dashboard-favorites-heading"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-2">
        <Star size={14} weight="regular" className="shrink-0 text-orange-600" />
        <h2
          id="dashboard-favorites-heading"
          className="text-[12px] font-medium text-ink"
        >
          Favourites
        </h2>
      </div>

      {favoriteProjects.length === 0 ? (
        <p className="border-t border-hairline px-2 py-2 text-[10px] text-secondary">
          Star a project to pin it here.
        </p>
      ) : (
        <div
          ref={treeRef}
          role="tree"
          aria-label="Favorite projects"
          onKeyDown={handleKeyDown}
          className="min-h-0 flex-1 overflow-y-auto border-t border-hairline py-0"
        >
          {favoriteProjects.map((project) => {
            const hasSheets = project.favoriteEstimateSheets.length > 0;
            const open = openIds.has(project.id);
            const projectKey = `project:${project.id}`;
            const projectIndex = flatItems.findIndex(
              (item) => item.key === projectKey,
            );
            const isActive = projectIndex === activeIndex;

            return (
              <div
                key={project.id}
                role="treeitem"
                aria-expanded={hasSheets ? open : undefined}
                aria-selected={false}
                aria-label={project.name}
              >
                <div className="flex items-center gap-2 px-2">
                  {hasSheets ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onClick={() => toggle(project.id)}
                      className="flex size-4 shrink-0 items-center justify-center rounded-xs text-tertiary hover:bg-surface-muted hover:text-secondary"
                    >
                      {open ? (
                        <CaretDown size={11} weight="regular" />
                      ) : (
                        <CaretRight size={11} weight="regular" />
                      )}
                    </button>
                  ) : (
                    <span aria-hidden="true" className="size-4 shrink-0" />
                  )}

                  {/* The row link is the single roving focus target for this treeitem:
                      one Tab stop, arrow-reachable whether or not the project has
                      sheets; ArrowRight/Left (handled on the tree) expand/collapse. */}
                  <Link
                    href={project.href}
                    data-tree-key={projectKey}
                    tabIndex={isActive ? 0 : -1}
                    onFocus={() => projectIndex >= 0 && setActiveIndex(projectIndex)}
                    className={cn(ROW_LINK, FOCUS_RING)}
                  >
                    <Folder
                      size={13}
                      weight="regular"
                      className="shrink-0 text-tertiary"
                    />
                    <span
                      className="truncate text-[11px] text-ink"
                      title={project.name}
                    >
                      {project.name}
                    </span>
                    {project.projectCode ? (
                      <span className="shrink-0 font-numeric text-[9px] text-secondary">
                        {project.projectCode}
                      </span>
                    ) : null}
                  </Link>
                </div>

                {hasSheets && open ? (
                  <div role="group" className="pl-5">
                    {project.favoriteEstimateSheets.map((sheet) => {
                      const sheetKey = `sheet:${sheet.id}`;
                      const sheetIndex = flatItems.findIndex(
                        (item) => item.key === sheetKey,
                      );
                      const sheetActive = sheetIndex === activeIndex;

                      return (
                        <div
                          key={sheet.id}
                          role="treeitem"
                          aria-selected={false}
                          aria-label={sheet.name}
                          className="flex items-center px-2"
                        >
                          <Link
                            href={sheet.href}
                            data-tree-key={sheetKey}
                            tabIndex={sheetActive ? 0 : -1}
                            onFocus={() =>
                              sheetIndex >= 0 && setActiveIndex(sheetIndex)
                            }
                            className={cn(ROW_LINK, FOCUS_RING)}
                          >
                            <FileText
                              size={11}
                              weight="regular"
                              className="shrink-0 text-tertiary"
                            />
                            <span
                              className="truncate text-[10px] text-secondary"
                              title={sheet.name}
                            >
                              {sheet.name}
                            </span>
                            {sheet.sheetCode ? (
                              <span className="shrink-0 font-numeric text-[9px] text-secondary">
                                {sheet.sheetCode}
                              </span>
                            ) : null}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
