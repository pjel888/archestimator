import type {
  ProjectChartEstimateSeries,
  ProjectChartGroupingMode,
} from "@/lib/project-charts/types";
import { getProjectChartsData } from "@/lib/repositories/project-charts-repository";
import { getProjectEstimateHealthData, type ProjectEstimateHealthData } from "@/lib/repositories/estimate-health-repository";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";
import type { EstimateRow, ProjectRow } from "@/lib/types/database";

export type ProjectDataEstimateSheet = {
  id: string;
  name: string;
  sheetCode: string | null;
  currencyCode: string;
  updatedAt: string | null;
  rowCount: number;
  totalCost: number;
};

export type ProjectDataRollup =
  | { kind: "single"; currencyCode: string; totalCost: number }
  | { kind: "mixed"; currencyCodes: string[] };

export type ProjectDataRouteSummary = {
  projectId: string;
  projectName: string;
  estimateSheets: ProjectDataEstimateSheet[];
  selectedEstimateId: string | null;
  compareEstimateIds: string[];
  selectedGroupingMode: ProjectChartGroupingMode;
  rollup: ProjectDataRollup;
  seriesByEstimateId: Record<string, ProjectChartEstimateSeries>;
  costAcrossSheetsMode: "stacked" | "totals-only";
  didTruncate: boolean;
  rowLimit: number;
  estimateHealth: ProjectEstimateHealthData | null;
};

export type GetProjectDataRouteSummaryOptions = {
  selectedEstimateId?: string | null;
  compareEstimateIds?: string[] | null;
  groupingMode?: ProjectChartGroupingMode;
};

export async function getProjectDataRouteSummary(
  projectId: string,
  options: GetProjectDataRouteSummaryOptions = {},
): Promise<ProjectDataRouteSummary | null> {
  const estimatesResult = await listProjectEstimates(projectId);
  const { project, estimates, rowCountByEstimateId, totalCostByEstimateId } = estimatesResult;
  if (!project) return null;

  const estimateSheets = estimates.map((estimate) =>
    toProjectDataEstimateSheet(project, estimate, {
      rowCount: rowCountByEstimateId.get(estimate.id) ?? 0,
      totalCost: totalCostByEstimateId.get(estimate.id) ?? 0,
    }),
  );
  const allowedEstimateIds = new Set(estimateSheets.map((estimate) => estimate.id));
  const selectedEstimateId =
    options.selectedEstimateId && allowedEstimateIds.has(options.selectedEstimateId)
      ? options.selectedEstimateId
      : estimateSheets[0]?.id ?? null;
  const compareEstimateIds = resolveCompareEstimateIds(
    estimateSheets,
    selectedEstimateId,
    options.compareEstimateIds ?? null,
  );
  const chartEstimateIds = selectedEstimateId ? [selectedEstimateId, ...compareEstimateIds] : [];

  const chartsData = await getProjectChartsData(project.id, {
    selectedEstimateIds: chartEstimateIds,
  });
  const estimateHealth = await getProjectEstimateHealthData(project.id, {
    selectedEstimateIds: chartEstimateIds,
  });

  return {
    projectId: project.id,
    projectName: project.name,
    estimateSheets,
    selectedEstimateId,
    compareEstimateIds,
    selectedGroupingMode: options.groupingMode ?? "category",
    rollup: computeProjectDataRollup(estimateSheets),
    seriesByEstimateId: chartsData?.seriesByEstimateId ?? {},
    costAcrossSheetsMode: estimateSheets.length > 20 ? "totals-only" : "stacked",
    didTruncate: Boolean(chartsData?.didTruncate),
    rowLimit: chartsData?.rowLimit ?? 5000,
    estimateHealth,
  };
}

function resolveCompareEstimateIds(
  estimateSheets: ProjectDataEstimateSheet[],
  selectedEstimateId: string | null,
  requestedCompareIds: string[] | null,
): string[] {
  if (!selectedEstimateId) return [];
  const allowedIds = new Set(estimateSheets.map((estimate) => estimate.id));
  const sourceIds =
    requestedCompareIds === null
      ? estimateSheets.flatMap((estimate) => (estimate.id === selectedEstimateId ? [] : [estimate.id])).slice(0, 1)
      : requestedCompareIds;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of sourceIds) {
    if (id === selectedEstimateId || !allowedIds.has(id) || seen.has(id)) continue;
    out.push(id);
    seen.add(id);
    if (out.length === 2) break;
  }
  return out;
}

function toProjectDataEstimateSheet(
  project: ProjectRow,
  estimate: EstimateRow,
  summary: { rowCount: number; totalCost: number },
): ProjectDataEstimateSheet {
  return {
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code,
    currencyCode: estimate.currency_code ?? project.currency_code ?? "PHP",
    updatedAt: estimate.updated_at,
    rowCount: summary.rowCount,
    totalCost: summary.totalCost,
  };
}

function computeProjectDataRollup(estimateSheets: ProjectDataEstimateSheet[]): ProjectDataRollup {
  const currencyCodes = [...new Set(estimateSheets.map((estimate) => estimate.currencyCode || "PHP"))].sort();
  if (currencyCodes.length > 1) return { kind: "mixed", currencyCodes };
  const currencyCode = currencyCodes[0] ?? "PHP";
  return {
    kind: "single",
    currencyCode,
    totalCost: estimateSheets.reduce((sum, estimate) => sum + estimate.totalCost, 0),
  };
}
