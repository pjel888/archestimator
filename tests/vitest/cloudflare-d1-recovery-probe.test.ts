import { describe, expect, it } from "vitest";

import {
  RECOVERY_PROBE_PATH,
  evaluateCloudflareD1RecoveryProbe,
  signCloudflareD1RecoveryProbe,
  type RecoveryProbeRequest,
  type RecoveryProbeState,
} from "../../scripts/lib/cloudflare-d1-recovery-probe";

const now = 1_784_275_200_000;
const state: RecoveryProbeState = { nonceDigests: [], successfulProbeCount: 0, failureWindowStartedAt: now, failedAttemptsInWindow: 0 };

function request(overrides: Partial<RecoveryProbeRequest> = {}): RecoveryProbeRequest {
  const value: RecoveryProbeRequest = {
    method: "POST",
    path: RECOVERY_PROBE_PATH,
    contentType: "application/json",
    contentLength: 2,
    body: "{}",
    runId: "recovery-20260712-a1b2c3d4",
    timestamp: now,
    nonce: "nonce-value-1234567890",
    signature: "",
    receivedAt: now,
    ...overrides,
  };
  if (overrides.signature === undefined) value.signature = signCloudflareD1RecoveryProbe(value, "test-signing-key");
  return value;
}

function evaluate(value = request(), currentState = state) {
  return evaluateCloudflareD1RecoveryProbe(value, { expectedRunId: "recovery-20260712-a1b2c3d4", signingKey: "test-signing-key", now }, currentState);
}

describe("Cloudflare D1 recovery probe", () => {
  it("accepts only the signed recovery probe and stores a nonce digest", () => {
    const result = evaluate();

    expect(result.accepted).toBe(true);
    expect(result.denialLabel).toBeNull();
    expect(result.nextState.successfulProbeCount).toBe(1);
    expect(result.nextState.nonceDigests).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("test-signing-key");
    expect(JSON.stringify(result)).not.toContain("nonce-value-1234567890");
  });

  it.each([
    ["wrong method", request({ method: "GET" }), "method-not-allowed"],
    ["wrong path", request({ path: "/api/other" }), "path-not-found"],
    ["wrong content type", request({ contentType: "text/plain" }), "content-type-invalid"],
    ["indeterminate body", request({ contentLength: undefined }), "content-length-invalid"],
    ["oversized body", request({ body: "x".repeat(8193), contentLength: 8193 }), "body-too-large"],
    ["late body", request({ receivedAt: now - 5001 }), "arrival-deadline-exceeded"],
    ["wrong run", request({ runId: "other-run-20260712" }), "run-id-mismatch"],
    ["expired timestamp", request({ timestamp: now - 300001 }), "timestamp-expired"],
    ["bad signature", request({ signature: "invalid" }), "signature-invalid"],
  ])("denies %s before dispatch", (_name, probeRequest, label) => {
    const result = evaluate(probeRequest);
    expect(result.accepted).toBe(false);
    expect(result.denialLabel).toBe(label);
  });

  it("rejects replay and bounded cardinality", () => {
    const first = evaluate();
    expect(evaluate(request(), first.nextState).denialLabel).toBe("nonce-replayed");
    expect(evaluate(request({ nonce: "another-nonce-123456789" }), { ...state, successfulProbeCount: 32 }).denialLabel).toBe("success-cap");
    expect(evaluate(request({ nonce: "third-nonce-1234567890" }), { ...state, failedAttemptsInWindow: 5 }).denialLabel).toBe("failed-attempt-cap");
  });
});
