import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
const header = readFileSync("src/components/workshop/ProjectWorkspaceHeaderRow.tsx", "utf8");
const teamspaceHeader = readFileSync("src/components/workshop/ProjectTeamspaceHeader.tsx", "utf8");

describe("project publication integration contract", () => {
  it("keeps publication separate from private Teamspaces membership", () => {
    expect(layout).toContain("getProjectPublicationSummary(projectId)");
    expect(layout).toContain("publicationSummary={publicationSummary}");
    expect(header).toContain("ProjectPublicationHeader");
    expect(header).toContain("publicationSummary");
    expect(teamspaceHeader).toContain("Private project link");
    expect(teamspaceHeader).toContain("Copy private link");
    expect(teamspaceHeader).not.toContain("Share page");
    expect(teamspaceHeader).not.toContain("Project share link");
  });
});
