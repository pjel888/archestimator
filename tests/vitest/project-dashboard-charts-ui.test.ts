import { describe, expect, it } from "vitest";

import {
  projectMiniSidebar,
  projectChartsPage,
  projectDataLoading,
  projectDataClient,
  projectDataCostBreakdown,
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
    expect(projectChartsPage).toContain('resolvedSearchParams?.surface === "components"');
    expect(projectChartsPage).toContain("promotionEnabled={isExpressComponentPromotionEnabled()}");
    expect(projectChartsPage).not.toContain("ProjectChartsClient");
  });

  it("keeps the project data route within the workshop fixed-shell scroll contract", () => {
    expect(projectDataClient).toContain("data-project-data-page");
    expect(projectDataClient).toContain("flex h-full min-h-0 flex-col overflow-hidden bg-white");
    expect(projectDataClient).toContain("min-h-0 flex-1");
    expect(projectDataClient).toContain("overflow-auto");
  });

  it("uses a two-section data layout, not the legacy comparison cockpit", () => {
    expect(projectDataCostBreakdown).toContain("Cost breakdown");
    expect(projectDataCostBreakdown).toContain("Estimate sheet");
    expect(projectDataCostBreakdown).toContain("Group cost by");
    expect(projectDataCostAcrossSheets).toContain("Cost across sheets");
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
