import { existsSync, readFileSync } from "node:fs";

function readOptional(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

export const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");
export const projectDashboardLayout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
export const projectChromeAsync = readFileSync("src/components/workshop/ProjectChromeAsync.tsx", "utf8");
export const projectDashboardClient = readFileSync("src/components/workshop/ProjectDashboardClient.tsx", "utf8");
export const projectTotalHeader = readFileSync("src/components/workshop/ProjectTotalHeader.tsx", "utf8");
export const projectMiniSidebar = readFileSync("src/components/workshop/ProjectMiniSidebar.tsx", "utf8");
export const workshopTitleHeader = readFileSync("src/components/workshop/WorkshopTitleHeader.tsx", "utf8");
export const workshopPageShell = readFileSync("src/components/workshop/WorkshopPageShell.tsx", "utf8");
export const workshopBreadcrumbs = readFileSync("src/components/workshop/WorkshopBreadcrumbs.tsx", "utf8");
export const estimateCenterColumnBoundary = readFileSync("src/components/workshop/EstimateCenterColumnBoundary.tsx", "utf8");
export const projectEstimateMetadataStrip = readFileSync("src/components/workshop/ProjectEstimateMetadataStrip.tsx", "utf8");
export const resizableSidePanel = readFileSync("src/components/workshop/ResizableSidePanel.tsx", "utf8");
export const sidePanelWidths = readFileSync("src/components/workshop/side-panel-widths.ts", "utf8");
export const searchInput = readFileSync("src/components/ui/search-input.tsx", "utf8");
export const headerIconToolbar = readFileSync("src/components/ui/header-icon-toolbar.tsx", "utf8");
export const workshopCollectionLayout = readFileSync("src/components/workshop/WorkshopCollectionLayout.tsx", "utf8");
export const estimateSheetTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
export const estimateSheetContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
export const estimateComponentLibrary = readFileSync("src/components/workshop/component-library/index.tsx", "utf8");
export const projectEstimatesPage = readFileSync("src/app/workshop/projects/[projectId]/estimates/page.tsx", "utf8");
export const projectEstimatesClient = readFileSync("src/components/workshop/ProjectEstimatesClient.tsx", "utf8");
export const projectEstimateNodePage = readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8");
export const projectChartsPage = readFileSync("src/app/workshop/projects/[projectId]/charts/page.tsx", "utf8");
export const projectChartsClient = readFileSync("src/components/workshop/project-charts/ProjectChartsClient.tsx", "utf8");
export const projectCostDonutChart = readFileSync("src/components/workshop/project-charts/ProjectCostDonutChart.tsx", "utf8");
export const sharedCostDonutChart = readFileSync("src/components/charts/CostDonutChart.tsx", "utf8");
// ProjectCostBubbleChart was deleted in the charts redesign (`03` UX-2 / `01` PERF-5);
// `readOptional` keeps the fixtures importable and lets tests assert its absence.
export const projectCostBubbleChart = readOptional("src/components/workshop/project-charts/ProjectCostBubbleChart.tsx");
export const projectVarianceSpine = readFileSync("src/components/workshop/project-charts/ProjectVarianceSpine.tsx", "utf8");
export const projectComparisonTable = readFileSync("src/components/workshop/project-charts/ProjectComparisonTable.tsx", "utf8");
export const globalsCss = readFileSync("src/app/globals.css", "utf8");
export const projectEstimatesLoading = readOptional("src/app/workshop/projects/[projectId]/estimates/loading.tsx");
export const estimateWorkspaceClient = readOptional("src/components/workshop/EstimateWorkspaceClient.tsx");
