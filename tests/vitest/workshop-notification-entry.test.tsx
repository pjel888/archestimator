import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import { WorkshopNotificationEntry } from "@/features/notifications/components/WorkshopNotificationEntry";
import { notificationFeedResult } from "../fixtures/notifications";

const hookState = vi.hoisted(() => ({
  feed: {
    data: null as typeof notificationFeedResult | null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  unread: {
    data: 2,
  },
  markRead: {
    isPending: false,
    mutate: vi.fn(),
    variables: undefined as string | undefined,
  },
  dismiss: {
    isPending: false,
    mutate: vi.fn(),
    variables: undefined as string | undefined,
  },
}));

vi.mock("@/features/notifications/hooks/useNotificationsQuery", () => ({
  useDeferredNotificationQueryEnabled: () => true,
  useNotificationsQuery: () => hookState.feed,
  useUnreadNotificationCountQuery: () => hookState.unread,
  useMarkNotificationReadMutation: () => hookState.markRead,
  useDismissNotificationMutation: () => hookState.dismiss,
}));

beforeEach(() => {
  vi.clearAllMocks();
  hookState.feed.data = notificationFeedResult;
});

describe("workshop notification entry", () => {
  it("renders the bell when notification hooks are supplied by the test harness", () => {
    render(<WorkshopNotificationEntry />);

    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toBeInTheDocument();
  });

  it("renders the workshop notification bell entry point under the app query provider", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <WorkshopNotificationEntry />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toHaveClass(
      "size-8",
      "cursor-pointer",
    );
  });

  it("renders the workshop settings entry point at the compact header icon size", () => {
    render(<WorkshopSettingsModal>Settings body</WorkshopSettingsModal>);

    expect(screen.getByRole("button", { name: "Open settings" })).toHaveClass("size-8", "cursor-pointer");
  });

  it("mounts notifications under the app query provider and workshop actions slot", () => {
    const providersSource = readFileSync("src/app/providers.tsx", "utf8");
    const shellSource = readFileSync("src/components/workshop/WorkshopRouteHeader.tsx", "utf8");

    expect(providersSource).toContain("NotificationProvider");
    expect(providersSource).toContain("<NotificationProvider>");
    expect(shellSource).toContain("WorkshopNotificationEntry");
    expect(shellSource).toContain("WorkshopSettingsModal");
    expect(shellSource).toContain("WorkshopSettingsEntry");
    expect(shellSource).toContain("const headerActions");
    expect(shellSource).toContain("actions={headerActions}");
    const headerActionsStart = shellSource.indexOf("const headerActions");
    const headerActionsSource = shellSource.slice(
      headerActionsStart,
      shellSource.indexOf("return (", headerActionsStart),
    );
    expect(headerActionsSource.indexOf("<WorkshopNotificationEntry")).toBeLessThan(
      headerActionsSource.indexOf("<WorkshopSettingsEntry"),
    );
  });
});
