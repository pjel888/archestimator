import { describe, expect, it } from "vitest";

import {
  ESTIMATE_PERF_FIXTURE_PROFILES,
  ESTIMATE_PERF_FIXTURE_SCHEMA,
  buildEstimatePerformanceFixture,
  fixturePayloadWithoutLinkage,
  flattenEstimatePerformanceNodes,
  stableStringify,
} from "../fixtures/estimate-sheet-performance";

describe("estimate-sheet performance fixtures", () => {
  it.each([
    ["small", 50],
    ["medium", 500],
    ["large", 1_000],
    ["stress", 2_500],
    ["limit", 5_000],
    ["over-limit", 5_001],
    ["realistic-skew", 5_000],
  ] as const)("generates the declared %s row profile", (profile, rowCount) => {
    const fixture = buildEstimatePerformanceFixture(profile);
    expect(fixture.schemaVersion).toBe(ESTIMATE_PERF_FIXTURE_SCHEMA);
    expect(fixture.profile).toBe(profile);
    expect(fixture.rows).toHaveLength(rowCount);
    expect(fixture.expectedTotals.rowCount).toBe(rowCount);
    expect(fixture.expectedTotals.nodeCount).toBe(fixture.distribution.nodes);
    expect(fixture.expectedTotals.componentMatchCount).toBe(
      ESTIMATE_PERF_FIXTURE_PROFILES[profile].componentMatchRows,
    );
    expect(fixture.fingerprints.application).not.toHaveLength(0);
    expect(fixture.fingerprints.producer).not.toHaveLength(0);
  });

  it("is byte deterministic for the same profile and seed", () => {
    const first = buildEstimatePerformanceFixture("limit", { seed: "contract-seed" });
    const second = buildEstimatePerformanceFixture("limit", { seed: "contract-seed" });
    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(stableStringify(fixturePayloadWithoutLinkage(first))).toBe(
      stableStringify(fixturePayloadWithoutLinkage(second)),
    );
  });

  it("changes the generated payload when the seed changes", () => {
    const first = buildEstimatePerformanceFixture("medium", { seed: "seed-a" });
    const second = buildEstimatePerformanceFixture("medium", { seed: "seed-b" });
    expect(stableStringify(fixturePayloadWithoutLinkage(first))).not.toBe(
      stableStringify(fixturePayloadWithoutLinkage(second)),
    );
  });

  it("records a complete node/depth/branch and row/revision/component census", () => {
    const fixture = buildEstimatePerformanceFixture("realistic-skew");
    const nodes = flattenEstimatePerformanceNodes(fixture);
    expect(nodes).toHaveLength(ESTIMATE_PERF_FIXTURE_PROFILES["realistic-skew"].nodes);
    expect(nodes.every((node) => node.id.startsWith("node-realistic-skew-"))).toBe(true);
    expect(fixture.distribution.nodes).toBe(nodes.length);
    expect(fixture.distribution.rows).toBe(fixture.rows.length);
    expect(Object.values(fixture.distribution.depth).reduce((sum, value) => sum + value, 0)).toBe(nodes.length);
    expect(Object.values(fixture.distribution.branches).reduce((sum, value) => sum + value, 0)).toBe(nodes.length);
    expect(Object.values(fixture.distribution.revisions).reduce((sum, value) => sum + value, 0)).toBe(fixture.rows.length);
    expect(Object.values(fixture.distribution.componentMatches).reduce((sum, value) => sum + value, 0)).toBe(fixture.rows.length);
    expect(fixture.rows.filter((row) => row.componentIdentity !== null)).toHaveLength(1_000);
  });

  it("keeps the limit fixture within the 1,500-node ceiling and over-limit row count explicit", () => {
    const limit = buildEstimatePerformanceFixture("limit");
    const overLimit = buildEstimatePerformanceFixture("over-limit");
    expect(flattenEstimatePerformanceNodes(limit)).toHaveLength(1_500);
    expect(flattenEstimatePerformanceNodes(overLimit)).toHaveLength(1_500);
    expect(limit.rows).toHaveLength(5_000);
    expect(overLimit.rows).toHaveLength(5_001);
  });

  it("does not include customer identifiers or mutable linkage in its default payload", () => {
    const fixture = buildEstimatePerformanceFixture("small");
    const serialized = stableStringify(fixturePayloadWithoutLinkage(fixture));
    expect(serialized).not.toMatch(/@|customer|bearer|cookie|secret|token/i);
    expect(fixture.linkage.counterpartPayloadSha256).toBeNull();
    expect(fixture.linkage.bundleSha256).toBeNull();
  });
});

