import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURE_PROFILES } from "../../scripts/lib/estimate-sheet-performance-contract";

const scriptPath = resolve(process.cwd(), "scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts");
const describeHosted = describe.skipIf(!existsSync(scriptPath));

describeHosted("estimate-sheet hosted D1 proof producer", () => {
  it("targets the bound ARCH_DB through remote Wrangler execution", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/ARCH_DB/);
    expect(source).toMatch(/--remote|remote/);
    expect(source).toMatch(/wrangler|d1 execute/i);
    expect(source).toMatch(/hosted-d1/);
  });

  it("records exact fixture cleanup instead of prefix deletion", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/cleanup|delete/i);
    expect(source).toMatch(/eleven|11/);
    expect(source).not.toMatch(/LIKE\s+['\"]%|prefix/i);
    expect(FIXTURE_PROFILES.limit).toBe(5_000);
  });
});

