import { afterEach, describe, expect, it } from "vitest";

import {
  isPlatformAdmin,
  isPlatformAdminEmail,
  isPlatformAdminRole,
  PLATFORM_ADMIN_EMAILS_ENV,
} from "@/lib/auth/roles";

const ORIGINAL_ENV = process.env[PLATFORM_ADMIN_EMAILS_ENV];

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
  } else {
    process.env[PLATFORM_ADMIN_EMAILS_ENV] = ORIGINAL_ENV;
  }
});

describe("isPlatformAdminEmail", () => {
  it("allows the default owner email when env is unset", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    expect(isPlatformAdminEmail("philipjonlewis@gmail.com")).toBe(true);
    expect(isPlatformAdminEmail("other@example.com")).toBe(false);
  });

  it("compares emails case-insensitively", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    expect(isPlatformAdminEmail("PHILIPJONLEWIS@GMAIL.COM")).toBe(true);
  });

  it("supports comma-separated allowlist emails", () => {
    process.env[PLATFORM_ADMIN_EMAILS_ENV] = "a@x.com, b@x.com";
    expect(isPlatformAdminEmail("a@x.com")).toBe(true);
    expect(isPlatformAdminEmail("b@x.com")).toBe(true);
    expect(isPlatformAdminEmail("c@x.com")).toBe(false);
  });

  it("rejects null and undefined", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    expect(isPlatformAdminEmail(null)).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
    expect(isPlatformAdminEmail("")).toBe(false);
  });
});

describe("isPlatformAdmin", () => {
  it("returns true for platform admin roles regardless of email", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    expect(isPlatformAdmin({ role: "ceo", email: "any@x.com" })).toBe(true);
    expect(isPlatformAdmin({ role: "admin", email: "any@x.com" })).toBe(true);
    expect(isPlatformAdminRole("ceo")).toBe(true);
  });

  it("returns true for allowlisted member emails", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    expect(
      isPlatformAdmin({ role: "member", email: "philipjonlewis@gmail.com" }),
    ).toBe(true);
  });

  it("returns false for non-admin non-allowlisted members", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    expect(isPlatformAdmin({ role: "member", email: "other@example.com" })).toBe(
      false,
    );
  });

  it("fails closed for email allowlist in production when env is unset", () => {
    delete process.env[PLATFORM_ADMIN_EMAILS_ENV];
    const productionEnv = { ...process.env, NODE_ENV: "production" };
    expect(isPlatformAdminEmail("philipjonlewis@gmail.com", productionEnv)).toBe(
      false,
    );
    expect(isPlatformAdmin({ role: "ceo", email: "any@x.com" })).toBe(true);
  });
});
