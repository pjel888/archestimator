import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import {
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplatesSeed,
  SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
} from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function TemplatesBrowseData() {
  const [templateSeed, componentLibrary] = await withPerfTraceRequest("workshop.library.templates", () =>
    Promise.all([
      traced("library.templates.seed", () => getCurrentWorkspaceEstimateTemplatesSeed()),
      traced("library.templates.components", () => getCurrentWorkspaceComponentRowsLibrary({
        includeDetailGraph: false,
        itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
      })),
    ]),
  );
  return (
    <TemplatesBrowsePageClient
      templateSeed={templateSeed}
      componentLibrary={componentLibrary}
      queryScope={{ userId: templateSeed.userId, workspaceId: templateSeed.workspaceId }}
    />
  );
}

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  return <TemplatesBrowseData />;
}
