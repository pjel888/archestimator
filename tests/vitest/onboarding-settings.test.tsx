import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GuidanceToursSettings } from "@/components/workshop/settings/GuidanceToursSettings";
import { ONBOARDING_FLOW_CATALOG } from "@/lib/onboarding/flow-catalog";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  closeBeforeNavigate: vi.fn(),
  getEligibleFlows: vi.fn(),
  refresh: vi.fn(),
  reopenChecklist: vi.fn(),
  resetGuidance: vi.fn(),
  setAutomaticGuidance: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/components/workshop/WorkshopSettingsModal", () => ({
  useWorkshopSettingsModal: () => ({
    closeBeforeNavigate: mocks.closeBeforeNavigate,
  }),
}));

vi.mock("@/lib/onboarding/activation-actions", () => ({
  reopenActivationChecklist: mocks.reopenChecklist,
  setAutomaticGuidanceEnabled: mocks.setAutomaticGuidance,
}));

vi.mock("@/lib/onboarding/flow-actions", () => ({
  resetCurrentGuidance: mocks.resetGuidance,
}));

vi.mock("@/lib/onboarding/flow-eligibility", () => ({
  getEligibleOnboardingFlows: mocks.getEligibleFlows,
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
    resourceContext: {
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "node-1",
    },
    activation: {
      selectedPath: "guided_sample",
      projectStarted: true,
      estimateStarted: true,
      firstAreaCreated: true,
      firstRowPriced: true,
      firstValidTotalReached: true,
      automaticGuidanceEnabled: false,
      checklistDismissed: true,
    },
    starter: null,
    audience: ["workspace_creator"],
    capabilities: [
      "view_workshop",
      "view_projects",
      "create_projects",
      "view_estimate",
      "edit_estimate",
      "manage_components",
      "manage_templates",
      "manage_client_links",
    ],
    dataPredicates: {},
    availableRoutes: [
      "workshop_home",
      "getting_started",
      "projects",
      "estimate_sheet",
      "library_components",
      "client_links",
    ],
    availableTargets: [],
    flowStates: [
      {
        flowKey: "core_orientation",
        flowVersion: 1,
        status: "completed",
        currentStepKey: null,
        generation: 1,
        revision: 4,
        resetCount: 0,
        tutorialBinding: null,
      },
      {
        flowKey: "library_reuse",
        flowVersion: 1,
        status: "in_progress",
        currentStepKey: "library_sources",
        generation: 1,
        revision: 2,
        resetCount: 0,
        tutorialBinding: null,
      },
    ],
  };
}

describe("GuidanceToursSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEligibleFlows.mockImplementation(
      (currentSnapshot: OnboardingEligibilitySnapshot) =>
        ONBOARDING_FLOW_CATALOG.map((definition) => ({
          definition,
          steps: definition.steps,
          state:
            currentSnapshot.flowStates.find(
              (state) =>
                state.flowKey === definition.key
                && state.flowVersion === definition.version,
            ) ?? null,
        })),
    );
    mocks.reopenChecklist.mockResolvedValue(undefined);
    mocks.resetGuidance.mockResolvedValue({ status: "applied", states: [] });
    mocks.setAutomaticGuidance.mockResolvedValue(undefined);
  });

  it("keeps explicit guide launches available while automatic guidance is off", async () => {
    const user = userEvent.setup();
    render(<GuidanceToursSettings snapshot={snapshot()} />);

    expect(
      screen.getByRole("switch", { name: "Show automatic guidance" }),
    ).toHaveAttribute("aria-checked", "false");

    await user.click(screen.getByRole("button", { name: "View again" }));

    expect(mocks.closeBeforeNavigate).toHaveBeenCalledWith(
      "/workshop?tour=core_orientation&mode=replay",
    );
    expect(mocks.setAutomaticGuidance).not.toHaveBeenCalled();
  });

  it("reactivates automatic guidance without resetting progress", async () => {
    const user = userEvent.setup();
    render(<GuidanceToursSettings snapshot={snapshot()} />);

    await user.click(
      screen.getByRole("switch", { name: "Show automatic guidance" }),
    );

    await waitFor(() =>
      expect(mocks.setAutomaticGuidance).toHaveBeenCalledWith(true),
    );
    expect(
      screen.getByRole("switch", { name: "Show automatic guidance" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText(/automatic guidance is on/i),
    ).toBeInTheDocument();
    expect(mocks.resetGuidance).not.toHaveBeenCalled();
  });

  it("restarts all guides with revision guards and preserves product work", async () => {
    const user = userEvent.setup();
    render(<GuidanceToursSettings snapshot={snapshot()} />);

    await user.click(
      screen.getByRole("button", { name: "Restart all guides" }),
    );
    expect(
      screen.getByText(/restart every guide from the beginning/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Restart all guides" }),
    );

    await waitFor(() =>
      expect(mocks.resetGuidance).toHaveBeenCalledWith({
        mutationId: expect.any(String),
        expectedRevisions: {
          core_orientation: 4,
          library_reuse: 2,
        },
      }),
    );
    expect(
      screen.getByText(
        /projects, estimates, client links, starter examples, and checklist progress were not changed/i,
      ),
    ).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("reopens the checklist without mutating guide state", async () => {
    const user = userEvent.setup();
    render(<GuidanceToursSettings snapshot={snapshot()} />);

    await user.click(
      screen.getByRole("button", { name: "Reopen checklist" }),
    );

    await waitFor(() =>
      expect(mocks.reopenChecklist).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText(/completed tasks remain complete/i),
    ).toBeInTheDocument();
    expect(mocks.resetGuidance).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite newer guide progress after a reset conflict", async () => {
    mocks.resetGuidance.mockResolvedValueOnce({
      status: "conflict",
      states: [
        { ...snapshot().flowStates[0], revision: 5 },
        { ...snapshot().flowStates[1], revision: 7 },
      ],
    });
    const user = userEvent.setup();
    render(<GuidanceToursSettings snapshot={snapshot()} />);

    await user.click(
      screen.getByRole("button", { name: "Restart all guides" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Restart all guides" }),
    );

    await waitFor(() => expect(mocks.resetGuidance).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(/latest progress is loading; review it, then choose restart all guides again/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/another session/i)).not.toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps current settings unchanged when an action fails", async () => {
    mocks.setAutomaticGuidance.mockRejectedValueOnce(new Error("unavailable"));
    const user = userEvent.setup();
    render(<GuidanceToursSettings snapshot={snapshot()} />);

    await user.click(
      screen.getByRole("switch", { name: "Show automatic guidance" }),
    );

    expect(
      await screen.findByText(/automatic guidance could not be updated/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Show automatic guidance" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("renders a safe unavailable state when the snapshot cannot load", () => {
    render(<GuidanceToursSettings snapshot={null} />);

    expect(
      screen.getByText("Guidance status is temporarily unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no progress was changed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Show automatic guidance" }),
    ).toBeDisabled();
    expect(mocks.getEligibleFlows).not.toHaveBeenCalled();
  });

  it("explains flows unavailable under the current access", () => {
    mocks.getEligibleFlows.mockImplementationOnce(
      (currentSnapshot: OnboardingEligibilitySnapshot) => [{
        definition: ONBOARDING_FLOW_CATALOG[0],
        steps: ONBOARDING_FLOW_CATALOG[0].steps,
        state: currentSnapshot.flowStates[0] ?? null,
      }],
    );
    const restricted = snapshot();
    restricted.capabilities = restricted.capabilities.filter(
      (capability) => capability !== "manage_client_links",
    );
    render(<GuidanceToursSettings snapshot={restricted} />);

    const card = screen.getByText("Client links").closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("Unavailable")).toBeInTheDocument();
    expect(
      within(card!).getByText(/not available with your current access/i),
    ).toBeInTheDocument();
    expect(
      within(card!).queryByRole("button", { name: /guide/i }),
    ).not.toBeInTheDocument();
  });
});
