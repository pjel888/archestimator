import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkshopSettingsModalContentView } from "@/components/workshop/WorkshopSettingsModalContentView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderSettings(initialPageId?: string) {
  return render(
    <WorkshopSettingsModalContentView
      initialPageId={initialPageId}
      onboardingSnapshot={null}
      renderSignOutControl={() => <button type="button">Real sign out action</button>}
    />,
  );
}

describe("WorkshopSettingsModalContentView", () => {
  it("opens on Profile with the persistent rail/detail layout", () => {
    renderSettings();

    const rail = screen.getByRole("complementary", { name: "Settings navigation" });
    expect(rail).toHaveClass("overflow-x-hidden", "bg-white");
    expect(within(rail).getByRole("button", { name: "Show Profile settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("main", { name: "Profile settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("opens a valid requested settings page and rejects unknown page ids", () => {
    const guidance = renderSettings("guidance-tours");

    expect(
      screen.getByRole("button", { name: "Show Guidance & tours settings" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("main", { name: "Guidance & tours settings" }),
    ).toBeInTheDocument();
    guidance.unmount();

    renderSettings("unknown-page");
    expect(
      screen.getByRole("button", { name: "Show Profile settings" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps category dividers, pointer rows, and in-panel selection behavior", () => {
    renderSettings();

    const rail = screen.getByRole("complementary", { name: "Settings navigation" });
    const workspaceRow = within(rail).getByRole("button", { name: "Show Workspace settings" });

    expect(workspaceRow).toHaveClass("cursor-pointer", "overflow-hidden");
    expect(workspaceRow.querySelector(".truncate")).not.toBeNull();
    expect(within(rail).getByText("Support and legal").closest("section")).toHaveClass(
      "border-t",
      "border-hairline",
      "pt-2",
    );
    fireEvent.click(workspaceRow);

    expect(workspaceRow).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("main", { name: "Workspace settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
  });

  it("uses email-specific copy for support mail links", () => {
    renderSettings();

    const rail = screen.getByRole("complementary", { name: "Settings navigation" });
    fireEvent.click(within(rail).getByRole("button", { name: "Show Data requests settings" }));

    expect(screen.getByText("Contact support")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open email/i })).toHaveAttribute(
      "href",
      "mailto:support@archestimator.com",
    );
  });

  it("keeps real sign-out content and omits platform operations", () => {
    renderSettings();

    const rail = screen.getByRole("complementary", { name: "Settings navigation" });
    expect(within(rail).queryByText("Access operations")).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Users settings" })).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Feedback triage settings" })).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Upload operations settings" })).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Scan overrides settings" })).not.toBeInTheDocument();

    fireEvent.click(within(rail).getByRole("button", { name: "Show Sign out settings" }));

    expect(screen.getByText("Real sign out action")).toBeInTheDocument();
  });
});
