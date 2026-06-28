import { CURRENT_TERMS } from "@/lib/legal/terms-content";

export const TERMS_GATE_COOKIE_NAME = "ae_terms_gate";
const TERMS_GATE_COOKIE_MAX_AGE_SECONDS = 15 * 60;

type TermsGateCookiePayload = {
  sub: string;
  version: string;
  exp: number;
};

function getTermsGateSecret() {
  return process.env.ARCHESTIMATOR_TERMS_GATE_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || null;
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeText(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function signaturesMatch(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function signPayload(payload: string, secret: string) {
  if (!globalThis.crypto?.subtle) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

export function getTermsGateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/workshop",
    maxAge: TERMS_GATE_COOKIE_MAX_AGE_SECONDS,
  };
}

export function getExpiredTermsGateCookieOptions() {
  return {
    ...getTermsGateCookieOptions(),
    maxAge: 0,
  };
}

export async function createTermsGateCookieValue(userId: string, nowMs = Date.now()) {
  const secret = getTermsGateSecret();
  if (!secret) return null;

  const payload: TermsGateCookiePayload = {
    sub: userId,
    version: CURRENT_TERMS.version,
    exp: Math.floor(nowMs / 1000) + TERMS_GATE_COOKIE_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload, secret);
  return signature ? `${encodedPayload}.${signature}` : null;
}

export async function verifyTermsGateCookieValue(value: string | null | undefined, userId: string, nowMs = Date.now()) {
  const secret = getTermsGateSecret();
  if (!secret || !value) return false;

  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return false;

  const expectedSignature = await signPayload(encodedPayload, secret);
  if (!expectedSignature || !signaturesMatch(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecodeText(encodedPayload)) as Partial<TermsGateCookiePayload>;
    return (
      payload.sub === userId &&
      payload.version === CURRENT_TERMS.version &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(nowMs / 1000)
    );
  } catch {
    return false;
  }
}
