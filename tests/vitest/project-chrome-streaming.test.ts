import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const layout = readFileSync(
  path.resolve(__dirname, "../../src/app/workshop/projects/[projectId]/layout.tsx"),
  "utf8",
);
const chrome = readFileSync(
  path.resolve(__dirname, "../../src/components/workshop/ProjectChromeAsync.tsx"),
  "utf8",
);

describe("project header chrome streaming (F5 / P1-2)", () => {
  it("streams ProjectChromeAsync behind Suspense in the actions slot", () => {
    expect(layout).toContain("<Suspense fallback={<ProjectHeaderChromeSkeleton />}>");
    expect(layout).toContain("<ProjectChromeAsync projectId={projectId} liveProject={liveProject} />");
  });

  it("moves the collaboration/publication/sheets fan-out out of the layout critical path", () => {
    expect(layout).not.toContain("getProjectCollaborationSummary");
    expect(layout).not.toContain("getProjectPublicationSummary");
    expect(chrome).toContain("getProjectCollaborationSummary(projectId)");
    expect(chrome).toContain("getProjectPublicationSummary(projectId)");
    expect(chrome).toContain("listProjectEstimateSheets(projectId)");
  });

  it("renders both header components and the project cursor layer from the streamed chrome", () => {
    expect(chrome).toContain("<ProjectPublicationHeader");
    expect(chrome).toContain("<ProjectTeamspaceHeader");
    // Teamspace cursor layer moved into the streamed chrome so it reuses the
    // resolved collaboration identity without blocking shell paint.
    expect(chrome).toContain("<ProjectCursorLayer");
    expect(layout).not.toContain("<ProjectCursorLayer");
  });
});
