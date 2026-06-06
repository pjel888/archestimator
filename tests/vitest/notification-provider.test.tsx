import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationProvider, shouldEnableNotifications } from "@/features/notifications/components/NotificationProvider";
import { releaseAnnouncementView } from "../fixtures/notifications";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/workshop",
}));

const hookMocks = vi.hoisted(() => ({
  acknowledgeMutate: vi.fn(),
  useReleaseAnnouncementQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
}));

vi.mock("@/features/notifications/hooks/useNotificationsQuery", () => ({
  useAcknowledgeReleaseAnnouncementMutation: () => ({
    mutate: hookMocks.acknowledgeMutate,
  }),
  useReleaseAnnouncementQuery: () => hookMocks.useReleaseAnnouncementQuery(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigationMocks.pathname = "/workshop";
  hookMocks.useReleaseAnnouncementQuery.mockReturnValue({ data: releaseAnnouncementView });
});

describe("NotificationProvider", () => {
  it("keeps public and signed-out style routes free of notification UI", () => {
    navigationMocks.pathname = "/share/public-token";

    render(
      <NotificationProvider>
        <main>Public share</main>
      </NotificationProvider>,
    );

    expect(screen.getByText("Public share")).toBeInTheDocument();
    expect(hookMocks.useReleaseAnnouncementQuery).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders children and an eligible release modal on workshop routes", () => {
    render(
      <NotificationProvider>
        <main>Workshop app</main>
      </NotificationProvider>,
    );

    expect(screen.getByText("Workshop app")).toBeInTheDocument();
    expect(hookMocks.useReleaseAnnouncementQuery).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "New release" })).toBeInTheDocument();
  });

  it("keeps route gating explicit", () => {
    expect(shouldEnableNotifications("/workshop")).toBe(true);
    expect(shouldEnableNotifications("/workshop/projects")).toBe(true);
    expect(shouldEnableNotifications("/share/token")).toBe(false);
    expect(shouldEnableNotifications("/login")).toBe(false);
    expect(shouldEnableNotifications(null)).toBe(false);
  });
});
