import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_PROBE_PATH = "/__recovery/probe";
export const RECOVERY_PROBE_BODY_LIMIT_BYTES = 8 * 1024;
const RECOVERY_PROBE_MAX_AGE_MS = 5 * 60 * 1000;
const RECOVERY_PROBE_ARRIVAL_DEADLINE_MS = 5 * 1000;
const RECOVERY_PROBE_MAX_SUCCESSES = 32;
const RECOVERY_PROBE_MAX_FAILURES_PER_MINUTE = 5;

export type RecoveryProbeRequest = {
  method: string;
  path: string;
  contentType: string | undefined;
  contentLength: number | undefined;
  body: string | Uint8Array;
  runId: string;
  timestamp: number;
  nonce: string;
  signature: string;
  receivedAt: number;
};

export type RecoveryProbeConfig = {
  expectedRunId: string;
  signingKey: string;
  now: number;
};

export type RecoveryProbeState = {
  nonceDigests: string[];
  successfulProbeCount: number;
  failureWindowStartedAt: number;
  failedAttemptsInWindow: number;
};

export type RecoveryProbeDecision = {
  accepted: boolean;
  denialLabel: string | null;
  bodyDigest: string;
  redactedLog: {
    runDigestPrefix: string;
    correlationDigestPrefix: string;
    denialLabel: string | null;
  };
  nextState: RecoveryProbeState;
};

function bytes(value: string | Uint8Array) {
  return typeof value === "string" ? Buffer.from(value) : Buffer.from(value);
}

function digest(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function constantTimeEqual(left: string, right: string) {
  return timingSafeEqual(Buffer.from(digest(left), "hex"), Buffer.from(digest(right), "hex"));
}

function normalizedContentType(value: string | undefined) {
  return value?.split(";", 1)[0]?.trim().toLowerCase();
}

function nextFailureState(state: RecoveryProbeState, now: number): RecoveryProbeState {
  const activeWindow = now - state.failureWindowStartedAt < 60 * 1000;
  return {
    ...state,
    failureWindowStartedAt: activeWindow ? state.failureWindowStartedAt : now,
    failedAttemptsInWindow: activeWindow ? state.failedAttemptsInWindow + 1 : 1,
  };
}

function redactedDecision(
  denialLabel: string | null,
  request: RecoveryProbeRequest,
  bodyDigest: string,
  nextState: RecoveryProbeState,
): RecoveryProbeDecision {
  return {
    accepted: denialLabel === null,
    denialLabel,
    bodyDigest,
    redactedLog: {
      runDigestPrefix: digest(request.runId).slice(0, 12),
      correlationDigestPrefix: digest(request.nonce).slice(0, 12),
      denialLabel,
    },
    nextState,
  };
}

export function signCloudflareD1RecoveryProbe(
  request: Pick<RecoveryProbeRequest, "method" | "path" | "runId" | "timestamp" | "nonce" | "body">,
  signingKey: string,
) {
  const bodyDigest = digest(request.body);
  const payload = [request.method, request.path, request.runId, request.timestamp, request.nonce, bodyDigest].join("\n");
  return createHmac("sha256", signingKey).update(payload).digest("base64url");
}

export function evaluateCloudflareD1RecoveryProbe(
  request: RecoveryProbeRequest,
  config: RecoveryProbeConfig,
  state: RecoveryProbeState,
): RecoveryProbeDecision {
  const body = bytes(request.body);
  const bodyDigest = digest(body);
  const deny = (label: string, nextState = state) => redactedDecision(label, request, bodyDigest, nextState);

  if (request.method !== "POST") return deny("method-not-allowed");
  if (request.path !== RECOVERY_PROBE_PATH) return deny("path-not-found");
  if (normalizedContentType(request.contentType) !== "application/json") return deny("content-type-invalid");
  if (!Number.isSafeInteger(request.contentLength) || request.contentLength < 0 || request.contentLength !== body.byteLength) {
    return deny("content-length-invalid");
  }
  if (request.contentLength > RECOVERY_PROBE_BODY_LIMIT_BYTES) return deny("body-too-large");
  if (config.now - request.receivedAt > RECOVERY_PROBE_ARRIVAL_DEADLINE_MS) return deny("arrival-deadline-exceeded");
  if (!constantTimeEqual(request.runId, config.expectedRunId)) return deny("run-id-mismatch");

  const afterFailure = nextFailureState(state, config.now);
  if (!Number.isSafeInteger(request.timestamp) || Math.abs(config.now - request.timestamp) > RECOVERY_PROBE_MAX_AGE_MS) {
    return deny("timestamp-expired", afterFailure);
  }
  if (!/^[a-zA-Z0-9_-]{16,256}$/.test(request.nonce)) return deny("nonce-invalid", afterFailure);
  if (state.failedAttemptsInWindow >= RECOVERY_PROBE_MAX_FAILURES_PER_MINUTE && config.now - state.failureWindowStartedAt < 60 * 1000) {
    return deny("failed-attempt-cap", state);
  }

  const expectedSignature = signCloudflareD1RecoveryProbe(request, config.signingKey);
  if (!constantTimeEqual(request.signature, expectedSignature)) return deny("signature-invalid", afterFailure);

  const nonceDigest = digest(request.nonce);
  if (state.nonceDigests.includes(nonceDigest)) return deny("nonce-replayed", afterFailure);
  if (state.successfulProbeCount >= RECOVERY_PROBE_MAX_SUCCESSES) return deny("success-cap", state);

  return redactedDecision(null, request, bodyDigest, {
    nonceDigests: [...state.nonceDigests, nonceDigest],
    successfulProbeCount: state.successfulProbeCount + 1,
    failureWindowStartedAt: state.failureWindowStartedAt,
    failedAttemptsInWindow: state.failedAttemptsInWindow,
  });
}
