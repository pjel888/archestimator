import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  notificationFeedResult,
  notificationFixtureIds,
  releaseAnnouncementView,
} from "../fixtures/notifications";

const actionMocks = vi.hoisted(() => ({
  acknowledgeReleaseAnnouncementAction: vi.fn(),
  dismissNotificationAction: vi.fn(),
  loadCurrentUserNotifications: vi.fn(),
  loadCurrentUserReleaseAnnouncement: vi.fn(),
  loadCurrentUserUnreadNotificationCount: vi.fn(),
  markNotificationReadAction: vi.fn(),
}));

vi.mock("@/lib/notifications/actions", () => actionMocks);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  actionMocks.loadCurrentUserNotifications.mockResolvedValue(notificationFeedResult);
  actionMocks.loadCurrentUserUnreadNotificationCount.mockResolvedValue(1);
  actionMocks.loadCurrentUserReleaseAnnouncement.mockResolvedValue(releaseAnnouncementView);
  actionMocks.markNotificationReadAction.mockResolvedValue({ ok: true });
  actionMocks.dismissNotificationAction.mockResolvedValue({ ok: true });
  actionMocks.acknowledgeReleaseAnnouncementAction.mockResolvedValue({ ok: true });
});

describe("notification query hooks", () => {
  it("uses stable query keys and notification-specific stale times", async () => {
    const hooks = await import("@/features/notifications/hooks/useNotificationsQuery");

    expect(hooks.notificationQueryKeys.all).toEqual(["notifications"]);
    expect(hooks.notificationQueryKeys.feed()).toEqual(["notifications", "feed", null]);
    expect(hooks.notificationQueryKeys.feed("cursor-1")).toEqual(["notifications", "feed", "cursor-1"]);
    expect(hooks.notificationQueryKeys.unreadCount()).toEqual(["notifications", "unread-count"]);
    expect(hooks.notificationQueryKeys.releaseModal()).toEqual(["notifications", "release-modal"]);
    expect(hooks.NOTIFICATION_UNREAD_STALE_TIME_MS).toBe(30_000);
    expect(hooks.NOTIFICATION_RELEASE_MODAL_STALE_TIME_MS).toBe(30_000);
    expect(hooks.NOTIFICATION_FEED_STALE_TIME_MS).toBe(60_000);
    expect(hooks.NOTIFICATION_BACKGROUND_QUERY_DELAY_MS).toBe(5_000);
  });

  it("calls server actions for feed, unread count, and release modal queries", async () => {
    const queryClient = makeQueryClient();
    const hooks = await import("@/features/notifications/hooks/useNotificationsQuery");

    const feed = renderHook(() => hooks.useNotificationsQuery({ limit: 10 }), { wrapper: makeWrapper(queryClient) });
    const unread = renderHook(() => hooks.useUnreadNotificationCountQuery(), { wrapper: makeWrapper(queryClient) });
    const modal = renderHook(() => hooks.useReleaseAnnouncementQuery(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(feed.result.current.data).toEqual(notificationFeedResult));
    await waitFor(() => expect(unread.result.current.data).toBe(1));
    await waitFor(() => expect(modal.result.current.data).toEqual(releaseAnnouncementView));
    expect(actionMocks.loadCurrentUserNotifications).toHaveBeenCalledWith({ limit: 10 });
    expect(actionMocks.loadCurrentUserUnreadNotificationCount).toHaveBeenCalledTimes(1);
    expect(actionMocks.loadCurrentUserReleaseAnnouncement).toHaveBeenCalledTimes(1);
  });

  it("can keep notification queries disabled for non-critical first paint", async () => {
    const queryClient = makeQueryClient();
    const hooks = await import("@/features/notifications/hooks/useNotificationsQuery");

    renderHook(() => hooks.useNotificationsQuery({ limit: 10 }, { enabled: false }), { wrapper: makeWrapper(queryClient) });
    renderHook(() => hooks.useUnreadNotificationCountQuery({ enabled: false }), { wrapper: makeWrapper(queryClient) });
    renderHook(() => hooks.useReleaseAnnouncementQuery({ enabled: false }), { wrapper: makeWrapper(queryClient) });

    expect(actionMocks.loadCurrentUserNotifications).not.toHaveBeenCalled();
    expect(actionMocks.loadCurrentUserUnreadNotificationCount).not.toHaveBeenCalled();
    expect(actionMocks.loadCurrentUserReleaseAnnouncement).not.toHaveBeenCalled();
  });

  it("enables background notification hydration after the first-paint delay", async () => {
    vi.useFakeTimers();
    const hooks = await import("@/features/notifications/hooks/useNotificationsQuery");

    try {
      const { result } = renderHook(() => hooks.useDeferredNotificationQueryEnabled());
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(hooks.NOTIFICATION_BACKGROUND_QUERY_DELAY_MS);
      });

      expect(result.current).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("updates cached feed/count/modal state after release acknowledgement", async () => {
    const queryClient = makeQueryClient();
    const hooks = await import("@/features/notifications/hooks/useNotificationsQuery");
    queryClient.setQueryData(hooks.notificationQueryKeys.feed(null), notificationFeedResult);
    queryClient.setQueryData(hooks.notificationQueryKeys.unreadCount(), 1);
    queryClient.setQueryData(hooks.notificationQueryKeys.releaseModal(), releaseAnnouncementView);

    const { result } = renderHook(() => hooks.useAcknowledgeReleaseAnnouncementMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync(notificationFixtureIds.userAReleaseDelivery);

    expect(actionMocks.acknowledgeReleaseAnnouncementAction).toHaveBeenCalledWith(notificationFixtureIds.userAReleaseDelivery);
    expect(queryClient.getQueryData(hooks.notificationQueryKeys.unreadCount())).toBe(0);
    expect(queryClient.getQueryData(hooks.notificationQueryKeys.releaseModal())).toBeNull();
    expect(queryClient.getQueryData<typeof notificationFeedResult>(hooks.notificationQueryKeys.feed(null))?.items[0]).toMatchObject({
      id: notificationFixtureIds.userAReleaseDelivery,
      modalAcknowledgedAt: expect.any(String),
      readAt: expect.any(String),
      seenAt: expect.any(String),
    });
  });

  it("keeps previous UI data stable when mutations return safe failures", async () => {
    const queryClient = makeQueryClient();
    const hooks = await import("@/features/notifications/hooks/useNotificationsQuery");
    actionMocks.dismissNotificationAction.mockResolvedValue({ ok: false, code: "unavailable" });
    queryClient.setQueryData(hooks.notificationQueryKeys.feed(null), notificationFeedResult);
    queryClient.setQueryData(hooks.notificationQueryKeys.unreadCount(), 1);

    const { result } = renderHook(() => hooks.useDismissNotificationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync(notificationFixtureIds.userAReleaseDelivery);

    expect(queryClient.getQueryData(hooks.notificationQueryKeys.feed(null))).toEqual(notificationFeedResult);
    expect(queryClient.getQueryData(hooks.notificationQueryKeys.unreadCount())).toBe(1);
  });

  it("does not introduce a second notification state owner", () => {
    const source = readFileSync("src/features/notifications/hooks/useNotificationsQuery.ts", "utf8");

    expect(source).not.toContain("zustand");
    expect(source).toContain("@tanstack/react-query");
  });
});
