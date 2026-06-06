"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acknowledgeReleaseAnnouncementAction,
  dismissNotificationAction,
  loadCurrentUserNotifications,
  loadCurrentUserReleaseAnnouncement,
  loadCurrentUserUnreadNotificationCount,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import type { NotificationDeliveryView, NotificationFeedResult, ReleaseAnnouncementView } from "@/lib/notifications/types";

export const NOTIFICATION_UNREAD_STALE_TIME_MS = 30_000;
export const NOTIFICATION_RELEASE_MODAL_STALE_TIME_MS = 30_000;
export const NOTIFICATION_FEED_STALE_TIME_MS = 60_000;

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  feed: (cursor?: string | null) => ["notifications", "feed", cursor ?? null] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
  releaseModal: () => ["notifications", "release-modal"] as const,
};

function updateUnreadCount(current: number | undefined, delta: number) {
  return Math.max((current ?? 0) + delta, 0);
}

function updateNotificationInFeed(
  current: NotificationFeedResult | undefined,
  deliveryId: string,
  updater: (item: NotificationDeliveryView) => NotificationDeliveryView | null,
) {
  if (!current) return current;
  return {
    ...current,
    items: current.items
      .map((item) => (item.id === deliveryId ? updater(item) : item))
      .filter((item): item is NotificationDeliveryView => Boolean(item)),
  };
}

function setReadState(item: NotificationDeliveryView, timestamp: string) {
  return {
    ...item,
    readAt: item.readAt ?? timestamp,
    seenAt: item.seenAt ?? timestamp,
  };
}

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all, refetchType: "none" });
}

export function useNotificationsQuery(input: { limit?: number; cursor?: string | null } = {}) {
  return useQuery({
    queryKey: notificationQueryKeys.feed(input.cursor),
    queryFn: () => loadCurrentUserNotifications(input),
    staleTime: NOTIFICATION_FEED_STALE_TIME_MS,
    retry: 1,
  });
}

export function useUnreadNotificationCountQuery() {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: loadCurrentUserUnreadNotificationCount,
    staleTime: NOTIFICATION_UNREAD_STALE_TIME_MS,
    retry: 1,
  });
}

export function useReleaseAnnouncementQuery() {
  return useQuery({
    queryKey: notificationQueryKeys.releaseModal(),
    queryFn: loadCurrentUserReleaseAnnouncement,
    staleTime: NOTIFICATION_RELEASE_MODAL_STALE_TIME_MS,
    retry: 1,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => markNotificationReadAction(deliveryId),
    retry: 0,
    onSuccess: (result, deliveryId) => {
      if (!result.ok) return;
      const timestamp = new Date().toISOString();
      let unreadWasDecremented = false;
      queryClient.setQueryData<NotificationFeedResult>(notificationQueryKeys.feed(null), (current) =>
        updateNotificationInFeed(current, deliveryId, (item) => {
          if (!item.readAt) unreadWasDecremented = true;
          return setReadState(item, timestamp);
        }),
      );
      if (unreadWasDecremented) {
        queryClient.setQueryData<number>(notificationQueryKeys.unreadCount(), (current) => updateUnreadCount(current, -1));
      }
      queryClient.setQueryData<ReleaseAnnouncementView | null>(notificationQueryKeys.releaseModal(), (current) =>
        current?.id === deliveryId ? null : current ?? null,
      );
      invalidateNotificationQueries(queryClient);
    },
  });
}

export function useDismissNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => dismissNotificationAction(deliveryId),
    retry: 0,
    onSuccess: (result, deliveryId) => {
      if (!result.ok) return;
      let unreadWasDecremented = false;
      queryClient.setQueryData<NotificationFeedResult>(notificationQueryKeys.feed(null), (current) =>
        updateNotificationInFeed(current, deliveryId, (item) => {
          if (!item.readAt) unreadWasDecremented = true;
          return null;
        }),
      );
      if (unreadWasDecremented) {
        queryClient.setQueryData<number>(notificationQueryKeys.unreadCount(), (current) => updateUnreadCount(current, -1));
      }
      queryClient.setQueryData<ReleaseAnnouncementView | null>(notificationQueryKeys.releaseModal(), (current) =>
        current?.id === deliveryId ? null : current ?? null,
      );
      invalidateNotificationQueries(queryClient);
    },
  });
}

export function useAcknowledgeReleaseAnnouncementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => acknowledgeReleaseAnnouncementAction(deliveryId),
    retry: 0,
    onSuccess: (result, deliveryId) => {
      if (!result.ok) return;
      const timestamp = new Date().toISOString();
      let unreadWasDecremented = false;
      queryClient.setQueryData<NotificationFeedResult>(notificationQueryKeys.feed(null), (current) =>
        updateNotificationInFeed(current, deliveryId, (item) => {
          if (!item.readAt) unreadWasDecremented = true;
          return {
            ...setReadState(item, timestamp),
            modalAcknowledgedAt: item.modalAcknowledgedAt ?? timestamp,
          };
        }),
      );
      if (unreadWasDecremented) {
        queryClient.setQueryData<number>(notificationQueryKeys.unreadCount(), (current) => updateUnreadCount(current, -1));
      }
      queryClient.setQueryData<ReleaseAnnouncementView | null>(notificationQueryKeys.releaseModal(), (current) =>
        current?.id === deliveryId ? null : current ?? null,
      );
      invalidateNotificationQueries(queryClient);
    },
  });
}
