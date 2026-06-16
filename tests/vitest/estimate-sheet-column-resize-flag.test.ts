import { afterEach, describe, expect, it, vi } from "vitest";

describe("estimate column resize feature flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is disabled by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED", "");
    vi.resetModules();

    const { WORKSHOP_VIRTUALIZATION_FLAGS } = await import("@/lib/workshop/virtualization-flags");

    expect(WORKSHOP_VIRTUALIZATION_FLAGS.estimateColumnResize).toBe(false);
  });

  it("can be enabled through the public workshop flag pattern", async () => {
    vi.stubEnv("NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED", "1");
    vi.resetModules();

    const { WORKSHOP_VIRTUALIZATION_FLAGS } = await import("@/lib/workshop/virtualization-flags");

    expect(WORKSHOP_VIRTUALIZATION_FLAGS.estimateColumnResize).toBe(true);
  });
});
