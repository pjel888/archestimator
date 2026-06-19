import { Suspense } from "react";

import { ProjectsListSkeleton } from "@/components/workshop/ProjectsListSkeleton";
import { ProjectsPageClient } from "@/components/workshop/projects-page-client";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { ensureDefaultWorkspace, listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

// The data fetch lives in its own async component inside a Suspense boundary so the shell
// chrome (sidebar, header, tabs region) flushes to the browser immediately and the project
// grid streams in once the DB waves resolve — instead of the whole document blocking on the
// fetch. The fallback reuses the exact `loading.tsx` skeleton, so there is no double-flash.
async function ProjectsData() {
  const { projects, favoriteProjectIds, projectGroups } = await listCurrentWorkspaceProjects();
  // Source the favorites scope identically to WorkshopPageShell (D2): the server +
  // client must build the same sidebar query key. Both helpers are React-cached, so
  // calling them here does not duplicate the work the shell already performed.
  const currentUser = await requireCurrentUserContext();
  const { workspace } = await ensureDefaultWorkspace();
  const favoritesScope = { workspaceId: workspace.id, userId: currentUser.userId };

  return (
    <ProjectsPageClient
      projects={projects}
      favoriteProjectIds={favoriteProjectIds}
      favoritesScope={favoritesScope}
      projectGroups={projectGroups}
    />
  );
}

export default function ProjectsPage() {
  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
      contentClassName=""
    >
      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsData />
      </Suspense>
    </WorkshopPageShell>
  );
}
