import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Controls, EventData, Step } from "react-joyride";

import { OnboardingTourClient } from "@/components/onboarding/OnboardingTourClient";
import { ONBOARDING_FLOW_CATALOG } from "@/lib/onboarding/flow-catalog";
import type { OnboardingMutationResult } from "@/lib/onboarding/flow-repository";
import type {
  EligibleOnboardingFlow,
  OnboardingEligibilitySnapshot,
} from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  onEvent: null as ((
    event: EventData,
    controls?: Controls,
  ) => void) | null,
  modalListener: null as ((event: {
    activeModalCount: number;
    type: "opening" | "closed_focus_restored";
  }) => void) | null,
  initialStepIndex: null as number | null,
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prepareRoute: vi.fn(),
  start: vi.fn(),
  steps: [] as Step[],
  stop: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
}));

vi.mock("react-joyride", () => ({
  useJoyride: (options: {
    initialStepIndex: number;
    onEvent: (event: EventData, controls: Controls) => void;
    steps: Step[];
  }) => {
    mocks.initialStepIndex = options.initialStepIndex;
    mocks.steps = options.steps;
    const controls = {
      next: vi.fn(),
      replay: vi.fn(),
      start: mocks.start,
      stop: mocks.stop,
    } as unknown as Controls;
    mocks.onEvent = (event, eventControls = controls) => {
      options.onEvent(event, eventControls);
    };
    return {
      controls,
      state: {
        index: 0,
        status: "running",
      },
      Tour: null,
    };
  },
}));

vi.mock("@/components/onboarding/onboarding-route-coordinator", () => ({
  prepareOnboardingRoute: mocks.prepareRoute,
}));

vi.mock("@/components/ui/overlays/modal-lifecycle", () => ({
  hasActiveApplicationModal: () => false,
  subscribeToModalLifecycle: (
    listener: (event: {
      activeModalCount: number;
      type: "opening" | "closed_focus_restored";
    }) => void,
  ) => {
    mocks.modalListener = listener;
    return () => undefined;
  },
}));

