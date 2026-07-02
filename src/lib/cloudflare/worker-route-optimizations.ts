const publicationTokenBase64UrlLength = 43;

const staticPublicPagePaths = new Set([
  "/",
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

const oauthStateCookieNames = [
  "better-auth.state",
  "__Secure-better-auth.state",
  "better-auth.oauth_state",
  "__Secure-better-auth.oauth_state",
];
const oauthStateCleanupPaths = ["/", "/login", "/api/auth", "/api/auth/callback", "/api/auth/callback/google"];
const oauthStateCleanupDomains = [null, "archestimator.com", ".archestimator.com"] as const;
const oauthStateResetParam = "oauth_state_reset";
const oauthStateResetDoneParam = "oauth_state_reset_done";
const stateMismatchError = "state_mismatch";
const oauthStateResetClearSiteData = "\"cache\", \"cookies\", \"storage\"";

const sharedLinkUnavailableHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Shared proposal unavailable</title></head><body><main><p>Shared proposal</p><h1>This shared proposal is unavailable</h1><p>Ask the sender for a fresh link.</p></main></body></html>`;

const canonicalHostRedirects = new Map([
  ["www.archestimator.com", { host: "archestimator.com", keepProofRoutes: false }],
  ["archestimator-proof.philipjonlewis.workers.dev", { host: "archestimator.com", keepProofRoutes: true }],
]);

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

function isSafeNavigationRequest(request: Request) {
  return request.method === "GET" || request.method === "HEAD";
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

export function routeCanonicalHostRedirect(request: Request) {
  const url = new URL(request.url);
  const canonical = canonicalHostRedirects.get(url.hostname.toLowerCase());
  if (!canonical) return null;
  if (canonical.keepProofRoutes && (url.pathname === "/api/health" || url.pathname.startsWith("/__cloudflare/"))) {
    return null;
  }

  url.hostname = canonical.host;
  return Response.redirect(url.toString(), 308);
}

function appendOAuthStateCookieCleanup(headers: Headers) {
  for (const name of oauthStateCookieNames) {
    for (const path of oauthStateCleanupPaths) {
      for (const domain of oauthStateCleanupDomains) {
        const domainAttribute = domain ? `; Domain=${domain}` : "";
        headers.append(
          "Set-Cookie",
          `${name}=; Max-Age=0; Path=${path}${domainAttribute}; HttpOnly; Secure; SameSite=Lax`,
        );
      }
    }
  }
}

function escapeHtmlAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;");
}

function createRedirectFallbackHtml(redirectUrl: URL) {
  const href = escapeHtmlAttribute(redirectUrl.toString());
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0;url=${href}"><title>Resetting sign-in</title><script>window.location.replace(${JSON.stringify(redirectUrl.toString())});</script></head><body><main><p>Resetting sign-in...</p><p><a href="${href}">Continue to sign in</a></p></main></body></html>`;
}

function createOAuthStateRetryResponse(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/login", requestUrl.origin);
  redirectUrl.searchParams.set("next", "/workshop");
  redirectUrl.searchParams.set(oauthStateResetParam, "1");

  const headers = new Headers({
    ...noStoreHeaders,
    "Clear-Site-Data": oauthStateResetClearSiteData,
    "Content-Type": "text/html; charset=utf-8",
    Expires: "0",
    Location: redirectUrl.toString(),
    Pragma: "no-cache",
    Refresh: `0; url=${redirectUrl.toString()}`,
  });
  appendOAuthStateCookieCleanup(headers);

  return new Response(createRedirectFallbackHtml(redirectUrl), { status: 302, headers });
}

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readBetterAuthStateCookieValue(value: string) {
  const decoded = safeDecodeCookieValue(value);
  const stateEnd = decoded.indexOf(".");
  return stateEnd > 0 ? decoded.slice(0, stateEnd) : decoded;
}

function hasMatchingOAuthStateCookie(cookieHeader: string | null, state: string) {
  if (!cookieHeader) return false;

  const stateCookieNames = new Set(oauthStateCookieNames);
  for (const chunk of cookieHeader.split(";")) {
    const splitAt = chunk.indexOf("=");
    if (splitAt <= 0) continue;

    const name = chunk.slice(0, splitAt).trim();
    if (!stateCookieNames.has(name)) continue;

    const value = chunk.slice(splitAt + 1).trim();
    if (readBetterAuthStateCookieValue(value) === state) return true;
  }

  return false;
}

function hasStateMismatchError(url: URL) {
  return url.searchParams.get("error") === stateMismatchError;
}

function isNextOrCloudflareAssetPath(pathname: string) {
  return pathname.startsWith("/_next/") || pathname.startsWith("/cdn-cgi/");
}

export function routeAuthStateMismatchRetry(request: Request) {
  if (!isSafeNavigationRequest(request)) return null;

  const url = new URL(request.url);
  if (
    !hasStateMismatchError(url) ||
    isNextOrCloudflareAssetPath(url.pathname)
  ) {
    return null;
  }

  return createOAuthStateRetryResponse(request);
}

export function routeAuthCallbackStateMismatchRetry(request: Request) {
  if (!isSafeNavigationRequest(request)) return null;

  const url = new URL(request.url);
  if (url.pathname !== "/api/auth/callback/google") return null;

  const state = url.searchParams.get("state");
  if (!state) return null;

  if (hasMatchingOAuthStateCookie(request.headers.get("cookie"), state)) return null;
  return createOAuthStateRetryResponse(request);
}

export function routeAuthStateResetLoginCompletion(request: Request) {
  if (!isSafeNavigationRequest(request)) return null;

  const url = new URL(request.url);
  if (url.pathname !== "/login" || url.searchParams.get(oauthStateResetParam) !== "1") return null;

  const redirectUrl = new URL("/login", url.origin);
  redirectUrl.searchParams.set("next", url.searchParams.get("next") || "/workshop");
  redirectUrl.searchParams.set(oauthStateResetDoneParam, "1");

  const headers = new Headers({
    ...noStoreHeaders,
    "Clear-Site-Data": oauthStateResetClearSiteData,
    "Content-Type": "text/html; charset=utf-8",
    Location: redirectUrl.toString(),
    Refresh: `0; url=${redirectUrl.toString()}`,
  });
  appendOAuthStateCookieCleanup(headers);

  return new Response(createRedirectFallbackHtml(redirectUrl), { status: 302, headers });
}

export function normalizeAuthStateMismatchRedirectResponse(response: Response, request: Request) {
  if (response.status < 300 || response.status >= 400) return response;

  const location = response.headers.get("location");
  if (!location) return response;

  let locationUrl: URL;
  try {
    locationUrl = new URL(location, request.url);
  } catch {
    return response;
  }

  if (!hasStateMismatchError(locationUrl)) return response;
  return createOAuthStateRetryResponse(new Request(locationUrl.toString()));
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
