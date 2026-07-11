import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/workshop/projects/[projectId]/team/page.tsx", "utf8");
const chrome = readFileSync("src/components/workshop/ProjectChromeAsync.tsx", "utf8");

describe("project team access route", () => {
  it("uses the project authorization boundary and exposes a dedicated header entry", () => {
    expect(route).toContain("getProjectCollaborationSummary(projectId)");
    expect(route).not.toContain("getCurrentWorkspaceProject(projectId)");
    expect(route).toContain("ProjectTeamAccessPanel");
    expect(chrome).toContain("getProjectTeamAccessHref");
    expect(chrome).toContain('data-project-team-access-link="true"');
    expect(chrome).toContain("/team");
  });
});
