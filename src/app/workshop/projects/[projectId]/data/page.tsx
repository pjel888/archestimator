import { notFound } from "next/navigation";

import { ProjectChartsClient } from "@/components/workshop/project-charts/ProjectChartsClient";
import { getProjectChartDefaultPair } from "@/lib/project-charts/aggregate-project-charts";
import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";
import { getProjectChartsData } from "@/lib/repositories/project-charts-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type ProjectDataPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{
    left?: string;
    right?: string;
    mode?: string;
  }>;
};

export default async function ProjectDataPage({ params, searchParams }: ProjectDataPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  assertRouteErrorSmoke({ routeLabel: "Project data", searchParams: resolvedSearchParams });

  const selectedEstimateIds = [resolvedSearchParams?.left, resolvedSearchParams?.right].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const data = await getProjectChartsData(projectId, { selectedEstimateIds });

  if (!data) {
    notFound();
  }

  const defaultPair = getProjectChartDefaultPair(data.estimateOptions);

  return (
    <ProjectChartsClient
      data={data}
      initialGroupingMode={readGroupingMode(resolvedSearchParams?.mode)}
      initialLeftEstimateId={resolvedSearchParams?.left ?? defaultPair.leftEstimateId}
      initialRightEstimateId={resolvedSearchParams?.right ?? defaultPair.rightEstimateId}
    />
  );
}

function readGroupingMode(value: string | undefined): ProjectChartGroupingMode {
  return value === "category" || value === "supplier" || value === "space" ? value : "space";
}
