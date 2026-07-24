import { Children, type ReactElement } from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import GettingStartedPage from "@/app/workshop/getting-started/page";
import { GettingStartedProgress } from "@/components/onboarding/GettingStartedProgress";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  loadSnapshot: vi.fn(),
}));

vi.mock("@/lib/onboarding/flow-actions", () => ({
  loadCurrentOnboardingEligibilitySnapshot: mocks.loadSnapshot,
}));

function snapshot(): OnboardingEligibilitySnapshot {
  return {
    userId: "viewer-1",
    workspaceId: "workspace-1",
    workspaceRole: "owner",
    accessSource: "workspace",
    effectiveRole: "owner",
    entryKind: "workspace_creator",
    viewportHint: "unknown",
    resourceContext: { projectId: "project-1", estimateId: "estimate-1" },
    activation: {
      selectedPath: "blank",
      projectStarted: true,
      estimateStarted: false,
      firstAreaCreated: false,
      firstRowPriced: false,
      firstValidTotalReached: false,
      automaticGuidanceEnabled: false,
      checklistDismissed: false,
    },
    starter: null,
    audience: ["workspace_creator"],
    capabilities: ["view_workshop", "view_projects", "create_projects", "view_estimate", "edit_estimate"],
    dataPredicates: {},
    availableRoutes: ["getting_started", "projects", "estimate_sheet"],
    availableTargets: [],
    flowStates: [],
  };
}

describe("Getting Started route", () => {
  beforeEach(() => {
    mocks.loadSnapshot.mockReset();
  });

  it("loads the authorized snapshot and passes it to GettingStartedProgress", async () => {
    const currentSnapshot = snapshot();
    mocks.loadSnapshot.mockResolvedValueOnce(currentSnapshot);

    const page = await GettingStartedPage();
    const routeChildren = Children.toArray(page.props.children) as ReactElement[];
    const progress = routeChildren[1]?.props.children as ReactElement<{
      snapshot: OnboardingEligibilitySnapshot;
    }>;

    expect(mocks.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(page.props).toMatchObject({
      breadcrumbs: ["Getting Started"],
      eyebrow: "Guidance",
      title: "Getting Started",
    });
    expect(progress.type).toBe(GettingStartedProgress);
    expect(progress.props.snapshot).toBe(currentSnapshot);
  });

  it("preserves visibility preferences without creating onboarding work", async () => {
    const currentSnapshot = snapshot();
    currentSnapshot.activation.automaticGuidanceEnabled = false;
    currentSnapshot.activation.checklistDismissed = true;
    mocks.loadSnapshot.mockResolvedValueOnce(currentSnapshot);

    const page = await GettingStartedPage();
    const routeChildren = Children.toArray(page.props.children) as ReactElement[];
    const progress = routeChildren[1]?.props.children as ReactElement<{
      snapshot: OnboardingEligibilitySnapshot;
    }>;

    expect(progress.props.snapshot.activation).toMatchObject({
      automaticGuidanceEnabled: false,
      checklistDismissed: true,
      projectStarted: true,
      estimateStarted: false,
    });
    expect(mocks.loadSnapshot).toHaveBeenCalledTimes(1);
  });
});
