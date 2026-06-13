import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// React cache() dedupes per request, not within a plain vitest run (verified: a
// cached fn still runs 3× here because there is no request scope). So F6 is
// asserted as a source contract; the real per-request round-trip reduction is
// captured at runtime via PERF_TRACE (05_MEASUREMENT_METHODOLOGY.md §1).
const source = readFileSync(
  path.resolve(__dirname, "../../src/lib/repositories/workspace-repository.ts"),
  "utf8",
);

describe("ensureDefaultWorkspace per-request memoization (F6)", () => {
  it("wraps ensureDefaultWorkspace in React cache() so the workspace lookup runs once per render", () => {
    expect(source).toMatch(/export const ensureDefaultWorkspace = cache\(async function ensureDefaultWorkspace/);
  });

  it("uses the same cache() helper as getCurrentWorkspaceProject", () => {
    expect(source).toContain('import { cache } from "react"');
    expect(source).toMatch(/export const getCurrentWorkspaceProject = cache\(/);
  });
});
