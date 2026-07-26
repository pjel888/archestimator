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

  it("keeps library dense mode on by default and exposes a live public flag reader", async () => {
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_DENSE_MODE", "");
    vi.resetModules();

    const { isLibraryDenseModeEnabled } = await import("@/lib/workshop/virtualization-flags");

    expect(isLibraryDenseModeEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_LIBRARY_DENSE_MODE", "0");
    expect(isLibraryDenseModeEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_LIBRARY_DENSE_MODE", "1");
    expect(isLibraryDenseModeEnabled()).toBe(true);
  });

  it("adds library dense table virtualization to the shared workshop flag map", async () => {
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED", "1");
    vi.resetModules();

    const {
      WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION,
      WORKSHOP_VIRTUALIZATION_FLAGS,
    } = await import("@/lib/workshop/virtualization-flags");

    expect(WORKSHOP_VIRTUALIZATION_FLAGS.libraryComponents).toBe(true);
    expect(WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION).toMatchObject({
      enabled: true,
      minRows: 500,
    });
  });
});
