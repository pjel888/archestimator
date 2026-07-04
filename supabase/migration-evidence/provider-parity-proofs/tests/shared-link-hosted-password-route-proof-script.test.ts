import { describe, expect, it } from "vitest";

import {
  assertExpectedSupabaseProject,
  createCsrfCookieHeader,
  parseNetscapeCookieJar,
  parseVercelCurlTiming,
  percentile,
  readSupabaseProjectRef,
} from "../../scripts/prove-shared-link-hosted-password-route";

describe("hosted shared-link password route proof script", () => {
  it("extracts response status and curl timing from noisy vercel curl output", () => {
    const parsed = parseVercelCurlTiming([
      "Vercel CLI 54.9.1",
      "Retrieving project...",
      "http_code=204",
      "time_total=0.412345",
      "",
    ].join("\n"));

    expect(parsed).toEqual({ status: 204, durationMs: 412.35 });
  });

  it("extracts named cookies from a Netscape cookie jar without leaking values", () => {
    const cookies = parseNetscapeCookieJar([
      "# Netscape HTTP Cookie File",
      "example.com\tFALSE\t/\tTRUE\t0\tae_publication_csrf\tcsrf-secret",
      "example.com\tFALSE\t/\tTRUE\t0\tae_publication_access_abc\taccess-secret",
    ].join("\n"));

    expect(cookies.get("ae_publication_csrf")).toBe("csrf-secret");
    expect([...cookies.keys()]).toEqual(["ae_publication_csrf", "ae_publication_access_abc"]);
  });

  it("builds the same CSRF cookie/header pair required by the password route", () => {
    expect(createCsrfCookieHeader("csrf-token")).toEqual({
      csrf: "csrf-token",
      cookieHeader: "ae_publication_csrf=csrf-token",
    });
  });

  it("refuses to mutate a Supabase project outside the Archestimator project ref", () => {
    expect(readSupabaseProjectRef("https://ebxxqidacheyapmmzavr.supabase.co")).toBe("ebxxqidacheyapmmzavr");
    expect(() => assertExpectedSupabaseProject("https://wrongprojectref.supabase.co")).toThrow(
      /expected ebxxqidacheyapmmzavr/i,
    );
  });

  it("uses the nearest upper-rank percentile for small sample proof runs", () => {
    expect(percentile([100, 250, 125], 0.95)).toBe(250);
  });
});
