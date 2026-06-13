/**
 * Realtime identity envelope — isomorphic verify + canonicalization (T1.2).
 *
 * Teamspace Improvement Plan, task T1.2: sender-bound realtime identity.
 * Addresses finding 05 §5 (HIGH: realtime cursor/presence spoofing + XSS via
 * attacker-controlled displayName), closing gaps G3 (wire identity is trusted
 * blindly) and G19 (no cryptographic binding of payload sender to auth user),
 * per decision R-18 (asymmetric, sender-bound envelopes verified client-side).
 *
 * SECURITY MODEL
 * --------------
 * The realtime wire is UNTRUSTED. Any connected member can broadcast a payload
 * claiming any `userId` / `displayName`. To stop member B from impersonating
 * member A, the server issues a short-lived Ed25519-signed envelope that binds
 * the authenticated user id (`sub`) to the channel `topic`, `role`, and an
 * expiry. Senders attach their cached envelope to every payload. Receivers:
 *
 *   1. verify the signature with the PUBLIC key obtained from THEIR OWN
 *      authenticated server call (never trust a key from the wire),
 *   2. check the envelope topic === the channel they are listening on,
 *   3. check the envelope is not expired (and `iat` is sane),
 *   4. check `payload.userId === envelope.sub`.
 *
 * If any check fails the payload is rejected (render nothing). Display identity
 * is then resolved from the SERVER roster by userId; `payload.displayName` is
 * always ignored, which also neutralises the stored/reflected XSS vector.
 *
 * This module is browser-safe: it uses only Web Crypto (`crypto.subtle`) with
 * the "Ed25519" algorithm (available in Node 24+ and modern browsers). It must
 * NOT import anything server-only — see realtime-identity-server.ts for the
 * signing half.
 */

/** Fixed field order for the signed message — MUST match the server signer. */
const SIGNED_FIELD_ORDER = ["sub", "topic", "role", "iat", "exp", "kid"] as const;

/**
 * The signed, sender-bound realtime identity envelope.
 *
 * `sig` is the base64url of the raw 64-byte Ed25519 signature over
 * {@link canonicalEnvelopeMessage}. The signed message EXCLUDES `sig`.
 */
export type RealtimeIdentityEnvelope = {
  /** Authenticated auth user id this envelope was issued to. */
  sub: string;
  /** Channel topic the envelope is bound to, e.g. "project:<uuid>". */
  topic: string;
  /** Realtime role for this topic, e.g. "editor" | "viewer" | "member". */
  role: string;
  /** Issued-at, unix seconds. */
  iat: number;
  /** Expiry, unix seconds (typically iat + ~300). */
  exp: number;
  /** Key id: first 8 hex chars of SHA-256(raw public key) for rotation. */
  kid: string;
  /** base64url of the raw 64-byte Ed25519 signature over the canonical message. */
  sig: string;
};

/** Envelope fields without the signature — the input to signing/canonicalization. */
export type SignedEnvelopeFields = Omit<RealtimeIdentityEnvelope, "sig">;

/**
 * Deterministic JSON of the signed fields in a FIXED key order.
 *
 * Determinism is the whole point: signer and verifier must serialize the exact
 * same bytes, independent of object key insertion order. We hand-build the JSON
 * rather than rely on `JSON.stringify(obj)` key order.
 */
export function canonicalEnvelopeMessage(env: SignedEnvelopeFields): string {
  const parts = SIGNED_FIELD_ORDER.map((key) => `${JSON.stringify(key)}:${JSON.stringify(env[key])}`);
  return `{${parts.join(",")}}`;
}

/** Encode an ArrayBuffer / Uint8Array as a base64url string (no padding). */
export function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Decode a base64url string into a Uint8Array. Throws on malformed input. */
export function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import a raw 32-byte Ed25519 public key (base64url) as a Web Crypto verify key.
 *
 * The base64url MUST be the raw public key (the JWK `x` value the server
 * exports). The returned key is only usable for "verify".
 */
export async function importVerifyKey(publicKeyRawBase64Url: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(publicKeyRawBase64Url);
  if (raw.length !== 32) {
    throw new Error(`Invalid Ed25519 public key length: expected 32 bytes, got ${raw.length}`);
  }
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "Ed25519" }, false, ["verify"]);
}

/** A structurally-valid envelope shape (does not imply a valid signature). */
function isEnvelopeShaped(value: unknown): value is RealtimeIdentityEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const env = value as Record<string, unknown>;
  return (
    typeof env.sub === "string" &&
    typeof env.topic === "string" &&
    typeof env.role === "string" &&
    typeof env.iat === "number" &&
    Number.isFinite(env.iat) &&
    typeof env.exp === "number" &&
    Number.isFinite(env.exp) &&
    typeof env.kid === "string" &&
    typeof env.sig === "string"
  );
}

export type VerifyRealtimeIdentityArgs = {
  /** Envelope received from the wire (untrusted; may be any value). */
  envelope: unknown;
  /** Verify key imported via {@link importVerifyKey} from YOUR server's pubkey. */
  publicKey: CryptoKey;
  /** Channel topic the receiver is actually subscribed to. */
  expectedTopic: string;
  /** The `userId` claimed by the broadcast/presence payload. */
  claimedUserId: string;
  /** Override for the current time (unix ms). Defaults to Date.now(). */
  nowMs?: number;
};

/**
 * Verify a sender-bound realtime identity envelope.
 *
 * Returns true ONLY if every check passes:
 *   - the envelope is structurally an envelope,
 *   - the Ed25519 signature verifies over the canonical signed message,
 *   - `topic === expectedTopic` (channel binding),
 *   - the envelope is currently valid: `iat*1000 <= nowMs < exp*1000` with sane
 *     ordering (`iat < exp`),
 *   - `sub === claimedUserId` (the payload cannot claim another member's id).
 *
 * Returns false on ANY failure, including malformed input or a thrown error —
 * it never throws. A false result means: reject the payload, render nothing.
 */
export async function verifyRealtimeIdentity({
  envelope,
  publicKey,
  expectedTopic,
  claimedUserId,
  nowMs = Date.now(),
}: VerifyRealtimeIdentityArgs): Promise<boolean> {
  try {
    if (!isEnvelopeShaped(envelope)) return false;

    // Binding checks first — cheap and independent of crypto.
    if (envelope.topic !== expectedTopic) return false;
    if (envelope.sub !== claimedUserId) return false;

    // Temporal validity. iat must precede exp; allow a tiny clock-skew grace on iat.
    const CLOCK_SKEW_MS = 30_000;
    if (envelope.iat >= envelope.exp) return false;
    const iatMs = envelope.iat * 1000;
    const expMs = envelope.exp * 1000;
    if (nowMs >= expMs) return false;
    if (nowMs + CLOCK_SKEW_MS < iatMs) return false;

    // Signature over the canonical signed fields (sig excluded).
    const message = canonicalEnvelopeMessage({
      sub: envelope.sub,
      topic: envelope.topic,
      role: envelope.role,
      iat: envelope.iat,
      exp: envelope.exp,
      kid: envelope.kid,
    });
    const signature = base64UrlDecode(envelope.sig);
    if (signature.length !== 64) return false;

    const data = new TextEncoder().encode(message);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signature as BufferSource,
      data as BufferSource,
    );
  } catch {
    return false;
  }
}
