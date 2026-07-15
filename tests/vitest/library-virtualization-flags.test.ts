import { beforeEach, describe, expect, it, vi } from "vitest";

describe("library virtualization defaults", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("enables dense mode and virtualization by default at the existing 500-row threshold", async () => {
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_DENSE_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED", "");

    const flags = await import("@/lib/workshop/virtualization-flags");

    expect(flags.isLibraryDenseModeEnabled()).toBe(true);
    expect(flags.isLibraryVirtualizationEnabled()).toBe(true);
    expect(flags.WORKSHOP_VIRTUALIZATION_FLAGS.libraryComponents).toBe(true);
    expect(flags.WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION).toMatchObject({
      enabled: true,
      minRows: 500,
    });
  });

  it("preserves explicit public environment opt-outs", async () => {
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_DENSE_MODE", "off");
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED", "0");

    const flags = await import("@/lib/workshop/virtualization-flags");

    expect(flags.isLibraryDenseModeEnabled()).toBe(false);
    expect(flags.isLibraryVirtualizationEnabled()).toBe(false);
    expect(flags.WORKSHOP_VIRTUALIZATION_FLAGS.libraryComponents).toBe(false);
  });
});
