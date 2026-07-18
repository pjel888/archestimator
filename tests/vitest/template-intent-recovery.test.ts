import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { reconcileExpiredTemplateMutationIntents } from "@/lib/component-library/template-intent-recovery-d1";

vi.mock("server-only", () => ({}));

describe("Template mutation intent recovery", () => {
  it("resolves only the requested expired pending intent", async () => {
    const run = vi.fn(async () => ({ success: true as const, meta: { changes: 1 } }));
    const bind = vi.fn((...values: unknown[]) => ({ run, values }));
    const prepare = vi.fn((sql: string) => ({ bind, sql }));
    const database = { prepare } as unknown as D1DatabaseLike;
    const now = new Date("2026-07-18T08:00:00.000Z");

    await expect(reconcileExpiredTemplateMutationIntents(database, {
      intentId: "11111111-1111-4111-8111-111111111111",
      limit: 1,
      now,
    })).resolves.toEqual({ resolved: 1 });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("state = 'not_applied'"));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("AND intent_id = ?"));
    expect(bind).toHaveBeenCalledWith(
      now.toISOString(),
      now.toISOString(),
      "11111111-1111-4111-8111-111111111111",
      now.toISOString(),
      1,
    );
  });

  it("is a no-op without a D1 binding", async () => {
    await expect(reconcileExpiredTemplateMutationIntents(null)).resolves.toEqual({ resolved: 0 });
  });
});
