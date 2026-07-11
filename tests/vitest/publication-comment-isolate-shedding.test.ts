import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("publication comment isolate failure shedding", () => {
  it("keeps optional shedding state route-local and outside durable decision admission", () => {
    const commentRoute = readFileSync("src/app/api/share/[token]/comment/route.ts", "utf8");
    const decisionRoute = readFileSync("src/app/api/share/[token]/decision/route.ts", "utf8");

    expect(commentRoute).toContain("const bestEffortIsolateFailureShedding = (() => {");
    expect(commentRoute).toContain("return { recordAttempt, record5xx, recordSuccess, isCircuitOpen };");
    expect(commentRoute).not.toContain("globalThis");
    expect(decisionRoute).toContain("await checkSharedLinkDecisionRateLimit");
    expect(decisionRoute).not.toContain("bestEffortIsolateFailureShedding");
  });
});
