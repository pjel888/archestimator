import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const collaborationTypes = readFileSync("src/lib/collaboration/types.ts", "utf8");
const projectLayout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
const projectChrome = readFileSync("src/components/workshop/ProjectChromeAsync.tsx", "utf8");

describe("project collaboration summary contract", () => {
  it("keeps project and estimate collaboration facts server-fed and realtime-ready", () => {
    expect(collaborationTypes).toContain('export type CollaborationRole = "owner" | "admin" | "editor" | "viewer";');
    expect(collaborationTypes).toContain("type ProjectCollaboratorSource");
    expect(collaborationTypes).toContain("ProjectCollaborationSummary");
    expect(collaborationTypes).toContain('projectChannel: `project:${string}`');
    expect(collaborationTypes).toContain('estimateChannelPrefix: "estimate:"');
    expect(workspaceRepository).toContain("export async function getProjectCollaborationSummary");
    expect(workspaceRepository).toContain("mapWorkspaceRoleToCollaborationRole");
    expect(workspaceRepository).toContain("readOptionalProjectMembers");
    expect(workspaceRepository).toContain("readOptionalEstimateSheetMembers");
    expect(workspaceRepository).toContain('projectChannel: `project:${projectId}`');
    expect(workspaceRepository).toContain('estimateChannelPrefix: "estimate:"');
    // P1-2: the collaboration fan-out + teamspace header moved into the streamed
    // ProjectChromeAsync; the layout streams it behind Suspense in the actions slot.
    expect(projectLayout).toContain("actions={");
    expect(projectLayout).toContain("<ProjectChromeAsync");
    expect(projectChrome).toContain("getProjectCollaborationSummary(projectId)");
    expect(projectChrome).toContain("<ProjectTeamspaceHeader summary={collaborationSummary} />");
  });
});
