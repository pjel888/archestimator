import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { getCurrentWorkspaceEstimateTemplates } from "@/lib/repositories/component-library-repository";
import { listReusableProjectSources } from "@/lib/reusable-sources/actions";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  const [templates, projectSources] = await Promise.all([
    getCurrentWorkspaceEstimateTemplates(),
    listReusableProjectSources(),
  ]);

  return <TemplatesBrowsePageClient templates={templates} projectSources={projectSources.sources} />;
}
