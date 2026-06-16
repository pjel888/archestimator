import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { getCurrentWorkspaceEstimateTemplatesSeed } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  const { templates, userId, workspaceId } = await getCurrentWorkspaceEstimateTemplatesSeed();

  return <TemplatesBrowsePageClient templates={templates} queryScope={{ userId, workspaceId }} />;
}
