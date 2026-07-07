import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dependabotConfig = readFileSync(".github/workflows-disabled/dependabot.yml", "utf8");
const codeqlWorkflow = readFileSync(".github/workflows-disabled/codeql.yml", "utf8");
const codeqlConfig = readFileSync(".github/codeql/codeql-config.yml", "utf8");

describe("security automation config", () => {
  it("preserves disabled Dependabot config for package and workflow ecosystems", () => {
    expect(dependabotConfig).toContain("package-ecosystem: npm");
    expect(dependabotConfig).toContain("package-ecosystem: github-actions");
    expect(dependabotConfig).toContain("open-pull-requests-limit: 5");
    expect(dependabotConfig).toContain("timezone: Asia/Manila");
  });

  it("preserves disabled pinned CodeQL analysis for JavaScript and TypeScript", () => {
    expect(codeqlWorkflow).toContain("security-events: write");
    expect(codeqlWorkflow).toContain("runs-on: ubuntu-24.04");
    expect(codeqlWorkflow).toContain("github/codeql-action/init@411bbbe57033eedfc1a82d68c01345aa96c737d7");
    expect(codeqlWorkflow).toContain("github/codeql-action/analyze@411bbbe57033eedfc1a82d68c01345aa96c737d7");
    expect(codeqlWorkflow).toContain("languages: javascript-typescript");
    expect(codeqlWorkflow).toContain("config-file: ./.github/codeql/codeql-config.yml");
    expect(codeqlConfig).toContain("security-extended");
    expect(codeqlConfig).toContain("security-and-quality");
  });
});
