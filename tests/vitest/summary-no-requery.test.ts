import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// F7 (redundant projects re-query) is solved by reusing the request-cached
// project row inside the collaboration + publication summaries. The
// collaboration path cannot call getCurrentWorkspaceProject because direct
// sheet managers must remain eligible for its estimate-scoped summary.
const source = readFileSync(
  path.resolve(__dirname, "../../src/lib/repositories/workspace-repository.ts"),
  "utf8",
);

function summaryBody(fnSignature: string) {
  const start = source.indexOf(fnSignature);
  expect(start, `${fnSignature} should exist`).toBeGreaterThan(-1);
  return source.slice(start, start + 900);
}

describe("collaboration/publication summaries reuse the cached project (F7)", () => {
  it("collaboration summary reuses the project row without whole-project authorization", () => {
    const body = summaryBody("export async function getProjectCollaborationSummary(projectId: string)");
    expect(body).toContain("getCachedWorkspaceProjectRow(projectId)");
    expect(body).not.toContain("getCurrentWorkspaceProject(projectId)");
    expect(body).not.toContain('.from("projects")');
  });

  it("publication summary uses the cached project lookup, not a raw projects re-query", () => {
    const body = summaryBody("async function getProjectPublicationSummary(\n  projectId: string,");
    expect(body).toContain("await getCurrentWorkspaceProject(projectId)");
    expect(body).not.toContain('.from("projects")');
  });

  it("dedupes project_members across both summaries via a request-cached helper", () => {
    expect(source).toContain("const getCachedWorkspaceProjectRow = cache(");
    expect(source).toContain("const getCachedProjectMembers = cache(");
  });
});
