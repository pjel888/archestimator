export const DEFAULT_AUTH_DESTINATION = "/workshop";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const LOGIN_PATH = "/login";
export const AUTH_REQUEST_PATH_HEADER = "x-archestimator-request-path";

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const PROTECTED_RETURN_PREFIXES = ["/workshop", "/admin"] as const;
const PROTECTED_RETURN_LOOP_PATHS = new Set([
  AUTH_CALLBACK_PATH,
  LOGIN_PATH,
  "/signup",
  "/access-required",
  "/workshop/terms",
]);
const SENSITIVE_RETURN_QUERY_KEY_PATTERN =
  /(?:^|[_-])(next|token|code|secret|email|password)(?:$|[_-])/i;
const MAX_PROTECTED_RETURN_LENGTH = 2_048;
const MAX_DECODE_PASSES = 3;

type OriginEnv = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV">> & Record<string, string | undefined>;

export function sanitizeProtectedReturnPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION,
) {
  const safeFallback =
    sanitizeProtectedPathOnly(fallback) ?? DEFAULT_AUTH_DESTINATION;
  const raw = typeof value === "string" ? value.trim() : "";
  return sanitizeProtectedPathOnly(raw) ?? safeFallback;
}

function getAllowedAppOrigins(env: OriginEnv = process.env) {
  const origins = new Set<string>();
  const configured = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
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
  loginUrl.searchParams.set("next", sanitizeProtectedReturnPath(next));
  return loginUrl;
}

function sanitizeProtectedPathOnly(value: string) {
  if (
    !value ||
    value.length > MAX_PROTECTED_RETURN_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    /\\/.test(value)
  ) {
    return null;
  }

  const decodedCandidates = decodeCandidates(value);
  if (!decodedCandidates) return null;

  for (const candidate of decodedCandidates) {
    if (
      candidate.length > MAX_PROTECTED_RETURN_LENGTH ||
      !candidate.startsWith("/") ||
      candidate.startsWith("//") ||
      /\\/.test(candidate) ||
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
  if (!isProtectedReturnPath(parsed.pathname)) return null;
  if (
    PROTECTED_RETURN_LOOP_PATHS.has(parsed.pathname) ||
    parsed.pathname.startsWith(`${AUTH_CALLBACK_PATH}/`) ||
    parsed.pathname.startsWith(`${LOGIN_PATH}/`)
  ) {
    return null;
  }
  if (parsed.searchParams.has("next")) return null;
  for (const key of parsed.searchParams.keys()) {
    if (SENSITIVE_RETURN_QUERY_KEY_PATTERN.test(key)) return null;
  }

  return `${parsed.pathname}${parsed.search}`;
}

function isProtectedReturnPath(pathname: string) {
  return PROTECTED_RETURN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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
