import { describe, expect, it } from "vitest";

import { deriveRealtimeSigningKey } from "@/lib/collaboration/realtime-identity-server";

describe("realtime identity signing-key boundary", () => {
  it("requires a dedicated signer in production instead of deriving from invite material", () => {
    expect(() => deriveRealtimeSigningKey({
      ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "invite-secret",
      NODE_ENV: "production",
    })).toThrow("REALTIME_IDENTITY_SIGNING_KEY is required in production.");
  });
});
