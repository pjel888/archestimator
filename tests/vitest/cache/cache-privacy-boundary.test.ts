import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/lib/auth/request-proxy";

const EDGE_CACHE = "s-maxage=31536000";
const PRIVATE_NO_STORE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "");
  vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_BYPASS", "0");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cache and privacy boundary", () => {
  it.each([
    ["/", `${EDGE_CACHE}, no-transform`],
    ["/about", EDGE_CACHE],
    ["/features?utm_source=quality-proof", EDGE_CACHE],
    ["/privacy", EDGE_CACHE],
  ])("keeps the public marketing route %s edge-cacheable", async (path, expected) => {
    const response = await proxy(request(path));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(expected);
    expect(response.headers.get("cache-control")).not.toContain("private");
    expect(response.headers.get("cache-control")).not.toContain("no-store");
  });

  it.each([
    "/share",
    "/share/",
    "/share/client-token",
    "/share/client-token?recipient=private-recipient",
    "/share/%E2%98%83/nested",
  ])("keeps the shared proposal boundary %s private and non-cacheable", async (path) => {
    const response = await proxy(request(path));
    const cacheControl = response.headers.get("cache-control");

    expect(response.status).toBe(200);
    expect(cacheControl).toBe(PRIVATE_NO_STORE);
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).not.toContain("s-maxage");
  });

  it("turns an OAuth state failure into a private recovery redirect without reflecting callback secrets", async () => {
    const response = await proxy(
      request(
        "/?error=state_mismatch&state=raw-state&code=raw-code&cookie=raw-cookie&next=%2Fapi%2Fauth%2Fcallback%2Fgoogle%3Fcode%3Draw-code",
      ),
    );
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(response.headers.get("clear-site-data")).toBe(
      '"cache", "cookies", "storage"',
    );
    expect(location.pathname).toBe("/login");
    expect(Object.fromEntries(location.searchParams)).toEqual({
      next: "/workshop",
      oauth_state_reset: "1",
    });
    expect(response.headers.get("set-cookie")).not.toMatch(
      /raw-state|raw-code|raw-cookie/,
    );
  });
});
