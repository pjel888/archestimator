import { afterEach, describe, expect, it, vi } from "vitest";

import { useEstimateHeaderActionsStore } from "@/components/workshop/use-estimate-header-actions-store";

describe("useEstimateHeaderActionsStore", () => {
  afterEach(() => {
    useEstimateHeaderActionsStore.getState().clear();
  });

  it("starts with safe, empty defaults (off-route gate)", () => {
    const state = useEstimateHeaderActionsStore.getState();
    expect(state.openActivity).toBeNull();
    expect(state.openProposalPreview).toBeNull();
    expect(state.canPreviewExport).toBe(false);
  });

  it("register sets all three values", () => {
    const openActivity = vi.fn();
    const openProposalPreview = vi.fn();

    useEstimateHeaderActionsStore.getState().register({
      openActivity,
      openProposalPreview,
      canPreviewExport: true,
    });

    const state = useEstimateHeaderActionsStore.getState();
    expect(state.openActivity).toBe(openActivity);
    expect(state.openProposalPreview).toBe(openProposalPreview);
    expect(state.canPreviewExport).toBe(true);
  });

  it("clear resets to safe defaults", () => {
    useEstimateHeaderActionsStore.getState().register({
      openActivity: vi.fn(),
      openProposalPreview: vi.fn(),
      canPreviewExport: true,
    });

    useEstimateHeaderActionsStore.getState().clear();

    const state = useEstimateHeaderActionsStore.getState();
    expect(state.openActivity).toBeNull();
    expect(state.openProposalPreview).toBeNull();
    expect(state.canPreviewExport).toBe(false);
  });
});
