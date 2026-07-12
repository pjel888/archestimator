import { describe, expect, it, vi } from "vitest";

import { getFeedbackAggregateForPlatformAdmin } from "@/lib/admin/feedback-aggregate";

describe("admin feedback aggregate", () => {
  it("counts only actionable feedback without reading feedback content", async () => {
    const first = vi.fn().mockResolvedValue({ open: 4 });
    const prepare = vi.fn(() => ({ first }));

    const result = await getFeedbackAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare } as never,
    );

    expect(prepare.mock.calls[0]?.[0]).toContain("status IN ('new', 'reviewing')");
    expect(prepare.mock.calls[0]?.[0]).not.toContain("message");
    expect(prepare.mock.calls[0]?.[0]).not.toContain("user_email");
    expect(result).toMatchObject({
      status: "available",
      fields: { open: { availability: "available", value: 4 } },
    });
  });

  it("returns unavailable before querying for unauthorized callers", async () => {
    const prepare = vi.fn();

    await expect(getFeedbackAggregateForPlatformAdmin(
      { email: "member@example.test", role: "member" },
      { prepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: { open: { availability: "unavailable", errorCategory: "source_denied", value: undefined } },
    });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("fails closed for D1 errors and invalid aggregate values", async () => {
    const failingPrepare = vi.fn(() => ({ first: vi.fn().mockRejectedValue(new Error("D1 unavailable")) }));
    const invalidPrepare = vi.fn(() => ({ first: vi.fn().mockResolvedValue({ open: "not-a-number" }) }));

    await expect(getFeedbackAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare: failingPrepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: { open: { availability: "unavailable", errorCategory: "source_failed", value: undefined } },
    });
    await expect(getFeedbackAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare: invalidPrepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: { open: { availability: "unavailable", errorCategory: "source_failed", value: undefined } },
    });
  });
});
