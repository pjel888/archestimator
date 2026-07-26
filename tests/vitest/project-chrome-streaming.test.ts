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
    expect(layout).toContain("<ProjectChromeAsync projectId={projectId} />");
  });

  it("moves the collaboration/publication fan-out out of the layout critical path", () => {
    expect(layout).toContain("<ProjectTitleAsync projectId={projectId} />");
    expect(layout).toContain('withPerfTraceRequest("workshop.project-layout-title"');
    expect(layout).toContain('traced("project-layout.title"');
    expect(layout).not.toContain('traced("project-layout.project"');
    expect(layout).not.toContain("getProjectCollaborationSummary");
    expect(layout).not.toContain("getProjectPublicationSummary");
    expect(chrome).toContain("ProjectChromeAsync.project");
    expect(chrome).toContain("getCurrentWorkspaceProject(projectId)");
    expect(chrome).toContain("getProjectPublicationSummary(projectId)");
    expect(chrome).not.toContain("listProjectEstimateSheets(projectId)");
  });

  it("renders Share and project-team actions from the streamed chrome", () => {
    expect(chrome).not.toContain("isPublisherEnabled()");
    expect(chrome).not.toContain("if (!publisherEnabled)");
    expect(chrome).toContain("getPublisherProjectHref(projectId)");
    expect(chrome).toContain("/workshop/publisher");
    expect(chrome).toContain("drawer: projectId");
    expect(chrome).toContain('params.set("tab", tab)');
    expect(chrome).toContain("getProjectTeamAccessHref(projectId)");
    expect(chrome).toContain("/workshop/projects/${encodeURIComponent(projectId)}/team");
    expect(chrome).toContain("canOpenPublisherDrawer");
    expect(chrome).toContain("publicationSummary?.canReadPublisherRoster");
    expect(chrome).toContain('publicationSummary.status !== "unpublished"');
    expect(chrome).toContain('data-publisher-project-link="publication"');
    expect(chrome).toContain('data-project-team-access-link="true"');
    expect(chrome).toContain('data-workshop-layout="project-publication-header"');
    expect(chrome).toContain('data-workshop-layout="project-teamspace-header"');
    expect(chrome).not.toContain("<ProjectPublicationHeader");
    expect(chrome).not.toContain("<ProjectTeamspaceHeader");
  });

  it("keeps the project cursor layer from the streamed chrome", () => {
    // Teamspace cursor layer moved into the streamed chrome so it reuses the
    // resolved collaboration identity without blocking shell paint.
    expect(chrome).toContain("<ProjectCursorLayer");
    expect(layout).not.toContain("<ProjectCursorLayer");
  });

  // Req 1 / D2: the relocated estimate "Activity" + "Preview Excel Export"
  // triggers mount inside the same single chrome wrapper, beside Share. The
  // component renders nothing until the estimate page registers into the shared
  // store, so it is hydration-safe inside this slot.
  it("mounts the relocated estimate header actions inside the chrome wrapper", () => {
    expect(chrome).toContain("<EstimateHeaderActions />");
  });

  // Regression guard for the hydration mismatch where the server rendered the
  // settings <button> at the slot the client expected the notification <div>.
  // Root cause: the resolved chrome returned a multi-node fragment while the
  // Suspense fallback was a single node, so the streaming swap shifted the
  // toolbar siblings by one. Both the resolved chrome and its fallback must
  // occupy exactly ONE top-level node (a `flex items-center gap-1` wrapper).
  it("keeps the streamed chrome and its skeleton at one top-level node (hydration safety)", () => {
    // Resolved chrome wraps its header components in a single element...
    expect(chrome).toContain('<div className="flex items-center gap-1">');
    // ...and must NOT return a bare multi-node fragment again.
    expect(chrome).not.toMatch(/return\s*\(\s*<>/);
    // The fallback skeleton mirrors that single-wrapper shape.
    expect(chrome).toMatch(
      /ProjectHeaderChromeSkeleton[\s\S]*?className="flex items-center gap-1"[\s\S]*?data-testid="project-header-chrome-skeleton"/,
    );
  });
});
