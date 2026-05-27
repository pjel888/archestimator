export const DEFAULT_AUTH_DESTINATION = "/workshop";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const LOGIN_PATH = "/login";
export const AUTH_REQUEST_PATH_HEADER = "x-archestimator-request-path";

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const MAX_DECODE_PASSES = 3;

type OriginEnv = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV">> & Record<string, string | undefined>;

export function sanitizeNextPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION,
) {
  const safeFallback = sanitizePathOnly(fallback) ?? DEFAULT_AUTH_DESTINATION;
  const raw = typeof value === "string" ? value.trim() : "";
  return sanitizePathOnly(raw) ?? safeFallback;
}

export function getAllowedAppOrigins(env: OriginEnv = process.env) {
  const origins = new Set<string>();
  const configured = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    ...(env.ARCHESTIMATOR_ALLOWED_APP_ORIGINS ?? "").split(","),
  ];

  for (const value of configured) {
    const origin = normalizeOrigin(value);
    if (origin) origins.add(origin);
  }

  return [...origins];
}

export function resolveAuthOrigin({
  requestOrigin,
  requestUrl,
  env = process.env,
}: {
  requestOrigin?: string | null;
  requestUrl?: string | null;
  env?: OriginEnv;
}) {
  const allowedOrigins = getAllowedAppOrigins(env);
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

  if (
    normalizedRequestOrigin &&
    (allowedOrigins.includes(normalizedRequestOrigin) ||
      isLocalhostOrigin(normalizedRequestOrigin, env))
  ) {
    return normalizedRequestOrigin;
  }

  const requestUrlOrigin = normalizeOriginFromUrl(requestUrl);
  if (
    requestUrlOrigin &&
    (allowedOrigins.includes(requestUrlOrigin) ||
      isLocalhostOrigin(requestUrlOrigin, env))
  ) {
    return requestUrlOrigin;
  }

  if (allowedOrigins.length === 0) {
    if (env.NODE_ENV === "production") {
      throw new Error("Missing canonical auth origin");
    }
    return "http://localhost:3000";
  }

  return allowedOrigins[0];
}

export function buildLoginRedirectUrl({
  origin,
  code,
  next,
}: {
  origin: string;
  code: string;
  next: string;
}) {
  const loginUrl = new URL(LOGIN_PATH, origin);
  loginUrl.searchParams.set("error", code);
  loginUrl.searchParams.set("next", sanitizeNextPath(next));
  return loginUrl;
}

function sanitizePathOnly(value: string) {
  if (!value || CONTROL_CHARACTER_PATTERN.test(value) || value.includes("\\")) {
    return null;
  }

  const decodedCandidates = decodeCandidates(value);
  if (!decodedCandidates) return null;

  for (const candidate of decodedCandidates) {
    if (
      !candidate.startsWith("/") ||
      candidate.startsWith("//") ||
      candidate.includes("\\") ||
      CONTROL_CHARACTER_PATTERN.test(candidate) ||
      /^[a-z][a-z\d+.-]*:/i.test(candidate)
    ) {
      return null;
    }
  }

  const decodedValue = decodedCandidates.at(-1) ?? value;
  let parsed: URL;
  try {
    parsed = new URL(decodedValue, "https://archestimator.local");
  } catch {
    return null;
  }

  if (parsed.origin !== "https://archestimator.local") return null;
  if (parsed.pathname === AUTH_CALLBACK_PATH) return null;
  if (hasUnsafeNestedNextPath(parsed)) return null;

  return decodedValue;
}

function hasUnsafeNestedNextPath(parsed: URL) {
  const nestedNextValues = parsed.searchParams.getAll("next");
  return nestedNextValues.some((nextValue) => sanitizePathOnly(nextValue) === null);
}

function decodeCandidates(value: string) {
  const candidates = [value];
  let current = value;

  for (let index = 0; index < MAX_DECODE_PASSES; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      candidates.push(decoded);
      current = decoded;
    } catch {
      return null;
    }
  }

  return candidates;
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function normalizeOriginFromUrl(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalhostOrigin(origin: string, env: OriginEnv) {
  return env.NODE_ENV !== "production" && LOCALHOST_ORIGIN_PATTERN.test(origin);
}
