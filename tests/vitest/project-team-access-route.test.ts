import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/workshop/projects/[projectId]/team/page.tsx", "utf8");
const chrome = readFileSync("src/components/workshop/ProjectChromeAsync.tsx", "utf8");
const teamE2e = readFileSync("e2e/project-team-access.spec.ts", "utf8");
const corporateE2e = readFileSync("e2e/corporate-accounts-admin.spec.ts", "utf8");

describe("project team access route", () => {
  it("uses the project authorization boundary and exposes a dedicated header entry", () => {
    expect(route).toContain("getProjectCollaborationSummary(projectId)");
    expect(route).not.toContain("getCurrentWorkspaceProject(projectId)");
    expect(route).toContain("ProjectTeamAccessPanel");
    expect(chrome).toContain("getProjectTeamAccessHref");
    expect(chrome).toContain('data-project-team-access-link="true"');
    expect(chrome).toContain("/team");
  });

  it("requires explicit authenticated fixtures for the Team and Corporate browser journeys", () => {
    expect(teamE2e).toContain("ARCHESTIMATOR_E2E_TEAM_PROJECT_ID");
    expect(corporateE2e).toContain("ARCHESTIMATOR_E2E_CORPORATE_WORKSPACE_ID");
    expect(teamE2e).toContain("isLocalDevAuthBypassReady(auth)");
    expect(corporateE2e).toContain("isLocalDevAuthBypassReady(auth)");
  });
});
