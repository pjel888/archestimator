import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FirstEstimateChecklist } from "@/components/workshop/FirstEstimateChecklist";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  dismiss: vi.fn(),
  refresh: vi.fn(),
  reopen: vi.fn(),
}));

vi.mock("@/lib/onboarding/activation-actions", () => ({
  dismissActivationChecklist: mocks.dismiss,
  reopenActivationChecklist: mocks.reopen,
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({ refresh: mocks.refresh }),
}));

function snapshot(
  overrides: Partial<OnboardingEligibilitySnapshot> = {},
): OnboardingEligibilitySnapshot {
  return {
    userId: "user-1",
    workspaceId: "workspace-1",
    workspaceRole: "owner",
    accessSource: "workspace",
    effectiveRole: "owner",
    entryKind: "workspace_creator",
    viewportHint: "unknown",
    resourceContext: { projectId: "project-1", estimateId: "estimate-1" },
    activation: {
      selectedPath: "guided_sample",
      projectStarted: true,
      estimateStarted: false,
      firstAreaCreated: false,
      firstRowPriced: false,
      firstValidTotalReached: false,
      automaticGuidanceEnabled: true,
      checklistDismissed: false,
    },
    starter: null,
    audience: ["workspace_creator"],
    capabilities: ["view_workshop", "view_projects", "create_projects", "view_estimate", "edit_estimate"],
    dataPredicates: {},
    availableRoutes: ["getting_started", "projects", "estimate_sheet"],
    availableTargets: [],
    flowStates: [],
    ...overrides,
  };
}

describe("FirstEstimateChecklist", () => {
  beforeEach(() => {
    mocks.dismiss.mockReset();
    mocks.dismiss.mockResolvedValue(undefined);
    mocks.refresh.mockReset();
    mocks.reopen.mockReset();
    mocks.reopen.mockResolvedValue(undefined);
  });

  it("renders the four-task saved-work checklist from its snapshot", () => {
    render(<FirstEstimateChecklist snapshot={snapshot()} />);

    expect(screen.getByRole("button", { name: "Hide checklist" })).toBeInTheDocument();
    expect(screen.getByText("Your first estimate")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText(/progress comes only from saved project and estimate sheet work/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Add an area and priced row")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Continue" })[0]).toHaveAttribute(
      "href",
      "/workshop/projects/project-1/estimates",
    );
  });

  it("collapses completed progress without offering a visibility reopen", () => {
    render(<FirstEstimateChecklist snapshot={snapshot({
      activation: {
        ...snapshot().activation,
        estimateStarted: true,
        firstAreaCreated: true,
        firstRowPriced: true,
        firstValidTotalReached: true,
      },
    })} />);

    expect(screen.getByText("Your first estimate is ready")).toBeInTheDocument();
    expect(screen.getByText("All 4 steps are complete.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("uses persisted hidden state and reopens through the server action", async () => {
    const user = userEvent.setup();
    render(<FirstEstimateChecklist snapshot={snapshot({
      activation: {
        ...snapshot().activation,
        checklistDismissed: true,
      },
    })} />);

    expect(screen.getByText("Getting started is hidden")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reopen" }));

    expect(mocks.reopen).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes only after the dismiss action resolves", async () => {
    let resolveDismiss: (() => void) | undefined;
    mocks.dismiss.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveDismiss = resolve;
    }));
    const user = userEvent.setup();
    render(<FirstEstimateChecklist snapshot={snapshot()} />);

    await user.click(screen.getByRole("button", { name: "Hide checklist" }));
    expect(mocks.dismiss).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).not.toHaveBeenCalled();

    resolveDismiss?.();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("does not render for a snapshot without creator editing access", () => {
    const { container } = render(<FirstEstimateChecklist snapshot={snapshot({
      capabilities: ["view_workshop", "view_projects", "view_estimate"],
    })} />);

    expect(container).toBeEmptyDOMElement();
  });
});
