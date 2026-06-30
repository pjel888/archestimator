const publicationTokenBase64UrlLength = 43;

const staticPublicPagePaths = new Set([
  "/",
  "/login",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/trust",
  "/privacy",
  "/terms",
  "/signup",
  "/access-required",
]);

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

const sharedLinkUnavailableHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Shared proposal unavailable</title></head><body><main><p>Shared proposal</p><h1>This shared proposal is unavailable</h1><p>Ask the sender for a fresh link.</p></main></body></html>`;

type CacheStorageWithDefault = CacheStorage & {
  default?: Cache;
};

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
};

type WorkerRouteFetcher = (request: Request) => Promise<Response> | Response;

type StaticPublicPageMemoryEntry = {
  body: ArrayBuffer;
  headers: [string, string][];
  status: number;
  statusText: string;
};

const staticPublicPageMemoryCache = new Map<string, StaticPublicPageMemoryEntry>();

function getDefaultCache() {
  return (globalThis as typeof globalThis & { caches?: CacheStorageWithDefault }).caches?.default ?? null;
}

function isGetRequest(request: Request) {
  return request.method === "GET";
}

function requestHasVisitorState(request: Request) {
  return request.headers.has("cookie") || request.headers.has("authorization");
}

function isStaticPublicPageRequest(request: Request) {
  if (!isGetRequest(request) || requestHasVisitorState(request)) return false;
  const url = new URL(request.url);
  return url.search === "" && staticPublicPagePaths.has(url.pathname);
}

function createCacheKey(request: Request) {
  const url = new URL(request.url);
  return new Request(url.toString(), { method: "GET" });
}

function createMemoryCacheKey(request: Request) {
  return new URL(request.url).toString();
}

function readStaticPublicPageMemoryCache(key: string) {
  const entry = staticPublicPageMemoryCache.get(key);
  if (!entry) return null;

  return new Response(entry.body.slice(0), {
    headers: new Headers(entry.headers),
    status: entry.status,
    statusText: entry.statusText,
  });
}

async function writeStaticPublicPageMemoryCache(key: string, response: Response) {
  if (!isCacheablePublicPageResponse(response)) return;
  staticPublicPageMemoryCache.set(key, {
    body: await response.arrayBuffer(),
    headers: [...response.headers.entries()],
    status: response.status,
    statusText: response.statusText,
  });
}

function hasNoStoreCacheControl(value: string | null) {
  return value?.toLowerCase().split(",").map((part) => part.trim()).includes("no-store") ?? false;
}

function isCacheablePublicPageResponse(response: Response) {
  return response.status === 200
    && response.headers.get("content-type")?.toLowerCase().includes("text/html")
    && !response.headers.has("set-cookie")
    && !hasNoStoreCacheControl(response.headers.get("cache-control"));
}

export function isWorkerPublicationTokenShape(token: string) {
  const normalized = token.trim();
  return normalized.length === publicationTokenBase64UrlLength && /^[A-Za-z0-9_-]+$/.test(normalized);
}

export function routeCloudflareFastHealthRequest(request: Request) {
  const url = new URL(request.url);
  if (!isGetRequest(request) || url.pathname !== "/api/health") return null;

  return Response.json(
    {
      ok: true,
      service: "archestimator",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function routeMalformedShareTokenRequest(request: Request) {
  if (!isGetRequest(request)) return null;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/share\/([^/]+)\/?$/);
  if (!match) return null;

  const token = decodeURIComponent(match[1] ?? "");
  if (isWorkerPublicationTokenShape(token)) return null;

  return new Response(sharedLinkUnavailableHtml, {
    status: 404,
    headers: {
      ...noStoreHeaders,
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export async function routeStaticPublicPageThroughCache(
  request: Request,
  ctx: ExecutionContextLike,
  fetcher: WorkerRouteFetcher,
) {
  if (!isStaticPublicPageRequest(request)) return null;

  const memoryCacheKey = createMemoryCacheKey(request);
  const memoryCachedResponse = readStaticPublicPageMemoryCache(memoryCacheKey);
  if (memoryCachedResponse) return memoryCachedResponse;

  const cache = getDefaultCache();
  if (!cache) {
    const response = await fetcher(request);
    await writeStaticPublicPageMemoryCache(memoryCacheKey, response.clone());
    return response;
  }

  const cacheKey = createCacheKey(request);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    await writeStaticPublicPageMemoryCache(memoryCacheKey, cachedResponse.clone());
    return cachedResponse;
  }

  const response = await fetcher(request);
  if (isCacheablePublicPageResponse(response)) {
    const cacheableResponse = response.clone();
    await writeStaticPublicPageMemoryCache(memoryCacheKey, cacheableResponse.clone());
    ctx.waitUntil(
      cache.put(cacheKey, cacheableResponse).catch((error) => {
        console.warn(
          "Cloudflare static public page cache write failed",
          error instanceof Error ? error.message : String(error),
        );
      }),
    );
  }

  return response;
}
