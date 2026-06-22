import { ProjectCursorLayer } from "@/components/workshop/ProjectCursorLayer";
import { EstimateHeaderActions } from "@/components/workshop/EstimateHeaderActions";
import { ProjectPublicationHeader } from "@/components/workshop/ProjectPublicationHeader";
import { ProjectTeamspaceHeader } from "@/components/workshop/ProjectTeamspaceHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PROJECT_HEADER_ACTION_SKELETON_CLASS } from "@/components/workshop/project-header-action-styles";
import {
  getProjectCollaborationSummary,
  getProjectPublicationSummary,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
import { traced } from "@/lib/perf/server-timing";
import type { Tables } from "@/lib/supabase/types";

type ProjectChromeAsyncProps = {
  projectId: string;
  liveProject: Tables<"projects"> | null;
};

/**
 * The publication + teamspace header chrome, fetched in its own async server
 * component so the layout shell and the route content (estimates skeleton) paint
 * immediately. Without this, the collaboration/publication/sheets fan-out blocked
 * first paint (finding F5 / P1-2). Reuses the already-resolved project so the
 * summary fns skip a redundant projects re-query (F7 / P1-3).
 */
export async function ProjectChromeAsync({ projectId, liveProject }: ProjectChromeAsyncProps) {
  const [collaborationSummary, publicationSummary, projectEstimateSheets] = liveProject
    ? await traced("ProjectChromeAsync.summaries", async () =>
        Promise.all([
          // The summaries reuse the request-cached getCurrentWorkspaceProject /
          // project_members internally (no redundant projects re-query, F7).
          getProjectCollaborationSummary(projectId),
          getProjectPublicationSummary(projectId),
          listProjectEstimateSheets(projectId),
        ]),
      )
    : [null, null, []];

  const currentCollaborator = collaborationSummary?.collaborators.find(
    (collaborator) => collaborator.id === collaborationSummary.currentUserId,
  );
  const currentUserEmail = currentCollaborator?.email ?? null;

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
      <ProjectPublicationHeader
        summary={publicationSummary}
        currentUserEmail={currentUserEmail}
        projectEstimateSheets={projectEstimateSheets}
      />
      <ProjectTeamspaceHeader summary={collaborationSummary} />
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
      <ProjectCursorLayer
        projectId={projectId}
        userId={collaborationSummary?.currentUserId ?? null}
        displayName={currentCollaborator?.displayName ?? null}
      />
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
      {/* Four size-8 placeholders approximate the resolved cluster — Share,
          Teamspace, and (on the estimate route) the relocated Activity + Preview
          Excel Export buttons (Req 1) — so the streamed swap minimizes layout
          shift (CLS). Off-route the two action buttons resolve to nothing, a
          minor over-estimate that errs toward stability. */}
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
      <Skeleton className={PROJECT_HEADER_ACTION_SKELETON_CLASS} />
    </div>
  );
}
