import { describe, expect, it } from "vitest";

import {
  projectDashboardPage,
  projectDashboardLayout,
  projectChromeAsync,
  projectDashboardClient,
  projectMiniSidebar,
} from "./project-dashboard-ui-fixtures";

describe("project dashboard core UI governance", () => {
  it("keeps the project page focused on project data visualization instead of estimate creation", () => {
    expect(projectDashboardPage).toContain("ProjectDashboardClient");
    expect(projectDashboardPage).not.toContain("ButtonLink");
    expect(projectDashboardPage).not.toContain("/estimates");
    expect(projectDashboardClient).not.toContain("Supabase");
    expect(projectDashboardClient).not.toContain("Source");
  });

  it("keeps project-level actions in the workshop shell while estimate detail routes hide project navigation", () => {
    expect(projectMiniSidebar).toContain("estimateSheetPathPrefix");
    expect(projectMiniSidebar).toContain("pathname?.startsWith(estimateSheetPathPrefix)");
    expect(projectMiniSidebar).toContain("if (isEstimateSheetRoute) return null;");
    expect(projectMiniSidebar).toContain('aria-label="Project navigation"');
    expect(projectMiniSidebar).toContain("w-[104px]");
    expect(projectMiniSidebar).not.toContain("ProjectWorkspaceProjectCode");
    expect(projectDashboardLayout).not.toContain("ProjectWorkspaceHeaderRow");
    expect(projectDashboardLayout).not.toContain("projectCode={projectCode}");
    expect(projectDashboardLayout).toContain('contentClassName="pt-0 pb-0 pr-2 pl-0"');
    expect(projectDashboardLayout).toContain("centerHeader={<ProjectEstimateMetadataStrip />}");
    expect(projectDashboardLayout).toContain("actions={");
    // P1-2: the publication/teamspace header chrome is streamed via ProjectChromeAsync
    // (in the layout's actions slot behind Suspense), not rendered inline in the layout.
    expect(projectChromeAsync).toContain("<ProjectPublicationHeader");
    expect(projectChromeAsync).toContain("<ProjectTeamspaceHeader");
    expect(projectChromeAsync).toContain("summary={publicationSummary}");
    expect(projectChromeAsync).toContain("summary={collaborationSummary}");
  });

  it("removes the project mini-sidebar only inside estimate sheet detail routes", () => {
    expect(projectMiniSidebar).toContain("estimateSheetPathPrefix");
    expect(projectMiniSidebar).toContain("pathname?.startsWith(estimateSheetPathPrefix)");
    expect(projectMiniSidebar).toContain("if (isEstimateSheetRoute) return null;");
    expect(projectDashboardLayout).toContain("<ProjectMiniSidebar projectId={projectId} />");
  });

  it("does not expose the deleted project-level Components route", () => {
    expect(projectMiniSidebar).not.toContain('label: "Components"');
    expect(projectMiniSidebar).not.toContain("SquaresFour");
    expect(projectMiniSidebar).not.toContain("/workshop/projects/${projectId}/components");
    expect(projectMiniSidebar).not.toContain('label: "Publish"');
    expect(projectMiniSidebar).not.toContain("/workshop/projects/${projectId}/publish");
  });

  it("keeps project details CRUD editing available from the project page", () => {
    expect(projectDashboardClient).toContain("updateProjectDetails");
    expect(projectDashboardClient).toContain("AutoSubmitForm");
    expect(projectDashboardClient).toContain('name="projectCode"');
    expect(projectDashboardClient).toContain('name="clientName"');
    expect(projectDashboardClient).toContain('name="location"');
  });

  it("organizes project data in a left-aligned 274px frosted project data panel", () => {
    expect(projectDashboardClient).toContain("justify-start");
    expect(projectDashboardClient).not.toContain("justify-start bg-white");
    expect(projectDashboardClient).toContain("w-[274px]");
    expect(projectDashboardClient).toContain("dashboard-glass flex min-h-0 flex-1 flex-col overflow-hidden");
    expect(projectDashboardClient).not.toContain("ml-auto");
    expect(projectDashboardClient).not.toContain("justify-end");
    expect(projectDashboardClient).not.toContain("Project data");
    expect(projectDashboardClient).not.toContain("<h3");
    expect(projectDashboardClient).toContain("flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2");
    expect(projectDashboardClient).toContain('label="Project name"');
    expect(projectDashboardClient).toContain('label="Client"');
    expect(projectDashboardClient).not.toContain('label="Project code"');
    expect(projectDashboardClient).not.toContain('label="Planned project budget"');
    expect(projectDashboardClient).not.toContain('name="projectBudget"');
    expect(projectDashboardClient).toContain('label="Project address"');
    expect(projectDashboardClient.indexOf('label="Project name"')).toBeLessThan(projectDashboardClient.indexOf('label="Client"'));
    expect(projectDashboardClient.indexOf('label="Client"')).toBeLessThan(projectDashboardClient.indexOf('label="Project address"'));
    expect(projectDashboardClient.indexOf('label="Project address"')).toBeLessThan(projectDashboardClient.indexOf('label="Created"'));
    expect(projectDashboardClient).toContain('label="Currency"');
    expect(projectDashboardClient).not.toContain('type="text"');
    expect(projectDashboardClient).not.toContain("formatBudgetInput");
    expect(projectDashboardClient).toContain('name="currencyCode"');
    expect(projectDashboardClient).toContain("value={currencyCode}");
    expect(projectDashboardClient).toContain("<textarea");
    expect(projectDashboardClient).toContain("!text-[10px] font-medium leading-3 text-secondary");
    expect(projectDashboardClient).not.toContain("grid grid-cols-2 gap-2");
    expect(projectDashboardClient).toContain('label="Created"');
    expect(projectDashboardClient).toContain('label="Updated"');
    expect(projectDashboardClient).toContain("grid grid-cols-2 divide-x divide-[color:var(--glass-border)] border-t border-[color:var(--glass-border)] bg-white/25");
    expect(projectDashboardClient).not.toContain("mt-auto grid grid-cols-2 divide-x divide-hairline");
    expect(projectDashboardClient).toContain("text-[8px] font-medium uppercase tracking-normal text-gray-400");
    expect(projectDashboardClient).toContain("text-[8px] font-medium leading-3 text-tertiary");
    expect(projectDashboardClient).not.toContain("ReadOnlyProjectDataField");
    expect(projectDashboardClient).toContain("ProjectActionTile");
    expect(projectDashboardClient).toContain('href={`/workshop/projects/${projectId}/estimates`}');
    expect(projectDashboardClient).toContain('href={`/workshop/projects/${projectId}/data`}');
    expect(projectDashboardClient).toContain('href="/workshop/projects"');
    expect(projectDashboardClient).not.toContain('href={`/workshop/projects/${projectId}/publish`}');
  });
});
