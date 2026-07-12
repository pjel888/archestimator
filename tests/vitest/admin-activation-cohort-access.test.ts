import { describe, expect, it, vi } from "vitest";

import {
  ActivationCohortRepositoryError,
  listActivationCohortForPlatformAdmin,
} from "@/lib/admin/activation-cohort-repository";

describe("activation cohort access boundary", () => {
  it.each([
    [null, "unauthenticated"],
    [{ email: "member@example.test", role: "member" }, "non-admin"],
    [{ email: "owner@example.test", role: "owner" }, "corporate-only owner"],
  ])("denies %s callers before D1 access", async (context) => {
    const prepare = vi.fn();

    await expect(listActivationCohortForPlatformAdmin(context as never, {}, { prepare } as never))
      .rejects.toBeInstanceOf(ActivationCohortRepositoryError);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("allows a platform admin through the guarded entrypoint", async () => {
    const all = vi.fn().mockResolvedValue({ results: [], success: true });
    const prepare = vi.fn(() => ({ bind: vi.fn(() => ({ all })) }));

    await expect(listActivationCohortForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      {},
      { prepare } as never,
    )).resolves.toEqual({ status: "available", rows: [], nextCursor: null });
    expect(prepare).toHaveBeenCalledTimes(1);
  });
});
