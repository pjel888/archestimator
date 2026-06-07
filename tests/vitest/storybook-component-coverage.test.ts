import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { collectCoverage, evaluateCoverage } from "../../scripts/check-storybook-component-coverage.mjs";

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

  it("rejects local wrapper stories without explicit contract metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "archestimator-storybook-coverage-"));
    const storyRoot = join(root, "src/stories/actions");

    try {
      mkdirSync(storyRoot, { recursive: true });
      writeFileSync(
        join(storyRoot, "button.stories.tsx"),
        `const LocalPreview = () => null;

const meta = {
  title: "Actions/Button",
  component: LocalPreview,
};

export default meta;
export const Default = {};
`,
      );

      const coverage = collectCoverage({
        root,
        storyRoot: join(root, "src/stories"),
        requiredStories: [{ title: "Actions/Button", exports: ["Default"] }],
        requiredTopLevelGroups: ["Actions"],
      });

      expect(evaluateCoverage(coverage)).toEqual([
        {
          heading: "Missing repo component linkage or explicit fixture/composition contract:",
          items: ["Actions/Button (src/stories/actions/button.stories.tsx) uses local LocalPreview"],
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts local wrapper stories with explicit contract metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "archestimator-storybook-coverage-"));
    const storyRoot = join(root, "src/stories/actions");

    try {
      mkdirSync(storyRoot, { recursive: true });
      writeFileSync(
        join(storyRoot, "button.stories.tsx"),
        `const LocalPreview = () => null;

const meta = {
  title: "Actions/Button",
  component: LocalPreview,
  parameters: {
    archestimator: {
      storybookContract: "story-composition",
    },
  },
};

export default meta;
export const Default = {};
`,
      );

      const coverage = collectCoverage({
        root,
        storyRoot: join(root, "src/stories"),
        requiredStories: [{ title: "Actions/Button", exports: ["Default"] }],
        requiredTopLevelGroups: ["Actions"],
      });

      expect(evaluateCoverage(coverage)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
