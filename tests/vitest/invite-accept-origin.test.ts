import { describe, expect, it } from "vitest";

import { isAllowedInviteOrigin } from "@/app/invite/[token]/accept/route";

// T1.6 / finding (5 §6 LOW) / gap G5: the invite-accept POST has no CSRF
// protection, so it relies on an Origin/same-site guard. These tests pin the
// pure guard logic so a cross-site POST can never reach the membership RPC.
function makeRequest(
  url: string,
  headers: Record<string, string>,
): Request {
  return new Request(url, { method: "POST", headers });
}

describe("isAllowedInviteOrigin", () => {
  it("blocks a cross-origin Origin header", () => {
    const request = makeRequest("https://app.example/invite/tok/accept", {
      origin: "https://evil.example",
      host: "app.example",
    });
    expect(isAllowedInviteOrigin(request)).toBe(false);
  });

  it("allows a same-origin Origin header", () => {
    const request = makeRequest("https://app.example/invite/tok/accept", {
      origin: "https://app.example",
      host: "app.example",
    });
    expect(isAllowedInviteOrigin(request)).toBe(true);
  });

  it("prefers X-Forwarded-Host (proxy) when matching the Origin", () => {
    const request = makeRequest("https://internal.local/invite/tok/accept", {
      origin: "https://app.example",
      "x-forwarded-host": "app.example",
      host: "internal.local",
    });
    expect(isAllowedInviteOrigin(request)).toBe(true);
  });

  it("blocks when the Origin host differs from the forwarded host", () => {
    const request = makeRequest("https://internal.local/invite/tok/accept", {
      origin: "https://evil.example",
      "x-forwarded-host": "app.example",
      host: "internal.local",
    });
    expect(isAllowedInviteOrigin(request)).toBe(false);
  });

  it("allows a missing Origin when the Referer is same-origin", () => {
    const request = makeRequest("https://app.example/invite/tok/accept", {
      referer: "https://app.example/invite/tok",
      host: "app.example",
    });
    expect(isAllowedInviteOrigin(request)).toBe(true);
  });

  it("blocks a missing Origin when the Referer is cross-origin", () => {
    const request = makeRequest("https://app.example/invite/tok/accept", {
      referer: "https://evil.example/attack",
      host: "app.example",
    });
    expect(isAllowedInviteOrigin(request)).toBe(false);
  });

  it("allows when neither Origin nor Referer is present (same-site navigation)", () => {
    const request = makeRequest("https://app.example/invite/tok/accept", {
      host: "app.example",
    });
    expect(isAllowedInviteOrigin(request)).toBe(true);
  });

  it("allows localhost dev origins", () => {
    const request = makeRequest("http://localhost:3000/invite/tok/accept", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(isAllowedInviteOrigin(request)).toBe(true);
  });

  it("treats a differing port as a different host and blocks it", () => {
    const request = makeRequest("http://localhost:3000/invite/tok/accept", {
      origin: "http://localhost:4000",
      host: "localhost:3000",
    });
    expect(isAllowedInviteOrigin(request)).toBe(false);
  });
});
