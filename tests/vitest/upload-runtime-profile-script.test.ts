import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload runtime profile and benchmark script", () => {
  it("records local Sharp smoke separately from hosted runtime proof", () => {
    const script = readFileSync(join(process.cwd(), "scripts/measure-upload-smoke-benchmark.mjs"), "utf8");

    expect(script).toContain("upload-runtime-profile");
    expect(script).toContain("upload-smoke-benchmark");
    expect(script).toContain("proofBoundary: \"local-only\"");
    expect(script).toContain("ARCH_UPLOAD_BENCHMARK_FULL");
    expect(script).toContain("Hosted memory/body/duration/storage-latency proof is still required");
    expect(script).toContain("temporaryRateLimitPerMinute: 12");
    expect(script).toContain("temporaryActiveUploadsPerActor: 3");
    expect(script).toContain("temporaryActiveUploadsPerWorkspace: 6");
  });
});
