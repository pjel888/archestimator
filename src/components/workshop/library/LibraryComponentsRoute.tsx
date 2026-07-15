import Link from "next/link";
import { Buildings } from "@phosphor-icons/react/dist/ssr";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import {
  LibraryComponentSourceShell,
  type LibraryComponentProjectOption,
  type LibraryComponentSource,
} from "@/components/workshop/library/LibraryComponentSourceShell";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { getProjectOnlyComponentRowsLibraryPage } from "@/lib/component-library/project-component-projection";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getCurrentWorkspaceComponentRowsLibraryPage } from "@/lib/repositories/component-library-repository";
import { ensureDefaultWorkspace, listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

type LibraryComponentsSearchParams = Record<string, string | string[] | undefined>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readComponentSource(searchParams?: LibraryComponentsSearchParams): LibraryComponentSource {
  return firstSearchParam(searchParams?.source) === "project" ? "project" : "library";
}

async function getCurrentWorkspaceLibraryManagementCapability() {
  const [currentUser, { workspace }, database] = await Promise.all([
    requireCurrentUserContext(),
    ensureDefaultWorkspace(),
    getCloudflareD1Database(),
  ]);
  if (!database) return false;
  return isWorkspaceEditorInD1(database, workspace.id, currentUser);
}

/**
 * Shared server content for the Components tab. Rendered by both the
 * library index route (until the Overview home ships) and the
 * /workshop/library/components sub-route.
 */
export async function LibraryComponentsRoute({
  searchParams,
}: {
  searchParams?: LibraryComponentsSearchParams;
} = {}) {
  const activeSource = readComponentSource(searchParams);

  if (activeSource === "project") {
    const result = await withPerfTraceRequest("workshop.library.project-components", async () => {
      const [{ projects }, canManageLibrary] = await Promise.all([
        traced("library.project-components.projects", () => listCurrentWorkspaceProjects()),
        traced("library.project-components.canManage", getCurrentWorkspaceLibraryManagementCapability),
      ]);
      const accessibleProjects = projects.filter((project) =>
        project.accessKind === "owned" || project.accessKind === "project-member",
      );
      const requestedProjectId = firstSearchParam(searchParams?.projectId);
      const selectedProject = accessibleProjects.find((project) => project.project.id === requestedProjectId)
        ?? accessibleProjects[0]
        ?? null;
      const projectLibrary = selectedProject
        ? await traced("library.project-components.rows", () =>
            getProjectOnlyComponentRowsLibraryPage(selectedProject.project.id),
          )
        : null;

      return {
        promotionEnabled: canManageLibrary && isExpressComponentPromotionEnabled(),
        projects: accessibleProjects,
        selectedProject,
        projectLibrary,
      };
    });

    const projectOptions: LibraryComponentProjectOption[] = result.projects.map((project) => ({
      id: project.project.id,
      label: project.project.name || "Untitled project",
    }));
    const selectedProjectId = result.selectedProject?.project.id ?? null;
    const selectedProjectName = result.selectedProject?.project.name || "Project";

    return (
      <LibraryComponentSourceShell
        activeSource="project"
        activeProjectId={selectedProjectId}
        projects={projectOptions}
      >
        {selectedProjectId && result.projectLibrary && result.projectLibrary.libraryItems.length > 0 ? (
          <LibraryPageClient
            initialLibrary={result.projectLibrary}
            projectId={selectedProjectId}
            projectOnly
            promotionEnabled={result.promotionEnabled}
            canManageLibrary={false}
          />
        ) : (
          <ProjectComponentsEmptyState
            projectId={selectedProjectId}
            projectName={selectedProjectName}
          />
        )}
      </LibraryComponentSourceShell>
    );
  }

  // The server fetch seeds the client TanStack Query cache via initialData. This
  // route renders the browse/table surfaces first, so it skips the unbounded
  // audit/attachment graph and hydrates a selected row on demand in the inspector.
  const [componentLibrary, canManageLibrary] = await withPerfTraceRequest("workshop.library.components", () =>
    Promise.all([
      traced("library.components.rows", () =>
        getCurrentWorkspaceComponentRowsLibraryPage(),
      ),
      traced("library.components.canManage", getCurrentWorkspaceLibraryManagementCapability),
    ]),
  );

  return (
    <LibraryComponentSourceShell activeSource="library">
      <LibraryPageClient initialLibrary={componentLibrary} canManageLibrary={canManageLibrary} />
    </LibraryComponentSourceShell>
  );
}

function ProjectComponentsEmptyState({
  projectId,
  projectName,
}: {
  projectId: string | null;
  projectName: string;
}) {
  return (
    <div className="grid h-full min-h-[320px] place-items-center p-4">
      <section className="grid max-w-md justify-items-center gap-2 rounded-xs border border-dashed border-hairline bg-white/45 p-6 text-center">
        <Buildings size={28} weight="regular" className="text-tertiary" aria-hidden="true" />
        <h2 className="text-[13px] font-medium leading-5 text-ink">
          {projectId ? `No project components in ${projectName}` : "Choose a project source"}
        </h2>
        <p className="text-[10px] leading-4 text-secondary">
          {projectId
            ? "Express and detached estimate components appear here automatically so they can be reviewed and promoted to the shared library."
            : "Create or join a project to browse its estimate-specific components from this catalogue."}
        </p>
        <Link
          href={projectId ? `/workshop/projects/${projectId}` : "/workshop/projects"}
          className="mt-1 inline-flex h-7 items-center rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-secondary transition hover:border-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {projectId ? "Open project" : "View projects"}
        </Link>
      </section>
    </div>
  );
}
