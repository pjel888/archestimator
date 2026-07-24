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

  it("clears an explicit launch intent that is not eligible in the current snapshot", () => {
    mocks.search = "tour=guided_estimate_practice&mode=start&keep=1";

    render(
      <OnboardingClientBoundary snapshot={snapshot()} mutate={vi.fn()} />,
    );

    expect(screen.queryByTestId("onboarding-tour")).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/workshop?keep=1");
  });

  it.each([
    "tour=not-a-real-guide&mode=start&keep=1",
    "tour=core_orientation&mode=not-a-real-mode&keep=1",
    "tour=core_orientation&keep=1",
  ])(
    "clears malformed launch params without starting unrelated automatic guidance: %s",
    (search) => {
      mocks.search = search;

      render(
        <OnboardingClientBoundary snapshot={snapshot()} mutate={vi.fn()} />,
      );

      expect(screen.queryByTestId("onboarding-tour")).not.toBeInTheDocument();
      expect(mocks.replace).toHaveBeenCalledWith("/workshop?keep=1");
    },
  );

  it("preserves route-owned mode params when no onboarding tour is requested", () => {
    mocks.search = "sheet=estimate-1&mode=supplier";

    render(
      <OnboardingClientBoundary snapshot={snapshot()} mutate={vi.fn()} />,
    );

    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("auto");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it.each(["/workshop", "/workshop/projects"])(
    "does not auto-resume an in-progress guide on %s without an explicit launch",
    (pathname) => {
      const currentSnapshot = snapshot();
      currentSnapshot.flowStates = [{
        flowKey: "core_orientation",
        flowVersion: 1,
        status: "in_progress",
        currentStepKey: "projects_entry",
        generation: 1,
        revision: 2,
        resetCount: 0,
        tutorialBinding: null,
        runId: "run-1",
      }];
      mocks.pathname = pathname;

      render(
        <OnboardingClientBoundary
          snapshot={currentSnapshot}
          mutate={vi.fn()}
        />,
      );

      expect(screen.queryByTestId("onboarding-tour")).not.toBeInTheDocument();
    },
  );

  it("does not auto-resume guided estimate practice on Projects", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.capabilities = [
      ...currentSnapshot.capabilities,
      "view_estimate",
      "edit_estimate",
    ];
    currentSnapshot.availableRoutes = [
      ...currentSnapshot.availableRoutes,
      "estimate_sheet",
    ];
    currentSnapshot.availableTargets = [
      ...currentSnapshot.availableTargets,
      "estimate.library",
    ];
    currentSnapshot.dataPredicates = {
      tutorial_binding_current: true,
      tutorial_core_incomplete: true,
    };
    currentSnapshot.flowStates = [
      {
        flowKey: "core_orientation",
        flowVersion: 1,
        status: "completed",
        currentStepKey: null,
        generation: 1,
        revision: 5,
        resetCount: 0,
        tutorialBinding: null,
        runId: "run-core",
      },
      {
        flowKey: "guided_estimate_practice",
        flowVersion: 1,
        status: "in_progress",
        currentStepKey: "practice_add_and_source",
        generation: 1,
        revision: 4,
        resetCount: 0,
        tutorialBinding: { version: 2, generation: 1 },
        runId: "run-practice",
      },
    ];
    mocks.pathname = "/workshop/projects";

    render(
      <OnboardingClientBoundary
        snapshot={currentSnapshot}
        mutate={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("onboarding-tour")).not.toBeInTheDocument();
  });

  it("resumes an in-progress guide only from an explicit launch intent", () => {
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
    mocks.pathname = "/workshop/projects";
    mocks.search = "tour=core_orientation&mode=resume";

    render(
      <OnboardingClientBoundary
        snapshot={currentSnapshot}
        mutate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("resume");
  });

  it("does not auto-launch a guide again after it exits in the same shell", () => {
    const currentSnapshot = snapshot();

    const { rerender } = render(
      <OnboardingClientBoundary
        snapshot={currentSnapshot}
        mutate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("onboarding-tour")).toHaveTextContent("auto");
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
