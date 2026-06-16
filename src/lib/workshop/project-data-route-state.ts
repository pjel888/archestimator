import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";

export type ProjectDataRouteSearchParams = {
  sheet?: string | string[];
  left?: string | string[];
  right?: string | string[];
  mode?: string | string[];
};

export type ProjectDataRouteState = {
  selectedEstimateId: string | null;
  groupingMode: ProjectChartGroupingMode;
};

export function resolveProjectDataRouteState(searchParams?: ProjectDataRouteSearchParams | null): ProjectDataRouteState {
  return {
    selectedEstimateId: readSelectedEstimateId(searchParams?.sheet, searchParams?.left),
    groupingMode: readGroupingMode(searchParams?.mode),
  };
}

function readGroupingMode(value: string | string[] | undefined): ProjectChartGroupingMode {
  const mode = readFirst(value);
  return mode === "category" || mode === "supplier" || mode === "space" ? mode : "category";
}

function readSelectedEstimateId(
  sheet: string | string[] | undefined,
  left: string | string[] | undefined,
): string | null {
  return readFirst(sheet) ?? readFirst(left) ?? null;
}

function readFirst(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}
