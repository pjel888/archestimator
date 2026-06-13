import { ProjectPublicationHeader } from "@/components/workshop/ProjectPublicationHeader";
import { ProjectTeamspaceHeader } from "@/components/workshop/ProjectTeamspaceHeader";
import { Skeleton } from "@/components/ui/skeleton";
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
          getProjectCollaborationSummary(projectId, liveProject),
          getProjectPublicationSummary(projectId, liveProject),
          listProjectEstimateSheets(projectId),
        ]),
      )
    : [null, null, []];

  const currentCollaborator = collaborationSummary?.collaborators.find(
    (collaborator) => collaborator.id === collaborationSummary.currentUserId,
  );
  const currentUserEmail = currentCollaborator?.email ?? null;

  return (
    <>
      <ProjectPublicationHeader
        summary={publicationSummary}
        currentUserEmail={currentUserEmail}
        projectEstimateSheets={projectEstimateSheets}
      />
      <ProjectTeamspaceHeader summary={collaborationSummary} />
    </>
  );
}

/**
 * Suspense fallback sized to roughly match the settled header chrome so streaming
 * it in does not shift the toolbar (CLS).
 */
export function ProjectHeaderChromeSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true" data-testid="project-header-chrome-skeleton">
      <Skeleton className="h-7 w-24 rounded-sm" />
      <Skeleton className="h-7 w-7 rounded-full" />
    </div>
  );
}
