import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");
const projectDashboardLayout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
const projectDashboardClient = readFileSync("src/components/workshop/ProjectDashboardClient.tsx", "utf8");
const projectTotalHeader = readFileSync("src/components/workshop/ProjectTotalHeader.tsx", "utf8");
const projectMiniSidebar = readFileSync("src/components/workshop/ProjectMiniSidebar.tsx", "utf8");

describe("project dashboard UI governance", () => {
  it("keeps the project page focused on project data visualization instead of estimate creation", () => {
    expect(projectDashboardPage).toContain("ProjectDashboardClient");
    expect(projectDashboardPage).not.toContain("ButtonLink");
    expect(projectDashboardPage).not.toContain("/estimates");
    expect(projectDashboardClient).not.toContain("Supabase");
    expect(projectDashboardClient).not.toContain("Source");
  });

  it("matches the project-code header to the Project mini-sidebar header", () => {
    const sidebarHeaderClass = 'flex h-10 items-center border-b border-hairline pl-4 pr-2';
    const sidebarTitleClass = 'truncate text-[9px] font-bold uppercase tracking-[0.14em] text-tertiary';

    expect(projectMiniSidebar).toContain(sidebarHeaderClass);
    expect(projectMiniSidebar).toContain(sidebarTitleClass);
    expect(projectDashboardLayout).toContain('const projectCode = liveProject?.project_code ?? projectId;');
    expect(projectDashboardLayout).toContain('flex h-10 shrink-0 items-center border-b border-hairline bg-white pl-4 pr-2');
    expect(projectDashboardLayout).toContain(sidebarTitleClass);
    expect(projectDashboardLayout).toContain('{projectCode}');
  });

  it("keeps project details CRUD editing available from the project page", () => {
    expect(projectDashboardClient).toContain("updateProjectDetails");
    expect(projectDashboardClient).toContain("AutoSubmitForm");
    expect(projectDashboardClient).toContain('name="projectCode"');
    expect(projectDashboardClient).toContain('name="clientName"');
    expect(projectDashboardClient).toContain('name="location"');
  });

  it("organizes all project data in a left-aligned 274px project data panel under the project code", () => {
    expect(projectDashboardClient).toContain("justify-start bg-white");
    expect(projectDashboardClient).toContain("w-[274px]");
    expect(projectDashboardClient).toContain("border-r border-hairline");
    expect(projectDashboardClient).not.toContain("ml-auto");
    expect(projectDashboardClient).not.toContain("justify-end");
    expect(projectDashboardClient).not.toContain("Project data");
    expect(projectDashboardClient).not.toContain("<h3");
    expect(projectDashboardClient).toContain("flex min-h-0 flex-1 flex-col gap-3 overflow-auto py-2 pl-4 pr-2");
    expect(projectDashboardClient).toContain('label="Project name"');
    expect(projectDashboardClient).toContain('label="Client"');
    expect(projectDashboardClient).not.toContain('label="Project code"');
    expect(projectDashboardClient).toContain('label="Planned project budget"');
    expect(projectDashboardClient).toContain('label="Project address"');
    expect(projectDashboardClient.indexOf('label="Project name"')).toBeLessThan(projectDashboardClient.indexOf('label="Client"'));
    expect(projectDashboardClient.indexOf('label="Client"')).toBeLessThan(projectDashboardClient.indexOf('label="Planned project budget"'));
    expect(projectDashboardClient.indexOf('label="Planned project budget"')).toBeLessThan(projectDashboardClient.indexOf('label="Project address"'));
    expect(projectDashboardClient.indexOf('label="Project address"')).toBeLessThan(projectDashboardClient.indexOf('label="Created"'));
    expect(projectDashboardClient).not.toContain('label="Currency"');
    expect(projectDashboardClient).toContain('type="text"');
    expect(projectDashboardClient).toContain("formatBudgetInput");
    expect(projectDashboardClient).toContain("minimumFractionDigits: 2");
    expect(projectDashboardClient).toContain("maximumFractionDigits: 2");
    expect(projectDashboardClient).toContain('value="PHP"');
    expect(projectDashboardClient).toContain("₱");
    expect(projectDashboardClient).toContain('align="left"');
    expect(projectDashboardClient).toContain("text-left text-[10px] font-semibold tabular-nums text-secondary");
    expect(projectDashboardClient).toContain("<textarea");
    expect(projectDashboardClient).toContain("!text-[10px] font-medium leading-3 text-secondary");
    expect(projectDashboardClient).not.toContain("grid grid-cols-2 gap-2");
    expect(projectDashboardClient).toContain('label="Created"');
    expect(projectDashboardClient).toContain('label="Updated"');
    expect(projectDashboardClient).toContain("grid grid-cols-2 divide-x divide-hairline border-t border-hairline pt-1");
    expect(projectDashboardClient).not.toContain("mt-auto grid grid-cols-2 divide-x divide-hairline");
    expect(projectDashboardClient).toContain("text-[6px] font-semibold uppercase tracking-[0.12em] text-gray-400");
    expect(projectDashboardClient).toContain("text-[8px] font-medium leading-3 text-tertiary");
    expect(projectDashboardClient).not.toContain("ReadOnlyProjectDataField");
  });

  it("links the editable budget to the planned project budget header", () => {
    expect(projectDashboardLayout).toContain("readProjectBudget");
    expect(projectDashboardLayout).toContain("<ProjectTotalHeader plannedBudget={plannedBudget} />");
    expect(projectTotalHeader).toContain("PROJECT_BUDGET_CHANGE_EVENT");
    expect(projectTotalHeader).toContain("dispatchProjectBudgetChange");
    expect(projectTotalHeader).toContain("formatPeso(budget)");
    expect(projectDashboardClient).toContain("dispatchProjectBudgetChange");
    expect(projectDashboardClient).toContain("onChange={(event) => dispatchProjectBudgetChange(parseBudgetInput(event.currentTarget.value))}");
  });
});
