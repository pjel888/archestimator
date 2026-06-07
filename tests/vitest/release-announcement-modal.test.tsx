import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReleaseAnnouncementModal } from "@/features/notifications/components/ReleaseAnnouncementModal";
import { releaseAnnouncementView } from "../fixtures/notifications";

const hookMocks = vi.hoisted(() => ({
  acknowledgeMutate: vi.fn(),
}));

vi.mock("@/features/notifications/hooks/useNotificationsQuery", () => ({
  useAcknowledgeReleaseAnnouncementMutation: () => ({
    mutate: hookMocks.acknowledgeMutate,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReleaseAnnouncementModal", () => {
  it("renders an accessible release dialog and wraps long body text", () => {
    render(<ReleaseAnnouncementModal announcement={releaseAnnouncementView} />);

    expect(screen.getByRole("dialog", { name: "New release" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close release announcement" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByText(releaseAnnouncementView.body)).toHaveClass("break-words");
    expect(screen.getByText(releaseAnnouncementView.releaseVersion ?? "")).toHaveTextContent("0.1.0-notification-test");
  });

  it("acknowledges once on close and returns focus", async () => {
    const user = userEvent.setup();
    function Harness() {
      const triggerRef = useRef<HTMLButtonElement | null>(null);
      return (
        <div>
          <button ref={triggerRef} type="button">Before modal</button>
          <ReleaseAnnouncementModal announcement={releaseAnnouncementView} returnFocusRef={triggerRef} />
        </div>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Before modal" });
    trigger.focus();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(hookMocks.acknowledgeMutate).toHaveBeenCalledTimes(1));
    expect(hookMocks.acknowledgeMutate).toHaveBeenCalledWith(releaseAnnouncementView.id);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "New release" })).not.toBeInTheDocument();
  });

  it("renders only allowed internal action links", () => {
    const { rerender } = render(<ReleaseAnnouncementModal announcement={releaseAnnouncementView} />);

    expect(screen.getByRole("link", { name: "View workshop" })).toHaveAttribute("href", "/workshop");

    rerender(
      <ReleaseAnnouncementModal
        announcement={{
          ...releaseAnnouncementView,
          actionHref: "https://example.com",
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: "View workshop" })).not.toBeInTheDocument();
  });

  it("does not render when there is no eligible announcement", () => {
    render(<ReleaseAnnouncementModal announcement={null} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
