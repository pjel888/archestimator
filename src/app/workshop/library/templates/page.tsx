import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getCurrentWorkspaceEstimateTemplatesSeed } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function TemplatesBrowseData() {
  const { templates, userId, workspaceId } = await withPerfTraceRequest("workshop.library.templates", () =>
    traced("library.templates.seed", () => getCurrentWorkspaceEstimateTemplatesSeed()),
  );
  return <TemplatesBrowsePageClient templates={templates} queryScope={{ userId, workspaceId }} />;
}

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  return <TemplatesBrowseData />;
}
