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
 *      existing server secret (so prod is stable WITHOUT new config): SHA-256
 *      of the first available of SUPABASE_SERVICE_ROLE_KEY,
 *      ARCHESTIMATOR_INVITE_TOKEN_PEPPER (the invite pepper reused from
 *      invite-entry.ts), or COLLABORATION_INVITE_PEPPER — taken as the 32-byte
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

/** Env var holding an explicit base64url PKCS8 Ed25519 private key (optional). */
const SIGNING_KEY_ENV = "REALTIME_IDENTITY_SIGNING_KEY";

/**
 * Existing server secrets used, in order, to deterministically derive a stable
 * Ed25519 seed when no explicit signing key is configured. The invite pepper
 * (ARCHESTIMATOR_INVITE_TOKEN_PEPPER) is the same secret used by
 * invite-entry.ts; COLLABORATION_INVITE_PEPPER is a documented fallback name.
 */
const DERIVATION_SECRET_ENVS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ARCHESTIMATOR_INVITE_TOKEN_PEPPER",
  "COLLABORATION_INVITE_PEPPER",
] as const;

type SigningKeyBundle = {
  privateKey: KeyObject;
  /** Raw 32-byte Ed25519 public key, base64url — hand this to the client. */
  publicKeyRawBase64Url: string;
  /** Key id: first 8 hex chars of SHA-256(raw public key). */
  kid: string;
};

let cachedBundle: SigningKeyBundle | null = null;

/** Read the first non-empty configured derivation secret. */
function readDerivationSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  for (const name of DERIVATION_SECRET_ENVS) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** The 32-byte raw Ed25519 public key (from JWK `x`) for a private KeyObject. */
function rawPublicKeyFromPrivate(privateKey: KeyObject): Uint8Array {
  const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as { x?: string };
  if (!jwk.x) throw new Error("Failed to export Ed25519 public key (missing JWK x).");
  // Decode base64url JWK x into the raw 32 bytes.
  return new Uint8Array(Buffer.from(jwk.x, "base64url"));
}

/**
 * Build an Ed25519 private KeyObject from a deterministic 32-byte seed.
 *
 * PKCS8 for Ed25519 wraps the 32-byte seed inside a fixed ASN.1 prefix; we
 * prepend that prefix and import as DER. This keeps key derivation pure-stdlib.
 */
function privateKeyFromSeed(seed: Uint8Array): KeyObject {
  if (seed.length !== 32) {
    throw new Error(`Ed25519 seed must be 32 bytes, got ${seed.length}`);
  }
  // ASN.1 DER PKCS8 prefix for an Ed25519 private key carrying a 32-byte seed:
  //   SEQUENCE { INTEGER 0, SEQUENCE { OID 1.3.101.112 }, OCTET STRING { OCTET STRING <32-byte seed> } }
  const PKCS8_ED25519_PREFIX = Buffer.from(
    "302e020100300506032b657004220420",
    "hex",
  );
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seed)]);
  return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

/** Derive the key bundle from process env per the documented source order. */
function deriveBundle(env: NodeJS.ProcessEnv = process.env): SigningKeyBundle {
  let privateKey: KeyObject;

  const explicit = env[SIGNING_KEY_ENV]?.trim();
  if (explicit) {
    const der = Buffer.from(explicit, "base64url");
    privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  } else {
    const secret = readDerivationSecret(env);
    if (secret) {
      const seed = new Uint8Array(createHash("sha256").update(secret, "utf8").digest());
      privateKey = privateKeyFromSeed(seed);
    } else {
      // No explicit key and no derivation secret available (e.g. local/dev with
      // no Supabase config). Fall back to an ephemeral keypair so the feature is
      // self-consistent within the process; envelopes still verify round-trip.
      privateKey = generateKeyPairSync("ed25519").privateKey;
    }
  }

  const rawPublic = rawPublicKeyFromPrivate(privateKey);
  const publicKeyRawBase64Url = base64UrlEncode(rawPublic);
  const kid = createHash("sha256").update(Buffer.from(rawPublic)).digest("hex").slice(0, 8);
  return { privateKey, publicKeyRawBase64Url, kid };
}

/**
 * Load (and cache) the Ed25519 signing key bundle. Idempotent; the imported
 * keys live in module scope for the lifetime of the process.
 */
export async function getRealtimeSigningKey(): Promise<SigningKeyBundle> {
  if (!cachedBundle) {
    cachedBundle = deriveBundle();
  }
  return cachedBundle;
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
}: IssueRealtimeIdentityArgs): Promise<IssuedRealtimeIdentity> {
  const { privateKey, publicKeyRawBase64Url, kid } = await getRealtimeSigningKey();

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + Math.max(1, Math.floor(ttlSeconds));

  const signedFields = { sub, topic, role, iat, exp, kid };
  const message = Buffer.from(canonicalEnvelopeMessage(signedFields), "utf8");
  const signature = nodeSign(null, message, privateKey); // raw 64-byte Ed25519 sig
  const sig = base64UrlEncode(new Uint8Array(signature));

  const envelope: RealtimeIdentityEnvelope = { ...signedFields, sig };
  return { envelope, publicKey: publicKeyRawBase64Url };
}
