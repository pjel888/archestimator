"use client";

import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

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
export const NOTIFICATION_BACKGROUND_QUERY_DELAY_MS = 5_000;

type NotificationQueryOptions = {
  enabled?: boolean;
};

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  feed: () => ["notifications", "feed"] as const,
  feedPage: (input: { limit?: number; cursor?: string | null } = {}) => [
    ...notificationQueryKeys.feed(),
    input.limit ?? null,
    input.cursor ?? null,
  ] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
  releaseModal: () => ["notifications", "release-modal"] as const,
};

function updateUnreadCount(current: number | undefined, delta: number) {
  return Math.max((current ?? 0) + delta, 0);
}

function updateNotificationInFeed(
  current: InfiniteData<NotificationFeedResult, string | null> | undefined,
  deliveryId: string,
  updater: (item: NotificationDeliveryView) => NotificationDeliveryView | null,
) {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items
        .map((item) => (item.id === deliveryId ? updater(item) : item))
        .filter((item): item is NotificationDeliveryView => Boolean(item)),
    })),
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

export function useDeferredNotificationQueryEnabled(force = false) {
  const [enabled, setEnabled] = useState(force);

  useEffect(() => {
    if (enabled) return undefined;
    if (force) {
      const frameId = window.requestAnimationFrame(() => setEnabled(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    let cancelled = false;
    let idleId: number | null = null;
    const activate = () => {
      if (!cancelled) setEnabled(true);
    };
    const timerId = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(activate, { timeout: 1_500 });
        return;
      }
      activate();
    }, NOTIFICATION_BACKGROUND_QUERY_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      if (idleId !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
    };
  }, [enabled, force]);

  return enabled || force;
}

export function useNotificationsQuery(input: { limit?: number; cursor?: string | null } = {}, options: NotificationQueryOptions = {}) {
  return useInfiniteQuery({
    queryKey: notificationQueryKeys.feedPage(input),
    queryFn: ({ pageParam }) => loadCurrentUserNotifications({ ...input, cursor: pageParam }),
    enabled: options.enabled ?? true,
    initialPageParam: input.cursor ?? null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: NOTIFICATION_FEED_STALE_TIME_MS,
    retry: 1,
  });
}

export function useUnreadNotificationCountQuery(options: NotificationQueryOptions = {}) {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: loadCurrentUserUnreadNotificationCount,
    enabled: options.enabled ?? true,
    staleTime: NOTIFICATION_UNREAD_STALE_TIME_MS,
    retry: 1,
  });
}

export function useReleaseAnnouncementQuery(options: NotificationQueryOptions = {}) {
  return useQuery({
    queryKey: notificationQueryKeys.releaseModal(),
    queryFn: loadCurrentUserReleaseAnnouncement,
    enabled: options.enabled ?? true,
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
      queryClient.setQueriesData<InfiniteData<NotificationFeedResult, string | null>>({ queryKey: notificationQueryKeys.feed() }, (current) =>
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
      queryClient.setQueriesData<InfiniteData<NotificationFeedResult, string | null>>({ queryKey: notificationQueryKeys.feed() }, (current) =>
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
      queryClient.setQueriesData<InfiniteData<NotificationFeedResult, string | null>>({ queryKey: notificationQueryKeys.feed() }, (current) =>
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
