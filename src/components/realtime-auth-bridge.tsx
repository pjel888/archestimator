"use client";

/**
 * Kept as a provider-level mount while realtime moves to Cloudflare Durable
 * Objects. The old browser auth-token refresh plumbing is intentionally retired
 * here; the Durable Object client uses signed per-room identity envelopes.
 */
export function RealtimeAuthBridge() {
  return null;
}
