import { TemplatesPageClient } from "@/components/workshop/TemplatesPageClient";
import { getCurrentWorkspaceEstimateTemplates } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  const templates = await getCurrentWorkspaceEstimateTemplates();

  return (
    <div className="h-full min-h-0 overflow-hidden p-2">
      <TemplatesPageClient templates={templates} />
    </div>
  );
}
