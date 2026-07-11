import "server-only";

/**
 * Realtime identity envelope — server-only signing half (T1.2).
 *
 * Teamspace Improvement Plan, task T1.2: sender-bound realtime identity.
 * Addresses finding 05 §5 (HIGH: realtime cursor/presence spoofing + XSS via
 * attacker-controlled displayName), closing gaps G3 (wire identity trusted
 * blindly) and G19 (no cryptographic binding of sender to auth user), per
 * decision R-18 (asymmetric, sender-bound envelopes verified client-side).
 *
 * This module holds the Ed25519 PRIVATE signing key and must never reach the
 * client. The verification half lives in realtime-identity.ts (isomorphic).
 *
 * KEY SOURCE ORDER
 * ----------------
 *   1. env `REALTIME_IDENTITY_SIGNING_KEY` — base64url PKCS8 private key.
 *   2. Otherwise, deterministically derive a stable Ed25519 seed from an
 *      existing Cloudflare/server secret: SHA-256 of the first available of
 *      ARCHESTIMATOR_INVITE_TOKEN_PEPPER (the invite pepper reused from
 *      invite-entry.ts) or COLLABORATION_INVITE_PEPPER — taken as the 32-byte
 *      Ed25519 seed.
 *
 * The derived/loaded keys are cached in module scope. The raw public key
 * (base64url, 32 bytes) is exposed so the client can cache it via its own
 * authenticated server call and verify locally.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as nodeSign,
  type KeyObject,
} from "node:crypto";
import {
  base64UrlEncode,
  canonicalEnvelopeMessage,
  type RealtimeIdentityEnvelope,
} from "@/lib/collaboration/realtime-identity";

/** Env var holding an explicit base64url PKCS8 Ed25519 private key. */
const SIGNING_KEY_ENV = "REALTIME_IDENTITY_SIGNING_KEY";

type SigningKeyBundle = {
  privateKey: KeyObject;
  /** Raw 32-byte Ed25519 public key, base64url — hand this to the client. */
  publicKeyRawBase64Url: string;
  /** Key id: first 8 hex chars of SHA-256(raw public key). */
  kid: string;
};

let cachedBundle: { cacheKey: string; bundle: SigningKeyBundle } | null = null;

/** The 32-byte raw Ed25519 public key (from JWK `x`) for a private KeyObject. */
function rawPublicKeyFromPrivate(privateKey: KeyObject): Uint8Array {
  const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as { x?: string };
  if (!jwk.x) throw new Error("Failed to export Ed25519 public key (missing JWK x).");
  // Decode base64url JWK x into the raw 32 bytes.
  return new Uint8Array(Buffer.from(jwk.x, "base64url"));
}

/** Builds the identity signer; production requires a dedicated signing key. */
export function deriveRealtimeSigningKey(env: NodeJS.ProcessEnv = process.env): SigningKeyBundle {
  let privateKey: KeyObject;

  const explicit = env[SIGNING_KEY_ENV]?.trim();
  if (explicit) {
    const der = Buffer.from(explicit, "base64url");
    privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  } else {
    if (env.NODE_ENV === "production") {
      throw new Error(`${SIGNING_KEY_ENV} is required in production.`);
    }
    // Local/test processes use an ephemeral keypair only; invite credentials
    // must never become a realtime identity signing key.
    privateKey = generateKeyPairSync("ed25519").privateKey;
  }

  const rawPublic = rawPublicKeyFromPrivate(privateKey);
  const publicKeyRawBase64Url = base64UrlEncode(rawPublic);
  const kid = createHash("sha256").update(Buffer.from(rawPublic)).digest("hex").slice(0, 8);
  return { privateKey, publicKeyRawBase64Url, kid };
}

function signingKeyCacheKey(env: NodeJS.ProcessEnv) {
  const explicit = env[SIGNING_KEY_ENV]?.trim();
  return explicit ? `explicit:${explicit}` : `ephemeral:${env.NODE_ENV ?? "development"}`;
}

/**
 * Load (and cache) the Ed25519 signing key bundle. Idempotent; the imported
 * keys live in module scope for the lifetime of the process.
 */
export async function getRealtimeSigningKey(env: NodeJS.ProcessEnv = process.env): Promise<SigningKeyBundle> {
  const cacheKey = signingKeyCacheKey(env);
  if (!cachedBundle || cachedBundle.cacheKey !== cacheKey) {
    cachedBundle = { cacheKey, bundle: deriveRealtimeSigningKey(env) };
  }
  return cachedBundle.bundle;
}

export type IssueRealtimeIdentityArgs = {
  /** Authenticated auth user id (the caller MUST have verified this). */
  sub: string;
  /** Channel topic to bind, e.g. "project:<uuid>" or "estimate:<uuid>". */
  topic: string;
  /** Realtime role for this topic. */
  role: string;
  /** Envelope lifetime in seconds. Default ~5 minutes. */
  ttlSeconds?: number;
  /** Override for the current time (unix ms). Defaults to Date.now(). */
  nowMs?: number;
  /** Request-scoped runtime environment (Cloudflare secrets are not process.env). */
  env?: NodeJS.ProcessEnv;
};

export type IssuedRealtimeIdentity = {
  envelope: RealtimeIdentityEnvelope;
  /** Raw base64url public key for the client to cache and verify with. */
  publicKey: string;
};

/**
 * Build and sign a sender-bound realtime identity envelope.
 *
 * The signature is a raw 64-byte Ed25519 signature (node `sign(null, ...)`)
 * over {@link canonicalEnvelopeMessage}, which the isomorphic client verifies
 * with Web Crypto. Returns the envelope plus the raw public key the client
 * should cache.
 */
export async function issueRealtimeIdentityEnvelope({
  sub,
  topic,
  role,
  ttlSeconds = 300,
  nowMs = Date.now(),
  env = process.env,
}: IssueRealtimeIdentityArgs): Promise<IssuedRealtimeIdentity> {
  const { privateKey, publicKeyRawBase64Url, kid } = await getRealtimeSigningKey(env);

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + Math.max(1, Math.floor(ttlSeconds));

  const signedFields = { sub, topic, role, iat, exp, kid };
  const message = Buffer.from(canonicalEnvelopeMessage(signedFields), "utf8");
  const signature = nodeSign(null, message, privateKey); // raw 64-byte Ed25519 sig
  const sig = base64UrlEncode(new Uint8Array(signature));

  const envelope: RealtimeIdentityEnvelope = { ...signedFields, sig };
  return { envelope, publicKey: publicKeyRawBase64Url };
}
