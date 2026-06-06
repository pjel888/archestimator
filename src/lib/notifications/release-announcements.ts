import {
  isNotificationKind,
  isNotificationSeverity,
  isNotificationSurface,
  type NotificationDeliveryView,
  type NotificationDeliveryWithDefinition,
  type ReleaseAnnouncementView,
} from "@/lib/notifications/types";

const WORKSHOP_ACTION_HREF_PATTERN = /^\/workshop(?:\/|$|\?)/;
const FORBIDDEN_ACTION_HREF_PATTERN = /(^\/\/|[\s]|javascript:|https?:|%2f|%5c)/i;

export function isAllowedNotificationActionHref(value: string | null): value is string | null {
  if (value === null) return true;
  return WORKSHOP_ACTION_HREF_PATTERN.test(value) && !FORBIDDEN_ACTION_HREF_PATTERN.test(value);
}

export function coerceNotificationDeliveryView(
  delivery: NotificationDeliveryWithDefinition,
): NotificationDeliveryView | null {
  const definition = Array.isArray(delivery.notification_definitions)
    ? delivery.notification_definitions[0]
    : delivery.notification_definitions;

  if (!definition) return null;
  if (!isNotificationKind(definition.kind)) return null;
  if (!isNotificationSeverity(definition.severity)) return null;
  if (!isNotificationSurface(definition.surface)) return null;
  if (!isAllowedNotificationActionHref(definition.action_href)) return null;

  return {
    id: delivery.id,
    notificationId: delivery.notification_id,
    kind: definition.kind,
    title: definition.title,
    body: definition.body,
    severity: definition.severity,
    surface: definition.surface,
    releaseVersion: definition.release_version,
    actionLabel: definition.action_label,
    actionHref: definition.action_href,
    deliveredAt: delivery.delivered_at,
    seenAt: delivery.seen_at,
    readAt: delivery.read_at,
    dismissedAt: delivery.dismissed_at,
    modalAcknowledgedAt: delivery.modal_acknowledged_at,
  };
}

export function isActiveReleaseAnnouncement(
  delivery: NotificationDeliveryWithDefinition,
  now = new Date(),
): boolean {
  const definition = Array.isArray(delivery.notification_definitions)
    ? delivery.notification_definitions[0]
    : delivery.notification_definitions;
  if (!definition) return false;
  if (definition.kind !== "release_announcement" || definition.surface !== "modal") return false;
  if (delivery.modal_acknowledged_at || delivery.dismissed_at) return false;
  if (new Date(definition.starts_at).getTime() > now.getTime()) return false;
  return !definition.expires_at || new Date(definition.expires_at).getTime() > now.getTime();
}

export function toReleaseAnnouncementView(
  delivery: NotificationDeliveryWithDefinition,
): ReleaseAnnouncementView | null {
  const view = coerceNotificationDeliveryView(delivery);
  if (!view || view.kind !== "release_announcement" || view.surface !== "modal") return null;
  return {
    ...view,
    kind: "release_announcement",
    surface: "modal",
  };
}
