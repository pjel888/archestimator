export type ExpressComponentTelemetryEvent =
  | "insert_requested"
  | "insert_succeeded"
  | "insert_failed"
  | "draft_deleted"
  | "save_requested"
  | "virtualization_disabled"
  | "promotion_requested"
  | "promotion_succeeded"
  | "promotion_failed";

export type ExpressComponentTelemetryPayload = {
  projectId?: string;
  estimateId?: string;
  rowId?: string;
  nodeId?: string;
  reason?: string;
  fieldNames?: string[];
  itemId?: string;
  retry?: boolean;
};

export function recordExpressComponentEvent(
  event: ExpressComponentTelemetryEvent,
  payload: ExpressComponentTelemetryPayload = {},
) {
  // Lightweight beta observability seam. Keep it privacy-safe and structured so
  // it can be swapped for Clarity/Sentry/server telemetry without changing call sites.
  if (process.env.NODE_ENV === "test") return;
  console.warn("[express-components]", { event, ...payload });
}
