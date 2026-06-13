import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { getCurrentWorkspaceEstimateTemplates } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  const templates = await getCurrentWorkspaceEstimateTemplates();

  return <TemplatesBrowsePageClient templates={templates} />;
}
