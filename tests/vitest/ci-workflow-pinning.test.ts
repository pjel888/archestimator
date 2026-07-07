import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const workflowPaths = [
  ".github/workflows-disabled/ci.yml",
  ".github/workflows-disabled/codeql.yml",
  ".github/workflows-disabled/react-doctor.yml",
] as const;
const workflowTextByPath = workflowPaths.map((path) => [path, readFileSync(path, "utf8")] as const);
const workflowText = workflowTextByPath.map(([, text]) => text).join("\n");

describe("disabled CI workflow pinning", () => {
  it("uses fixed GitHub-hosted runners and Bun version", () => {
    expect(workflowText).not.toContain("ubuntu-latest");
    expect(workflowText).not.toMatch(/bun-version:\s*latest\b/);
    expect(workflowText).toContain("runs-on: ubuntu-24.04");
    expect(workflowText).toContain("bun-version: 1.3.14");
  });

  it("pins external actions by immutable 40-character commit SHA", () => {
    const usesSpecs = [...workflowText.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);

    expect(usesSpecs.length).toBeGreaterThan(0);
    for (const usesSpec of usesSpecs) {
      expect(usesSpec).toMatch(/^[^@\s]+@[0-9a-f]{40}$/);
    }
  });
});
