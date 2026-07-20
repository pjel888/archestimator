import {
  createCloudflareBetterAuthForD1,
  createCloudflareBetterAuthMagicLinkPlugin,
  createCloudflareBetterAuthNextHandlers,
  getBetterAuthRouteGateSession,
  readBetterAuthRouteGateUserIdentity,
  resolveCloudflareBetterAuthSocialProviders,
  type BetterAuthRouteGateUserIdentity,
  type CreateCloudflareBetterAuthOptions,
} from "@/lib/auth/better-auth-cloudflare";
import { isCloudflareBetterAuthProviderValueEnabled } from "@/lib/auth/auth-provider-selection";

const MIN_BETTER_AUTH_SECRET_LENGTH = 32;

type CloudflareBetterAuthEnv = Record<string, unknown> & {
  ARCH_DB?: unknown;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  ARCHESTIMATOR_ALLOWED_APP_ORIGINS?: string;
  ARCHESTIMATOR_AUTH_PROVIDER?: string;
  BETTER_AUTH_GOOGLE_CLIENT_ID?: string;
  BETTER_AUTH_GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

type CloudflareBetterAuthContext = {
  env?: CloudflareBetterAuthEnv;
  ctx?: {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
};

type RuntimeRequestInput = {
  headers: Headers;
  requestUrl?: string | null;
};

export function isCloudflareBetterAuthProviderEnabled(env: Record<string, string | undefined> = process.env) {
  return isCloudflareBetterAuthProviderValueEnabled(env.ARCHESTIMATOR_AUTH_PROVIDER);
}

function readContextEnvString(context: CloudflareBetterAuthContext | null, name: keyof CloudflareBetterAuthEnv) {
  const value = context?.env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRuntimeEnvString(
  context: CloudflareBetterAuthContext | null,
  name: keyof CloudflareBetterAuthEnv,
  env: Record<string, string | undefined> = process.env,
) {
  return readContextEnvString(context, name) ?? env[name]?.trim() ?? undefined;
}

function originFrom(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function splitOriginList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => originFrom(item.trim()))
    .filter((item): item is string => Boolean(item));
}

function originFromHeaders(headers: Headers) {
  const host = headers.get("host");
  if (!host) return null;
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return originFrom(`${proto}://${host}`);
}

function resolveBaseURL(input: RuntimeRequestInput, context: CloudflareBetterAuthContext | null) {
  return readRuntimeEnvString(context, "BETTER_AUTH_URL")
    ?? readRuntimeEnvString(context, "NEXT_PUBLIC_APP_URL")
    ?? readRuntimeEnvString(context, "NEXT_PUBLIC_SITE_URL")
    ?? originFrom(input.requestUrl)
    ?? originFromHeaders(input.headers)
    ?? "http://localhost:3000";
}

function resolveTrustedOrigins(
  input: RuntimeRequestInput,
  context: CloudflareBetterAuthContext | null,
  baseURL: string,
) {
  return Array.from(new Set([
    originFrom(baseURL),
    originFrom(input.requestUrl),
    originFromHeaders(input.headers),
    ...splitOriginList(readRuntimeEnvString(context, "BETTER_AUTH_TRUSTED_ORIGINS")),
    ...splitOriginList(readRuntimeEnvString(context, "ARCHESTIMATOR_ALLOWED_APP_ORIGINS")),
  ].filter((item): item is string => Boolean(item))));
}

async function loadCloudflareBetterAuthContext(): Promise<CloudflareBetterAuthContext | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return await getCloudflareContext({ async: true }) as unknown as CloudflareBetterAuthContext;
  } catch {
    return null;
  }
}

function bindWaitUntil(context: CloudflareBetterAuthContext | null) {
  const ctx = context?.ctx;
  const waitUntil = ctx?.waitUntil;
  return typeof waitUntil === "function" ? waitUntil.bind(ctx) : undefined;
}

async function resolveOptions(input: RuntimeRequestInput): Promise<CreateCloudflareBetterAuthOptions | null> {
  const context = await loadCloudflareBetterAuthContext();
  const secret = readRuntimeEnvString(context, "BETTER_AUTH_SECRET");
  if (!secret || secret.length < MIN_BETTER_AUTH_SECRET_LENGTH) return null;

  const d1Database = context?.env?.ARCH_DB;
  if (!d1Database) return null;

  const baseURL = resolveBaseURL(input, context);
  const magicLinkPlugin = await createCloudflareBetterAuthMagicLinkPlugin({
    d1Database,
  });

  return {
    d1Database,
    baseURL,
    secret,
    trustedOrigins: resolveTrustedOrigins(input, context, baseURL),
    waitUntil: bindWaitUntil(context),
    plugins: [magicLinkPlugin],
    socialProviders: resolveCloudflareBetterAuthSocialProviders({
      ...process.env,
      BETTER_AUTH_GOOGLE_CLIENT_ID: readRuntimeEnvString(context, "BETTER_AUTH_GOOGLE_CLIENT_ID"),
      BETTER_AUTH_GOOGLE_CLIENT_SECRET: readRuntimeEnvString(context, "BETTER_AUTH_GOOGLE_CLIENT_SECRET"),
      GOOGLE_CLIENT_ID: readRuntimeEnvString(context, "GOOGLE_CLIENT_ID"),
      GOOGLE_CLIENT_SECRET: readRuntimeEnvString(context, "GOOGLE_CLIENT_SECRET"),
    }),
  };
}

export async function createCloudflareBetterAuthForRequest(request: Request) {
  const options = await resolveOptions({
    headers: request.headers,
    requestUrl: request.url,
  });
  return options ? createCloudflareBetterAuthForD1(options) : null;
}

export async function createCloudflareBetterAuthNextHandlersForRequest(request: Request) {
  const options = await resolveOptions({
    headers: request.headers,
    requestUrl: request.url,
  });
  return options ? createCloudflareBetterAuthNextHandlers(options) : null;
}

export async function getCloudflareBetterAuthIdentityFromRequest(
  request: RuntimeRequestInput,
): Promise<BetterAuthRouteGateUserIdentity | null> {
  const options = await resolveOptions(request);
  if (!options) return null;
  const auth = await createCloudflareBetterAuthForD1(options);
  const session = await getBetterAuthRouteGateSession(auth, request.headers);
  return readBetterAuthRouteGateUserIdentity(session);
}
