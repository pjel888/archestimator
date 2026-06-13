import { describe, expect, it } from "vitest";

import {
  projectMiniSidebar,
  projectChartsPage,
  projectChartsClient,
  projectCostDonutChart,
  projectCostBubbleChart,
  sharedCostDonutChart,
  projectDashboardClient,
  projectEstimatesClient,
  estimateSheetContent,
} from "./project-dashboard-ui-fixtures";

describe("project dashboard charts UI governance", () => {
  it("adds project charts as a first-class project section without hiding project navigation", () => {
    expect(projectMiniSidebar).toContain('label: "Charts"');
    expect(projectMiniSidebar).toContain("ChartPieSlice");
    expect(projectMiniSidebar).toContain("`/workshop/projects/${projectId}/charts`");
    expect(projectChartsPage).toContain("getProjectChartsData");
    expect(projectChartsPage).toContain("ProjectChartsClient");
  });

  it("keeps the project charts route within the workshop fixed-shell scroll contract", () => {
    expect(projectChartsClient).toContain("data-project-charts-page");
    expect(projectChartsClient).toContain("flex h-full min-h-0 flex-col overflow-hidden bg-white");
    expect(projectChartsClient).toContain("flex shrink-0 flex-wrap items-center gap-2");
    expect(projectChartsClient).toContain("min-h-0 flex-1 overflow-auto p-1");
  });

  it("keeps D3 shape rendering isolated to the project charts feature", () => {
    expect(projectCostDonutChart).not.toContain('from "d3"');
    expect(projectCostBubbleChart).not.toContain('from "d3"');
    expect(projectCostBubbleChart).not.toContain('from "d3";');
    expect(sharedCostDonutChart).toContain('from "d3-shape"');
    expect(projectCostBubbleChart).toContain('from "d3-hierarchy"');
    expect(projectDashboardClient).not.toContain('from "d3"');
    expect(projectEstimatesClient).not.toContain('from "d3"');
    expect(estimateSheetContent).not.toContain('from "d3"');
  });

  it("keeps the non-default project bubble chart behind a named dynamic import", () => {
    expect(projectChartsClient).toContain("dynamic(() =>");
    expect(projectChartsClient).toContain("module.ProjectCostBubbleChart");
    expect(projectChartsClient).not.toContain('import { ProjectCostBubbleChart }');
  });
});
