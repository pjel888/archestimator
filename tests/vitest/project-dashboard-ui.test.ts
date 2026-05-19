import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");
const projectDashboardLayout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
const projectDashboardClient = readFileSync("src/components/workshop/ProjectDashboardClient.tsx", "utf8");
const projectTotalHeader = readFileSync("src/components/workshop/ProjectTotalHeader.tsx", "utf8");
const projectMiniSidebar = readFileSync("src/components/workshop/ProjectMiniSidebar.tsx", "utf8");
const workshopTitleHeader = readFileSync("src/components/workshop/WorkshopTitleHeader.tsx", "utf8");
const projectWorkspaceHeaderRow = readFileSync("src/components/workshop/ProjectWorkspaceHeaderRow.tsx", "utf8");
const projectWorkspaceProjectCode = readFileSync("src/components/workshop/ProjectWorkspaceProjectCode.tsx", "utf8");
const estimateCenterColumnBoundary = readFileSync("src/components/workshop/EstimateCenterColumnBoundary.tsx", "utf8");
const projectEstimateMetadataStrip = readFileSync("src/components/workshop/ProjectEstimateMetadataStrip.tsx", "utf8");
const resizableSidePanel = readFileSync("src/components/workshop/ResizableSidePanel.tsx", "utf8");
const searchInput = readFileSync("src/components/ui/search-input.tsx", "utf8");
const headerIconToolbar = readFileSync("src/components/ui/header-icon-toolbar.tsx", "utf8");
const workshopCollectionLayout = readFileSync("src/components/workshop/WorkshopCollectionLayout.tsx", "utf8");
const estimateSheetTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
const estimateSheetContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const estimateComponentLibrary = readFileSync("src/components/workshop/component-library/index.tsx", "utf8");
const projectEstimatesPage = readFileSync("src/app/workshop/projects/[projectId]/estimates/page.tsx", "utf8");

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
    expect(projectDashboardLayout).toContain('<ProjectWorkspaceHeaderRow projectCode={projectCode} />');
    expect(projectWorkspaceHeaderRow).toContain('relative h-10 shrink-0 border-b border-hairline bg-white');
    expect(projectWorkspaceHeaderRow).toContain('const isEstimateSheetRoute = Boolean(pathname?.includes("/estimates/"));');
    expect(projectWorkspaceHeaderRow).toContain('<ProjectEstimateMetadataStrip projectCode={projectCode} />');
    expect(projectWorkspaceHeaderRow).toContain('w-[var(--estimate-tree-panel-width,272px)]');
    expect(projectWorkspaceHeaderRow).toContain('pl-4 pr-2');
    expect(projectWorkspaceHeaderRow).toContain('textClassName="font-bold"');
    expect(projectWorkspaceProjectCode).toContain(sidebarTitleClass.replace("font-bold ", ""));
    expect(projectWorkspaceProjectCode).toContain('{projectCode}');
  });

  it("uses one estimate center-column width contract for the totals header and estimate metadata strip", () => {
    expect(estimateCenterColumnBoundary).toContain('"workshop-title"');
    expect(estimateCenterColumnBoundary).toContain('"project-workspace-row"');
    expect(estimateCenterColumnBoundary).toContain("--estimate-tree-panel-width,272px");
    expect(estimateCenterColumnBoundary).toContain("--estimate-library-panel-width,380px");
    expect(estimateCenterColumnBoundary).toContain("--project-mini-sidebar-width,104px");
    expect(workshopTitleHeader).toContain("EstimateCenterColumnBoundary");
    expect(projectDashboardLayout).toContain("ProjectWorkspaceHeaderRow");
    expect(projectWorkspaceHeaderRow).toContain("ProjectWorkspaceHeaderSurface");
    expect(projectWorkspaceHeaderRow).toContain("ProjectWorkspaceProjectCode");
    expect(projectWorkspaceHeaderRow).toContain("<ProjectEstimateMetadataStrip projectCode={projectCode} />");
    expect(projectEstimateMetadataStrip).toContain('scope="project-workspace-row"');
    expect(projectEstimateMetadataStrip).toContain('className="pointer-events-none bg-white"');
    expect(projectEstimateMetadataStrip).toContain("<ProjectWorkspaceProjectCode projectCode={projectCode}");
    expect(projectEstimateMetadataStrip).toContain('textClassName="font-normal"');
    expect(projectEstimateMetadataStrip).toContain('font-normal uppercase tracking-[0.14em] text-tertiary');
    expect(projectEstimateMetadataStrip).toContain('data-estimate-center-column="metadata-strip"');
    expect(projectEstimateMetadataStrip).toContain("ProjectEstimateMetadataStripBoundary");
    expect(projectEstimateMetadataStrip).toContain("ProjectEstimateMetadataStripGrid");
    expect(projectEstimateMetadataStrip).toContain("EstimateSheetNameCell");
    expect(projectTotalHeader).toContain('data-estimate-center-column="project-total-header"');
    expect(projectTotalHeader).toContain('className="flex h-full w-full items-center justify-between bg-white px-2"');
    expect(projectTotalHeader).not.toContain("border-x border-hairline bg-white px-2");
  });

  it("keeps minimized estimate side-panel rails white instead of changing background color", () => {
    expect(resizableSidePanel).toContain('className="h-full rounded-none border-x border-hairline bg-white hover:bg-white"');
    expect(resizableSidePanel).not.toContain('collapsed ? "bg-surface-muted" : "bg-white"');
    expect(resizableSidePanel).not.toContain('hover:bg-surface-muted');
  });

  it("keeps shared search and icon toolbar rows at 38px with no component borders", () => {
    const sharedSearchSurfaces = [
      workshopCollectionLayout,
      estimateSheetTree,
      estimateSheetContent,
      estimateComponentLibrary,
      projectEstimatesPage,
    ].join("\n");

    expect(searchInput).toContain("complete 38px search surface height");
    expect(searchInput).toContain("h-[38px] min-h-[38px]");
    expect(searchInput).not.toContain("h-12 min-h-12");
    expect(searchInput).not.toContain("border border-hairline bg-white px-1");
    expect(headerIconToolbar).toContain('className="flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0"');
    expect(headerIconToolbar).not.toContain("border-y border-hairline");
    expect(headerIconToolbar).not.toContain("min-h-10");
    expect(sharedSearchSurfaces).not.toContain('wrapperClassName="h-12 w-full"');
    expect(sharedSearchSurfaces).not.toMatch(/className="flex h-12 (shrink-0 )?items-center/);
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
