import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { getProjectComponentRowsLibrary } from "@/lib/component-library/project-component-projection";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type ProjectComponentsPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectComponentsPage({ params, searchParams }: ProjectComponentsPageProps) {
  const [{ projectId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  assertRouteErrorSmoke({ routeLabel: "Project Components", searchParams: resolvedSearchParams });
  const componentLibrary = await getProjectComponentRowsLibrary(projectId);

  return <LibraryPageClient initialLibrary={componentLibrary} projectId={projectId} promotionEnabled={isExpressComponentPromotionEnabled()} />;
}
