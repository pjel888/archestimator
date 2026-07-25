import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dependabotConfig = readFileSync(".github/dependabot.yml", "utf8");
const codeqlPullRequestWorkflow = readFileSync(".github/workflows/codeql-pr.yml", "utf8");
const codeqlUploadWorkflow = readFileSync(".github/workflows/codeql-upload.yml", "utf8");
const codeqlConfig = readFileSync(".github/codeql/codeql-config.yml", "utf8");

describe("security automation config", () => {
  it("enables Dependabot for package and workflow ecosystems", () => {
    expect(dependabotConfig).toContain("package-ecosystem: npm");
    expect(dependabotConfig).toContain("package-ecosystem: github-actions");
    expect(dependabotConfig).toContain("open-pull-requests-limit: 5");
    expect(dependabotConfig).toContain("timezone: Asia/Manila");
  });

  it("keeps pinned CodeQL analysis split between pull-request proof and authorized upload", () => {
    expect(codeqlPullRequestWorkflow).toContain("upload: never");
    expect(codeqlPullRequestWorkflow).not.toContain("security-events: write");
    expect(codeqlUploadWorkflow).toContain("security-events: write");
    for (const workflow of [codeqlPullRequestWorkflow, codeqlUploadWorkflow]) {
      expect(workflow).toContain("runs-on: ubuntu-24.04");
      expect(workflow).toContain("github/codeql-action/init@adfda868f108ac4222129de456ea554034a27db7");
      expect(workflow).toContain("github/codeql-action/analyze@adfda868f108ac4222129de456ea554034a27db7");
      expect(workflow).toContain("languages: javascript-typescript");
      expect(workflow).toContain("config-file: ./.github/codeql/codeql-config.yml");
    }
    expect(codeqlConfig).toContain("security-extended");
    expect(codeqlConfig).toContain("security-and-quality");
  });
});
