import { notFound } from "next/navigation";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { ProjectDataClient } from "@/components/workshop/project-data/ProjectDataClient";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { getProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import { resolveProjectDataRouteState } from "@/lib/workshop/project-data-route-state";

type ProjectDataPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{
    sheet?: string;
    left?: string;
    right?: string;
    mode?: string;
    surface?: string;
  }>;
};

export default async function ProjectDataPage({ params, searchParams }: ProjectDataPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  assertRouteErrorSmoke({ routeLabel: "Project data", searchParams: resolvedSearchParams });

  if (resolvedSearchParams?.surface === "components") {
    return (
      <LibraryPageClient
        projectId={projectId}
        promotionEnabled={isExpressComponentPromotionEnabled()}
      />
    );
  }

  const routeState = resolveProjectDataRouteState(resolvedSearchParams);

  const summary = await getProjectDataRouteSummary(projectId, {
    selectedEstimateId: routeState.selectedEstimateId,
    groupingMode: routeState.groupingMode,
  });

  if (!summary) {
    notFound();
  }

  return <ProjectDataClient summary={summary} />;
}
