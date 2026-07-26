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
    expect(projectDashboardPage).not.toContain("createEstimate");
    expect(projectDashboardPage).toContain("listRecentProjectEstimateSheets(projectId, 1)");
    expect(projectDashboardPage).toContain('redirect(`/workshop/projects/${projectId}/estimates/${directEstimateSheet.id}`)');
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
    expect(projectDashboardLayout).toContain('contentClassName="pt-0 pb-0 pr-0 pl-0"');
    expect(projectDashboardLayout).toContain("centerHeader={<ProjectEstimateMetadataStrip />}");
    expect(projectDashboardLayout).toContain("actions={");
    // P1-2 + Publisher Phase 4: the async chrome stays streamed, and
    // project-scoped publication/access actions now deep-link to Publisher.
    expect(projectChromeAsync).toContain("<ProjectPublisherHeaderActions");
    expect(projectChromeAsync).toContain("getPublisherProjectHref(projectId)");
    expect(projectChromeAsync).toContain('data-publisher-project-link="publication"');
    expect(projectChromeAsync).toContain("getProjectTeamAccessHref(projectId)");
    expect(projectChromeAsync).toContain('data-project-team-access-link="true"');
    expect(projectChromeAsync).toContain("publicationSummary={publicationSummary}");
    expect(projectChromeAsync).toContain("canOpenPublisherDrawer");
    expect(projectChromeAsync).not.toContain("isPublisherEnabled()");
    expect(projectChromeAsync).not.toContain("if (!publisherEnabled)");
    expect(projectChromeAsync).not.toContain("<ProjectPublicationHeader");
    expect(projectChromeAsync).not.toContain("<ProjectTeamspaceHeader");
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
    expect(projectDashboardClient).toContain('name="projectImageUrl"');
    expect(projectDashboardClient).toContain('name="currencyCode"');
    expect(projectDashboardClient).toContain("CreatableCombobox");
    expect(projectDashboardClient).toContain('name="clientName"');
    expect(projectDashboardClient).toContain('ariaLabel="Client"');
    expect(projectDashboardClient).toContain('name={readOnly ? undefined : "location"}');
    expect(projectDashboardClient).toContain('aria-live="polite"');
  });

  it("organizes the dashboard as an identity rail plus a Google map command surface", () => {
    expect(projectDashboardClient).toContain("justify-start");
    expect(projectDashboardClient).not.toContain("justify-start bg-white");
    expect(projectDashboardClient).toContain("md:w-[274px]");
    expect(projectDashboardClient).toContain("dashboard-glass flex h-full min-h-0 flex-1 flex-col overflow-hidden");
    expect(projectDashboardClient).toContain('className="flex min-h-0 flex-1 overflow-auto p-2"');
    expect(projectDashboardClient).not.toContain("ml-auto");
    expect(projectDashboardClient).not.toContain("justify-end");
    expect(projectDashboardClient).not.toContain("Project data");
    expect(projectDashboardClient).not.toContain("<h3");
    expect(projectDashboardClient).toContain("flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-2");
    expect(projectDashboardClient).toContain('label="Project name"');
    expect(projectDashboardClient).toContain('label="Client"');
    expect(projectDashboardClient).not.toContain('label="Project code"');
    expect(projectDashboardClient).not.toContain('label="Planned project budget"');
    expect(projectDashboardClient).not.toContain('name="projectBudget"');
    expect(projectDashboardClient).toContain('label="Project address"');
    expect(projectDashboardClient.indexOf('label="Project name"')).toBeLessThan(projectDashboardClient.indexOf('label="Client"'));
    expect(projectDashboardClient.indexOf('label="Client"')).toBeLessThan(projectDashboardClient.indexOf('label="Project address"'));
    expect(projectDashboardClient.indexOf('label="Project address"')).toBeLessThan(projectDashboardClient.indexOf('label="Created"'));
    expect(projectDashboardClient).not.toContain('label="Currency"');
    expect(projectDashboardClient).not.toContain("formatBudgetInput");
    expect(projectDashboardClient).toContain('name="currencyCode"');
    expect(projectDashboardClient).toContain("value={currencyCode}");
    expect(projectDashboardClient).toContain("ProjectAddressAutocomplete");
    expect(projectDashboardClient).not.toContain("<textarea");
    expect(projectDashboardClient).not.toContain("grid grid-cols-2 gap-2");
    expect(projectDashboardClient).toContain('label="Created"');
    expect(projectDashboardClient).toContain('label="Updated"');
    expect(projectDashboardClient).toContain("grid grid-cols-2 divide-x divide-[color:var(--glass-border)] border-t border-[color:var(--glass-border)] bg-white/25");
    expect(projectDashboardClient).not.toContain("mt-auto grid grid-cols-2 divide-x divide-hairline");
    expect(projectDashboardClient).toContain("text-[9px] font-medium uppercase tracking-normal text-gray-400");
    expect(projectDashboardClient).toContain("text-[10px] font-medium leading-3 text-tertiary");
    expect(projectDashboardClient).not.toContain("ReadOnlyProjectDataField");
    expect(projectDashboardClient).not.toContain("ProjectActionTile");
    expect(projectDashboardClient).not.toContain("ProjectMetric");
    expect(projectDashboardClient).not.toContain('href={`/workshop/projects/${projectId}/data`}');
    expect(projectDashboardClient).not.toContain('href="/workshop/projects"');
    expect(projectDashboardClient).not.toContain('href={`/workshop/projects/${projectId}/publish`}');
    expect(projectDashboardClient).not.toContain('aria-label="Project overview"');
    expect(projectDashboardClient).not.toContain('aria-label="Project dashboard actions"');
    expect(projectDashboardClient).not.toContain("Working surface");
    expect(projectDashboardClient).toContain('aria-label="Project command surface"');
    expect(projectDashboardClient).toContain("ProjectLocationMap");
    expect(projectDashboardClient).toContain("ProjectEstimateSummaryPanel");
    expect(projectDashboardClient).toContain("ProjectActivityFeedPanel");
    expect(projectDashboardClient).toContain('aria-label="Project activity feed"');
    expect(projectDashboardClient).toContain("All estimate sheets");
    expect(projectDashboardClient).toContain("const mapRightRail = useMemo(() => <ProjectActivityFeedPanel page={projectActivityPage} />");
    expect(projectDashboardClient).toContain("rightRail={mapRightRail}");
    expect(projectDashboardClient).toContain('data-testid="project-activity-date-toggle"');
    expect(projectDashboardClient).toContain("aria-expanded={!collapsed}");
    expect(projectDashboardClient).toContain("flex h-[60px] w-full");
    expect(projectDashboardClient).toContain("bg-transparent");
    expect(projectDashboardClient).toContain('className="ml-3 border-l border-[color:var(--glass-border)] pl-3"');
    expect(projectDashboardClient).not.toContain("{page.items.length}");
    expect(projectDashboardClient).not.toContain("bg-white/45 py-1");
    expect(projectDashboardClient).toContain("Estimate Count");
    expect(projectDashboardClient).toContain("Recent Estimate Sheets");
    expect(projectDashboardClient).toContain("dashboard-project-card-panel");
    expect(projectDashboardClient).toContain("googleMapsApiKey");
    expect(projectDashboardClient).toContain("saveProjectLocation");
    expect(projectDashboardClient).toContain('formData.set("source", "geocoded")');
    expect(projectDashboardClient).toContain('formData.set("geocoderName", "google")');
    expect(projectDashboardClient).toContain('formData.set("syncProjectAddress", "1")');
    expect(projectDashboardClient).not.toContain('label="Recent sheets"');
    expect(projectDashboardClient).not.toContain('label="Published link"');
    expect(projectDashboardClient).not.toContain('label="Estimate activity"');
    expect(projectDashboardClient).not.toContain('label="Location"');
    expect(projectDashboardClient).not.toContain("No estimate activity yet.");
    expect(projectDashboardClient).not.toContain("Older activity is available from estimate history.");
    expect(projectDashboardClient).not.toContain("No exact pin saved.");
    expect(projectDashboardClient).not.toContain("Map provider disabled");
    expect(projectDashboardClient).not.toContain("Save pin");
    expect(projectDashboardClient).not.toContain("Clear pin");
    expect(projectDashboardClient).not.toContain("Mapbox");
    expect(projectDashboardClient).not.toContain("maplibre");
    expect(projectDashboardClient).not.toContain("Nominatim");
  });
});
