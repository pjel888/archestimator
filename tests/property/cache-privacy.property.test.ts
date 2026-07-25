import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

import { proxy } from "@/lib/auth/request-proxy";
import { isPublicationTokenShape } from "@/lib/publication/security";

const MARKETING_PATHS = [
  "/",
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/trust",
  "/signup",
] as const;
const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-".split("");
const MALFORMED_TOKENS = [
  "",
  "0",
  "客户",
  "😀",
  "../",
  "token.with.dot",
  "%2F",
  "a".repeat(42),
  "a".repeat(44),
  "a".repeat(512),
] as const;

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function arbitraryQuery() {
  return fc.array(
    fc.record({
      key: fc.string({ maxLength: 24 }),
      value: fc.string({ maxLength: 96 }),
    }),
    { maxLength: 12 },
  );
}

function productionPublicationToken() {
  return fc
    .array(fc.constantFrom(...BASE64URL_ALPHABET), {
      minLength: 43,
      maxLength: 43,
    })
    .map((characters) => characters.join(""));
}

function encodedQuery(
  entries: ReadonlyArray<{ key: string; value: string }>,
) {
  const search = new URLSearchParams();
  for (const { key, value } of entries) {
    search.append(`proof_${key}`, value);
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}

beforeEach(() => {
  vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "");
  vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_BYPASS", "0");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cache/privacy properties", () => {
  it("keeps exact marketing routes cacheable for arbitrary duplicate, reordered, empty, and Unicode query values", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...MARKETING_PATHS),
        arbitraryQuery(),
        async (pathname, query) => {
          const response = await proxy(
            request(`${pathname}${encodedQuery(query)}`),
          );
          const cacheControl = response.headers.get("cache-control") ?? "";

          expect(cacheControl).toContain("s-maxage=31536000");
          expect(cacheControl).not.toContain("private");
          expect(cacheControl).not.toContain("no-store");
        },
      ),
      { numRuns: 150 },
    );
  });

  it("keeps every production-shape shared-proposal token private across arbitrary query ordering and duplication", async () => {
    await fc.assert(
      fc.asyncProperty(
        productionPublicationToken(),
        arbitraryQuery(),
        async (token, query) => {
          expect(isPublicationTokenShape(token)).toBe(true);
          const response = await proxy(
            request(`/share/${token}${encodedQuery(query)}`),
          );
          const cacheControl = response.headers.get("cache-control") ?? "";

          expect(cacheControl).toContain("private");
          expect(cacheControl).toContain("no-store");
          expect(cacheControl).not.toContain("s-maxage");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rejects empty, Unicode, traversal-shaped, dotted, wrong-length, and extreme publication tokens", () => {
    fc.assert(
      fc.property(fc.constantFrom(...MALFORMED_TOKENS), (token) => {
        expect(isPublicationTokenShape(token)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("never reflects arbitrary callback state, code, or cookie values into the OAuth recovery destination", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          state: fc.string({ minLength: 1, maxLength: 128 }),
          code: fc.string({ minLength: 1, maxLength: 128 }),
          cookie: fc.string({ minLength: 1, maxLength: 128 }),
        }),
        async ({ state, code, cookie }) => {
          const search = new URLSearchParams({
            error: "state_mismatch",
            state,
            code,
            cookie,
            next: `/api/auth/callback/google?code=${code}`,
          });
          const response = await proxy(request(`/?${search}`));
          const location = new URL(response.headers.get("location") ?? "");

          expect(response.headers.get("cache-control")).toContain("no-store");
          expect([...location.searchParams.keys()].sort()).toEqual([
            "next",
            "oauth_state_reset",
          ]);
          expect(location.searchParams.get("next")).toBe("/workshop");
          expect(location.searchParams.get("oauth_state_reset")).toBe("1");
        },
      ),
      { numRuns: 150 },
    );
  });
});
