import { describe, expect, it } from "vitest";

import {
  projectDashboardPage,
  projectEstimateNodePage,
  projectEstimatesPage,
  estimateWorkspaceClient,
  projectEstimatesLoading,
  workshopShell,
  workshopRouteHeader,
  workshopLayout,
  globalsCss,
  projectDashboardLayout,
  projectDashboardLoading,
  projectTotalHeader,
  projectTotalEvents,
  projectEstimateMetadataStrip,
  projectDashboardClient,
  projectRouteContentFallback,
} from "./project-dashboard-ui-fixtures";

describe("project dashboard route shell UI governance", () => {
  it("keeps estimate workspace client components behind named dynamic imports", () => {
    expect(estimateWorkspaceClient).not.toBe("");
    expect(projectEstimateNodePage).toContain("EstimateWorkspaceClient");
    expect(projectEstimateNodePage).not.toContain('import { EstimateSheetContent }');
    expect(projectEstimateNodePage).not.toContain('import { EstimateSheetTree }');
    expect(estimateWorkspaceClient).toContain("dynamic(() =>");
    expect(estimateWorkspaceClient).toContain("module.EstimateSheetTree");
    expect(estimateWorkspaceClient).toContain("module.EstimateSheetContent");
  });

  it("keeps the estimates-list fallback page-local so sheet routes do not inherit it", () => {
    expect(projectEstimatesLoading).toBe("");
    // Routing Page Optimization P2-T1: the estimates list still gets a
    // table-shaped fallback, but not through a segment loading.tsx that wraps
    // nested estimate-sheet routes and flashes the wrong skeleton.
    expect(projectEstimatesPage).toContain('import { Suspense } from "react"');
    expect(projectEstimatesPage).toContain("ProjectEstimatesListRouteFallback");
    expect(projectEstimatesPage).toContain("<Suspense fallback={<ProjectEstimatesListRouteFallback />}>");
    expect(projectEstimatesPage).toContain("<ProjectEstimatesContent params={params} />");
    expect(projectEstimatesPage).toContain("async function ProjectEstimatesContent");
    expect(projectEstimatesPage.indexOf("<Suspense fallback={<ProjectEstimatesListRouteFallback />}>")).toBeLessThan(
      projectEstimatesPage.indexOf('withPerfTraceRequest("workshop.estimates-list"'),
    );
    expect(projectEstimatesPage).not.toContain("ProjectRouteContentFallback");
    expect(projectEstimatesPage).not.toContain("WorkshopPageShell");
    expect(projectEstimatesPage).not.toContain('from "@/components/workshop/WorkshopShell"');
    expect(projectDashboardLayout).toContain("WorkshopRouteHeader");
  });

  it("locks page-level scrolling only while the workshop shell is mounted", () => {
    expect(workshopShell).toContain("data-workshop-page-shell-root");
    expect(workshopShell).toContain("h-[100dvh] overflow-hidden");
    expect(workshopShell).toContain("const sidePanelWidthCssVariables = await getSidePanelWidthCssVariables();");
    expect(workshopShell).toContain("<AuthenticatedMainSidebar status={sidebarStatus} />");
    expect(workshopRouteHeader).toContain("<WorkshopSettingsEntry location={settingsModalLocation} />");
    expect(workshopShell).not.toContain("WorkshopContentSkeleton");
    expect(workshopShell).toContain("{children}");
    expect(workshopShell).not.toContain("Modern Bungalow");
    expect(globalsCss).toContain("body:has([data-workshop-page-shell-root])");
    expect(globalsCss).toContain("overflow: hidden");
    expect(globalsCss).not.toContain("body {\\n  overflow: hidden;");
  });

  it("keeps shell auth and workspace bootstrap out of the content streaming path", () => {
    const shellFunctionStart = workshopShell.indexOf("export async function WorkshopShell");
    const shellReturnStart = workshopShell.indexOf("return (", shellFunctionStart);
    const shellPreamble = workshopShell.slice(shellFunctionStart, shellReturnStart);

    expect(shellPreamble).not.toContain("getCurrentUserContext()");
    expect(shellPreamble).not.toContain("ensureDefaultWorkspace()");
    expect(workshopShell).toContain("async function AuthenticatedMainSidebar");
    expect(workshopRouteHeader).toContain("async function WorkshopSettingsEntry");
    expect(workshopShell).toContain("<Suspense fallback={<MainSidebarShellFallback status={sidebarStatus} />}>");
    expect(workshopRouteHeader).toContain("<Suspense fallback={<WorkshopSettingsEntryFallback location={settingsModalLocation} />}>");
    // Gate stays synchronous-first in layout before WorkshopShell mounts.
    expect(workshopLayout).toContain("isProtectedRouteGateSatisfied");
    expect(workshopLayout.indexOf("isProtectedRouteGateSatisfied")).toBeLessThan(workshopLayout.indexOf("<WorkshopShell"));
  });

  it("gets the active header budget from the selected estimate sheet metadata", () => {
    expect(projectDashboardLayout).not.toContain("readProjectBudget");
    expect(projectDashboardLayout).toContain("projectId={projectId}");
    expect(projectDashboardLayout).toContain("<ProjectTotalFooterOverlay projectId={projectId} />");
    expect(projectTotalHeader).toContain("function ProjectTotalFooterOverlay");
    expect(projectTotalHeader).toContain("<ProjectTotalHeader projectId={projectId} />");
    expect(projectTotalHeader).toContain("usePathname");
    expect(projectTotalHeader).toContain("pathname?.startsWith(`/workshop/projects/${projectId}/estimates/`)");
    expect(projectTotalHeader).toContain("if (!isEstimateSheetRoute) return null;");
    expect(projectTotalHeader).toContain("PROJECT_BUDGET_CHANGE_EVENT");
    expect(projectTotalHeader).toContain("window.addEventListener(PROJECT_BUDGET_CHANGE_EVENT");
    expect(projectTotalEvents).toContain("dispatchProjectBudgetChange");
    expect(projectTotalHeader).toContain("formatPeso(budget)");
    expect(projectEstimateMetadataStrip).toContain("dispatchProjectBudgetChange(projectBudget ?? 0)");
    expect(projectDashboardClient).not.toContain("dispatchProjectBudgetChange");
  });

  it("renders the project dashboard as glass content on the shared shell material", () => {
    expect(projectDashboardPage).not.toContain("searchParams");
    expect(projectDashboardPage).not.toContain("getProjectDashboardSummary");
    expect(projectDashboardPage).not.toContain("getProjectActivity");
    expect(projectDashboardPage).toContain("countProjectEstimateSheetsForProject");
    expect(projectDashboardPage).not.toContain("projectEstimateSheets.length");
    expect(projectDashboardPage).toContain("listRecentProjectEstimateSheets");
    expect(projectDashboardPage).toContain('withPerfTraceRequest("workshop.project-dashboard"');
    expect(projectDashboardPage).toContain('traced("project-dashboard.estimate-count"');
    expect(projectDashboardPage).not.toContain("createPublicationDashboardStatus");
    expect(projectDashboardPage).toContain("listProjectActivityPage");
    expect(projectDashboardPage).toContain("projectActivityPage={dashboardData.projectActivityPage}");
    expect(projectDashboardPage).toContain("getProjectLocation");
    expect(projectDashboardPage).toContain("const projectLocationPromise = canEditPromise.then");
    expect(projectDashboardPage).toContain('canEdit ? traced("project-dashboard.location"');
    expect(projectDashboardPage).toContain("projectLocation={dashboardData.projectLocation}");
    expect(projectDashboardPage).toContain("GOOGLE_MAPS_API_KEY");
    expect(projectDashboardLayout).toContain('className="flex h-full min-h-0 overflow-hidden"');
    expect(projectDashboardLayout).not.toContain("overflow-hidden bg-white");
    expect(projectDashboardLayout).not.toContain("overflow-hidden bg-canvas");
    expect(projectDashboardClient).toContain('aria-label="Project dashboard"');
    expect(projectDashboardClient).toContain('aria-label="Project command surface"');
    expect(projectDashboardClient).toContain("dashboard-glass flex h-full min-h-0 flex-1 flex-col overflow-hidden");
    expect(projectDashboardClient).toContain("ProjectLocationMap");
    expect(projectDashboardClient).toContain("ProjectAddressAutocomplete");
    expect(projectDashboardClient).toContain("ProjectEstimateSummaryPanel");
    expect(projectDashboardClient).toContain("ProjectActivityFeedPanel");
    expect(projectDashboardClient).toContain("All estimate sheets");
    expect(projectDashboardClient).toContain("const mapRightRail = useMemo(() => <ProjectActivityFeedPanel page={projectActivityPage} />");
    expect(projectDashboardClient).toContain("rightRail={mapRightRail}");
    expect(projectDashboardClient).toContain('data-testid="project-activity-date-toggle"');
    expect(projectDashboardClient).toContain("aria-expanded={!collapsed}");
    expect(projectDashboardClient).not.toContain("{page.items.length}");
    expect(projectDashboardClient).toContain("Estimate Count");
    expect(projectDashboardClient).toContain("Recent Estimate Sheets");
    expect(projectDashboardClient).toContain("dashboard-project-card-panel");
    expect(projectDashboardClient).toContain("dashboard-project-count-panel");
    expect(projectDashboardClient).toContain("dashboard-published-panel");
    expect(projectDashboardClient).not.toContain('label="Recent sheets"');
    expect(projectDashboardClient).not.toContain('label="Published link"');
    expect(projectDashboardClient).not.toContain('label="Estimate activity"');
    expect(projectDashboardClient).not.toContain('label="Location"');
    expect(projectDashboardClient).not.toContain('aria-label="Project overview"');
    expect(projectDashboardClient).not.toContain('aria-label="Project dashboard actions"');
    expect(projectDashboardClient).toContain("dashboard-glass");
    expect(projectDashboardClient).not.toContain("ProjectActionTile");
    expect(projectDashboardClient).not.toContain("workshop-project-card-glass");
    expect(workshopRouteHeader).not.toContain("workshop-shell-glass-chrome--top relative flex h-14 shrink-0 items-center justify-between border");
    expect(workshopShell).not.toContain("workshop-shell-glass-chrome--bottom relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible border");
  });

  it("uses the same empty command-surface shell for dashboard loading and suspense fallback", () => {
    for (const source of [projectDashboardLoading, projectRouteContentFallback]) {
      expect(source).not.toContain('label="Recent sheets"');
      expect(source).not.toContain('label="Published link"');
      expect(source).not.toContain('label="Estimate activity"');
      expect(source).not.toContain('label="Location"');
      expect(source).toContain("dashboard-glass flex h-full min-h-0 flex-1 flex-col overflow-hidden");
      expect(source).toContain('className="flex min-h-0 flex-1 overflow-auto p-2"');
      expect(source).not.toContain("bg-canvas");
      expect(source).not.toContain("border border-hairline bg-white");
      expect(source).not.toContain("Project overview");
      expect(source).not.toContain("Project dashboard actions");
    }
  });
});
