import { describe, expect, it } from "vitest";

import {
  getRealtimeIdentityRefreshDelay,
  REALTIME_IDENTITY_REFRESH_LEEWAY_MS,
} from "@/lib/collaboration/realtime-refresh";

describe("realtime identity refresh timing", () => {
  it("renews one minute before expiry and avoids an immediate retry loop", () => {
    expect(getRealtimeIdentityRefreshDelay(360, 0)).toBe(300_000);
    expect(getRealtimeIdentityRefreshDelay(30, 0)).toBe(5_000);
    expect(getRealtimeIdentityRefreshDelay(Number.NaN, 0)).toBe(5_000);
    expect(REALTIME_IDENTITY_REFRESH_LEEWAY_MS).toBe(60_000);
  });
});
