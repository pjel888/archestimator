import { describe, expect, it } from "vitest";

import { resolvePreparedEstimateBrowserRuntime } from "../../e2e/helpers/estimate-sheet-performance-runtime";

const run = {
  route: { projectId: "project-1", nodeId: "node-1" },
  storageState: "/tmp/prepared-storage-state.json",
} as never;

describe("estimate-sheet Playwright runtime", () => {
  it("derives browser inputs from the prepared manifest and ready preview", () => {
    expect(resolvePreparedEstimateBrowserRuntime(run, { active: true, readiness: "READY", port: 3107 }, {})).toEqual({
      baseURL: "http://127.0.0.1:3107",
      projectId: "project-1",
      nodeId: "node-1",
      storageState: "/tmp/prepared-storage-state.json",
    });
  });

  it("rejects an ambient endpoint that does not match the prepared preview", () => {
    expect(() => resolvePreparedEstimateBrowserRuntime(
      run,
      { active: true, readiness: "READY", port: 3107 },
      { ESTIMATE_PERF_BASE_URL: "http://127.0.0.1:3190" },
    )).toThrow("ESTIMATE_PERF_BASE_URL conflicts");
  });
});
