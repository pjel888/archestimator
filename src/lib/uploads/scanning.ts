export type UploadScanStatus =
  | "not_required"
  | "pending"
  | "clean"
  | "infected"
  | "unsupported"
  | "failed_transient"
  | "failed_permanent"
  | "override_approved";

export type UploadScanSurface = "project-image" | "component-image" | "component-attachment";

export type UploadScanPolicy = {
  surface: UploadScanSurface;
  required: boolean;
};

export type UploadScanGateInput = {
  surface: UploadScanSurface;
  scanStatus: UploadScanStatus;
  overrideExpiresAt?: string | Date | null;
};

export type UploadScanGateDecision =
  | { allowed: true; reason: "scan_not_required" | "scan_clean" | "override_active" }
  | { allowed: false; reason: "scan_pending" | "scan_failed" | "scan_unsupported" | "scan_infected" | "override_expired" };

export type UploadScanProviderOutcome =
  | { outcome: "clean"; provider: string; result?: Record<string, unknown> }
  | { outcome: "infected"; provider: string; signature?: string; result?: Record<string, unknown> }
  | { outcome: "unsupported"; provider: string; reason?: string; result?: Record<string, unknown> }
  | { outcome: "failed_transient"; provider: string; reason?: string; result?: Record<string, unknown> }
  | { outcome: "failed_permanent"; provider: string; reason?: string; result?: Record<string, unknown> };

export type UploadScanBackpressureInput = {
  queuedCount: number;
  maxQueuedCount: number;
  queuedBytes: number;
  maxQueuedBytes: number;
  oldestQueuedAt?: string | Date | null;
  maxQueueAgeMs: number;
  now?: Date;
};

export type UploadScanBackpressureDecision =
  | { allowed: true }
  | { allowed: false; reason: "queue_count" | "queued_bytes" | "queue_age"; retryAfterSeconds: number };

const RETRY_AFTER_SECONDS = 60;

export function getUploadScanPolicy(surface: UploadScanSurface): UploadScanPolicy {
  return {
    surface,
    required: surface === "component-attachment",
  };
}

function isFutureDate(value: string | Date | null | undefined, now: Date) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() > now.getTime();
}

export function decideUploadScanGate(input: UploadScanGateInput, now = new Date()): UploadScanGateDecision {
  const policy = getUploadScanPolicy(input.surface);
  if (!policy.required) return { allowed: true, reason: "scan_not_required" };
  if (input.scanStatus === "clean") return { allowed: true, reason: "scan_clean" };
  if (input.scanStatus === "override_approved") {
    return isFutureDate(input.overrideExpiresAt, now)
      ? { allowed: true, reason: "override_active" }
      : { allowed: false, reason: "override_expired" };
  }
  if (input.scanStatus === "pending" || input.scanStatus === "failed_transient") {
    return { allowed: false, reason: "scan_pending" };
  }
  if (input.scanStatus === "infected") return { allowed: false, reason: "scan_infected" };
  if (input.scanStatus === "unsupported") return { allowed: false, reason: "scan_unsupported" };
  return { allowed: false, reason: "scan_failed" };
}

export function scanStatusFromProviderOutcome(outcome: UploadScanProviderOutcome): Exclude<UploadScanStatus, "not_required" | "pending" | "override_approved"> {
  return outcome.outcome;
}

export function canTransitionUploadScanStatus(from: UploadScanStatus, to: UploadScanStatus) {
  if (from === to) return true;
  if (from === "not_required") return false;
  if (from === "pending") {
    return to === "clean"
      || to === "infected"
      || to === "unsupported"
      || to === "failed_transient"
      || to === "failed_permanent";
  }
  if (from === "failed_transient") {
    return to === "pending"
      || to === "clean"
      || to === "infected"
      || to === "unsupported"
      || to === "failed_permanent";
  }
  if (from === "failed_permanent" || from === "unsupported") return to === "override_approved";
  return false;
}

export function evaluateUploadScanBackpressure(input: UploadScanBackpressureInput): UploadScanBackpressureDecision {
  if (input.queuedCount >= input.maxQueuedCount) {
    return { allowed: false, reason: "queue_count", retryAfterSeconds: RETRY_AFTER_SECONDS };
  }
  if (input.queuedBytes >= input.maxQueuedBytes) {
    return { allowed: false, reason: "queued_bytes", retryAfterSeconds: RETRY_AFTER_SECONDS };
  }
  if (input.oldestQueuedAt) {
    const now = input.now ?? new Date();
    const oldestQueuedAt = input.oldestQueuedAt instanceof Date ? input.oldestQueuedAt : new Date(input.oldestQueuedAt);
    if (Number.isFinite(oldestQueuedAt.getTime()) && now.getTime() - oldestQueuedAt.getTime() >= input.maxQueueAgeMs) {
      return { allowed: false, reason: "queue_age", retryAfterSeconds: RETRY_AFTER_SECONDS };
    }
  }
  return { allowed: true };
}
