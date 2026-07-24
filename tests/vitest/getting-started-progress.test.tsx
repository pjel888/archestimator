import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GettingStartedProgress } from "@/components/onboarding/GettingStartedProgress";
import type {
  OnboardingEligibilitySnapshot,
  StarterReadinessState,
} from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  addStarter: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  restoreStarter: vi.fn(),
  resumeStarter: vi.fn(),
  selectPath: vi.fn(),
  startGuidedSample: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/lib/onboarding/activation-actions", () => ({
  addCurrentStarterContent: mocks.addStarter,
  restoreCurrentStarterContent: mocks.restoreStarter,
  resumeCurrentStarterContent: mocks.resumeStarter,
  startGuidedSample: mocks.startGuidedSample,
}));

vi.mock("@/lib/onboarding/first-run-actions", () => ({
  selectCurrentOnboardingPath: mocks.selectPath,
}));

function starter(state: StarterReadinessState) {
  return {
    state,
    packVersion: 1,
    workspaceRevision: state === "not_started" || state === "explicit_add" ? null : 4,
    userRevision: state === "complete" ? 4 : null,
    inactiveAssetKeys: state === "inactive_key_restore" ? ["project.reference"] : [],
  } satisfies NonNullable<OnboardingEligibilitySnapshot["starter"]>;
}

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
    resourceContext: {
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "area-1",
    },
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
    starter: starter("complete"),
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
    dataPredicates: {
      estimate_context_available: true,
      tutorial_binding_current: true,
      tutorial_core_incomplete: true,
      client_link_project_available: true,
      client_link_core_incomplete: true,
    },
    availableRoutes: [
      "workshop_home",
      "getting_started",
      "projects",
      "estimate_sheet",
      "library_templates",
      "client_links",
    ],
    availableTargets: [],
    flowStates: [],
    ...overrides,
  };
}

describe("GettingStartedProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addStarter.mockResolvedValue({});
    mocks.restoreStarter.mockResolvedValue({});
    mocks.resumeStarter.mockResolvedValue({});
    mocks.selectPath.mockResolvedValue(undefined);
    mocks.startGuidedSample.mockResolvedValue({
      projectId: "practice-project",
      estimateId: "practice-estimate",
      areaId: "practice-area",
      tutorialVersion: 2,
      tutorialGeneration: 1,
      resumed: false,
    });
  });

  it("starts guided practice before routing and leaves selection to the D1 batch", async () => {
    const user = userEvent.setup();
    render(<GettingStartedProgress snapshot={snapshot()} />);

    await user.click(screen.getByRole("button", { name: "Start guided practice" }));

    await waitFor(() => expect(mocks.startGuidedSample).toHaveBeenCalledTimes(1));
    expect(mocks.selectPath).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith(
      "/workshop/projects/practice-project/estimates/practice-area?tour=guided_estimate_practice&mode=resume",
    );
  });

  it.each([
    ["Open example", "starter_reference", "/workshop/projects"],
    ["Open practice project", "starter_sandbox", "/workshop/projects"],
    ["Browse templates", "workspace_template", "/workshop/library/templates"],
    ["Start from scratch", "blank", "/workshop/projects?start=blank"],
  ])("selects %s before routing", async (buttonName, path, href) => {
    const user = userEvent.setup();
    render(<GettingStartedProgress snapshot={snapshot()} />);

    await user.click(screen.getByRole("button", { name: buttonName }));

    await waitFor(() => expect(mocks.selectPath).toHaveBeenCalledWith(path));
    expect(mocks.push).toHaveBeenCalledWith(href);
  });

  it("keeps starter-dependent examples unavailable while guided practice remains available", () => {
    render(
      <GettingStartedProgress
        snapshot={snapshot({ starter: starter("explicit_add") })}
      />,
    );

    expect(screen.getByRole("button", { name: "Start guided practice" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Open example" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open practice project" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add starter content" })).toBeEnabled();
  });

  it.each([
    ["not_started", "Add starter content", "addStarter"],
    ["explicit_add", "Add starter content", "addStarter"],
    ["partial", "Resume installation", "resumeStarter"],
    ["installing", "Resume installation", "resumeStarter"],
    ["inactive_key_restore", "Restore starter content", "restoreStarter"],
  ] as const)(
    "runs the %s starter recovery action and refreshes",
    async (state, buttonName, mockKey) => {
      const user = userEvent.setup();
      render(
        <GettingStartedProgress snapshot={snapshot({ starter: starter(state) })} />,
      );

      await user.click(screen.getByRole("button", { name: buttonName }));

      await waitFor(() => expect(mocks[mockKey]).toHaveBeenCalledTimes(1));
      if (state === "inactive_key_restore") {
        expect(mocks.restoreStarter).toHaveBeenCalledWith(4);
      }
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    },
  );

  it("does not expose shared starter mutations to a member", () => {
    render(
      <GettingStartedProgress
        snapshot={snapshot({
          workspaceRole: "member",
          effectiveRole: "member",
          entryKind: "workspace_member",
          starter: starter("explicit_add"),
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Add starter content" })).not.toBeInTheDocument();
    expect(
      screen.getByText(/ask a workspace owner or admin to add or restore shared starter content/i),
    ).toBeInTheDocument();
  });

  it("honors persisted checklist dismissal and points to Guidance settings", () => {
    const current = snapshot();
    render(
      <GettingStartedProgress
        snapshot={snapshot({
          activation: {
            ...current.activation,
            checklistDismissed: true,
          },
        })}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "First estimate checklist" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("First estimate checklist hidden")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Guidance settings" })).toHaveAttribute(
      "href",
      "/workshop/settings?page=guidance-tours",
    );
  });

  it("surfaces guided-practice failure without saving or navigating", async () => {
    mocks.startGuidedSample.mockRejectedValueOnce(new Error("unavailable"));
    const user = userEvent.setup();
    render(<GettingStartedProgress snapshot={snapshot()} />);

    await user.click(screen.getByRole("button", { name: "Start guided practice" }));

    expect(
      await screen.findByText(/this path could not be prepared/i),
    ).toBeInTheDocument();
    expect(mocks.selectPath).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("does not offer a dead guided-practice lesson launch before the practice binding exists", () => {
    render(
      <GettingStartedProgress
        snapshot={snapshot({
          dataPredicates: {
            estimate_context_available: true,
            tutorial_binding_current: false,
            tutorial_core_incomplete: false,
            client_link_project_available: true,
            client_link_core_incomplete: true,
          },
        })}
      />,
    );

    const card = screen.getByText("Guided estimate practice").closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).getByText(/create the guided practice project before opening its lessons/i),
    ).toBeInTheDocument();
    expect(within(card!).queryByRole("link", { name: /start guide/i })).not.toBeInTheDocument();
  });

  it("offers guided-practice lesson launch only after the practice binding is current", () => {
    render(<GettingStartedProgress snapshot={snapshot()} />);

    const card = screen.getByText("Guided estimate practice").closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByRole("link", { name: "Start guide" })).toHaveAttribute(
      "href",
      "/workshop/getting-started?tour=guided_estimate_practice&mode=start",
    );
  });
});
