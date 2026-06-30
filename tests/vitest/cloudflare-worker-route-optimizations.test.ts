import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isWorkerPublicationTokenShape,
  routeCloudflareFastHealthRequest,
  routeMalformedShareTokenRequest,
  routeStaticPublicPageThroughCache,
} from "@/lib/cloudflare/worker-route-optimizations";

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
    const request = new Request("https://proof.example.com/login");

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
    const request = new Request("https://proof.example.com/login", {
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
});
