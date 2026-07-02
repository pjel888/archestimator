import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isWorkerPublicationTokenShape,
  normalizeAuthStateMismatchRedirectResponse,
  routeAuthCallbackStateMismatchRetry,
  routeAuthStateMismatchRetry,
  routeAuthStateResetLoginCompletion,
  routeCanonicalHostRedirect,
  routeCloudflareFastHealthRequest,
  routeMalformedShareTokenRequest,
  routeStaticPublicPageThroughCache,
} from "@/lib/cloudflare/worker-route-optimizations";

const OAUTH_STATE_RESET_CLEAR_SITE_DATA = "\"cache\", \"cookies\", \"storage\"";

class FakeDefaultCache {
  readonly entries = new Map<string, Response>();
  matchCalls = 0;
  putCalls = 0;

  async match(request: Request) {
    this.matchCalls += 1;
    return this.entries.get(request.url)?.clone();
  }

  async put(request: Request, response: Response) {
    this.putCalls += 1;
    this.entries.set(request.url, response.clone());
  }
}

function createContext() {
  const pending: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
    },
    pending,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Cloudflare Worker route optimizations", () => {
  it("redirects www traffic to the apex host before app routing", async () => {
    const response = routeCanonicalHostRedirect(
      new Request("https://www.archestimator.com/login?next=%2Fworkshop"),
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://archestimator.com/login?next=%2Fworkshop");
    expect(
      routeCanonicalHostRedirect(
        new Request("https://www.archestimator.com/api/auth/sign-in/social", { method: "POST" }),
      )?.headers.get("location"),
    ).toBe("https://archestimator.com/api/auth/sign-in/social");
    expect(routeCanonicalHostRedirect(new Request("https://archestimator.com/login?next=%2Fworkshop"))).toBeNull();
  });

  it("redirects Worker-subdomain auth traffic while preserving proof endpoints", async () => {
    const loginResponse = routeCanonicalHostRedirect(
      new Request("https://archestimator-proof.philipjonlewis.workers.dev/login?next=%2Fworkshop"),
    );

    expect(loginResponse?.status).toBe(308);
    expect(loginResponse?.headers.get("location")).toBe("https://archestimator.com/login?next=%2Fworkshop");
    expect(
      routeCanonicalHostRedirect(
        new Request("https://archestimator-proof.philipjonlewis.workers.dev/api/auth/sign-in/google"),
      )?.headers.get("location"),
    ).toBe("https://archestimator.com/api/auth/sign-in/google");
    expect(
      routeCanonicalHostRedirect(new Request("https://archestimator-proof.philipjonlewis.workers.dev/api/health")),
    ).toBeNull();
    expect(
      routeCanonicalHostRedirect(
        new Request("https://archestimator-proof.philipjonlewis.workers.dev/__cloudflare/provider-proof"),
      ),
    ).toBeNull();
  });

  it("redirects stale OAuth state errors at the root into a clean login retry", async () => {
    const response = routeAuthStateMismatchRetry(
      new Request("https://archestimator.com/?error=state_mismatch"),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response?.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("content-type")).toContain("text/html");
    expect(response?.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response?.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(response?.headers.get("set-cookie")).toContain("Path=/api/auth/callback/google");
    await expect(response?.text()).resolves.toContain("window.location.replace");

    expect(routeAuthStateMismatchRetry(new Request("https://archestimator.com/?error=invalid_code"))).toBeNull();
    expect(
      routeAuthStateMismatchRetry(new Request("https://archestimator.com/api/auth/error?error=invalid_code")),
    ).toBeNull();
    expect(
      routeAuthStateMismatchRetry(
        new Request("https://archestimator.com/?error=state_mismatch", { method: "POST" }),
      ),
    ).toBeNull();
  });

  it("redirects HEAD stale OAuth state probes at the root into a clean login retry", () => {
    const response = routeAuthStateMismatchRetry(
      new Request("https://archestimator.com/?error=state_mismatch", { method: "HEAD" }),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response?.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
  });

  it("redirects state mismatch errors from any app path before cacheable routing", async () => {
    const response = routeAuthStateMismatchRetry(
      new Request("https://archestimator.com/workshop/projects?error=state_mismatch"),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
  });

  it("redirects Better Auth state mismatch error URLs into the same clean login retry", async () => {
    const response = routeAuthStateMismatchRetry(
      new Request("https://archestimator.com/api/auth/error?error=state_mismatch"),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response?.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
  });

  it("redirects Google callbacks with no matching OAuth state cookie before Better Auth can strand the browser", async () => {
    const response = routeAuthCallbackStateMismatchRetry(
      new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
        headers: {
          cookie: "theme=dark; __Secure-better-auth.state=old-state.signature",
        },
      }),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response?.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(response?.headers.get("set-cookie")).toContain("Path=/login");
    expect(response?.headers.get("set-cookie")).toContain("Path=/api/auth/callback/google");
    await expect(response?.text()).resolves.toContain("Resetting sign-in");
  });

  it("lets Google callbacks with a matching duplicate state cookie continue to the app handler", () => {
    const response = routeAuthCallbackStateMismatchRetry(
      new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
        headers: {
          cookie:
            "theme=dark; __Secure-better-auth.state=old-state.signature; "
            + "better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh-signature",
        },
      }),
    );

    expect(response).toBeNull();
  });

  it("rewrites downstream state-mismatch redirects into the clean login retry", async () => {
    const response = normalizeAuthStateMismatchRedirectResponse(
      new Response(null, {
        status: 302,
        headers: {
          location: "/?error=state_mismatch",
        },
      }),
      new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    await expect(response.text()).resolves.toContain("window.location.replace");
  });

  it("leaves non-state-mismatch downstream redirects untouched", () => {
    const downstreamResponse = new Response(null, {
      status: 302,
      headers: {
        location: "/login?next=%2Fworkshop&error=invalid_code",
      },
    });

    const response = normalizeAuthStateMismatchRedirectResponse(
      downstreamResponse,
      new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake"),
    );

    expect(response).toBe(downstreamResponse);
  });

  it("turns reset-login URLs into a one-time cleanup hop before rendering login", async () => {
    const response = routeAuthStateResetLoginCompletion(
      new Request("https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1"),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
    );
    expect(response?.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
    );
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response?.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    await expect(response?.text()).resolves.toContain("oauth_state_reset_done=1");

    expect(routeAuthStateResetLoginCompletion(new Request("https://archestimator.com/login?next=%2Fworkshop"))).toBeNull();
  });

  it("serves health directly without the OpenNext handler", async () => {
    const response = routeCloudflareFastHealthRequest(new Request("https://proof.example.com/api/health"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    await expect(response?.json()).resolves.toMatchObject({
      ok: true,
      service: "archestimator",
    });
  });

  it("fails malformed share tokens closed without rejecting valid publication token shapes", async () => {
    const validToken = "a".repeat(43);

    expect(isWorkerPublicationTokenShape(validToken)).toBe(true);
    expect(isWorkerPublicationTokenShape("not-a-real-hosted-worker-share-token")).toBe(false);
    expect(routeMalformedShareTokenRequest(new Request(`https://proof.example.com/share/${validToken}`))).toBeNull();

    const response = routeMalformedShareTokenRequest(
      new Request("https://proof.example.com/share/not-a-real-hosted-worker-share-token"),
    );

    expect(response?.status).toBe(404);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("content-type")).toContain("text/html");
    await expect(response?.text()).resolves.toContain("This shared proposal is unavailable");
  });

  it("caches anonymous static public pages through the Worker Cache API", async () => {
    const cache = new FakeDefaultCache();
    vi.stubGlobal("caches", { default: cache });
    const { ctx, pending } = createContext();
    const fetcher = vi.fn(async () => new Response("<!doctype html><html><body>ok</body></html>", {
      headers: {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
      },
    }));
    const request = new Request("https://proof.example.com/features");

    const missResponse = await routeStaticPublicPageThroughCache(request, ctx, fetcher);
    await Promise.all(pending);
    const hitResponse = await routeStaticPublicPageThroughCache(request, ctx, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.matchCalls).toBe(1);
    expect(cache.putCalls).toBe(1);
    await expect(missResponse?.text()).resolves.toContain("ok");
    await expect(hitResponse?.text()).resolves.toContain("ok");
  });

  it("bypasses visitor-state public page requests", async () => {
    const cache = new FakeDefaultCache();
    vi.stubGlobal("caches", { default: cache });
    const { ctx } = createContext();
    const fetcher = vi.fn(async () => new Response("<!doctype html><html><body>ok</body></html>", {
      headers: {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
      },
    }));
    const request = new Request("https://proof.example.com/features", {
      headers: { cookie: "session=present" },
    });

    const firstResponse = await routeStaticPublicPageThroughCache(request, ctx, fetcher);
    const secondResponse = await routeStaticPublicPageThroughCache(request, ctx, fetcher);

    expect(firstResponse).toBeNull();
    expect(secondResponse).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(cache.matchCalls).toBe(0);
    expect(cache.putCalls).toBe(0);
  });

  it("does not cache the auth entry route through the Worker static-page cache", async () => {
    const cache = new FakeDefaultCache();
    vi.stubGlobal("caches", { default: cache });
    const { ctx } = createContext();
    const fetcher = vi.fn(async () => new Response("<!doctype html><html><body>login</body></html>", {
      headers: {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "text/html; charset=utf-8",
      },
    }));
    const request = new Request("https://proof.example.com/login");

    const response = await routeStaticPublicPageThroughCache(request, ctx, fetcher);

    expect(response).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(cache.matchCalls).toBe(0);
    expect(cache.putCalls).toBe(0);
  });
});
