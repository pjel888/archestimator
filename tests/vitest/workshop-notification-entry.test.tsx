import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  it("renders nothing when a shell is tested outside the app query provider", () => {
    const { container } = render(<WorkshopNotificationEntry />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the workshop notification bell entry point under the app query provider", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <WorkshopNotificationEntry />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toHaveClass("size-10");
  });

  it("mounts notifications under the app query provider and workshop actions slot", () => {
    const providersSource = readFileSync("src/app/providers.tsx", "utf8");
    const shellSource = readFileSync("src/components/workshop/WorkshopPageShell.tsx", "utf8");

    expect(providersSource).toContain("NotificationProvider");
    expect(providersSource).toContain("<NotificationProvider>");
    expect(shellSource).toContain("WorkshopNotificationEntry");
    expect(shellSource).toContain("WorkshopSettingsModal");
    expect(shellSource).toContain("const headerActions");
    expect(shellSource).toContain("actions={headerActions}");
    const headerActionsStart = shellSource.indexOf("const headerActions");
    const headerActionsSource = shellSource.slice(
      headerActionsStart,
      shellSource.indexOf("return (", headerActionsStart),
    );
    expect(headerActionsSource.indexOf("<WorkshopNotificationEntry")).toBeLessThan(
      headerActionsSource.indexOf("<WorkshopSettingsModal>"),
    );
  });
});
