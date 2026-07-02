import { cookies } from "next/headers";

type ForwardedCookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
};

type ForwardedCookie = {
  name: string;
  value: string;
  options: ForwardedCookieOptions;
};

export const BETTER_AUTH_OAUTH_STATE_COOKIE_NAMES = [
  "better-auth.state",
  "__Secure-better-auth.state",
  "better-auth.oauth_state",
  "__Secure-better-auth.oauth_state",
] as const;

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasCookieNameAt(value: string, index: number) {
  const rest = value.slice(index).trimStart();
  return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+=/.test(rest);
}

export function splitSetCookieHeader(value: string | null | undefined) {
  const header = value?.trim();
  if (!header) return [];

  const parts: string[] = [];
  let start = 0;
  let inExpires = false;

  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (header.slice(index, index + 8).toLowerCase() === "expires=") inExpires = true;
    if (char === ";") inExpires = false;
    if (char === "," && !inExpires && hasCookieNameAt(header, index + 1)) {
      parts.push(header.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(header.slice(start).trim());
  return parts.filter(Boolean);
}

export function getSetCookieHeaders(headers: Headers) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") return getSetCookie.call(headers);
  return splitSetCookieHeader(headers.get("set-cookie"));
}

export function parseForwardedSetCookie(header: string): ForwardedCookie | null {
  const segments = header.split(";").map((segment) => segment.trim()).filter(Boolean);
  const [nameValue, ...attributes] = segments;
  const splitAt = nameValue?.indexOf("=") ?? -1;
  if (!nameValue || splitAt <= 0) return null;

  const options: ForwardedCookieOptions = {};
  for (const attribute of attributes) {
    const attributeSplitAt = attribute.indexOf("=");
    const rawName = attributeSplitAt >= 0 ? attribute.slice(0, attributeSplitAt) : attribute;
    const rawValue = attributeSplitAt >= 0 ? attribute.slice(attributeSplitAt + 1) : "";
    const name = rawName.trim().toLowerCase();
    const value = rawValue.trim();

    if (name === "domain" && value) options.domain = value;
    else if (name === "path" && value) options.path = value;
    else if (name === "expires" && value) {
      const expires = new Date(value);
      if (!Number.isNaN(expires.getTime())) options.expires = expires;
    } else if (name === "max-age" && value) {
      const maxAge = Number(value);
      if (Number.isFinite(maxAge)) options.maxAge = maxAge;
    } else if (name === "httponly") options.httpOnly = true;
    else if (name === "secure") options.secure = true;
    else if (name === "samesite") {
      const sameSite = value.toLowerCase();
      if (sameSite === "strict" || sameSite === "lax" || sameSite === "none") {
        options.sameSite = sameSite;
      }
    }
  }

  return {
    name: nameValue.slice(0, splitAt),
    value: safeDecodeCookieValue(nameValue.slice(splitAt + 1)),
    options,
  };
}

export async function forwardSetCookieHeaders(headers: Headers) {
  const forwardedCookies = getSetCookieHeaders(headers)
    .map((header) => parseForwardedSetCookie(header))
    .filter((cookie): cookie is ForwardedCookie => Boolean(cookie));
  if (forwardedCookies.length === 0) return;

  const cookieStore = await cookies();
  for (const cookie of forwardedCookies) {
    cookieStore.set(cookie.name, cookie.value, cookie.options);
  }
}

function getCookieCleanupDomains(origin?: string) {
  if (!origin) return [];

  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return [];
  }

  if (hostname === "archestimator.com" || hostname.endsWith(".archestimator.com")) {
    return ["archestimator.com", ".archestimator.com"];
  }

  return [];
}

export async function clearBetterAuthOAuthStateCookies(origin?: string) {
  const cookieStore = await cookies();
  const secure = !origin || origin.startsWith("https://");
  const baseOptions: ForwardedCookieOptions = {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  };

  for (const name of BETTER_AUTH_OAUTH_STATE_COOKIE_NAMES) {
    cookieStore.set(name, "", baseOptions);
    for (const domain of getCookieCleanupDomains(origin)) {
      cookieStore.set(name, "", { ...baseOptions, domain });
    }
  }
}

type CookiePair = {
  name: string;
  value: string;
};

function parseCookiePairs(header: string) {
  const pairs: CookiePair[] = [];

  for (const chunk of header.split(";")) {
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

export function normalizeBetterAuthOAuthStateCookieHeader(headers: Headers, state: string | null | undefined) {
  if (!state) return headers;

  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return headers;

  const stateCookieNames = new Set<string>(BETTER_AUTH_OAUTH_STATE_COOKIE_NAMES);
  const pairs = parseCookiePairs(cookieHeader);
  let matchedStateCookie: CookiePair | null = null;
  const preservedPairs: CookiePair[] = [];

  for (const pair of pairs) {
    if (!stateCookieNames.has(pair.name)) {
      preservedPairs.push(pair);
      continue;
    }

    if (!matchedStateCookie && readBetterAuthStateCookieValue(pair.value) === state) {
      matchedStateCookie = pair;
    }
  }

  if (!matchedStateCookie) return headers;

  const normalizedHeaders = new Headers(headers);
  normalizedHeaders.set(
    "cookie",
    [...preservedPairs, matchedStateCookie]
      .map((pair) => `${pair.name}=${pair.value}`)
      .join("; "),
  );
  return normalizedHeaders;
}
