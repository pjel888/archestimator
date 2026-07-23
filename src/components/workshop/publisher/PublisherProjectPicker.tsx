"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/overlays/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import type { ProjectPublicationRosterShareOption } from "@/lib/publisher/roster-repository";
import { cn } from "@/lib/ui/cn";

type PublisherProjectPickerProps = {
  onOpenChange: (open: boolean) => void;
  onSelect: (projectId: string) => void;
  open: boolean;
  projects: ProjectPublicationRosterShareOption[];
};

const statusCopy = {
  expired: { badge: "danger", label: "Expired" },
  published: { badge: "active", label: "Live" },
  revoked: { badge: "danger", label: "Off" },
  unpublished: { badge: "draft", label: "Not shared" },
  unknown: { badge: "inactive", label: "Check status" },
} satisfies Record<ProjectPublicationRosterShareOption["status"], { badge: StatusBadgeStatus; label: string }>;

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function PublisherProjectPicker({ onOpenChange, onSelect, open, projects }: PublisherProjectPickerProps) {
  const [search, setSearch] = useState("");
  const normalizedSearch = normalizeSearchValue(search);
  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter((project) =>
      [project.name, project.projectCode, project.clientName]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch, projects]);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) setSearch("");
    onOpenChange(nextOpen);
  }

  function selectProject(projectId: string) {
    changeOpen(false);
    onSelect(projectId);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen} closeLabel="Close project picker">
      <DialogPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" data-publisher-project-picker="true">
          <DialogOverlay blur className="bg-black/25" />
          <DialogContent
            initialFocus="first"
            className="max-h-[min(36rem,calc(100dvh-2rem))] w-[min(32rem,calc(100vw-2rem))]"
          >
            <DialogHeader className="min-h-11 px-3 py-2">
              <div className="min-w-0">
                <DialogTitle className="text-[12px] font-medium leading-4">Choose a project</DialogTitle>
                <DialogDescription className="mt-0.5 text-[10px] font-normal leading-4">
                  Only projects you can manage are shown. Choose one that is ready to share.
                </DialogDescription>
              </div>
              <DialogCloseButton className="size-8" />
            </DialogHeader>

            <DialogBody className="flex min-h-0 flex-col gap-2 p-2">
              <SearchInput
                autoFocus
                aria-label="Search projects to share"
                placeholder="Search by project, code, or client"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                onClear={() => setSearch("")}
                className="!text-[10px]"
                wrapperClassName="!h-8 !min-h-8 border border-divider bg-surface"
              />

              <div className="flex min-h-0 flex-1 flex-col">
                <p className="mb-1.5 text-[9px] font-medium leading-3 text-secondary" aria-live="polite">
                  {filteredProjects.length === 1 ? "1 project" : `${filteredProjects.length} projects`}
                </p>
                <div className="min-h-0 flex-1 overflow-auto border-y border-hairline">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => {
                      const status = statusCopy[project.status];
                      const readyToShare = project.estimateCount !== 0;
                      const rowContent = (
                        <>
                          <span className="grid size-7 shrink-0 place-items-center rounded-xs bg-surfaceMuted text-secondary">
                            <FolderSimple size={14} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium leading-4 text-ink">{project.name}</span>
                            <span className="block truncate text-[9px] leading-3 text-secondary">
                              {[project.projectCode, project.clientName].filter(Boolean).join(" / ") || "No client set"}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] leading-3 text-secondary">
                              <StatusBadge status={status.badge} showDot className="min-w-0 px-1.5 py-1 !text-[10px]">
                                {status.label}
                              </StatusBadge>
                              <span>
                                {project.estimateCount === null
                                  ? "Estimates checked on open"
                                  : project.estimateCount === 1
                                    ? "1 estimate"
                                    : `${project.estimateCount} estimates`}
                              </span>
                            </span>
                          </span>
                        </>
                      );

                      return readyToShare ? (
                        <button
                          key={project.id}
                          type="button"
                          className="group flex min-h-14 w-full items-center gap-2.5 border-b border-hairline px-2.5 py-2 text-left transition-colors last:border-b-0 hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                          onClick={() => selectProject(project.id)}
                        >
                          {rowContent}
                          <ArrowRight size={16} className="shrink-0 text-secondary group-hover:text-ink" aria-hidden="true" />
                        </button>
                      ) : (
                        <Link
                          key={project.id}
                          href={`/workshop/projects/${encodeURIComponent(project.id)}/estimates`}
                          className={cn(
                            "group flex min-h-14 w-full items-center gap-2.5 border-b border-hairline px-2.5 py-2 text-left transition-colors last:border-b-0",
                            "hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                          )}
                          onClick={() => changeOpen(false)}
                        >
                          {rowContent}
                          <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-medium text-ink">
                            <Plus size={16} aria-hidden="true" /> Add estimate
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="grid min-h-40 place-items-center px-4 py-8 text-center">
                      <div>
                        <p className="text-[11px] font-medium text-ink">No matching projects</p>
                        <p className="mt-1 text-[10px] leading-4 text-secondary">Try a project name, code, or client.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DialogBody>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