vi.mock("@/components/onboarding/OnboardingPortal", () => ({
  OnboardingPortal: ({
    portalRef,
  }: {
    portalRef: (element: HTMLDivElement | null) => void;
  }) => <div ref={portalRef} />,
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
    capabilities: ["view_workshop"],
    dataPredicates: {},
    availableRoutes: ["workshop_home"],
    availableTargets: [],
    flowStates: [],
  };
}

function flow(): EligibleOnboardingFlow {
  const definition = ONBOARDING_FLOW_CATALOG.find(
    (candidate) => candidate.key === "core_orientation",
  );
  if (!definition) throw new Error("Core orientation flow is unavailable.");
  return {
    definition,
    steps: definition.steps,
    state: null,
  };
}

function startEvent(stepId: string): EventData {
  return {
    action: "start",
    index: 0,
    lifecycle: "ready",
    origin: null,
    size: 1,
    status: "running",
    step: { id: stepId },
    type: "tour:start",
  } as EventData;
}

function finishedEvent(stepId: string, index: number): EventData {
  return {
    action: "next",
    index,
    lifecycle: "complete",
    origin: null,
    size: index + 1,
    status: "finished",
    step: { id: stepId },
    type: "tour:end",
  } as EventData;
}

function closeEvent(stepId: string): EventData {
  return {
    action: "close",
    index: 0,
    lifecycle: "complete",
    origin: "button_close",
    size: 1,
    status: "running",
    step: { id: stepId },
    type: "step:after",
  } as EventData;
}

function nextEvent(stepId: string, index = 0): EventData {
  return {
    action: "next",
    index,
    lifecycle: "complete",
    origin: null,
    size: index + 2,
    status: "running",
    step: { id: stepId },
    type: "step:after",
  } as EventData;
}

function genericErrorEvent(stepId: string, index = 0): EventData {
  return {
    action: "error",
    index,
    lifecycle: "error",
    origin: null,
    size: index + 1,
    status: "error",
    step: { id: stepId },
    type: "error",
  } as EventData;
}

describe("OnboardingTourClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prepareRoute.mockResolvedValue({
      href: "/workshop",
      ok: true,
    });
    mocks.initialStepIndex = null;
    mocks.onEvent = null;
    mocks.modalListener = null;
    mocks.steps = [];
  });

  it("opens a restarted guide at step one instead of the stale saved step", () => {
    const eligibleFlow = flow();
    const savedStep = eligibleFlow.steps[2];
    if (!savedStep) throw new Error("Core orientation needs a third step.");
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "in_progress",
      currentStepKey: savedStep.key,
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: null,
    };

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="restart"
        snapshot={snapshot()}
        mutate={vi.fn()}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    expect(mocks.initialStepIndex).toBe(0);
  });

  it.each(["restart", "replay"] as const)(
    "starts a completed guide in %s mode",
    async (launchMode) => {
      const eligibleFlow = flow();
      eligibleFlow.state = {
        flowKey: eligibleFlow.definition.key,
        flowVersion: eligibleFlow.definition.version,
        status: "completed",
        currentStepKey: null,
        generation: 1,
        revision: 4,
        resetCount: 0,
        tutorialBinding: null,
      };

      render(
        <OnboardingTourClient
          flow={eligibleFlow}
          launchMode={launchMode}
          snapshot={snapshot()}
          mutate={vi.fn()}
          reducedMotion={false}
          onLaunchIntentConsumed={vi.fn()}
        />,
      );

      await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(0));
    },
  );

  it("keeps an explicit launch active until the tour finishes", async () => {
    const eligibleFlow = flow();
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "completed",
      currentStepKey: null,
      generation: 1,
      revision: 4,
      resetCount: 0,
      tutorialBinding: null,
    };
    const onLaunchIntentConsumed = vi.fn();

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="replay"
        snapshot={snapshot()}
        mutate={vi.fn()}
        reducedMotion={false}
        onLaunchIntentConsumed={onLaunchIntentConsumed}
      />,
    );

    await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(0));
    expect(onLaunchIntentConsumed).not.toHaveBeenCalled();

    const lastIndex = eligibleFlow.steps.length - 1;
    await act(async () => {
      mocks.onEvent?.(
        finishedEvent(eligibleFlow.steps[lastIndex]?.key ?? "", lastIndex),
      );
      await Promise.resolve();
    });

    expect(onLaunchIntentConsumed).toHaveBeenCalledTimes(1);
  });

  it("persists only one launch when Joyride emits tour:start twice", async () => {
    const eligibleFlow = flow();
    const mutate = vi.fn().mockResolvedValue({
      status: "applied",
      state: {
        flowKey: eligibleFlow.definition.key,
        flowVersion: eligibleFlow.definition.version,
        status: "in_progress",
        currentStepKey: eligibleFlow.steps[0]?.key ?? null,
        generation: 1,
        revision: 0,
        resetCount: 0,
        tutorialBinding: null,
      },
      runId: "run-1",
    });

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="auto"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    const event = startEvent(eligibleFlow.steps[0]?.key ?? "");
    await act(async () => {
      mocks.onEvent?.(event);
      mocks.onEvent?.(event);
      await Promise.resolve();
    });

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      command: "start",
      expectedRevision: null,
      launchMode: "auto",
    }));
  });

  it("silently refreshes an initial conflict instead of blaming another session", async () => {
    const eligibleFlow = flow();
    const mutate = vi.fn().mockResolvedValue({
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: {
        flowKey: eligibleFlow.definition.key,
        flowVersion: eligibleFlow.definition.version,
        status: "completed",
        currentStepKey: null,
        generation: 1,
        revision: 4,
        resetCount: 0,
        tutorialBinding: null,
      },
    });

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="auto"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    const event = startEvent(eligibleFlow.steps[0]?.key ?? "");
    await act(async () => {
      mocks.onEvent?.(event);
      await Promise.resolve();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Guidance progress changed. Retry to continue from the latest saved step."),
    ).not.toBeInTheDocument();
  });

  it("reloads the latest saved run when a mid-guide mutation conflicts", async () => {
    const eligibleFlow = flow();
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "in_progress",
      currentStepKey: eligibleFlow.steps[0]?.key ?? null,
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: null,
      runId: "run-1",
    };
    const mutate = vi.fn().mockResolvedValue({
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: {
        ...eligibleFlow.state,
        revision: 3,
      },
    });

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="resume"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    await act(async () => {
      mocks.onEvent?.(nextEvent(eligibleFlow.steps[0]?.key ?? ""));
      await Promise.resolve();
    });
    await screen.findByText(
      "Guidance progress changed. Retry to continue from the latest saved step.",
    );

    await act(async () => {
      screen.getByRole("button", { name: "Try again" }).click();
      await Promise.resolve();
    });

    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining(
        "tour=core_orientation&mode=resume",
      ),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("persists one precise pause when route preparation already handled the failure", async () => {
    const eligibleFlow = flow();
    const mutate = vi.fn().mockResolvedValue({
      status: "applied",
      state: {
        flowKey: eligibleFlow.definition.key,
        flowVersion: eligibleFlow.definition.version,
        status: "in_progress",
        currentStepKey: eligibleFlow.steps[0]?.key ?? null,
        generation: 1,
        revision: 1,
        resetCount: 0,
        tutorialBinding: null,
      },
      runId: "run-1",
    });
    mocks.prepareRoute.mockResolvedValueOnce({
      ok: false,
      reason: "target_timeout",
    });

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="resume"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    const routedStep = mocks.steps.find((step) => step.before);
    const routedStepKey =
      typeof routedStep?.id === "string" ? routedStep.id : "";
    await act(async () => {
      await expect(routedStep?.before?.()).rejects.toThrow("target_timeout");
    });
    await act(async () => {
      mocks.onEvent?.(
        genericErrorEvent(routedStepKey),
      );
      await Promise.resolve();
    });

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      command: "pause",
      reasonCode: "target_timeout",
    }));
    expect(
      screen.getByText("The next control is not available in the current view."),
    ).toBeInTheDocument();
  });

  it("refreshes the server snapshot after a guide completes", async () => {
    const eligibleFlow = flow();
    const lastIndex = eligibleFlow.steps.length - 1;
    const lastStepKey = eligibleFlow.steps[lastIndex]?.key ?? null;
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "in_progress",
      currentStepKey: lastStepKey,
      generation: 1,
      revision: 4,
      resetCount: 0,
      tutorialBinding: null,
      runId: "run-1",
    };
    const mutate = vi.fn().mockResolvedValue({
      status: "applied",
      state: {
        ...eligibleFlow.state,
        status: "completed",
        currentStepKey: null,
        revision: 5,
      },
      runId: "run-1",
    });

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="resume"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    await act(async () => {
      mocks.onEvent?.(finishedEvent(lastStepKey ?? "", lastIndex));
      await Promise.resolve();
    });

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ command: "complete", expectedRevision: 4 }),
    ));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("waits for pause persistence before consuming an exited launch", async () => {
    const eligibleFlow = flow();
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "in_progress",
      currentStepKey: eligibleFlow.steps[0]?.key ?? null,
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: null,
      runId: "run-1",
    };
    let resolveMutation:
      | ((result: OnboardingMutationResult) => void)
      | null = null;
    const mutate = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );
    const onLaunchIntentConsumed = vi.fn();

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="resume"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={onLaunchIntentConsumed}
      />,
    );

    await act(async () => {
      mocks.onEvent?.(
        closeEvent(eligibleFlow.steps[0]?.key ?? ""),
        {
          next: vi.fn(),
          replay: vi.fn(),
          start: mocks.start,
          stop: mocks.stop,
        } as unknown as Controls,
      );
      await Promise.resolve();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(onLaunchIntentConsumed).not.toHaveBeenCalled();

    await act(async () => {
      resolveMutation?.({
        status: "applied",
        state: {
          ...eligibleFlow.state!,
          revision: 3,
        },
        runId: "run-1",
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(onLaunchIntentConsumed).toHaveBeenCalledTimes(1));
  });

  it("still persists a resume after an application modal pauses the tour", async () => {
    const eligibleFlow = flow();
    let revision = -1;
    const mutate = vi.fn().mockImplementation(
      async (command: { command: string }) => {
        revision += 1;
        return {
          status: "applied",
          state: {
            flowKey: eligibleFlow.definition.key,
            flowVersion: eligibleFlow.definition.version,
            status: "in_progress",
            currentStepKey: eligibleFlow.steps[0]?.key ?? null,
            generation: 1,
            revision,
            resetCount: 0,
            tutorialBinding: null,
          },
          runId: "run-1",
          command,
        };
      },
    );

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="auto"
        snapshot={snapshot()}
        mutate={mutate}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    const event = startEvent(eligibleFlow.steps[0]?.key ?? "");
    await act(async () => {
      mocks.onEvent?.(event);
      await Promise.resolve();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    await act(async () => {
      mocks.modalListener?.({ activeModalCount: 1, type: "opening" });
      await Promise.resolve();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));

    await act(async () => {
      mocks.modalListener?.({
        activeModalCount: 0,
        type: "closed_focus_restored",
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(mocks.start).toHaveBeenCalled());

    await act(async () => {
      mocks.onEvent?.(event);
      await Promise.resolve();
    });

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(3));
    expect(mutate.mock.calls.map(([command]) => command.command)).toEqual([
      "start",
      "pause",
      "resume",
    ]);
  });
});
