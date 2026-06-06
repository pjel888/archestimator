import type { Tables } from "@/lib/supabase/types";

export const NOTIFICATION_KINDS = [
  "release_announcement",
  "system_notice",
  "collaboration",
  "publication_activity",
  "beta_feedback",
  "security_notice",
] as const;

export const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "critical"] as const;

export const NOTIFICATION_SURFACES = ["center", "modal", "toast_and_center"] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];
export type NotificationSurface = (typeof NOTIFICATION_SURFACES)[number];

export type NotificationDeliveryView = {
  id: string;
  notificationId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  severity: NotificationSeverity;
  surface: NotificationSurface;
  releaseVersion: string | null;
  actionLabel: string | null;
  actionHref: string | null;
  deliveredAt: string;
  seenAt: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  modalAcknowledgedAt: string | null;
};

export type NotificationFeedResult = {
  items: NotificationDeliveryView[];
  nextCursor: string | null;
};

export type ReleaseAnnouncementView = NotificationDeliveryView & {
  kind: "release_announcement";
  surface: "modal";
};

export type NotificationActionResult =
  | { ok: true }
  | { ok: false; code: "unauthenticated" | "not_found" | "invalid_input" | "unavailable" };

export type NotificationDefinitionRow = Pick<
  Tables<"notification_definitions">,
  | "action_href"
  | "action_label"
  | "body"
  | "expires_at"
  | "kind"
  | "priority"
  | "release_version"
  | "severity"
  | "starts_at"
  | "surface"
  | "title"
>;

export type NotificationDeliveryRow = Pick<
  Tables<"notification_deliveries">,
  | "delivered_at"
  | "dismissed_at"
  | "id"
  | "modal_acknowledged_at"
  | "notification_id"
  | "read_at"
  | "seen_at"
>;

export type NotificationDeliveryWithDefinition = NotificationDeliveryRow & {
  notification_definitions: NotificationDefinitionRow | NotificationDefinitionRow[] | null;
};

export function isNotificationKind(value: string): value is NotificationKind {
  return NOTIFICATION_KINDS.includes(value as NotificationKind);
}

export function isNotificationSeverity(value: string): value is NotificationSeverity {
  return NOTIFICATION_SEVERITIES.includes(value as NotificationSeverity);
}

export function isNotificationSurface(value: string): value is NotificationSurface {
  return NOTIFICATION_SURFACES.includes(value as NotificationSurface);
}
