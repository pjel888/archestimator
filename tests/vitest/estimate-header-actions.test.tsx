import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EstimateHeaderActions } from "@/components/workshop/EstimateHeaderActions";
import { useEstimateHeaderActionsStore } from "@/components/workshop/use-estimate-header-actions-store";

function register(overrides: Partial<{ openActivity: () => void; openProposalPreview: () => void; canPreviewExport: boolean }> = {}) {
  act(() => {
    useEstimateHeaderActionsStore.getState().register({
      openActivity: overrides.openActivity ?? vi.fn(),
      openProposalPreview: overrides.openProposalPreview ?? vi.fn(),
      canPreviewExport: overrides.canPreviewExport ?? true,
    });
  });
}

describe("EstimateHeaderActions", () => {
  afterEach(() => {
    act(() => {
      useEstimateHeaderActionsStore.getState().clear();
    });
  });

  it("renders nothing when the store is empty (off-route gate)", () => {
    const { container } = render(<EstimateHeaderActions />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Activity" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview Excel Export" })).not.toBeInTheDocument();
  });

  it("renders both triggers with their accessible names once registered", () => {
    register();
    render(<EstimateHeaderActions />);

    const activity = screen.getByRole("button", { name: "Activity" });
    const preview = screen.getByRole("button", { name: "Preview Excel Export" });
    expect(activity).toHaveAttribute("title", "Activity");
    expect(preview).toHaveAttribute("title", "Preview Excel Export");
  });

  it("disables the export trigger when canPreviewExport is false", () => {
    register({ canPreviewExport: false });
    render(<EstimateHeaderActions />);

    expect(screen.getByRole("button", { name: "Preview Excel Export" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Activity" })).toBeEnabled();
  });

  it("invokes the registered handlers when clicked", async () => {
    const user = userEvent.setup();
    const openActivity = vi.fn();
    const openProposalPreview = vi.fn();
    register({ openActivity, openProposalPreview, canPreviewExport: true });
    render(<EstimateHeaderActions />);

    await user.click(screen.getByRole("button", { name: "Activity" }));
    expect(openActivity).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));
    expect(openProposalPreview).toHaveBeenCalledTimes(1);
  });
});
