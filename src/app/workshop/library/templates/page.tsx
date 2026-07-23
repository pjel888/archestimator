import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { assertBetaFeaturePathAllowed } from "@/lib/feature-gates/enforce";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import {
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplatesSeed,
  SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
} from "@/lib/repositories/component-library-repository";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getCurrentWorkspaceLibraryManagementCapability() {
  const [currentUser, { workspace }, database] = await Promise.all([
    requireCurrentUserContext(),
    ensureDefaultWorkspace(),
    getCloudflareD1Database(),
  ]);
  if (!database) return false;
  return isWorkspaceEditorInD1(database, workspace.id, currentUser);
}

async function TemplatesBrowseData() {
  const [templateSeed, componentLibrary, canManageLibrary] = await withPerfTraceRequest("workshop.library.templates", () =>
    Promise.all([
      traced("library.templates.seed", () => getCurrentWorkspaceEstimateTemplatesSeed()),
      traced("library.templates.components", () => getCurrentWorkspaceComponentRowsLibrary({
        includeDetailGraph: false,
        itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
      })),
      traced("library.templates.canManage", getCurrentWorkspaceLibraryManagementCapability),
    ]),
  );
  return (
    <TemplatesBrowsePageClient
      templateSeed={templateSeed}
      componentLibrary={componentLibrary}
      queryScope={{ userId: templateSeed.userId, workspaceId: templateSeed.workspaceId }}
      canManageLibrary={canManageLibrary}
    />
  );
}

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  await assertBetaFeaturePathAllowed("/workshop/library/templates");
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  return <TemplatesBrowseData />;
}
