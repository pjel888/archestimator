"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, FilePlus, FolderPlus, Package } from "@phosphor-icons/react/dist/ssr";

import { ButtonLink } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { NewProjectModal } from "@/components/workshop/NewProjectModal";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { createEstimateSheetDraft } from "@/lib/estimates/actions";
import { buildEstimateSheetHref } from "@/lib/workshop/compare-href";
import { cn } from "@/lib/ui/cn";

import { ContinueCard } from "./ContinueCard";
import { projectEstimatesHref, type WorkshopEstimateSummary, type WorkshopProjectSummary } from "./lib";

type LibraryHubCardProps = {
  href: string;
  count?: number;
  continueEstimate?: WorkshopEstimateSummary | null;
  recentProjects?: WorkshopProjectSummary[];
  className?: string;
};

type LibraryCardLinkProps = {
  href: string;
  className?: string;
};

const EMPTY_RECENT_PROJECTS: WorkshopProjectSummary[] = [];

export function LibraryCardLink({ href, className }: LibraryCardLinkProps) {
  return (
    <div
      aria-label="Library"
      className={cn(
        "dashboard-destination-card iband-library-card dashboard-destination-card--library dashboard-card-hover group relative block h-full min-h-[118px] w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      <ButtonLink
        href={href}
        variant="plain"
        size="icon-xs"
        aria-label="Open Library"
        className="dashboard-project-card-arrow absolute right-2 top-2 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        <ArrowUpRight
          size={32}
          weight="regular"
          aria-hidden="true"
          className="dashboard-destination-card-icon transition-colors duration-[200ms] ease-out motion-reduce:transition-none"
        />
      </ButtonLink>

      <span className="absolute left-2 top-2 z-10">
        <span className="dashboard-destination-card-index font-numeric text-[22px] font-thin leading-none">04</span>
      </span>

      <span className="absolute bottom-2 right-2 z-10 max-w-[calc(100%-16px)] text-right">
        <span className="dashboard-destination-card-title font-display text-[32px] font-normal leading-none tracking-[0.04em] uppercase">
          Library
        </span>
      </span>
    </div>
  );
}

/**
 * The Library hub — same destination footprint as the other tiles, with the
 * same transparent glass treatment applied to the primary link and quick actions.
 */
export function LibraryHubCard({
  href,
  continueEstimate,
  recentProjects = EMPTY_RECENT_PROJECTS,
  className,
}: LibraryHubCardProps) {
  const router = useNavigationRouter();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [estimatePending, startEstimateTransition] = useTransition();
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const estimateTargetProject = recentProjects[0] ?? null;
  const clientOptions = useMemo(
    () => recentProjects.map((project) => project.client_name ?? ""),
    [recentProjects],
  );

  function createEstimateForLatestProject() {
    if (!estimateTargetProject || estimatePending) return;

    setEstimateError(null);
    startEstimateTransition(() => {
      void createEstimateSheetDraft(estimateTargetProject.id)
        .then((result) => router.push(buildEstimateSheetHref(estimateTargetProject.id, result.estimateId, result.firstNodeId)))
        .catch((error: unknown) => {
          setEstimateError(error instanceof Error ? error.message : "Could not create estimate sheet.");
          router.push(projectEstimatesHref(estimateTargetProject.id));
        });
    });
  }

  return (
    <>
      <div className={cn("dashboard-destination-card--library relative h-full min-h-0 w-full", className)}>
        {continueEstimate ? (
          <span className="iband-library-continue-slot">
            <ContinueCard estimate={continueEstimate} bare />
          </span>
        ) : (
          <LibraryCardLink href={href} />
        )}
        <span className="iband-library-stack">
          <Tooltip label="New project" side="right" className="h-full w-full">
            <IconButton
              type="button"
              variant="plain"
              size="icon-xs"
              className="dashboard-destination-card dashboard-card-hover iband-library-new-project"
              label="New project"
              title={undefined}
              onClick={() => setNewProjectOpen(true)}
              icon={<FolderPlus size={16} weight="regular" aria-hidden="true" />}
            />
          </Tooltip>
          <span className="iband-library-action-grid">
            <Tooltip label="New component" side="right" className="h-full w-full">
              <ButtonLink
                href="/workshop/library/components?add=component"
                variant="plain"
                size="icon-xs"
                className="dashboard-destination-card dashboard-card-hover iband-library-new-component"
                aria-label="New component"
              >
                <Package size={16} weight="regular" aria-hidden="true" />
              </ButtonLink>
            </Tooltip>
            <Tooltip
              label={estimateTargetProject ? "New estimate sheet" : "Create a project first"}
              side="right"
              className="h-full w-full"
            >
              <IconButton
                type="button"
                variant="plain"
                size="icon-xs"
                className="dashboard-destination-card dashboard-card-hover iband-library-new-sheet"
                disabled={!estimateTargetProject || estimatePending}
                label={
                  estimateTargetProject
                    ? estimatePending
                      ? `Creating estimate sheet in ${estimateTargetProject.name}`
                      : `New estimate sheet in ${estimateTargetProject.name}`
                    : "New estimate sheet unavailable until a project exists"
                }
                title={undefined}
                onClick={createEstimateForLatestProject}
                icon={<FilePlus size={16} weight="regular" aria-hidden="true" />}
              />
            </Tooltip>
          </span>
        </span>
      </div>
      {newProjectOpen ? <NewProjectModal onClose={() => setNewProjectOpen(false)} clientOptions={clientOptions} /> : null}
      {estimateError ? <p className="sr-only" role="status">{estimateError}</p> : null}
    </>
  );
}
