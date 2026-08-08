import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const qualityWorkflow = readFileSync(".github/workflows/quality.yml", "utf8");
const releaseEvidenceWorkflow = readFileSync(".github/workflows/release-evidence.yml", "utf8");
const dependencyReviewWorkflow = readFileSync(".github/workflows/dependency-review.yml", "utf8");
const workflowSources = readdirSync(".github/workflows")
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .map((name) => readFileSync(`.github/workflows/${name}`, "utf8"));
const thirdPartyActionReference = /uses:\s+(?!\.\/)([^\s@]+)@([^\s#]+)/g;

describe("CI workflow source", () => {
  it("pins every third-party action to an immutable commit", () => {
    const references = workflowSources
      .flatMap((workflow) => [...workflow.matchAll(thirdPartyActionReference)]);

    expect(references.length).toBeGreaterThanOrEqual(20);
    expect(references.every((match) => /^[0-9a-f]{40}$/u.test(match[2] ?? ""))).toBe(true);
  });

  it("runs the quality matrix only when manually dispatched", () => {
    expect(qualityWorkflow).toContain("  workflow_dispatch:");
    expect(qualityWorkflow).not.toContain("  pull_request:");
    expect(qualityWorkflow).not.toContain("  push:");
    expect(qualityWorkflow).not.toContain("  schedule:");
    expect(qualityWorkflow).not.toContain("pull_request_target");
    expect(qualityWorkflow).toContain("bun scripts/quality/classify.ts");
    expect(qualityWorkflow).toContain("Q2_CRITICAL_CHANGE_GATE");
    expect(qualityWorkflow).toContain("Q3_RELEASE_GATE");
  });

  it("keeps every repository workflow manual-only", () => {
    for (const workflow of workflowSources) {
      expect(workflow).toContain("  workflow_dispatch:");
      expect(workflow).not.toContain("  pull_request:");
      expect(workflow).not.toContain("  push:");
      expect(workflow).not.toContain("  schedule:");
      expect(workflow).not.toContain("  repository_dispatch:");
      expect(workflow).not.toContain("  workflow_call:");
    }
  });

  it("fails closed through one aggregate quality gate", () => {
    expect(qualityWorkflow).toContain("name: quality / gate");
    expect(qualityWorkflow).toContain("if: ${{ always() }}");
    expect(qualityWorkflow).toContain("Build immutable job-result input");
    expect(qualityWorkflow).toContain("bun scripts/quality/aggregate.ts");
    expect(qualityWorkflow).toContain("--output artifacts/quality/aggregate.json");
  });

  it("packages release evidence only for the trusted main dispatch commit", () => {
    expect(releaseEvidenceWorkflow).toContain("workflow_dispatch:");
    expect(releaseEvidenceWorkflow).toContain("commit_sha:");
    expect(releaseEvidenceWorkflow).toContain("TRUSTED_REF: ${{ github.ref }}");
    expect(releaseEvidenceWorkflow).toContain("TRUSTED_SHA: ${{ github.sha }}");
    expect(releaseEvidenceWorkflow).toContain('test "$TRUSTED_REF" = "refs/heads/main"');
    expect(releaseEvidenceWorkflow).toContain(
      'test "${CANDIDATE_SHA,,}" = "${TRUSTED_SHA,,}"',
    );
    expect(releaseEvidenceWorkflow).toContain("ref: ${{ github.sha }}");
    expect(releaseEvidenceWorkflow).not.toContain("ref: ${{ inputs.commit_sha }}");
    expect(releaseEvidenceWorkflow).toContain("Verify checkout identity");
    expect(releaseEvidenceWorkflow).toContain("bun run quality:release");
    expect(releaseEvidenceWorkflow).toContain("bun run cf:build");
    expect(releaseEvidenceWorkflow).toContain("release-candidate.tgz.sha256");
    expect(releaseEvidenceWorkflow).toContain("actions/attest-build-provenance@43d14bc2b83dec42d39ecae14e916627a18bb661");
  });
});
