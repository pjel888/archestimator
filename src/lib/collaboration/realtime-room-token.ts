const DEFAULT_ROOM_TOKEN_TTL_SECONDS = 300;
const CLOCK_SKEW_MS = 30_000;

const TOKEN_SECRET_ENVS = [
  "REALTIME_ROOM_TOKEN_SECRET",
  "REALTIME_IDENTITY_SIGNING_KEY",
  "ARCHESTIMATOR_INVITE_TOKEN_PEPPER",
  "COLLABORATION_INVITE_PEPPER",
] as const;

export type RealtimeRoomCapability =
  | "presence:read"
  | "presence:write"
  | "broadcast:cursor"
  | "broadcast:row-update"
  | "support:subscribe"
  | "support:fanout";

export type RealtimeRoomTokenAudience = "support-inbox";

export type RealtimeRoomTokenClaims = {
  v: 1;
  sub: string;
  topic: string;
  iat: number;
  exp: number;
} | {
  v: 2;
  sub: string;
  topic: string;
  aud?: RealtimeRoomTokenAudience;
  capabilities: RealtimeRoomCapability[];
  iat: number;
  exp: number;
};

type EnvLike = Record<string, unknown>;

function getDefaultEnv(): EnvLike {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

export function readRealtimeRoomTokenSecret(env: EnvLike = getDefaultEnv()) {
  for (const name of TOKEN_SECRET_ENVS) {
    const value = env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Collaboration rooms require an explicit v2 signing secret. Legacy room
 * channels retain their compatibility fallback through readRealtimeRoomTokenSecret.
 */
export function readCollaborationRoomTokenSecret(env: EnvLike = getDefaultEnv()) {
  const value = env.REALTIME_ROOM_TOKEN_SECRET;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function base64UrlEncode(input: Uint8Array) {
  let binary = "";
  for (let i = 0; i < input.length; i += 1) {
    binary += String.fromCharCode(input[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(input).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeStringEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function encodeClaims(claims: RealtimeRoomTokenClaims) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
}

function decodeClaims(payload: string): RealtimeRoomTokenClaims | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const claims = parsed as Partial<RealtimeRoomTokenClaims>;
    if (claims.v !== 1 && claims.v !== 2) return null;
    if (typeof claims.sub !== "string" || !claims.sub) return null;
    if (typeof claims.topic !== "string" || !claims.topic) return null;
    if (typeof claims.iat !== "number" || !Number.isFinite(claims.iat)) return null;
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) return null;
    if (claims.iat >= claims.exp) return null;
    if (claims.v === 2 && claims.aud !== undefined && claims.aud !== "support-inbox") return null;
    if (claims.v === 2 && (!Array.isArray(claims.capabilities) || claims.capabilities.some((capability) => !isRealtimeRoomCapability(capability)))) {
      return null;
    }
    return claims as RealtimeRoomTokenClaims;
  } catch {
    return null;
  }
}

export async function issueRealtimeRoomToken({
  audience,
  capabilities,
  nowMs = Date.now(),
  secret,
  sub,
  topic,
  ttlSeconds = DEFAULT_ROOM_TOKEN_TTL_SECONDS,
}: {
  audience?: RealtimeRoomTokenAudience;
  capabilities?: readonly RealtimeRoomCapability[];
  nowMs?: number;
  secret: string;
  sub: string;
  topic: string;
  ttlSeconds?: number;
}) {
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + Math.max(1, Math.floor(ttlSeconds));
  const payload = encodeClaims(capabilities
    ? {
        v: 2,
        sub,
        topic,
        ...(audience ? { aud: audience } : {}),
        capabilities: [...new Set(capabilities)].sort() as RealtimeRoomCapability[],
        iat,
        exp,
      }
    : { v: 1, sub, topic, iat, exp });
  const signature = await hmacSha256(secret, payload);
  return `${payload}.${signature}`;
}

export function isRealtimeRoomCapability(value: unknown): value is RealtimeRoomCapability {
  return value === "presence:read"
    || value === "presence:write"
    || value === "broadcast:cursor"
    || value === "broadcast:row-update"
    || value === "support:subscribe"
    || value === "support:fanout";
}

export function hasRealtimeRoomCapability(
  claims: RealtimeRoomTokenClaims,
  capability: RealtimeRoomCapability,
) {
  return claims.v === 2 && claims.capabilities.includes(capability);
}

export async function verifyRealtimeRoomToken({
  expectedAudience,
  expectedTopic,
  nowMs = Date.now(),
  secret,
  token,
}: {
  expectedAudience?: RealtimeRoomTokenAudience;
  expectedTopic: string;
  nowMs?: number;
  secret: string;
  token: string;
}) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expectedSignature = await hmacSha256(secret, payload);
  if (!timingSafeStringEqual(signature, expectedSignature)) return null;

  const claims = decodeClaims(payload);
  if (!claims) return null;
  if (claims.topic !== expectedTopic) return null;
  if (expectedAudience && (claims.v !== 2 || claims.aud !== expectedAudience)) return null;

  const iatMs = claims.iat * 1000;
  const expMs = claims.exp * 1000;
  if (nowMs >= expMs) return null;
  if (nowMs + CLOCK_SKEW_MS < iatMs) return null;

  return claims;
}
