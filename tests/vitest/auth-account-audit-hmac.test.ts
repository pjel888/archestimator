import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hashAccountSecurityValue,
  hashAccountSecurityValueWithPepper,
  recordAccountSecurityEvent,
} from "@/lib/auth/account-audit";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
}

describe("account audit HMAC pepper migration (P0.6)", () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  // Scenario HMAC-1: rotation produces different hash for same input
  it("hashAccountSecurityValueWithPepper produces different digests under different peppers (HMAC-1)", () => {
    const digestA = hashAccountSecurityValueWithPepper("203.0.113.10", "pepper-alpha");
    const digestB = hashAccountSecurityValueWithPepper("203.0.113.10", "pepper-beta");
    expect(digestA).not.toEqual(digestB);
    expect(digestA.startsWith("hmac-sha256:")).toBe(true);
    expect(digestB.startsWith("hmac-sha256:")).toBe(true);
  });

  // Scenario PEPPER-1: production without pepper must throw — never silently fall back to plain hash
  it("hashAccountSecurityValue throws in production when AUTH_AUDIT_HASH_PEPPER is missing (PEPPER-1)", () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_AUDIT_HASH_PEPPER;
    expect(() => hashAccountSecurityValue("203.0.113.10")).toThrow(
      /AUTH_AUDIT_HASH_PEPPER/i,
    );
  });

  // Scenario PEPPER-2: production with pepper uses HMAC, not plain SHA-256
  it("hashAccountSecurityValue uses HMAC prefix when pepper is configured (PEPPER-2)", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_AUDIT_HASH_PEPPER = "test-pepper-12345";
    const digest = hashAccountSecurityValue("203.0.113.10");
    expect(digest.startsWith("hmac-sha256:")).toBe(true);
    expect(digest.startsWith("sha256:")).toBe(false);
  });

  // Scenario AUDIT-LOG-1 (RISK-016): failed audit write must NOT swallow silently — emits opaque
  // structured log without leaking the underlying error message
  it("recordAccountSecurityEvent emits opaque audit_write_failed log on failure (AUDIT-LOG-1, RISK-016)", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.AUTH_AUDIT_HASH_PEPPER;
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const d1Store = await import("@/lib/auth/account-audit-d1-store");
    vi.spyOn(d1Store, "recordAccountSecurityEventInCloudflareD1").mockRejectedValue(
      new Error("D1: SQLSTATE HY000 sensitive internal detail"),
    );

    await recordAccountSecurityEvent({ eventType: "test.event" });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedArg = consoleErrorSpy.mock.calls[0]?.[0];
    const loggedString =
      typeof loggedArg === "string"
        ? loggedArg
        : JSON.stringify(loggedArg ?? {});
    expect(loggedString).toMatch(/audit_write_failed/i);
    expect(loggedString).not.toMatch(/SQLSTATE|HY000|sensitive internal detail/i);
  });
});
