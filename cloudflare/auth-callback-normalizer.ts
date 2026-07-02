type Env = {
  ARCH_APP: Fetcher;
};

type CookiePair = {
  name: string;
  value: string;
};

type OAuthStateCookieResult = {
  hasOAuthStateCookie: boolean;
  matchedStateCookie: CookiePair | null;
  preservedPairs: CookiePair[];
};

const OAUTH_STATE_COOKIE_NAMES = new Set([
  "better-auth.state",
  "__Secure-better-auth.state",
  "better-auth.oauth_state",
  "__Secure-better-auth.oauth_state",
]);
const OAUTH_STATE_CLEANUP_PATHS = ["/", "/login", "/api/auth", "/api/auth/callback", "/api/auth/callback/google"];
const OAUTH_STATE_CLEANUP_DOMAINS = [null, "archestimator.com", ".archestimator.com"] as const;
const OAUTH_STATE_RESET_PARAM = "oauth_state_reset";
const OAUTH_STATE_RESET_DONE_PARAM = "oauth_state_reset_done";
const STATE_MISMATCH_ERROR = "state_mismatch";
const OAUTH_STATE_RESET_CLEAR_SITE_DATA = "\"cache\", \"cookies\", \"storage\"";
const CANONICAL_HOSTNAME = "archestimator.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOSTNAME}`;

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookiePairs(cookieHeader: string) {
  const pairs: CookiePair[] = [];

  for (const chunk of cookieHeader.split(";")) {
    const splitAt = chunk.indexOf("=");
    if (splitAt <= 0) continue;
    const name = chunk.slice(0, splitAt).trim();
    const value = chunk.slice(splitAt + 1).trim();
    if (name) pairs.push({ name, value });
  }

  return pairs;
}

function readBetterAuthStateCookieValue(value: string) {
  const decoded = safeDecodeCookieValue(value);
  const stateEnd = decoded.indexOf(".");
  return stateEnd > 0 ? decoded.slice(0, stateEnd) : decoded;
}

function findOAuthStateCookie(cookieHeader: string | null, state: string | null): OAuthStateCookieResult {
  const preservedPairs: CookiePair[] = [];
  let matchedStateCookie: CookiePair | null = null;
  let hasOAuthStateCookie = false;

  if (!cookieHeader || !state) {
    return { hasOAuthStateCookie, matchedStateCookie, preservedPairs };
  }

  for (const pair of parseCookiePairs(cookieHeader)) {
    if (!OAUTH_STATE_COOKIE_NAMES.has(pair.name)) {
      preservedPairs.push(pair);
      continue;
    }

    hasOAuthStateCookie = true;
    if (!matchedStateCookie && readBetterAuthStateCookieValue(pair.value) === state) {
      matchedStateCookie = pair;
    }
  }

  return { hasOAuthStateCookie, matchedStateCookie, preservedPairs };
}

function appendOAuthStateCleanupHeaders(headers: Headers) {
  for (const name of OAUTH_STATE_COOKIE_NAMES) {
    for (const path of OAUTH_STATE_CLEANUP_PATHS) {
      for (const domain of OAUTH_STATE_CLEANUP_DOMAINS) {
        const domainAttribute = domain ? `; Domain=${domain}` : "";
        headers.append(
          "Set-Cookie",
          `${name}=; Max-Age=0; Path=${path}${domainAttribute}; HttpOnly; Secure; SameSite=Lax`,
        );
      }
    }
  }
}

function createOAuthStateCleanupHeaders() {
  const headers = new Headers({
    "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
    Expires: "0",
    Pragma: "no-cache",
  });

  appendOAuthStateCleanupHeaders(headers);

  return headers;
}

function escapeHtmlAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;");
}

function createRedirectFallbackHtml(redirectUrl: URL) {
  const href = escapeHtmlAttribute(redirectUrl.toString());
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0;url=${href}"><title>Resetting sign-in</title><script>window.location.replace(${JSON.stringify(redirectUrl.toString())});</script></head><body><main><p>Resetting sign-in...</p><p><a href="${href}">Continue to sign in</a></p></main></body></html>`;
}

function createRedirectWithFallbackResponse(redirectUrl: URL, headers: Headers) {
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Refresh", `0; url=${redirectUrl.toString()}`);
  headers.set("Location", redirectUrl.toString());
  return new Response(createRedirectFallbackHtml(redirectUrl), { status: 302, headers });
}

function createStateMismatchRetryResponse(request: Request, options?: { clearSiteData?: boolean }) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/login", getCanonicalOrigin(requestUrl));
  redirectUrl.searchParams.set("next", "/workshop");
  redirectUrl.searchParams.set(OAUTH_STATE_RESET_PARAM, "1");

  const headers = createOAuthStateCleanupHeaders();
  if (options?.clearSiteData ?? isStateMismatchRetryUrl(request)) {
    headers.set("Clear-Site-Data", OAUTH_STATE_RESET_CLEAR_SITE_DATA);
  }
  return createRedirectWithFallbackResponse(redirectUrl, headers);
}

