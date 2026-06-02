import { describe, expect, it, vi, beforeEach } from "vitest";

import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

describe("publication client CSRF headers", () => {
  let cookieWrites: string[] = [];

  beforeEach(() => {
    cookieWrites = [];
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => cookieWrites.at(-1) ?? "",
      set: (value: string) => {
        cookieWrites.push(value);
      },
    });
  });

  it("generates a unique cookie/header pair per request with SameSite=Lax and 1-hour max age", () => {
    const first = createPublicationCsrfHeaders();
    const firstCookie = cookieWrites.at(-1) ?? "";
    const second = createPublicationCsrfHeaders();
    const secondCookie = cookieWrites.at(-1) ?? "";

    expect(first["x-archestimator-csrf"]).toEqual(expect.any(String));
    expect(first["x-archestimator-csrf"].length).toBeGreaterThan(16);
    expect(second["x-archestimator-csrf"]).not.toBe(first["x-archestimator-csrf"]);
    expect(firstCookie).toContain(`ae_publication_csrf=${first["x-archestimator-csrf"]}`);
    expect(secondCookie).toContain(`ae_publication_csrf=${second["x-archestimator-csrf"]}`);
    expect(secondCookie).toContain("SameSite=Lax");
    expect(secondCookie).toContain("Max-Age=3600");
  });

  it("uses crypto-backed randomness rather than a hardcoded token", () => {
    const getRandomValues = vi.spyOn(window.crypto, "getRandomValues");

    const headers = createPublicationCsrfHeaders();

    expect(getRandomValues).toHaveBeenCalled();
    expect(headers["x-archestimator-csrf"]).not.toBe(["client", "post"].join("-"));
  });
});
