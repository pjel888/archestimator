import { describe, expect, it, vi } from "vitest";

import worker from "../../cloudflare/auth-callback-normalizer";

const OAUTH_STATE_RESET_CLEAR_SITE_DATA = "\"cache\", \"cookies\", \"storage\"";

function createEnv(fetchImpl: (request: Request) => Promise<Response> | Response) {
  return {
    ARCH_APP: {
      fetch: fetchImpl,
    },
  };
}

describe("Cloudflare auth callback normalizer Worker", () => {
  it("keeps only the OAuth state cookie matching the Google callback state", async () => {
    const appFetch = vi.fn(async () => new Response("forwarded"));
    const request = new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
      headers: {
        cookie:
          "theme=light; __Secure-better-auth.state=old-state.old-signature; "
          + "better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh%2Fsignature",
      },
    });

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(200);
    expect(appFetch).toHaveBeenCalledTimes(1);
    const forwardedRequest = appFetch.mock.calls[0]?.[0] as Request;
    expect(forwardedRequest.headers.get("cookie")).toBe(
      "theme=light; better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh%2Fsignature",
    );
  });

  it("clears stale OAuth state cookies and redirects to a retryable login when no cookie matches", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
      headers: {
        cookie: "theme=light; __Secure-better-auth.state=old-state.old-signature",
      },
    });

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("Path=/login");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/callback/google");
    expect(response.headers.get("set-cookie")).toContain("Domain=.archestimator.com");
    expect(await response.text()).toContain("Resetting sign-in");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects to a retryable login when the callback state arrives without any cookie", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects root state mismatch URLs to a clean login retry", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/?error=state_mismatch");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/callback/google");
    expect(await response.text()).toContain("window.location.replace");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects www state mismatch URLs directly to the apex clean login retry", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://www.archestimator.com/?error=state_mismatch");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(await response.text()).toContain("archestimator.com/login");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects HEAD state mismatch probes instead of forwarding them to the app", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/?error=state_mismatch", { method: "HEAD" });

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects www Google callbacks without matching state to the apex clean login retry", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://www.archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
      headers: {
        cookie: "__Secure-better-auth.state=old-state.signature",
      },
    });

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects state mismatch URLs on any app route to a clean login retry", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/workshop?error=state_mismatch");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("redirects Better Auth state mismatch error URLs before they can strand users at the root", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/api/auth/error?error=state_mismatch");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("rewrites downstream state mismatch redirects into the clean login retry", async () => {
    const appFetch = vi.fn(async () => new Response(null, {
      status: 302,
      headers: {
        location: "https://archestimator.com/?error=state_mismatch",
      },
    }));
    const request = new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
      headers: {
        cookie: "__Secure-better-auth.state=fresh-state.signature",
      },
    });

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).toHaveBeenCalledTimes(1);
  });

  it("rewrites relative downstream state mismatch redirects into the clean login retry", async () => {
    const appFetch = vi.fn(async () => new Response(null, {
      status: 302,
      headers: {
        location: "/?error=state_mismatch",
      },
    }));
    const request = new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake", {
      headers: {
        cookie: "__Secure-better-auth.state=fresh-state.signature",
      },
    });

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(appFetch).toHaveBeenCalledTimes(1);
  });

  it("redirects legacy retry login error URLs to the clean reset URL", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/login?next=%2Fworkshop&error=state_mismatch");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("turns the clean reset login URL into a one-time cleanup hop", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
    );
    expect(response.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/callback/google");
    expect(await response.text()).toContain("oauth_state_reset_done=1");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("turns www reset-login URLs into an apex cleanup completion hop", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://www.archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
    );
    expect(response.headers.get("refresh")).toBe(
      "0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
    );
    expect(response.headers.get("clear-site-data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(await response.text()).toContain("oauth_state_reset_done=1");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("canonicalizes normal www traffic before it can mint host-scoped OAuth state", async () => {
    const appFetch = vi.fn(async () => new Response("should not be called"));
    const request = new Request("https://www.archestimator.com/login?next=%2Fworkshop");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://archestimator.com/login?next=%2Fworkshop");
    expect(appFetch).not.toHaveBeenCalled();
  });

  it("does not add cleanup headers to the normal login page", async () => {
    const appFetch = vi.fn(async () => new Response("login"));
    const request = new Request("https://archestimator.com/login?next=%2Fworkshop");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(200);
    expect(response.headers.get("clear-site-data")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(appFetch).toHaveBeenCalledTimes(1);
  });

  it("forwards non-auth requests unchanged when installed as a broad edge adapter", async () => {
    const appFetch = vi.fn(async () => new Response(null, { status: 204 }));
    const request = new Request("https://archestimator.com/workshop");

    const response = await worker.fetch(request, createEnv(appFetch));

    expect(response.status).toBe(204);
    expect(appFetch).toHaveBeenCalledTimes(1);
    expect(appFetch.mock.calls[0]?.[0]).toBe(request);
  });
});
