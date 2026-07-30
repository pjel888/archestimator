import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("project artifact authorization contract", () => {
  it("requires whole-project access for unrestricted artifact metadata and content", () => {
    const source = readFileSync(
      "src/app/api/projects/[projectId]/artifacts/_route-core.ts",
      "utf8",
    );

    expect(source).toContain("canAccessWholeProjectInD1(database, projectId, currentUser)");
    expect(source).not.toContain("canAccessProjectInD1(database, projectId, currentUser)");
  });
});
