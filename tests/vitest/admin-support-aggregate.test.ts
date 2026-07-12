import { describe, expect, it, vi } from "vitest";

import { getSupportAggregateForPlatformAdmin } from "@/lib/admin/support-aggregate";

describe("admin support aggregate", () => {
  it("returns only the open aggregate for a platform admin", async () => {
    const first = vi.fn().mockResolvedValue({ open: 3 });
    const prepare = vi.fn(() => ({ first }));

    const result = await getSupportAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare } as never,
    );

    expect(prepare.mock.calls[0]?.[0]).toContain("COUNT(*) AS open");
    expect(prepare.mock.calls[0]?.[0]).not.toContain("subject");
    expect(prepare.mock.calls[0]?.[0]).not.toContain("body_text");
    expect(result).toMatchObject({
      status: "available",
      fields: { open: { availability: "available", value: 3 } },
    });
  });

  it("does not query for non-admin callers and returns unavailable instead of zero", async () => {
    const prepare = vi.fn();

    await expect(getSupportAggregateForPlatformAdmin(
      { email: "member@example.test", role: "member" },
      { prepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: { open: { availability: "unavailable", errorCategory: "source_denied", value: undefined } },
    });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("returns unavailable on D1 failures or invalid aggregate values", async () => {
    const failingPrepare = vi.fn(() => ({ first: vi.fn().mockRejectedValue(new Error("D1 unavailable")) }));
    const invalidPrepare = vi.fn(() => ({ first: vi.fn().mockResolvedValue({ open: "not-a-number" }) }));

    await expect(getSupportAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare: failingPrepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: { open: { availability: "unavailable", errorCategory: "source_failed", value: undefined } },
    });
    await expect(getSupportAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare: invalidPrepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: { open: { availability: "unavailable", errorCategory: "source_failed", value: undefined } },
    });
  });
});
