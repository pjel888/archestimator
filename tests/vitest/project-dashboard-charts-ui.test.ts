import { describe, expect, it } from "vitest";

import {
  projectMiniSidebar,
  projectChartsPage,
  projectDataLoading,
  projectDataClient,
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
    expect(projectDataClient).toContain('data-project-data-grid="16x12"');
    expect(projectDataClient).toContain("min-h-0 flex-1");
    expect(projectDataClient).toContain("overflow-auto");
  });

  it("uses an insight-led data layout, not the legacy comparison cockpit", () => {
    expect(projectDataClient).toContain("ProjectDataInsightHeader");
    expect(projectDataInsightHeader).toContain("Cost data");
    expect(projectDataInsightHeader).toContain("Estimate sheet");
    expect(projectDataInsightHeader).toContain("Group cost by");
    expect(projectDataCostBreakdown).toContain("Cost breakdown");
    expect(projectDataCostBreakdown).toContain("CostLedger");
    expect(projectDataCostBreakdown).toContain("hideCallouts");
    expect(projectDataCostLedger).toContain("hidden w-full px-2 py-1.5 font-medium sm:table-cell");
    expect(projectDataClient).toContain("CostCompositionSection");
    expect(projectDataCostAcrossSheets).toContain("Cost across sheets");
    expect(projectDataCostAcrossSheets).toContain("Data table");
    expect(projectDataCostAcrossSheets).not.toContain("Show full table");
    expect(projectDataClient).not.toContain("Baseline estimate");
    expect(projectDataClient).not.toContain("ProjectVarianceSpine");
  });

  it("uses the project data loading skeleton instead of a comparison skeleton", () => {
    expect(projectDataLoading).toContain("data-project-data-loading");
    expect(projectDataLoading).toContain("Loading project data");
    expect(projectDataLoading).not.toContain("data-project-charts-loading");
    expect(projectDataLoading).not.toContain("cost-comparison");
    expect(projectDataLoading).not.toContain("variance");
  });

  it("keeps d3-shape isolated in the shared donut implementation", () => {
    expect(projectDataClient).not.toContain('from "d3');
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
