/**
 * Realtime identity envelope — round-trip & spoof-resistance tests (T1.2).
 *
 * Teamspace Improvement Plan task T1.2 / finding 05 §5 (HIGH spoof/XSS) /
 * gaps G3, G19 / decision R-18. Proves the sender-bound envelope verifies on a
 * genuine round-trip and that every spoofing / tampering / expiry / wrong-topic
 * path is rejected (verify === false) WITHOUT throwing.
 *
 * The server module imports `server-only`, which vitest aliases to a harmless
 * stub (see tests/vitest/server-only-stub.ts + vitest.config.ts), so we can
 * exercise the real signer here.
 */

import { describe, expect, it } from "vitest";
import {
  importVerifyKey,
  verifyRealtimeIdentity,
  type RealtimeIdentityEnvelope,
} from "@/lib/collaboration/realtime-identity";
import { issueRealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity-server";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";
const TOPIC_X = "estimate:33333333-3333-3333-3333-333333333333";
const TOPIC_Y = "estimate:44444444-4444-4444-4444-444444444444";

async function importPublicKey(publicKey: string) {
  return importVerifyKey(publicKey);
}

describe("realtime identity envelope", () => {
  it("verifies a valid server-issued envelope on the client (round-trip)", async () => {
    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_A,
      topic: TOPIC_X,
      role: "editor",
    });
    const key = await importPublicKey(publicKey);

    const ok = await verifyRealtimeIdentity({
      envelope,
      publicKey: key,
      expectedTopic: TOPIC_X,
      claimedUserId: USER_A,
    });

    expect(ok).toBe(true);
  });

  it("rejects member B claiming to be member A (payload.userId !== envelope.sub)", async () => {
    // Envelope is honestly issued to B, but the payload claims it is A.
    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_B,
      topic: TOPIC_X,
      role: "editor",
    });
    const key = await importPublicKey(publicKey);

    const ok = await verifyRealtimeIdentity({
      envelope,
      publicKey: key,
      expectedTopic: TOPIC_X,
      claimedUserId: USER_A, // spoofed claim
    });

    expect(ok).toBe(false);
  });

  it("rejects an expired envelope", async () => {
    const sixMinutesAgoMs = Date.now() - 6 * 60 * 1000;
    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_A,
      topic: TOPIC_X,
      role: "editor",
      ttlSeconds: 300,
      nowMs: sixMinutesAgoMs, // issued (and expired) in the past
    });
    const key = await importPublicKey(publicKey);

    const ok = await verifyRealtimeIdentity({
      envelope,
      publicKey: key,
      expectedTopic: TOPIC_X,
      claimedUserId: USER_A,
    });

    expect(ok).toBe(false);
  });

  it("rejects an envelope bound to a different topic", async () => {
    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_A,
      topic: TOPIC_X,
      role: "editor",
    });
    const key = await importPublicKey(publicKey);

    const ok = await verifyRealtimeIdentity({
      envelope,
      publicKey: key,
      expectedTopic: TOPIC_Y, // receiver is on a different channel
      claimedUserId: USER_A,
    });

    expect(ok).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_A,
      topic: TOPIC_X,
      role: "editor",
    });
    const key = await importPublicKey(publicKey);

    // Flip a character in the base64url signature.
    const flipped = envelope.sig[0] === "A" ? "B" : "A";
    const tampered: RealtimeIdentityEnvelope = { ...envelope, sig: flipped + envelope.sig.slice(1) };

    const ok = await verifyRealtimeIdentity({
      envelope: tampered,
      publicKey: key,
      expectedTopic: TOPIC_X,
      claimedUserId: USER_A,
    });

    expect(ok).toBe(false);
  });

  it("rejects a tampered field (role) that invalidates the signature", async () => {
    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_A,
      topic: TOPIC_X,
      role: "viewer",
    });
    const key = await importPublicKey(publicKey);

    // Attacker upgrades themselves to editor; signature no longer matches.
    const tampered: RealtimeIdentityEnvelope = { ...envelope, role: "editor" };

    const ok = await verifyRealtimeIdentity({
      envelope: tampered,
      publicKey: key,
      expectedTopic: TOPIC_X,
      claimedUserId: USER_A,
    });

    expect(ok).toBe(false);
  });

  it("rejects unknown / garbage envelopes without throwing", async () => {
    const { publicKey } = await issueRealtimeIdentityEnvelope({
      sub: USER_A,
      topic: TOPIC_X,
      role: "editor",
    });
    const key = await importPublicKey(publicKey);

    const garbageInputs: unknown[] = [
      null,
      undefined,
      42,
      "not-an-envelope",
      {},
      { sub: USER_A }, // missing fields
      { sub: USER_A, topic: TOPIC_X, role: "editor", iat: 1, exp: 2, kid: "x", sig: "!!!not-base64url!!!" },
      { sub: USER_A, topic: TOPIC_X, role: "editor", iat: 1, exp: 2, kid: "x", sig: "AAAA" },
    ];

    for (const envelope of garbageInputs) {
      const ok = await verifyRealtimeIdentity({
        envelope,
        publicKey: key,
        expectedTopic: TOPIC_X,
        claimedUserId: USER_A,
      });
      expect(ok).toBe(false);
    }
  });
});
