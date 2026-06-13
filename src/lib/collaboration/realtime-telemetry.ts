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

export type RealtimeTelemetryEvent = {
  type: RealtimeTelemetryType;
  /** Coarse channel topic (e.g. "project:…" / "estimate:…"). Never a raw path. */
  topic?: string;
  detail?: string;
};

type RealtimeTelemetrySink = (event: RealtimeTelemetryEvent) => void;

let sink: RealtimeTelemetrySink | null = null;

export function setRealtimeTelemetrySink(next: RealtimeTelemetrySink | null) {
  sink = next;
}

export function reportRealtimeEvent(event: RealtimeTelemetryEvent) {
  if (sink) {
    try {
      sink(event);
    } catch {
      // a telemetry failure must never break the feature
    }
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[realtime:${event.type}]${event.topic ? ` ${event.topic}` : ""}${event.detail ? ` — ${event.detail}` : ""}`,
    );
  }
}