function hasStateMismatchError(url: URL) {
  return url.searchParams.get("error") === STATE_MISMATCH_ERROR;
}

function isSafeNavigationMethod(request: Request) {
  return request.method === "GET" || request.method === "HEAD";
}

function isNextOrCloudflareAssetPath(pathname: string) {
  return pathname.startsWith("/_next/") || pathname.startsWith("/cdn-cgi/");
}

function getCanonicalOrigin(url: URL) {
  return url.hostname.toLowerCase() === CANONICAL_HOSTNAME ? url.origin : CANONICAL_ORIGIN;
}

function isCanonicalHostRedirectRequest(request: Request) {
  const url = new URL(request.url);
  return url.hostname.toLowerCase() === "www.archestimator.com";
}

function createCanonicalHostRedirect(request: Request) {
  const url = new URL(request.url);
  url.protocol = "https:";
  url.hostname = CANONICAL_HOSTNAME;
  url.port = "";

  return Response.redirect(url.toString(), 308);
}

function createStateMismatchRetryResponseFromUrl(url: URL) {
  return createStateMismatchRetryResponse(new Request(url.toString()), { clearSiteData: true });
}

function createNormalizedRequest(request: Request) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  const state = url.searchParams.get("state");
  const stateCookie = findOAuthStateCookie(headers.get("cookie"), state);

  if (state && !stateCookie.matchedStateCookie) {
    return createStateMismatchRetryResponse(request, { clearSiteData: true });
  }

  if (stateCookie.matchedStateCookie) {
    headers.set(
      "cookie",
      [...stateCookie.preservedPairs, stateCookie.matchedStateCookie]
        .map((pair) => `${pair.name}=${pair.value}`)
        .join("; "),
    );
  }
  return new Request(request, { headers });
}

function isStateMismatchRetryUrl(request: Request) {
  if (!isSafeNavigationMethod(request)) return false;

  const url = new URL(request.url);
  return hasStateMismatchError(url) && !isNextOrCloudflareAssetPath(url.pathname);
}

function isStateMismatchLoginRetryUrl(request: Request) {
  if (!isSafeNavigationMethod(request)) return false;

  const url = new URL(request.url);
  return url.pathname === "/login" && hasStateMismatchError(url);
}

function isOAuthStateResetLoginUrl(request: Request) {
  if (!isSafeNavigationMethod(request)) return false;

  const url = new URL(request.url);
  return url.pathname === "/login" && url.searchParams.get(OAUTH_STATE_RESET_PARAM) === "1";
}

function createCleanLoginStateResetRedirect(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/login", getCanonicalOrigin(requestUrl));
  redirectUrl.searchParams.set("next", requestUrl.searchParams.get("next") || "/workshop");
  redirectUrl.searchParams.set(OAUTH_STATE_RESET_PARAM, "1");

  const headers = createOAuthStateCleanupHeaders();
  headers.set("Clear-Site-Data", OAUTH_STATE_RESET_CLEAR_SITE_DATA);

  return createRedirectWithFallbackResponse(redirectUrl, headers);
}

function createCompletedLoginStateResetRedirect(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/login", getCanonicalOrigin(requestUrl));
  redirectUrl.searchParams.set("next", requestUrl.searchParams.get("next") || "/workshop");
  redirectUrl.searchParams.set(OAUTH_STATE_RESET_DONE_PARAM, "1");

  const headers = createOAuthStateCleanupHeaders();
  headers.set("Clear-Site-Data", OAUTH_STATE_RESET_CLEAR_SITE_DATA);

  return createRedirectWithFallbackResponse(redirectUrl, headers);
}

function isGoogleOAuthCallback(request: Request) {
  const url = new URL(request.url);
  return url.pathname === "/api/auth/callback/google";
}

function normalizeStateMismatchRedirectResponse(response: Response, request: Request) {
  const location = response.headers.get("location");
  if (!location || response.status < 300 || response.status >= 400) return response;

  let locationUrl: URL;
  try {
    locationUrl = new URL(location, request.url);
  } catch {
    return response;
  }

  if (!hasStateMismatchError(locationUrl)) return response;
  return createStateMismatchRetryResponseFromUrl(locationUrl);
}

export default {
  async fetch(request, env) {
    if (isStateMismatchRetryUrl(request)) {
      return createStateMismatchRetryResponse(request);
    }

    if (!isGoogleOAuthCallback(request)) {
      if (isStateMismatchLoginRetryUrl(request)) {
        return createCleanLoginStateResetRedirect(request);
      }

      if (isOAuthStateResetLoginUrl(request)) {
        return createCompletedLoginStateResetRedirect(request);
      }

      if (isCanonicalHostRedirectRequest(request)) {
        return createCanonicalHostRedirect(request);
      }

      return normalizeStateMismatchRedirectResponse(await env.ARCH_APP.fetch(request), request);
    }

    const normalizedRequest = createNormalizedRequest(request);
    if (normalizedRequest instanceof Response) return normalizedRequest;
    return normalizeStateMismatchRedirectResponse(await env.ARCH_APP.fetch(normalizedRequest), normalizedRequest);
  },
} satisfies ExportedHandler<Env>;
