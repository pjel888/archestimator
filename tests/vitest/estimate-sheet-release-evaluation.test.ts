import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { RELEASE_EVALUATION_SCHEMA } from "../../scripts/lib/estimate-sheet-performance-contract";

const scriptPath = resolve(process.cwd(), "scripts/write-estimate-sheet-release-evaluation.ts");
const describeRelease = describe.skipIf(!existsSync(scriptPath));

describeRelease("estimate-sheet release evaluation contract", () => {
  it("writes the dedicated release schema and maps evaluator status", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain(RELEASE_EVALUATION_SCHEMA);
    expect(source).toMatch(/READY/);
    expect(source).toMatch(/NOT_READY/);
    expect(source).toMatch(/BLOCKED/);
  });

  it("keeps hosted proof and release-gate receipts as dependencies", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/hosted|observability/i);
    expect(source).toMatch(/release-gates|release.*gate/i);
    expect(source).toMatch(/sha256|fingerprint/i);
    expect(source).toMatch(/dependency|receipt/i);
  });
});

