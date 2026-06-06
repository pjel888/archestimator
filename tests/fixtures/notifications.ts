import type {
  NotificationActionResult,
  NotificationDeliveryView,
  NotificationFeedResult,
  ReleaseAnnouncementView,
} from "@/lib/notifications/types";

export const notificationFixtureIds = {
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  releaseDefinition: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userAReleaseDelivery: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  userBReleaseDelivery: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  securityDefinition: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  userASecurityDelivery: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
} as const;

export const releaseAnnouncementView: ReleaseAnnouncementView = {
  id: notificationFixtureIds.userAReleaseDelivery,
  notificationId: notificationFixtureIds.releaseDefinition,
  kind: "release_announcement",
  title: "New release",
  body: "Archestimator has a new in-app notification proof build.",
  severity: "info",
  surface: "modal",
  releaseVersion: "0.1.0-notification-test",
  actionLabel: "View workshop",
  actionHref: "/workshop",
  deliveredAt: "2026-06-06T09:00:00.000Z",
  seenAt: null,
  readAt: null,
  dismissedAt: null,
  modalAcknowledgedAt: null,
};

export const securityNotificationView: NotificationDeliveryView = {
  id: notificationFixtureIds.userASecurityDelivery,
  notificationId: notificationFixtureIds.securityDefinition,
  kind: "security_notice",
  title: "Security notice",
  body: "Your account security settings were updated.",
  severity: "warning",
  surface: "center",
  releaseVersion: null,
  actionLabel: "Open settings",
  actionHref: "/workshop/settings",
  deliveredAt: "2026-06-06T08:30:00.000Z",
  seenAt: "2026-06-06T08:40:00.000Z",
  readAt: "2026-06-06T08:40:00.000Z",
  dismissedAt: null,
  modalAcknowledgedAt: null,
};

export const notificationFeedResult: NotificationFeedResult = {
  items: [releaseAnnouncementView, securityNotificationView],
  nextCursor: null,
};

export function makeNotificationActionSuccess(): NotificationActionResult {
  return { ok: true };
}

export function makeNotificationActionFailure(
  code: Exclude<NotificationActionResult, { ok: true }>["code"] = "unavailable",
): NotificationActionResult {
  return { ok: false, code };
}
