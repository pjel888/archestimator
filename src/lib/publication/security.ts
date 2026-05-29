import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes as nodeRandomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const tokenHashPrefix = "hmac-sha256-v1";
const tokenEncryptionPrefix = "aes-256-gcm-v1";
const passwordHashPrefix = "scrypt-sha256-v1";
const accessCookiePrefix = "publication-access-v1";
const csrfCookieName = "ae_publication_csrf";
const publicationAccessCookieMaxAgeSeconds = 24 * 60 * 60;

type RandomBytes = (size: number) => Buffer;
type PublicationAccessCookieContext = {
  token: string;
  publicationId: string;
  snapshotVersion: string | number;
};

type PublicationAccessCookieOptions = {
  maxAgeSeconds?: number;
  now?: number;
  secret?: string;
};

type PublicationAccessCookiePayload = {
  expiresAt: number;
  publicationId: string;
  snapshotVersion: string;
  tokenDigest: string;
};

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function constantTimeEqual(left: Buffer, right: Buffer) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createPublicationToken({
  bytes = 32,
  randomBytes = nodeRandomBytes,
}: {
  bytes?: number;
  randomBytes?: RandomBytes;
} = {}) {
  return toBase64Url(randomBytes(bytes));
}

export function hashPublicationToken(token: string, secret: string) {
  const digest = createHmac("sha256", secret).update(token).digest();
  return `${tokenHashPrefix}:${toBase64Url(digest)}`;
}

export function encryptPublicationToken(token: string, secret: string, randomBytes: RandomBytes = nodeRandomBytes) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${tokenEncryptionPrefix}:${toBase64Url(iv)}:${toBase64Url(tag)}:${toBase64Url(encrypted)}`;
}

export function decryptPublicationToken(encryptedToken: string, secret: string) {
  const [prefix, iv, tag, encrypted] = encryptedToken.split(":");
  if (prefix !== tokenEncryptionPrefix || !iv || !tag || !encrypted) throw new Error("Publication token envelope is invalid.");

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), fromBase64Url(iv));
  decipher.setAuthTag(fromBase64Url(tag));
  return Buffer.concat([decipher.update(fromBase64Url(encrypted)), decipher.final()]).toString("utf8");
}

export function readPublicationTokenEncryptionSecret() {
  const configured = process.env.PUBLICATION_TOKEN_ENCRYPTION_SECRET?.trim() ?? process.env.ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("PUBLICATION_TOKEN_ENCRYPTION_SECRET is required in production.");
  return "archestimator-local-publication-token-secret";
}

export function readPublicationTokenHashSecret() {
  const configured = process.env.PUBLICATION_TOKEN_HASH_SECRET?.trim() ?? process.env.ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("PUBLICATION_TOKEN_HASH_SECRET is required in production.");
  return "archestimator-local-publication-hash-secret";
}

export function readPublicationAccessCookieSecret() {
  const configured =
    process.env.PUBLICATION_ACCESS_COOKIE_SECRET?.trim() ??
    process.env.ARCHESTIMATOR_PUBLICATION_ACCESS_COOKIE_SECRET?.trim();
  if (configured) return configured;
  return readPublicationTokenHashSecret();
}

export async function hashPublicationPassword(
  password: string,
  {
    saltBytes = nodeRandomBytes,
  }: {
    saltBytes?: RandomBytes;
  } = {},
) {
  const salt = saltBytes(16);
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${passwordHashPrefix}:${toBase64Url(salt)}:${toBase64Url(hash)}`;
}

export async function verifyPublicationPassword(password: string, passwordHash: string) {
  const [prefix, salt, expected] = passwordHash.split(":");
  if (prefix !== passwordHashPrefix || !salt || !expected) return false;

  const actual = (await scryptAsync(password, fromBase64Url(salt), 32)) as Buffer;
  return constantTimeEqual(actual, fromBase64Url(expected));
}

export function createPublicPostCsrfToken({
  randomBytes = nodeRandomBytes,
}: {
  randomBytes?: RandomBytes;
} = {}) {
  return toBase64Url(randomBytes(16));
}

export function createPublicationAccessCookieName(token: string) {
  const suffix = createHash("sha256").update(token).digest("base64url").slice(0, 20);
  return `ae_publication_access_${suffix}`;
}

function createPublicationAccessCookiePayload(
  { token, publicationId, snapshotVersion }: PublicationAccessCookieContext,
  expiresAt: number,
): PublicationAccessCookiePayload {
  return {
    expiresAt,
    publicationId,
    snapshotVersion: String(snapshotVersion),
    tokenDigest: createHash("sha256").update(token).digest("base64url"),
  };
}

function signPublicationAccessCookiePayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function parsePublicationAccessCookiePayload(value: string, secret: string) {
  const [prefix, encodedPayload, signature] = value.split(":");
  if (prefix !== accessCookiePrefix || !encodedPayload || !signature) return null;

  const expectedSignature = signPublicationAccessCookiePayload(encodedPayload, secret);
  if (!constantTimeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<PublicationAccessCookiePayload>;
    if (
      typeof payload.expiresAt !== "number" ||
      typeof payload.publicationId !== "string" ||
      typeof payload.snapshotVersion !== "string" ||
      typeof payload.tokenDigest !== "string"
    ) {
      return null;
    }
    return payload as PublicationAccessCookiePayload;
  } catch {
    return null;
  }
}

function readCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function verifyPublicationAccessCookieValue(
  value: string | undefined,
  context: PublicationAccessCookieContext,
  { now = Date.now(), secret = readPublicationAccessCookieSecret() }: PublicationAccessCookieOptions = {},
) {
  if (!value) return false;
  const payload = parsePublicationAccessCookiePayload(value, secret);
  if (!payload || payload.expiresAt <= now) return false;

  const expectedPayload = createPublicationAccessCookiePayload(context, payload.expiresAt);
  return (
    payload.publicationId === expectedPayload.publicationId &&
    payload.snapshotVersion === expectedPayload.snapshotVersion &&
    constantTimeEqual(Buffer.from(payload.tokenDigest), Buffer.from(expectedPayload.tokenDigest))
  );
}

export function hasPublicationAccessCookie(
  cookieHeader: string,
  context: PublicationAccessCookieContext,
  options?: PublicationAccessCookieOptions,
) {
  const value = readCookieValue(cookieHeader, createPublicationAccessCookieName(context.token));
  return verifyPublicationAccessCookieValue(value, context, options);
}

export function createPublicationAccessCookie(
  context: PublicationAccessCookieContext,
  {
    maxAgeSeconds = publicationAccessCookieMaxAgeSeconds,
    now = Date.now(),
    secret = readPublicationAccessCookieSecret(),
  }: PublicationAccessCookieOptions = {},
) {
  const expiresAt = now + maxAgeSeconds * 1000;
  const encodedPayload = Buffer.from(
    JSON.stringify(createPublicationAccessCookiePayload(context, expiresAt)),
    "utf8",
  ).toString("base64url");
  const signature = signPublicationAccessCookiePayload(encodedPayload, secret);
  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${createPublicationAccessCookieName(context.token)}=${accessCookiePrefix}:${encodedPayload}:${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureCookie}`;
}

export function assertSameOriginPublicPost(request: Request): { ok: true } | { ok: false; status: number; message: string } {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (!origin || origin !== requestOrigin) {
    return { ok: false, status: 403, message: "Cross-origin publication requests are blocked." };
  }

  const csrfHeader = request.headers.get("x-archestimator-csrf");
  const csrfCookie = readCookieValue(request.headers.get("cookie") ?? "", csrfCookieName);
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return { ok: false, status: 403, message: "Publication request verification failed." };
  }

  return { ok: true };
}

// ============================================================================
// P5: Additive Recipient Session Cookie (shared_link_session_[token])
// - Exact spec: HttpOnly, SameSite=Lax, Secure (prod), Max-Age=86400
// - Additive to ae_publication_access_* password cookie (no changes to existing fns/logic)
// - Used for /share/[token]?recipient= verification + future interactive (P6+)
// - Client-visible _ok flag (non-secret) supports useSharedLinkSession hook
// ============================================================================

const sharedLinkSessionCookiePrefix = "shared-link-session-v1";
const sharedLinkSessionCookieMaxAgeSeconds = 86400;

export type SharedLinkSessionContext = {
  token: string;
  publicationId: string;
  snapshotVersion: string | number;
  recipientId?: string;
};

type SharedLinkSessionCookiePayload = {
  expiresAt: number;
  publicationId: string;
  snapshotVersion: string;
  tokenDigest: string;
  recipientId?: string;
};

function createSharedLinkSessionCookiePayload(
  { token, publicationId, snapshotVersion, recipientId }: SharedLinkSessionContext,
  expiresAt: number,
): SharedLinkSessionCookiePayload {
  return {
    expiresAt,
    publicationId,
    snapshotVersion: String(snapshotVersion),
    tokenDigest: createHash("sha256").update(token).digest("base64url"),
    recipientId,
  };
}

function signSharedLinkSessionCookiePayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function parseSharedLinkSessionCookiePayload(value: string, secret: string) {
  const [prefix, encodedPayload, signature] = value.split(":");
  if (prefix !== sharedLinkSessionCookiePrefix || !encodedPayload || !signature) return null;

  const expectedSignature = signSharedLinkSessionCookiePayload(encodedPayload, secret);
  if (!constantTimeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SharedLinkSessionCookiePayload>;
    if (
      typeof payload.expiresAt !== "number" ||
      typeof payload.publicationId !== "string" ||
      typeof payload.snapshotVersion !== "string" ||
      typeof payload.tokenDigest !== "string"
    ) {
      return null;
    }
    return payload as SharedLinkSessionCookiePayload;
  } catch {
    return null;
  }
}

export function createSharedLinkSessionCookieName(token: string) {
  const suffix = createHash("sha256").update(token).digest("base64url").slice(0, 20);
  return `shared_link_session_${suffix}`;
}

export function verifySharedLinkSessionCookieValue(
  value: string | undefined,
  context: SharedLinkSessionContext,
  { now = Date.now(), secret = readPublicationAccessCookieSecret() }: PublicationAccessCookieOptions = {},
) {
  if (!value) return false;
  const payload = parseSharedLinkSessionCookiePayload(value, secret);
  if (!payload || payload.expiresAt <= now) return false;

  const expectedPayload = createSharedLinkSessionCookiePayload(context, payload.expiresAt);
  return (
    payload.publicationId === expectedPayload.publicationId &&
    payload.snapshotVersion === expectedPayload.snapshotVersion &&
    constantTimeEqual(Buffer.from(payload.tokenDigest), Buffer.from(expectedPayload.tokenDigest)) &&
    (payload.recipientId === undefined || payload.recipientId === expectedPayload.recipientId)
  );
}

export function getSharedLinkSessionCookieParts(
  context: SharedLinkSessionContext,
  {
    maxAgeSeconds = sharedLinkSessionCookieMaxAgeSeconds,
    now = Date.now(),
    secret = readPublicationAccessCookieSecret(),
  }: PublicationAccessCookieOptions = {},
) {
  const expiresAt = now + maxAgeSeconds * 1000;
  const encodedPayload = Buffer.from(
    JSON.stringify(createSharedLinkSessionCookiePayload(context, expiresAt)),
    "utf8",
  ).toString("base64url");
  const signature = signSharedLinkSessionCookiePayload(encodedPayload, secret);
  const name = createSharedLinkSessionCookieName(context.token);
  const value = `${sharedLinkSessionCookiePrefix}:${encodedPayload}:${signature}`;
  const secure = process.env.NODE_ENV === "production";
  return {
    name,
    value,
    cookieOptions: {
      path: "/",
      httpOnly: true as const,
      sameSite: "lax" as const,
      maxAge: maxAgeSeconds,
      secure,
    },
  };
}

export function createSharedLinkSessionCookie(
  context: SharedLinkSessionContext,
  opts: PublicationAccessCookieOptions = {},
) {
  const parts = getSharedLinkSessionCookieParts(context, opts);
  const secureCookie = parts.cookieOptions.secure ? "; Secure" : "";
  return `${parts.name}=${parts.value}; Path=${parts.cookieOptions.path}; HttpOnly; SameSite=Lax; Max-Age=${parts.cookieOptions.maxAge}${secureCookie}`;
}

// ============================================================================
// P10 — Password Brute-Force Hardening (additive only)
// In-memory lockout store (Map + TTL prune, per plan + P6/P8 precedent; no DB table).
// Progressive delay (1s, 2s, 4s, 8s...) on failures before lock.
// Hard lock after 5 attempts per IP+token (15min block from 5th fail; 1hr window for count).
// IP from x-forwarded-for (same as recordProjectPublicationEvent).
// Always records 'password_attempt' (success/failure in metadata) — type extended at call site.
// Backwards compat: no-pw tokens, existing cookies, verify/create paths, success flows untouched.
// Test-only reset exported for red tests in project-publication-security.test.ts
// ============================================================================

const PASSWORD_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const PROGRESSIVE_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

type PasswordAttemptRecord = {
  timestamps: number[];
  lockedUntil?: number;
};

const passwordAttemptStore = new Map<string, PasswordAttemptRecord>();

export function __resetPasswordAttemptStoreForTest() {
  passwordAttemptStore.clear();
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function getPasswordAttemptKey(ip: string, token: string): string {
  return `${ip}:${token}`;
}

function pruneOldPasswordAttempts(record: PasswordAttemptRecord, now: number) {
  record.timestamps = record.timestamps.filter((t) => now - t < PASSWORD_ATTEMPT_WINDOW_MS);
}

export function getProgressiveDelayMs(failCount: number): number {
  if (failCount <= 0) return 0;
  const idx = Math.min(failCount - 1, PROGRESSIVE_DELAYS_MS.length - 1);
  return PROGRESSIVE_DELAYS_MS[idx];
}

export function isPasswordLocked(ip: string, token: string, now = Date.now()): boolean {
  const key = getPasswordAttemptKey(ip, token);
  const rec = passwordAttemptStore.get(key);
  if (!rec) return false;
  if (rec.lockedUntil && now < rec.lockedUntil) return true;
  pruneOldPasswordAttempts(rec, now);
  if (rec.timestamps.length >= 5) {
    rec.lockedUntil = now + PASSWORD_LOCKOUT_DURATION_MS;
    return true;
  }
  return false;
}

export function recordPasswordFailure(ip: string, token: string, now = Date.now()): number {
  const key = getPasswordAttemptKey(ip, token);
  let rec = passwordAttemptStore.get(key);
  if (!rec) {
    rec = { timestamps: [] };
    passwordAttemptStore.set(key, rec);
  }
  pruneOldPasswordAttempts(rec, now);
  rec.timestamps.push(now);
  if (rec.timestamps.length >= 5 && !rec.lockedUntil) {
    rec.lockedUntil = now + PASSWORD_LOCKOUT_DURATION_MS;
  }
  return getProgressiveDelayMs(rec.timestamps.length);
}

export function recordPasswordSuccess(ip: string, token: string) {
  const key = getPasswordAttemptKey(ip, token);
  passwordAttemptStore.delete(key);
}
