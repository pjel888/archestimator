import { describe, expect, it } from "vitest";

import {
  projectDashboardPage,
  projectEstimateNodePage,
  estimateWorkspaceClient,
  projectEstimatesLoading,
  workshopPageShell,
  globalsCss,
  projectDashboardLayout,
  projectDashboardLoading,
  projectTotalHeader,
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

  it("provides a nested loading fallback for project estimate list transitions", () => {
    expect(projectEstimatesLoading).not.toBe("");
    // P0-6: the list route uses a table-shaped skeleton matching the page, not the
    // node-route ProjectRouteContentFallback (sidebar + 2-column grid + right rail).
    expect(projectEstimatesLoading).toContain("ProjectEstimatesListSkeleton");
    expect(projectEstimatesLoading).not.toContain("ProjectRouteContentFallback");
    expect(projectEstimatesLoading).not.toContain("WorkshopPageShell");
    expect(projectEstimatesLoading).not.toContain("cookies()");
    expect(projectEstimatesLoading).not.toContain("getCurrentUserContext");
  });

  it("locks page-level scrolling only while the workshop shell is mounted", () => {
    expect(workshopPageShell).toContain("data-workshop-page-shell-root");
    expect(workshopPageShell).toContain("h-[100dvh] overflow-hidden");
    expect(workshopPageShell).toContain("Promise.all([");
    expect(workshopPageShell).toContain("<Suspense fallback={<WorkshopShellContentFallback />}>");
    expect(workshopPageShell).toContain("function WorkshopShellContentFallback()");
    expect(workshopPageShell).not.toContain("Modern Bungalow");
    expect(globalsCss).toContain("body:has([data-workshop-page-shell-root])");
    expect(globalsCss).toContain("overflow: hidden");
    expect(globalsCss).not.toContain("body {\\n  overflow: hidden;");
  });

  it("gets the active header budget from the selected estimate sheet metadata", () => {
    expect(projectDashboardLayout).not.toContain("readProjectBudget");
    expect(projectDashboardLayout).toContain("projectId={projectId}");
    expect(workshopPageShell).toContain("<ProjectTotalHeader projectId={projectId} />");
    expect(projectTotalHeader).toContain("usePathname");
    expect(projectTotalHeader).toContain("pathname?.startsWith(`/workshop/projects/${projectId}/estimates/`)");
    expect(projectTotalHeader).toContain("if (!isEstimateSheetRoute) return null;");
    expect(projectTotalHeader).toContain("PROJECT_BUDGET_CHANGE_EVENT");
    expect(projectTotalHeader).toContain("dispatchProjectBudgetChange");
    expect(projectTotalHeader).toContain("formatPeso(budget)");
    expect(projectEstimateMetadataStrip).toContain("dispatchProjectBudgetChange(projectBudget ?? 0)");
    expect(projectDashboardClient).not.toContain("dispatchProjectBudgetChange");
  });

  it("renders the project dashboard as glass content on the shared shell material", () => {
    expect(projectDashboardPage).not.toContain("searchParams");
    expect(projectDashboardPage).not.toContain("getProjectDashboardSummary");
    expect(projectDashboardPage).not.toContain("getProjectActivity");
    expect(projectDashboardPage).toContain("listRecentProjectEstimateSheets");
    expect(projectDashboardPage).toContain("createPublicationDashboardStatus");
    expect(projectDashboardLayout).toContain('className="flex h-full min-h-0 overflow-hidden"');
    expect(projectDashboardLayout).not.toContain("overflow-hidden bg-white");
    expect(projectDashboardLayout).not.toContain("overflow-hidden bg-canvas");
    expect(projectDashboardClient).toContain('aria-label="Project dashboard"');
    expect(projectDashboardClient).toContain('aria-label="Project command surface"');
    expect(projectDashboardClient).toContain('label="Recent sheets"');
    expect(projectDashboardClient).toContain('label="Published link"');
    expect(projectDashboardClient).toContain('label="Estimate activity"');
    expect(projectDashboardClient).toContain('label="Location"');
    expect(projectDashboardClient).not.toContain('aria-label="Project overview"');
    expect(projectDashboardClient).not.toContain('aria-label="Project dashboard actions"');
    expect(projectDashboardClient).toContain("dashboard-glass");
    expect(projectDashboardClient).not.toContain("ProjectActionTile");
    expect(projectDashboardClient).not.toContain("workshop-project-card-glass");
    expect(workshopPageShell).not.toContain("workshop-shell-glass-chrome--top relative flex h-14 shrink-0 items-center justify-between border");
    expect(workshopPageShell).not.toContain("workshop-shell-glass-chrome--bottom relative flex min-h-12 shrink-0 items-center justify-between gap-2 overflow-visible border");
  });

  it("uses the same command-surface skeleton for dashboard loading and suspense fallback", () => {
    for (const source of [projectDashboardLoading, projectRouteContentFallback]) {
      expect(source).toContain('aria-label="Recent sheets"');
      expect(source).toContain('aria-label="Published link"');
      expect(source).toContain('aria-label="Estimate activity"');
      expect(source).toContain('aria-label="Location"');
      expect(source).toContain("dashboard-glass flex min-h-0 flex-1 flex-col overflow-hidden");
      expect(source).not.toContain("bg-canvas");
      expect(source).not.toContain("border border-hairline bg-white");
      expect(source).not.toContain("Project overview");
      expect(source).not.toContain("Project dashboard actions");
    }
  });
});
