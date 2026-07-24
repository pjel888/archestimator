import { Suspense } from "react";

import { ProjectsListSkeleton } from "@/components/workshop/ProjectsListSkeleton";
import { ProjectsPageClient } from "@/components/workshop/projects-page-client";
import { WorkshopCanvasWash } from "@/components/workshop/WorkshopCanvasWash";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { parseProjectStartIntent } from "@/lib/projects/project-start-intent";
import { ensureDefaultWorkspace, listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

type ProjectsPageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

// The data fetch lives in its own async component inside a Suspense boundary so the shell
// chrome (sidebar, header, tabs region) flushes to the browser immediately and the project
// grid streams in once the DB waves resolve — instead of the whole document blocking on the
// fetch. The fallback reuses the exact `loading.tsx` skeleton, so there is no double-flash.
async function ProjectsData({
  searchParams,
}: {
  searchParams: ProjectsPageSearchParams;
}) {
  return withPerfTraceRequest("workshop.projects.data", async () => {
    // Source the favorites scope identically to WorkshopShell (D2): the server +
    // client must build the same sidebar query key. Both helpers are React-cached, so
    // calling them here does not duplicate the work the shell already performed.
    const [params, { projects, favoriteProjectIds, projectGroups, workspaceRole }, currentUser, { workspace }] = await Promise.all([
      searchParams,
      traced("projects.route.list", () => listCurrentWorkspaceProjects()),
      requireCurrentUserContext(),
      ensureDefaultWorkspace(),
    ]);
    const favoritesScope = { workspaceId: workspace.id, userId: currentUser.userId };
    const ownedProjects = projects.filter((item) => item.accessKind === "owned");
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
    const googleMapsMapId = process.env.GOOGLE_MAPS_MAP_ID ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? null;

    return (
      <ProjectsPageClient
        projects={ownedProjects}
        favoriteProjectIds={favoriteProjectIds}
        favoritesScope={favoritesScope}
        projectGroups={projectGroups}
        workspaceRole={workspaceRole}
        initialProjectStartIntent={parseProjectStartIntent(params.start)}
        googleMapsApiKey={googleMapsApiKey}
        googleMapsMapId={googleMapsMapId}
      />
    );
  });
}

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: ProjectsPageSearchParams;
}) {
  return (
    <WorkshopRouteHeader
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
      contentClassName=""
    >
      <WorkshopCanvasWash className="projects-canvas-wash" />

      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsData searchParams={searchParams} />
      </Suspense>
    </WorkshopRouteHeader>
  );
}
