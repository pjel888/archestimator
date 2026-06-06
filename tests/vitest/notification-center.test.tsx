import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";
import { notificationFeedResult, notificationFixtureIds } from "../fixtures/notifications";

const hookState = vi.hoisted(() => ({
  feed: {
    data: null as typeof notificationFeedResult | null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  unread: {
    data: 1,
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
  hookState.feed.isError = false;
  hookState.feed.isLoading = false;
  hookState.feed.refetch = vi.fn();
  hookState.unread.data = 1;
  hookState.markRead.mutate = vi.fn();
  hookState.dismiss.mutate = vi.fn();
});

describe("NotificationCenter", () => {
  it("labels the bell with unread count and closes with focus return on Escape", async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    const bell = screen.getByRole("button", { name: "Notifications, 1 unread" });
    bell.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument());
    expect(bell).toHaveFocus();
  });

  it("renders feed rows with accessible read and dismiss controls", async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));

    await user.click(screen.getByRole("button", { name: "Mark New release read" }));
    await user.click(screen.getByRole("button", { name: "Dismiss Security notice" }));

    expect(hookState.markRead.mutate).toHaveBeenCalledWith(notificationFixtureIds.userAReleaseDelivery);
    expect(hookState.dismiss.mutate).toHaveBeenCalledWith(notificationFixtureIds.userASecurityDelivery);
  });

  it("closes when the user clicks outside the notification panel", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <NotificationCenter />
        <button type="button">Outside target</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside target" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument());
  });

  it("renders loading, empty, and retryable error states compactly", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NotificationCenter />);

    hookState.feed.isLoading = true;
    rerender(<NotificationCenter />);
    await user.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading notifications...");

    hookState.feed.isLoading = false;
    hookState.feed.data = { items: [], nextCursor: null };
    rerender(<NotificationCenter />);
    expect(screen.getByText("No notifications")).toBeInTheDocument();

    hookState.feed.isError = true;
    rerender(<NotificationCenter />);
    expect(screen.getByRole("alert")).toHaveTextContent("Notifications could not load.");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(hookState.feed.refetch).toHaveBeenCalled();
  });
});
