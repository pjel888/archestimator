/**
 * Lightweight realtime telemetry sink.
 *
 * Plan: 2026-06-14 Teamspace Improvement Plan — T0.6 / decision R-17 / gap G15.
 * A silently dropped realtime channel is a failed Teamspace experience even if
 * the modal still renders. These events make channel/auth/identity failures
 * visible. In dev they `console.warn`; in prod a real sink (Clarity/Sentry) can
 * be registered with `setRealtimeTelemetrySink`.
 */

export type RealtimeTelemetryType =
  | "subscribed"
  | "channel_error"
  | "closed"
  | "auth_refresh_failed"
  | "rate_limited"
  | "identity_rejected";

export type RealtimeTelemetryDetail =
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED"
  | "IDENTITY_ISSUANCE_FAILED"
  | "MISSING_ENVELOPE"
  | "ENVELOPE_VERIFICATION_FAILED";

export type RealtimeTelemetryEvent = {
  type: RealtimeTelemetryType;
  /** Internal topic value; it is normalized before leaving this module. */
  topic?: string;
  detail?: RealtimeTelemetryDetail;
};

export type RealtimeTelemetryRecord = {
  type: RealtimeTelemetryType;
  /** Topic family only. Never contains a room, project, or estimate identifier. */
  topic?: "project" | "estimate" | "unknown";
  /** Fixed operational code only. Never contains exception or user input text. */
  detail?: RealtimeTelemetryDetail;
};

type RealtimeTelemetrySink = (event: RealtimeTelemetryRecord) => void;

let sink: RealtimeTelemetrySink | null = null;

export function setRealtimeTelemetrySink(next: RealtimeTelemetrySink | null) {
  sink = next;
}

export function sanitizeRealtimeTelemetryEvent(
  event: RealtimeTelemetryEvent,
): RealtimeTelemetryRecord {
  const topic = event.topic?.split(":", 1)[0];
  const topicFamily =
    topic === "project" || topic === "estimate" ? topic : "unknown";

  return {
    type: event.type,
    ...(event.topic ? { topic: topicFamily } : {}),
    ...(event.detail ? { detail: event.detail } : {}),
  };
}

export function reportRealtimeEvent(event: RealtimeTelemetryEvent) {
  const record = sanitizeRealtimeTelemetryEvent(event);
  if (sink) {
    try {
      sink(record);
    } catch {
      // a telemetry failure must never break the feature
    }
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[realtime:${record.type}]${record.topic ? ` ${record.topic}` : ""}${record.detail ? ` — ${record.detail}` : ""}`,
    );
  }
}
