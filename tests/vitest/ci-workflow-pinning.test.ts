import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/release.yml", "utf8");
const dependencyReviewWorkflow = readFileSync(".github/workflows/dependency-review.yml", "utf8");
const actionReference = /uses:\s+[^\s@]+@([0-9a-f]{40})/g;
const usesReference = /uses:\s+([^\s]+)/g;

describe("CI workflow source", () => {
  it("uses only pinned third-party actions and frozen Bun installs", () => {
    const pins = [...ciWorkflow.matchAll(actionReference), ...dependencyReviewWorkflow.matchAll(actionReference)];
    const uses = [...ciWorkflow.matchAll(usesReference), ...dependencyReviewWorkflow.matchAll(usesReference)];

    expect(pins.length).toBeGreaterThanOrEqual(9);
    expect(uses.every((match) => /@[0-9a-f]{40}$/.test(match[1]))).toBe(true);
    expect(ciWorkflow).toContain("bun install --frozen-lockfile");
    expect(ciWorkflow).not.toContain("continue-on-error");
  });

  it("uses fork-safe pull request and push triggers with a strict aggregate check", () => {
    expect(ciWorkflow).toContain("  pull_request:");
    expect(ciWorkflow).toContain("  push:");
    expect(ciWorkflow).not.toContain("pull_request_target");
    expect(ciWorkflow).not.toContain("merge_group");
    expect(ciWorkflow).toContain("bun run type-check");
    expect(ciWorkflow).toContain("TYPECHECK_RESULT");
    expect(ciWorkflow).toContain('test "$BUILD_RESULT" = success');
  });

  it("generates and uploads the immutable release artifacts after required checks", () => {
    expect(ciWorkflow).toContain("release-candidate:");
    expect(ciWorkflow).toContain("needs: [required]");
    expect(ciWorkflow).toContain("bun run cf:build");
    expect(ciWorkflow).toContain("scripts/generate-release-candidate-artifact.ts");
    expect(ciWorkflow).toContain("release-candidate-metadata.json");
    expect(ciWorkflow).toContain("worker-input-paths.json");
    expect(ciWorkflow).toContain("release-candidate-payload-digest.json");
    expect(ciWorkflow).toContain("actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02");
    expect(ciWorkflow).toContain("name: release-candidate-${{ github.run_id }}");
  });

  it("recomputes the downloaded candidate payload before metadata admission", () => {
    expect(releaseWorkflow).toContain("release-candidate-payload-digest.json");
    expect(releaseWorkflow).toContain("--verify-upload-payload true");
    expect(releaseWorkflow.indexOf("--verify-upload-payload true")).toBeLessThan(
      releaseWorkflow.indexOf("scripts/lib/release-candidate-metadata.ts"),
    );
  });
});
