import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Storybook component coverage", () => {
  it("verifies required standalone stories from actual story files", () => {
    const output = execFileSync("node", ["scripts/check-storybook-component-coverage.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(output).toContain("Actual story files:");
    expect(output).toContain("Required standalone titles checked:");
    expect(output).toContain("Storybook component coverage OK");
  });
});
