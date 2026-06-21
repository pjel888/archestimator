import { notFound } from "next/navigation";

import { ProjectDataClient } from "@/components/workshop/project-data/ProjectDataClient";
import { getProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import { resolveProjectDataRouteState } from "@/lib/workshop/project-data-route-state";

type ProjectDataPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{
    sheet?: string;
    compare?: string;
    left?: string;
    right?: string;
    mode?: string;
  }>;
};

export default async function ProjectDataPage({ params, searchParams }: ProjectDataPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  assertRouteErrorSmoke({ routeLabel: "Project data", searchParams: resolvedSearchParams });
  const routeState = resolveProjectDataRouteState(resolvedSearchParams);

  const summary = await getProjectDataRouteSummary(projectId, {
    selectedEstimateId: routeState.selectedEstimateId,
    compareEstimateIds: routeState.compareEstimateIds,
    groupingMode: routeState.groupingMode,
  });

  if (!summary) {
    notFound();
  }

  return <ProjectDataClient summary={summary} />;
}
