import { describe, expect, it } from "vitest";

import {
  projectEstimateNodePage,
  estimateWorkspaceClient,
  projectEstimatesLoading,
  workshopPageShell,
  globalsCss,
  projectDashboardLayout,
  projectTotalHeader,
  projectEstimateMetadataStrip,
  projectDashboardClient,
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
    expect(projectEstimatesLoading).toContain("ProjectRouteContentFallback");
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
});
