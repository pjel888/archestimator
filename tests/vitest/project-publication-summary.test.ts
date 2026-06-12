import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
const publicationHeader = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");
const teamspaceHeader = readFileSync("src/components/workshop/ProjectTeamspaceHeader.tsx", "utf8");

describe("project publication integration contract (Shared Link V2)", () => {
  it("keeps publication separate from private Teamspaces membership", () => {
    expect(layout).toContain("getProjectPublicationSummary(projectId)");
    expect(layout).toContain("<ProjectPublicationHeader");
    expect(layout).toContain("summary={publicationSummary}");
    expect(layout).toContain("currentUserEmail={currentUserEmail}");
    expect(layout).toContain("projectEstimateSheets={projectEstimateSheets}");
    expect(publicationHeader).toContain("ProjectPublicationHeader({ summary");
    expect(publicationHeader).toContain('data-workshop-layout="project-publication-header"');
    expect(publicationHeader).toContain('title="Shared link"');
    expect(teamspaceHeader).toContain("Private project link");
    expect(teamspaceHeader).toContain("Copy private link");
    expect(teamspaceHeader).not.toContain("Share page");
    expect(teamspaceHeader).not.toContain("Shared link");
  });
});
