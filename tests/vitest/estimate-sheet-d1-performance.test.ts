import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURE_PROFILES } from "../../scripts/lib/estimate-sheet-performance-contract";
import { buildEstimatePerformanceFixture } from "../fixtures/estimate-sheet-performance";

const scriptPath = resolve(process.cwd(), "scripts/measure-estimate-sheet-d1.ts");
const describeD1 = describe.skipIf(!existsSync(scriptPath));

describeD1("estimate-sheet local D1 performance contract", () => {
  it("declares the local-d1 evidence class and the 1,500-node row-load shape", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/local-d1/);
    expect(source).toMatch(/measureEstimateSheetPerformance|FIXTURE_PROFILES|limit/);
    expect(source).toMatch(/bind/i);
    expect(source).toMatch(/query|statement/i);
    expect(source).toMatch(/plan|cleanup/i);
  });

  it("provides enough nodes and rows for the declared D1 stress shape", () => {
    const fixture = buildEstimatePerformanceFixture("limit");
    expect(fixture.expectedTotals.nodeCount).toBe(1_500);
    expect(fixture.expectedTotals.rowCount).toBe(FIXTURE_PROFILES.limit);
    expect(fixture.nodes.length).toBeGreaterThan(0);
  });

  it("keeps local D1 measurement free of browser-only resource declarations", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).not.toMatch(/PLAYWRIGHT_STORAGE_STATE/);
    expect(source).not.toMatch(/baseURL\s*:/);
  });
});
