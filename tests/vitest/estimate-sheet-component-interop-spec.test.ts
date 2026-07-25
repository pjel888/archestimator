import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("e2e/estimate-sheet-mvp.spec.ts", "utf8");

describe("estimate-sheet MVP browser specification", () => {
  it("keeps the integrated estimate workflow serial and retry-free", () => {
    expect(source).toContain('test.describe("Estimate Sheet MVP"');
    expect(source).toContain('test.describe.configure({ mode: "serial", retries: 0 })');
    expect(source).toContain('test("keeps create, edit, retry, conflict, template, and cleanup behavior authoritative"');
  });

  it("covers the current create, persistence, failure, conflict, and cleanup boundaries", () => {
    for (const step of [
      "stable Area rename and template create-to-reload",
      "Library create, immediate insert, Enter save, and reload",
      "duplicate timeout retry and stale conflict stay replay-safe",
      "failed bulk action rolls back exact rows",
      "permanent cleanup removes source and linked rows",
    ]) {
      expect(source).toContain(`test.step("${step}"`);
    }
  });

  it("fails on unexpected browser errors and emits reporter-consumable evidence", () => {
    expect(source).toContain('page.on("pageerror"');
    expect(source).toContain('page.on("requestfailed"');
    expect(source).toContain("expect(unexpectedErrors).toEqual([])");
    expect(source).toContain('testInfo.attach("estimate-sheet-mvp-metrics"');
    expect(source).toContain("cleanupErrors");
  });
});
