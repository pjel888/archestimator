import { describe, expect, it } from "vitest";

import {
  projectMiniSidebar,
  projectChartsPage,
  projectChartsClient,
  projectCostDonutChart,
  projectCostBubbleChart,
  sharedCostDonutChart,
  projectVarianceSpine,
  projectComparisonTable,
  projectDashboardClient,
  projectEstimatesClient,
  estimateSheetContent,
} from "./project-dashboard-ui-fixtures";

describe("project charts UI governance", () => {
  it("reframes the project nav from 'Charts'/pie to a cost-comparison label and icon (`13` R-7)", () => {
    // Route stays /charts for compatibility, but the chrome no longer presents it as pie decoration.
    expect(projectMiniSidebar).toContain("`/workshop/projects/${projectId}/charts`");
    expect(projectMiniSidebar).not.toContain('label: "Charts"');
    expect(projectMiniSidebar).not.toContain("ChartPieSlice");
    expect(projectMiniSidebar).toMatch(/label:\s*"(Compare|Cost comparison)"/);
    expect(projectChartsPage).toContain("getProjectChartsData");
    expect(projectChartsPage).toContain("ProjectChartsClient");
  });

  it("keeps the project charts route within the workshop fixed-shell scroll contract", () => {
    expect(projectChartsClient).toContain("data-project-charts-page");
    expect(projectChartsClient).toContain("flex h-full min-h-0 flex-col overflow-hidden bg-white");
    expect(projectChartsClient).toContain("shrink-0");
    expect(projectChartsClient).toContain("min-h-0 flex-1");
    expect(projectChartsClient).toContain("overflow-auto");
  });

  it("deletes the bubble chart and its d3-hierarchy dependency (`01` PERF-5 / `03` UX-2)", () => {
    expect(projectCostBubbleChart).toBe("");
    expect(projectChartsClient).not.toContain("ProjectCostBubbleChart");
    expect(projectChartsClient).not.toContain("d3-hierarchy");
    expect(projectVarianceSpine).not.toContain("d3-hierarchy");
    expect(projectComparisonTable).not.toContain("d3-hierarchy");
  });

  it("keeps the demoted donut dynamically imported so its d3-shape stays off the default paint", () => {
    expect(projectChartsClient).toMatch(/dynamic\(\s*\(\s*\)\s*=>/);
    expect(projectChartsClient).toContain('import("./ProjectCostDonutChart")');
    expect(projectChartsClient).toContain("module.ProjectCostDonutChart");
    expect(projectChartsClient).not.toContain('import { ProjectCostDonutChart }');
    expect(sharedCostDonutChart).toContain('from "d3-shape"');
    expect(projectCostDonutChart).not.toContain('from "d3"');
  });

  it("keeps D3 out of the non-chart workshop surfaces", () => {
    expect(projectDashboardClient).not.toContain('from "d3"');
    expect(projectEstimatesClient).not.toContain('from "d3"');
    expect(estimateSheetContent).not.toContain('from "d3"');
  });
});
