import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_DESTINATION,
  resolveAuthOrigin,
  sanitizeNextPath,
} from "@/lib/auth/redirects";

describe("sanitizeNextPath", () => {
  it("keeps same-origin app paths with query strings", () => {
    expect(sanitizeNextPath("/workshop/projects?view=active")).toBe(
      "/workshop/projects?view=active",
    );
    expect(sanitizeNextPath("/workshop/library#items")).toBe(
      "/workshop/library#items",
    );
    expect(sanitizeNextPath("/invite/public-token-123")).toBe(
      "/invite/public-token-123",
    );
  });

  it("rejects encoded external invite next values", () => {
    expect(
      sanitizeNextPath(
        "/invite/public-token-123?next=https%3A%2F%2Fevil.example%2Fphish",
      ),
    ).toBe(DEFAULT_AUTH_DESTINATION);
    expect(
      sanitizeNextPath(
        "/invite/public-token-123?next=%2F%2Fevil.example%2Fphish",
      ),
    ).toBe(DEFAULT_AUTH_DESTINATION);
  });

  it("rejects auth callback recursion while preserving invite retry fallback", () => {
    expect(
      sanitizeNextPath(
        "/auth/callback?next=%2Finvite%2Fpublic-token-123",
        "/invite/public-token-123",
      ),
    ).toBe("/invite/public-token-123");
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
    "/auth/callback",
    "/auth/callback?next=/workshop",
    "/%61uth/callback?next=/workshop",
  ])("falls back for unsafe next value %s", (value) => {
    expect(sanitizeNextPath(value)).toBe(DEFAULT_AUTH_DESTINATION);
  });

  it("uses the supplied fallback only when it is safe", () => {
    expect(sanitizeNextPath("//evil.example", "/workshop/settings")).toBe(
      "/workshop/settings",
    );
    expect(sanitizeNextPath("//evil.example", "https://evil.example")).toBe(
      DEFAULT_AUTH_DESTINATION,
    );
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
