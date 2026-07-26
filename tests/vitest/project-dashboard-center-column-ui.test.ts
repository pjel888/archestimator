import { describe, expect, it } from "vitest";

import {
  estimateCenterColumnBoundary,
  estimateCenterColumnBoundaryVars,
  workshopShell,
  sidePanelWidths,
  resizableSidePanel,
  workshopTitleHeader,
  projectEstimateMetadataStrip,
  projectDashboardLayout,
  workshopBreadcrumbs,
  projectTotalHeader,
} from "./project-dashboard-ui-fixtures";

describe("project dashboard center-column UI governance", () => {
  it("uses one estimate center-column width contract for the totals footer and estimate metadata strip", () => {
    expect(estimateCenterColumnBoundary).toContain('"workshop-title"');
    expect(estimateCenterColumnBoundary).toContain('"project-workspace-row"');
    expect(estimateCenterColumnBoundary).toContain("var(--estimate-tree-panel-width)");
    expect(estimateCenterColumnBoundary).toContain("var(--estimate-library-panel-width)");
    expect(estimateCenterColumnBoundary).toContain("var(--project-mini-sidebar-width)");
    expect(estimateCenterColumnBoundaryVars).toContain('"--estimate-tree-panel-width": "376px"');
    expect(estimateCenterColumnBoundaryVars).toContain('"--estimate-library-panel-width": "560px"');
    expect(estimateCenterColumnBoundaryVars).toContain('"--project-mini-sidebar-width": "104px"');
    expect(workshopShell).toContain("getSidePanelWidthCssVariables");
    expect(sidePanelWidths).toMatch(/storageKey: "estimate_component_library_width",[\s\S]*?defaultWidth: 400,[\s\S]*?minWidth: 360,[\s\S]*?maxWidth: 480,/);
    expect(sidePanelWidths).toContain("component_library_tree_width");
    expect(resizableSidePanel).toContain("document.cookie");
    expect(workshopTitleHeader).toContain("EstimateCenterColumnBoundary");
    expect(workshopTitleHeader).toContain("data-workshop-title-block");
    expect(projectEstimateMetadataStrip).not.toContain('document.querySelector<HTMLElement>("[data-workshop-title-block]")');
    expect(projectEstimateMetadataStrip).not.toContain("workshopTitleBlock.hidden");
    expect(projectEstimateMetadataStrip).toContain('workshopCanvas.dataset.estimateSheetRoute = "true"');
    expect(projectEstimateMetadataStrip).toContain("delete workshopCanvas.dataset.estimateSheetRoute");
    expect(workshopShell).toContain("data-workshop-page-shell-canvas");
    expect(projectDashboardLayout).not.toContain("ProjectWorkspaceHeaderRow");
    expect(projectDashboardLayout).toContain('{ label: "Projects", href: "/workshop/projects" }');
    expect(projectDashboardLayout).toContain('{ label: title, href: `/workshop/projects/${projectId}` }');
    expect(projectDashboardLayout).toContain("centerHeader={<ProjectEstimateMetadataStrip />}");
    expect(workshopTitleHeader).toContain('import { WorkshopBreadcrumbs, type WorkshopBreadcrumb } from "./WorkshopBreadcrumbs"');
    expect(workshopTitleHeader).toContain("breadcrumbs={visibleBreadcrumbs}");
    expect(workshopTitleHeader).toContain("projectId={projectId}");
    expect(workshopShell).not.toContain("breadcrumbNav");
    expect(workshopTitleHeader).toContain("WorkshopBreadcrumbs");
    expect(workshopTitleHeader).toContain("data-workshop-title-region");
    expect(workshopBreadcrumbs).toContain('data-workshop-layout="workshop-breadcrumbs"');
    expect(workshopBreadcrumbs).toContain('aria-label="Project breadcrumbs"');
    expect(workshopBreadcrumbs).toContain('label: "Estimates"');
    expect(workshopBreadcrumbs).toContain('`${projectRoute}/estimates`');
    expect(projectEstimateMetadataStrip).toContain('data-workshop-layout="project-estimate-metadata-row"');
    expect(projectEstimateMetadataStrip).toContain('text-[10px] font-medium tracking-normal text-ink');
    expect(workshopTitleHeader).toContain('truncate text-[12px] font-medium leading-4 tracking-normal text-ink');
    expect(workshopTitleHeader).toContain('truncate text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary');
    expect(projectEstimateMetadataStrip).toContain("ProjectEstimateMetadataStripGrid");
    expect(projectEstimateMetadataStrip).toContain("EstimateSheetNameCell");
    expect(projectEstimateMetadataStrip).toContain("estimateNameKey");
    expect(projectEstimateMetadataStrip).not.toContain("EstimateVersionCell");
    expect(projectEstimateMetadataStrip).toContain("place-items-center");
    expect(projectEstimateMetadataStrip).toContain("text-center");
    expect(projectEstimateMetadataStrip).toContain("text-ink");
    expect(projectEstimateMetadataStrip).toContain("items-center gap-1");
    expect(projectTotalHeader).toContain('data-estimate-center-column="project-total-header"');
    expect(projectTotalHeader).toContain('className="mx-px flex h-full w-[calc(100%-2px)] items-center gap-2 px-2"');
    expect(projectTotalHeader).toContain("BUDGET_WARNING_THRESHOLD_PERCENT = 85");
    expect(projectTotalHeader).toContain("function BudgetHealthMeter");
    expect(projectTotalHeader).toContain("<meter");
    expect(projectTotalHeader).toContain("BUDGET_HEALTH_SEGMENT_COUNT = 144");
    expect(projectTotalHeader).toContain("data-budget-health-segment");
    expect(projectTotalHeader).toContain("data-budget-health-segment-tone");
    expect(projectTotalHeader).not.toContain("border-x border-hairline bg-white px-2");
  });
});
