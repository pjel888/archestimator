const NOTIFICATION_KINDS = [
  "release_announcement",
  "system_notice",
  "collaboration",
  "publication_activity",
  "beta_feedback",
  "security_notice",
] as const;

const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "critical"] as const;

const NOTIFICATION_SURFACES = ["center", "modal", "toast_and_center"] as const;

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

export type NotificationDefinitionRow = {
  action_href: string | null;
  action_label: string | null;
  body: string;
  expires_at: string | null;
  kind: string;
  priority: number;
  release_version: string | null;
  severity: string;
  starts_at: string;
  surface: string;
  title: string;
};

export type NotificationDeliveryRow = {
  delivered_at: string;
  dismissed_at: string | null;
  id: string;
  modal_acknowledged_at: string | null;
  notification_id: string;
  read_at: string | null;
  seen_at: string | null;
};

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
