import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingClientBoundary } from "@/components/onboarding/OnboardingClientBoundary";
import { ONBOARDING_FLOW_CATALOG } from "@/lib/onboarding/flow-catalog";
import type {
  OnboardingEligibilitySnapshot,
  OnboardingLaunchMode,
} from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  pathname: "/workshop",
  replace: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockOnboardingTour({
      launchMode,
      onLaunchIntentConsumed,
    }: {
      launchMode: OnboardingLaunchMode;
      onLaunchIntentConsumed: () => void;
    }) {
      return (
        <button
          data-testid="onboarding-tour"
          onClick={onLaunchIntentConsumed}
          type="button"
        >
          {launchMode}
        </button>
      );
    },
}));

function snapshot(): OnboardingEligibilitySnapshot {
  return {
    userId: "user-1",
    workspaceId: "workspace-1",
    workspaceRole: "owner",
    accessSource: "workspace",
    effectiveRole: "owner",
    entryKind: "workspace_creator",
    viewportHint: "unknown",
    resourceContext: {},
    activation: {
      selectedPath: null,
      projectStarted: false,
      estimateStarted: false,
      firstAreaCreated: false,
      firstRowPriced: false,
      firstValidTotalReached: false,
      automaticGuidanceEnabled: true,
      checklistDismissed: false,
    },
    starter: null,
    audience: ["workspace_creator"],
    capabilities: ["view_workshop", "view_projects"],
    dataPredicates: {},
    availableRoutes: ["workshop_home", "projects", "getting_started"],
    availableTargets: [
      "shell.workspace",
      "nav.projects",
      "header.getting_started",
    ],
    flowStates: [],
  };
}

describe("OnboardingClientBoundary", () => {
  beforeEach(() => {
    mocks.pathname = "/workshop";
    mocks.search = "";
    vi.clearAllMocks();
  });

  it("does not prepare automatic guidance behind Settings", () => {
    mocks.pathname = "/workshop/settings";

    render(
      <OnboardingClientBoundary snapshot={snapshot()} mutate={vi.fn()} />,
    );

    expect(screen.queryByTestId("onboarding-tour")).not.toBeInTheDocument();
  });

  it("still prepares automatic guidance on the Workshop dashboard", () => {
    render(
      <OnboardingClientBoundary snapshot={snapshot()} mutate={vi.fn()} />,
    );

    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("auto");
  });

  it("honors an explicit launch intent even on a Settings route", () => {
    const flow = ONBOARDING_FLOW_CATALOG.find(
      (candidate) => candidate.key === "core_orientation",
    );
    if (!flow) throw new Error("Core orientation flow is unavailable.");
    mocks.pathname = "/workshop/settings";
    mocks.search = `tour=${flow.key}&mode=start`;

    render(
      <OnboardingClientBoundary snapshot={snapshot()} mutate={vi.fn()} />,
    );

    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("start");
  });

  it("does not auto-resume a guide again after it exits in the same shell", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.flowStates = [{
      flowKey: "core_orientation",
      flowVersion: 1,
      status: "in_progress",
      currentStepKey: "welcome",
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: null,
      runId: "run-1",
    }];

    const { rerender } = render(
      <OnboardingClientBoundary
        snapshot={currentSnapshot}
        mutate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("resume");
    fireEvent.click(screen.getByTestId("onboarding-tour"));
    expect(screen.queryByTestId("onboarding-tour")).not.toBeInTheDocument();

    mocks.search = "tour=core_orientation&mode=resume";
    rerender(
      <OnboardingClientBoundary
        snapshot={currentSnapshot}
        mutate={vi.fn()}
      />,
    );
    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("resume");
  });
});
