import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkshopSettingsModalContentView } from "@/components/workshop/WorkshopSettingsModalContentView";

function renderSettings(canManagePlatform = true) {
  return render(
    <WorkshopSettingsModalContentView
      canManagePlatform={canManagePlatform}
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
    expect(within(rail).getByText("Access operations").closest("section")).toHaveClass(
      "border-t",
      "border-hairline",
      "pt-2",
    );

    fireEvent.click(workspaceRow);

    expect(workspaceRow).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("main", { name: "Workspace settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
  });

  it("shows upload operations only to platform admins", () => {
    renderSettings();

    const rail = screen.getByRole("complementary", { name: "Settings navigation" });
    const uploadOperationsRow = within(rail).getByRole("button", { name: "Show Upload operations settings" });
    const scanOverrideRow = within(rail).getByRole("button", { name: "Show Scan overrides settings" });

    fireEvent.click(uploadOperationsRow);

    expect(screen.getByRole("main", { name: "Upload operations settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Upload operations" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open page/i })).toHaveAttribute(
      "href",
      "/workshop/settings/upload-operations",
    );

    fireEvent.click(scanOverrideRow);

    expect(screen.getByRole("main", { name: "Scan overrides settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scan overrides" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open page/i })).toHaveAttribute(
      "href",
      "/workshop/settings/scan-overrides",
    );
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

  it("keeps real sign-out content and hides platform operations from non-admin users", () => {
    renderSettings(false);

    const rail = screen.getByRole("complementary", { name: "Settings navigation" });
    expect(within(rail).queryByText("Access operations")).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Users settings" })).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Upload operations settings" })).not.toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Show Scan overrides settings" })).not.toBeInTheDocument();

    fireEvent.click(within(rail).getByRole("button", { name: "Show Sign out settings" }));

    expect(screen.getByText("Real sign out action")).toBeInTheDocument();
  });
});
