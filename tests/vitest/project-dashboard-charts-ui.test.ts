import { describe, expect, it } from "vitest";

import {
  projectMiniSidebar,
  projectChartsPage,
  projectDataLoading,
  projectDataClient,
  projectDataComparisonBoard,
  projectDataInsightHeader,
  projectDataCostBreakdown,
  projectDataCostLedger,
  projectDataCostAcrossSheets,
  sharedCostDonutChart,
  projectDashboardClient,
  projectEstimatesClient,
  estimateSheetContent,
} from "./project-dashboard-ui-fixtures";

describe("project charts UI governance", () => {
  it("reframes the project nav from 'Charts'/pie to a Data label and icon (`13` R-7)", () => {
    expect(projectMiniSidebar).toContain("`/workshop/projects/${projectId}/data`");
    expect(projectMiniSidebar).not.toContain('label: "Charts"');
    expect(projectMiniSidebar).not.toContain("ChartPieSlice");
    expect(projectMiniSidebar).toContain('label: "Data"');
    expect(projectChartsPage).toContain("getProjectDataRouteSummary");
    expect(projectChartsPage).toContain("ProjectDataClient");
    expect(projectChartsPage).not.toContain("ProjectChartsClient");
  });

  it("keeps the project data route within the workshop fixed-shell scroll contract", () => {
    expect(projectDataClient).toContain("data-project-data-page");
    expect(projectDataClient).toContain("dashboard-canvas-wash flex h-full min-h-0 flex-col overflow-hidden bg-transparent");
    expect(projectDataClient).toContain('data-project-data-grid="comparison-board"');
    expect(projectDataClient).toContain("min-h-0 flex-1");
    expect(projectDataClient).toContain("overflow-hidden");
  });

  it("uses a comparison-first data board, not detached analysis panels", () => {
    expect(projectDataClient).toContain("CostComparisonBoard");
    expect(projectDataClient).not.toContain("ProjectDataInsightHeader");
    expect(projectDataClient).not.toContain("CostCompositionSection");
    expect(projectDataClient).not.toContain("CostAcrossSheetsSection");
    expect(projectDataComparisonBoard).toContain("Cost comparison");
    expect(projectDataComparisonBoard).toContain("Baseline estimate sheet");
    expect(projectDataComparisonBoard).toContain("Add sheet to compare");
    expect(projectDataComparisonBoard).toContain("project-data-cost-comparison-table");
    expect(projectDataComparisonBoard).toContain("buildProjectChartComparisonView");
    expect(projectDataComparisonBoard).toContain("buildInsightSentence");
    expect(projectDataInsightHeader).toContain("Estimate sheet");
    expect(projectDataCostBreakdown).toContain("CostLedger");
    expect(projectDataCostLedger).toContain("hidden w-full px-2 py-1.5 font-medium sm:table-cell");
    expect(projectDataCostAcrossSheets).toContain("Cost across sheets");
    expect(projectDataClient).not.toContain("ProjectVarianceSpine");
  });

  it("uses a project data comparison skeleton", () => {
    expect(projectDataLoading).toContain("data-project-data-loading");
    expect(projectDataLoading).toContain("Loading project data");
    expect(projectDataLoading).toContain('data-project-data-grid="comparison-board"');
    expect(projectDataLoading).toContain("project-data-grid__board");
    expect(projectDataLoading).not.toContain("data-project-charts-loading");
    expect(projectDataLoading).not.toContain("variance");
  });

  it("keeps d3-shape isolated in the shared donut implementation", () => {
    expect(projectDataClient).not.toContain('from "d3');
    expect(projectDataComparisonBoard).not.toContain('from "d3');
    expect(projectDataCostBreakdown).not.toContain('from "d3');
    expect(projectDataCostAcrossSheets).not.toContain('from "d3');
    expect(sharedCostDonutChart).toContain('from "d3-shape"');
  });

  it("keeps D3 out of the non-chart workshop surfaces", () => {
    expect(projectDashboardClient).not.toContain('from "d3"');
    expect(projectEstimatesClient).not.toContain('from "d3"');
    expect(estimateSheetContent).not.toContain('from "d3"');
  });
});
