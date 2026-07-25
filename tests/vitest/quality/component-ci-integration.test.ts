import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const qualityWorkflow = readFileSync(".github/workflows/quality.yml", "utf8");
const jobResultsBuilder = readFileSync(
  "scripts/quality/ci/build-job-results.mjs",
  "utf8",
);

function componentJobSource(): string {
  const start = qualityWorkflow.indexOf("  component:");
  const end = qualityWorkflow.indexOf("\n  property:", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return qualityWorkflow.slice(start, end);
}

describe("component CI integration", () => {
  it("downloads the immutable classification artifact before profile dispatch", () => {
    const componentJob = componentJobSource();

    expect(componentJob).toContain("needs: classify");
    expect(componentJob).toContain("name: Download classification");
    expect(componentJob).toContain(
      "name: quality-classification-${{ github.run_id }}-${{ github.run_attempt }}",
    );
    expect(componentJob).toContain("path: artifacts/quality");
    expect(componentJob.indexOf("name: Download classification")).toBeLessThan(
      componentJob.indexOf("name: Run selected component tier"),
    );
  });

  it("dispatches every executable profile to its matching component lane and fails closed otherwise", () => {
    const componentJob = componentJobSource();

    expect(componentJob).toContain(
      "Q1_CHANGE_GATE) bun run test:component:change ;;",
    );
    expect(componentJob).toContain(
      "Q2_CRITICAL_CHANGE_GATE) bun run test:component:critical ;;",
    );
    expect(componentJob).toContain(
      "Q3_RELEASE_GATE) bun run test:component:release ;;",
    );
    expect(componentJob).toContain('echo "Unsupported component profile: $QUALITY_PROFILE"');
    expect(componentJob).toContain("exit 1");
    expect(componentJob).not.toContain("bun run test:component:coverage");
  });

  it("uploads both component lanes without changing aggregate job traceability", () => {
    const componentJob = componentJobSource();

    expect(componentJob).toContain("artifacts/quality/component.json");
    expect(componentJob).toContain("artifacts/quality/component-strict.vitest.json");
    expect(componentJob).toContain("artifacts/quality/component-full.vitest.json");
    expect(componentJob).toContain("artifacts/coverage/component-strict/**");
    expect(componentJob).toContain("artifacts/coverage/component/**");
    expect(jobResultsBuilder).toContain(
      '["quality / component", "COMPONENT", "component", "component.json"]',
    );
  });
});
