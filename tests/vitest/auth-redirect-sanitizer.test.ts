import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_DESTINATION,
  resolveAuthOrigin,
  sanitizeProtectedReturnPath,
} from "@/lib/auth/redirects";

describe("sanitizeProtectedReturnPath", () => {
  it("keeps protected app paths with non-sensitive query strings", () => {
    expect(sanitizeProtectedReturnPath("/workshop/projects?view=active")).toBe(
      "/workshop/projects?view=active",
    );
    expect(sanitizeProtectedReturnPath("/workshop/library#items")).toBe(
      "/workshop/library",
    );
    expect(sanitizeProtectedReturnPath("/admin/support?status=open")).toBe(
      "/admin/support?status=open",
    );
  });

  it("rejects protected paths with nested external return intent", () => {
    expect(
      sanitizeProtectedReturnPath(
        "/workshop/projects?next=https%3A%2F%2Fevil.example%2Fphish",
      ),
    ).toBe(DEFAULT_AUTH_DESTINATION);
    expect(
      sanitizeProtectedReturnPath(
        "/admin/support?next=%2F%2Fevil.example%2Fphish",
      ),
    ).toBe(DEFAULT_AUTH_DESTINATION);
  });

  it("rejects auth callback recursion while preserving a protected fallback", () => {
    expect(
      sanitizeProtectedReturnPath(
        "/auth/callback?next=%2Fworkshop%2Fprojects",
        "/workshop/projects",
      ),
    ).toBe("/workshop/projects");
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    "https://evil.example/phish",
    "http://evil.example/phish",
    "//evil.example/phish",
    "%2F%2Fevil.example/phish",
    "https:%2f%2fevil.example/phish",
    "/\\evil.example",
    "\\evil.example",
    "/workshop/%5Cevil.example",
    "/workshop%0d%0aLocation:%20https://evil.example",
    "/%",
    "/%zz",
    "/%E0%A4%A",
    "not-a-path",
    "/invite/public-token-123",
    "/pricing",
    "/auth/callback",
    "/auth/callback?next=/workshop",
    "/%61uth/callback?next=/workshop",
  ])("falls back for unsafe next value %s", (value) => {
    expect(sanitizeProtectedReturnPath(value)).toBe(DEFAULT_AUTH_DESTINATION);
  });

  it("uses the supplied fallback only when it is safe", () => {
    expect(
      sanitizeProtectedReturnPath("//evil.example", "/workshop/settings"),
    ).toBe("/workshop/settings");
    expect(
      sanitizeProtectedReturnPath("//evil.example", "/invite/public-token-123"),
    ).toBe(DEFAULT_AUTH_DESTINATION);
  });
});

describe("resolveAuthOrigin", () => {
  it("prefers an allow-listed request origin", () => {
    expect(
      resolveAuthOrigin({
        requestOrigin: "https://staging.archestimator.com",
        requestUrl: "https://staging.archestimator.com/login",
        env: {
          NEXT_PUBLIC_APP_URL: "https://app.archestimator.com",
          ARCHESTIMATOR_ALLOWED_APP_ORIGINS:
            "https://app.archestimator.com,https://staging.archestimator.com",
        },
      }),
    ).toBe("https://staging.archestimator.com");
  });

  it("falls back to the canonical configured origin for untrusted origins", () => {
    expect(
      resolveAuthOrigin({
        requestOrigin: "https://evil.example",
        requestUrl: "https://evil.example/login",
        env: {
          NEXT_PUBLIC_APP_URL: "https://app.archestimator.com",
          ARCHESTIMATOR_ALLOWED_APP_ORIGINS:
            "https://app.archestimator.com",
        },
      }),
    ).toBe("https://app.archestimator.com");
  });

  it("allows localhost origins during local development", () => {
    expect(
      resolveAuthOrigin({
        requestOrigin: "http://localhost:3000",
        requestUrl: "http://localhost:3000/login",
        env: {},
      }),
    ).toBe("http://localhost:3000");
  });

  it("allows Cloudflare preview and loopback localhost origins during local development", () => {
    expect(
      resolveAuthOrigin({
        requestOrigin: "http://localhost:8787",
        requestUrl: "http://localhost:8787/login",
        env: {},
      }),
    ).toBe("http://localhost:8787");

    expect(
      resolveAuthOrigin({
        requestOrigin: "http://127.0.0.1:3000",
        requestUrl: "http://127.0.0.1:3000/login",
        env: {},
      }),
    ).toBe("http://127.0.0.1:3000");
  });

  it("does not trust localhost origins in production", () => {
    expect(
      resolveAuthOrigin({
        requestOrigin: "http://localhost:3000",
        requestUrl: "http://localhost:3000/login",
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_APP_URL: "https://archestimator.com",
          ARCHESTIMATOR_ALLOWED_APP_ORIGINS: "https://archestimator.com",
        },
      }),
    ).toBe("https://archestimator.com");
  });

  it("fails closed in production when no canonical origin is configured", () => {
    expect(() =>
      resolveAuthOrigin({
        requestOrigin: null,
        requestUrl: "https://evil.example/login",
        env: {
          NODE_ENV: "production",
        },
      }),
    ).toThrow("Missing canonical auth origin");
  });
});
