import type { ReactElement } from "react";

import { describe, expect, it, vi } from "vitest";

import { FirstEstimateChecklist } from "@/components/workshop/FirstEstimateChecklist";
import GettingStartedPage from "@/app/workshop/getting-started/page";
import { deriveFirstEstimateChecklist } from "@/lib/onboarding/first-estimate-checklist";
import type { ActivationProgress } from "@/lib/onboarding/activation-repository";

const mocks = vi.hoisted(() => ({
  getCurrentActivationProgress: vi.fn(),
}));

vi.mock("@/lib/onboarding/activation-actions", () => ({
  getCurrentActivationProgress: mocks.getCurrentActivationProgress,
}));

function progress(overrides: Partial<ActivationProgress> = {}): ActivationProgress {
  return {
    userId: "viewer-1",
    workspaceId: "workspace-1",
    selectedPath: "blank",
    projectId: "project-1",
    estimateId: "estimate-1",
    lastMilestone: "project_created",
    firstValueCompletedAt: null,
    checklistDismissedAt: "2026-07-12T01:00:00.000Z",
    checklistReopenedAt: "2026-07-12T02:00:00.000Z",
    supportState: "none",
    lastEventAt: "2026-07-12T00:00:00.000Z",
    version: 1,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T02:00:00.000Z",
    ...overrides,
  };
}

describe("Getting Started route", () => {
  it("renders the authorized viewer's persisted progress without starting a project", async () => {
    const viewerProgress = progress();
    mocks.getCurrentActivationProgress.mockResolvedValueOnce(viewerProgress);

    const page = await GettingStartedPage();
    const checklist = page.props.children as ReactElement<{ progress: ActivationProgress | null }>;

    expect(mocks.getCurrentActivationProgress).toHaveBeenCalledTimes(1);
    expect(page.props).toMatchObject({
      breadcrumbs: ["Getting Started"],
      eyebrow: "Workspace",
      title: "Getting Started",
    });
    expect(checklist.type).toBe(FirstEstimateChecklist);
    expect(checklist.props.progress).toEqual(viewerProgress);
  });

  it("preserves a later reopen timestamp so the checklist is visible again", async () => {
    const reopenedProgress = progress();
    mocks.getCurrentActivationProgress.mockResolvedValueOnce(reopenedProgress);

    const page = await GettingStartedPage();
    const checklist = page.props.children as ReactElement<{ progress: ActivationProgress | null }>;

    expect(checklist.props.progress?.checklistReopenedAt).toBe("2026-07-12T02:00:00.000Z");
    expect(deriveFirstEstimateChecklist(checklist.props.progress).isDismissed).toBe(false);
  });
});
