import { ProjectsPageClient } from "@/components/workshop/projects-page-client";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { ensureDefaultWorkspace, listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

export default async function ProjectsPage() {
  const { projects, favoriteProjectIds, projectGroups } = await listCurrentWorkspaceProjects();
  // Source the favorites scope identically to WorkshopPageShell (D2): the server +
  // client must build the same sidebar query key. Both helpers are React-cached, so
  // calling them here does not duplicate the work the shell already performed.
  const currentUser = await requireCurrentUserContext();
  const { workspace } = await ensureDefaultWorkspace();
  const favoritesScope = { workspaceId: workspace.id, userId: currentUser.userId };

  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
      contentClassName=""
    >
      <ProjectsPageClient
        projects={projects}
        favoriteProjectIds={favoriteProjectIds}
        favoritesScope={favoritesScope}
        projectGroups={projectGroups}
      />
    </WorkshopPageShell>
  );
}
