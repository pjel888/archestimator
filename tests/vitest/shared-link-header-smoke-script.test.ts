import { describe, expect, it, vi } from "vitest";

import {
  evaluateShareHeaders,
  hasNoStoreCacheControl,
  redactShareUrl,
  renderMarkdown,
  smokeShareHeaders,
} from "../../scripts/smoke-share-headers.mjs";

describe("shared-link header smoke script", () => {
  it("redacts share and recipient tokens from report URLs", () => {
    expect(redactShareUrl("https://preview.example/share/raw-share-token?recipient=raw-recipient-token&view=summary")).toBe(
      "https://preview.example/share/%3Credacted-token%3E?recipient=%3Credacted%3E&view=summary",
    );
  });

  it("redacts Vercel protected-preview bypass tokens from report URLs", () => {
    expect(redactShareUrl("https://preview.example/share/raw-share-token?_vercel_share=raw-bypass&view=summary")).toBe(
      "https://preview.example/share/%3Credacted-token%3E?_vercel_share=%3Credacted%3E&view=summary",
    );
  });

  it("recognizes no-store cache headers and frame protection", () => {
    expect(hasNoStoreCacheControl("private, no-cache, no-store, max-age=0")).toBe(true);

    const result = evaluateShareHeaders({
      "cache-control": "private, no-store",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "strict-transport-security": "max-age=63072000",
      "x-robots-tag": "noindex, nofollow",
    });

    expect(result.passed).toBe(true);
  });

  it("falls back to GET when HEAD does not prove the header contract", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 405,
        headers: { "cache-control": "private, no-store" },
      }))
      .mockResolvedValueOnce(new Response("<html>share</html>", {
        status: 200,
        headers: {
          "cache-control": "private, no-store",
          "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
          "strict-transport-security": "max-age=63072000",
          "x-robots-tag": "noindex, nofollow",
        },
      }));

    const report = await smokeShareHeaders({
      shareUrl: "https://preview.example/share/raw-share-token?recipient=raw-recipient-token",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(report.method).toBe("GET");
    expect(report.headStatus).toBe(405);
    expect(report.passed).toBe(true);
    expect(JSON.stringify(report)).not.toContain("raw-share-token");
    expect(JSON.stringify(report)).not.toContain("raw-recipient-token");
  });

  it("sends a supplied Cookie header without writing it into the report", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 200,
      headers: {
        "cache-control": "private, no-store",
        "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "strict-transport-security": "max-age=63072000",
        "x-robots-tag": "noindex, nofollow",
      },
    }));

    const report = await smokeShareHeaders({
      shareUrl: "https://preview.example/share/raw-share-token",
      fetchImpl: fetchMock as unknown as typeof fetch,
      requestHeaders: { cookie: "vercel-auth=secret-cookie" },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://preview.example/share/raw-share-token", {
      method: "HEAD",
      redirect: "manual",
      headers: { cookie: "vercel-auth=secret-cookie" },
    });
    expect(report.passed).toBe(true);
    expect(JSON.stringify(report)).not.toContain("secret-cookie");
  });

  it("renders markdown without leaking header values or URL secrets", async () => {
    const report = await smokeShareHeaders({
      shareUrl: "https://preview.example/share/raw-share-token",
      fetchImpl: vi.fn(async () => new Response(null, {
        status: 200,
        headers: {
          "cache-control": "private, no-store",
          "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
          "strict-transport-security": "max-age=63072000",
          "x-robots-tag": "noindex, nofollow",
        },
      })) as unknown as typeof fetch,
    });

    const markdown = renderMarkdown(report);
    expect(markdown).toContain("Status: **PASS**");
    expect(markdown).toContain("Frame policy denies embedding");
    expect(markdown).not.toContain("raw-share-token");
  });
});
