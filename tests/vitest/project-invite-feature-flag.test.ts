import { describe, expect, it } from "vitest";

import {
  createInviteToken,
  hashInviteToken,
  isProjectInviteEntryEnabled,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";

describe("project invite entry feature flag", () => {
  it("keeps invite entry unavailable when the flag is disabled", () => {
    expect(
      isProjectInviteEntryEnabled({
        PROJECT_INVITE_ENTRY_ENABLED: "false",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "pepper",
      }),
    ).toBe(false);
  });

  it("disables invite entry when ARCHESTIMATOR_INVITE_TOKEN_PEPPER is missing", () => {
    expect(
      readInviteEntryConfig({
        PROJECT_INVITE_ENTRY_ENABLED: "true",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "",
      }),
    ).toEqual({
      enabled: false,
      reason: "missing-pepper",
    });
  });

  it("does not generate invite tokens while disabled", () => {
    expect(() =>
      createInviteToken({
        PROJECT_INVITE_ENTRY_ENABLED: "false",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "pepper",
      }),
    ).toThrow("Project invite entry is disabled.");
  });

  it("hashes invite tokens with a required server pepper and no raw-token fallback", () => {
    const rawToken = "public-token-value";
    const pepperedHash = hashInviteToken(rawToken, "server-pepper");
    const otherPepperHash = hashInviteToken(rawToken, "other-pepper");

    expect(pepperedHash).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(pepperedHash).not.toContain(rawToken);
    expect(pepperedHash).not.toBe(otherPepperHash);
    expect(() => hashInviteToken(rawToken, "")).toThrow("Invite token pepper is required.");
  });
});
