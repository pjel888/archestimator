import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimatesPage = readFileSync("src/app/workshop/projects/[projectId]/estimates/page.tsx", "utf8");
const projectEstimatesClient = readFileSync("src/components/workshop/ProjectEstimatesClient.tsx", "utf8");
const projectEstimatesTable = readFileSync("src/components/workshop/ProjectEstimatesTable.tsx", "utf8");
const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("estimate bootstrap UI governance", () => {
  it("renders live Supabase estimate cards and project estimate navigation", () => {
    expect(estimatesPage).toContain("ProjectEstimatesClient");
    expect(projectEstimatesClient).toContain("ProjectEstimatesTable");
    expect(projectEstimatesClient).toContain("TreePanelHeader");
    expect(projectEstimatesClient).toContain("Search Estimates");
    expect(estimatesPage).not.toContain("NewEstimateForm");
    expect(estimatesPage).not.toContain("EstimateListCard");
    // P-1.1: the client list row is the sensitive-column-free DTO, no longer the
    // full Supabase estimates row (finding F9).
    expect(projectEstimatesTable).toContain("export type ProjectEstimateTableRow = ProjectEstimateListRow");
    expect(projectEstimatesTable).not.toContain('Tables<"estimates">');
    expect(projectEstimatesTable).toContain("function getEstimateHref");
    expect(projectEstimatesTable).toContain('`/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`');
    expect(projectEstimatesTable).not.toContain('header: "Scope"');
    expect(projectEstimatesTable).not.toContain("ProjectEstimateScopeCell");
    expect(projectDashboardPage).not.toContain("ButtonLink");
    expect(workspaceRepository).toContain("type ProjectEstimatesListResult");
    expect(workspaceRepository).toContain("nodeCountByEstimateId: Map<string, number>");
    expect(workspaceRepository).toContain("rowCountByEstimateId: Map<string, number>");
    expect(workspaceRepository).toContain("createEmptyProjectEstimateSummaryMaps");
  });
});
