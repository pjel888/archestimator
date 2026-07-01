import Link from "next/link";
import { LinkSimple, UsersThree } from "@phosphor-icons/react/dist/ssr";

import { ProjectCursorLayer } from "@/components/workshop/ProjectCursorLayer";
import { EstimateHeaderActions } from "@/components/workshop/EstimateHeaderActions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROJECT_HEADER_ACTION_BUTTON_CLASS,
  PROJECT_HEADER_ACTION_DOT_CLASS,
  PROJECT_HEADER_ACTION_ICON_SIZE,
  PROJECT_HEADER_ACTION_SKELETON_CLASS,
} from "@/components/workshop/project-header-action-styles";
import {
  getCurrentWorkspaceProject,
  getProjectCollaborationSummary,
  getProjectPublicationSummary,
} from "@/lib/repositories/workspace-repository";
import { traced } from "@/lib/perf/server-timing";
import { isProjectPageCursorsEnabled } from "@/lib/collaboration/feature-flags";
import type { PublisherDrawerTabId } from "@/components/workshop/publisher/PublisherDrawer";
import type { ProjectPublicationSummary } from "@/lib/publication/types";
import type { ProjectRow } from "@/lib/types/database";

type ProjectChromeAsyncProps = {
  projectId: string;
  liveProject?: ProjectRow | null;
};

type ProjectPublisherHeaderActionsProps = {
  projectId: string;
  publicationSummary: ProjectPublicationSummary | null;
};

function getPublisherProjectHref(projectId: string, tab?: PublisherDrawerTabId) {
  const params = new URLSearchParams({ project: projectId, drawer: projectId });
  if (tab && tab !== "overview") params.set("tab", tab);
  return `/workshop/publisher?${params.toString()}`;
}

function ProjectPublisherHeaderActions({ projectId, publicationSummary }: ProjectPublisherHeaderActionsProps) {
  const publicationHref = getPublisherProjectHref(projectId);
  const accessHref = getPublisherProjectHref(projectId, "access");
  const hasPublishedLink = publicationSummary?.status === "published";
  const canOpenPublisherDrawer = Boolean(
    publicationSummary?.canManagePublication ||
    (publicationSummary?.canReadPublisherRoster && publicationSummary.status !== "unpublished"),
  );

  if (!canOpenPublisherDrawer) return null;

  return (
    <span className="contents" data-publisher-project-actions="true">
      <Link
        href={publicationHref}
        prefetch={false}
        className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
        aria-label="Open shared link in Publisher"
        title="Open shared link in Publisher"
        data-workshop-layout="project-publication-header"
        data-publisher-project-link="publication"
      >
        <LinkSimple size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
        {hasPublishedLink ? (
          <span
            aria-hidden="true"
            data-shared-link-active-dot="true"
            className={PROJECT_HEADER_ACTION_DOT_CLASS}
          />
        ) : null}
      </Link>
      <Link
        href={accessHref}
        prefetch={false}
        className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
        aria-label="Open project access in Publisher"
        title="Open project access in Publisher"
        data-workshop-layout="project-teamspace-header"
        data-publisher-project-link="access"
      >
        <UsersThree size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
      </Link>
    </span>
  );
}

/**
 * The publication + teamspace header chrome, fetched in its own async server
 * component so the layout shell and the route content (estimates skeleton) paint
 * immediately. Without this, the collaboration/publication/sheets fan-out blocked
 * first paint (finding F5 / P1-2). Reuses the already-resolved project so the
 * summary fns skip a redundant projects re-query (F7 / P1-3).
 */
export async function ProjectChromeAsync({ projectId, liveProject }: ProjectChromeAsyncProps) {
  const projectPageCursorsEnabled = isProjectPageCursorsEnabled();
  const resolvedLiveProject = liveProject === undefined
    ? await traced("ProjectChromeAsync.project", async () => {
        const { project } = await getCurrentWorkspaceProject(projectId);
        return project;
      })
    : liveProject;

  const publicationSummary = resolvedLiveProject
    ? await traced("ProjectChromeAsync.publication-summary", () => getProjectPublicationSummary(projectId))
    : null;
  const collaborationSummary = resolvedLiveProject && projectPageCursorsEnabled
    ? await traced("ProjectChromeAsync.collaboration-summary", () => getProjectCollaborationSummary(projectId))
    : null;
  const currentCollaborator = collaborationSummary?.collaborators.find(
    (collaborator) => collaborator.id === collaborationSummary.currentUserId,
  );

  // Render inside a SINGLE wrapper element that mirrors `ProjectHeaderChromeSkeleton`
  // exactly. The fallback and the resolved chrome must occupy the *same* number of
  // top-level DOM nodes in the toolbar row, otherwise the streaming Suspense swap
  // shifts the following siblings (notification bell + settings) by one slot and
  // React reports a hydration mismatch (server rendered the settings <button> where
  // the client expects the notification <div>). One wrapper = one slot, always,
  // which also isolates any per-child node-count variation (publication state,
  // cursor overlay) from the toolbar siblings.
  return (
    <div className="flex items-center gap-1">
      <ProjectPublisherHeaderActions projectId={projectId} publicationSummary={publicationSummary} />
      {/* Req 1 / D2: the estimate page's "Activity" + "Preview Excel Export"
          triggers, relocated here beside Share. A client component that renders
          nothing until an estimate page mounts and registers into the shared
          store — identical on the server, on first client render, and off the
          estimate route, so the streamed-chrome swap and hydration stay clean.
          Safe inside this single wrapper: per the comment above, child-count
          variation here does NOT shift the toolbar siblings. */}
      <EstimateHeaderActions />
      {/* Teamspace T5.3 project-wide cursors — a fixed inset-0 overlay, inert
          unless the OFF-by-default flag is on. Rendered here (not the layout) so
          it reuses the collaboration identity this streamed chrome already
          resolves, keeping the shell paint unblocked (P1-2). */}
      {projectPageCursorsEnabled ? (
        <ProjectCursorLayer
          projectId={projectId}
          userId={collaborationSummary?.currentUserId ?? null}
          displayName={currentCollaborator?.displayName ?? null}
        />
      ) : null}
    </div>
  );
}

/**
 * Suspense fallback for `ProjectChromeAsync`. MUST mirror the resolved chrome's
 * outer shape: a single `flex items-center gap-1` wrapper holding the toolbar's
 * icon buttons. Keeping the fallback and the resolved content at the same single
 * top-level node count is what prevents the streaming swap from shifting the
 * notification/settings siblings and triggering a hydration mismatch. The
 * size-8 placeholders are sized to the real toolbar buttons so the swap also
 * avoids layout shift (CLS).
 */
export function ProjectHeaderChromeSkeleton() {
  return (
    <div className="flex items-center gap-1" aria-hidden="true" data-testid="project-header-chrome-skeleton">
      {/* Four size-8 placeholders approximate the resolved cluster — Publisher
          shared-link/access actions plus, on estimate routes, the relocated
          Activity and Preview Excel Export buttons (Req 1). Off-route the two
          estimate actions resolve to nothing, an over-estimate that errs toward
          stability. */}
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
    </div>
  );
}
