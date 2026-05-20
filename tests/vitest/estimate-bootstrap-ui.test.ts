import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimatesPage = readFileSync("src/app/workshop/projects/[projectId]/estimates/page.tsx", "utf8");
const projectEstimatesClient = readFileSync("src/components/workshop/ProjectEstimatesClient.tsx", "utf8");
const newEstimateForm = readFileSync("src/components/workshop/NewEstimateForm.tsx", "utf8");
const projectEstimatesTable = readFileSync("src/components/workshop/ProjectEstimatesTable.tsx", "utf8");
const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("estimate bootstrap UI governance", () => {
  it("uses shared primitives for estimate creation controls", () => {
    expect(newEstimateForm).toContain('from "@/components/ui/button"');
    expect(newEstimateForm).toContain('from "@/components/ui/control-input"');
    expect(newEstimateForm).not.toContain("<button");
    expect(newEstimateForm).not.toContain("<input");
  });

  it("renders live Supabase estimate cards and project estimate navigation", () => {
    expect(estimatesPage).toContain("ProjectEstimatesClient");
    expect(projectEstimatesClient).toContain("ProjectEstimatesTable");
    expect(projectEstimatesClient).toContain("HeaderIconToolbar");
    expect(projectEstimatesClient).toContain("SearchInput");
    expect(projectEstimatesClient).toContain("Search Estimate Sheets");
    expect(estimatesPage).not.toContain("NewEstimateForm");
    expect(estimatesPage).not.toContain("EstimateListCard");
    expect(projectEstimatesTable).toContain('type ProjectEstimateTableRow = Tables<"estimates"> &');
    expect(projectEstimatesTable).toContain("function getEstimateHref");
    expect(projectEstimatesTable).not.toContain('header: "Scope"');
    expect(projectEstimatesTable).not.toContain("ProjectEstimateScopeCell");
    expect(projectDashboardPage).not.toContain("ButtonLink");
    expect(workspaceRepository).toContain("type ProjectEstimatesListResult");
    expect(workspaceRepository).toContain("nodeCountByEstimateId: Map<string, number>");
    expect(workspaceRepository).toContain("rowCountByEstimateId: Map<string, number>");
    expect(workspaceRepository).toContain("createEmptyProjectEstimateSummaryMaps");
  });
});
