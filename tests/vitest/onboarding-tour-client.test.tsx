import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Controls, EventData, Step } from "react-joyride";

import { OnboardingTourClient } from "@/components/onboarding/OnboardingTourClient";
import { ONBOARDING_FLOW_CATALOG } from "@/lib/onboarding/flow-catalog";
import type { OnboardingMutationResult } from "@/lib/onboarding/flow-repository";
import type {
  EligibleOnboardingFlow,
  OnboardingEligibilitySnapshot,
} from "@/lib/onboarding/flow-types";
import {
  ONBOARDING_TARGET_HANDOFF_EVENT,
} from "@/components/onboarding/onboarding-runtime-events";

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

function firstValueFlow(): EligibleOnboardingFlow {
  const definition = ONBOARDING_FLOW_CATALOG.find(
    (candidate) => candidate.key === "first_estimate_value",
  );
  if (!definition) throw new Error("First-value flow is unavailable.");
  const currentStep = definition.steps.find((step) => step.key === "add_priced_row");
  if (!currentStep) throw new Error("First-value add-row step is unavailable.");
  return {
    definition,
    steps: definition.steps,
    state: {
      flowKey: definition.key,
      flowVersion: definition.version,
      status: "in_progress",
      currentStepKey: currentStep.key,
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: null,
      runId: "run-1",
    },
  };
}

function guidedPracticeFlow(): EligibleOnboardingFlow {
  const definition = ONBOARDING_FLOW_CATALOG.find(
    (candidate) => candidate.key === "guided_estimate_practice",
  );
  if (!definition) throw new Error("Guided-practice flow is unavailable.");
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

function targetNotFoundEvent(stepId: string, index = 0): EventData {
  return {
    action: "update",
    index,
    lifecycle: "ready",
    origin: null,
    size: index + 1,
    status: "running",
    step: { id: stepId },
    type: "error:target_not_found",
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

  it("carries automatic tour intent across route navigation", async () => {
    const eligibleFlow = flow();
    mocks.prepareRoute.mockImplementationOnce(async (input: {
      navigate: (href: string) => void;
    }) => {
      input.navigate("/workshop/projects");
      return { href: "/workshop/projects", ok: true };
    });

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="auto"
        snapshot={snapshot()}
        mutate={vi.fn()}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    const routedStep = mocks.steps.find((step) => step.before);
    await act(async () => {
      await routedStep?.before?.();
    });

    expect(mocks.push).toHaveBeenCalledWith(
      "/workshop/projects?tour=core_orientation&mode=resume",
    );
  });

  it("hands focus to the real target and returns without completing the step", async () => {
    const eligibleFlow = firstValueFlow();
    const stepIndex = eligibleFlow.steps.findIndex((step) => step.key === "add_priced_row");
    const target = document.createElement("button");
    target.dataset.onboardingTarget = "estimate.add_row";
    Object.defineProperty(target, "getClientRects", {
      value: () => [{ width: 120, height: 32 }],
    });
    document.body.append(target);

    render(
      <OnboardingTourClient
        flow={eligibleFlow}
        launchMode="resume"
        snapshot={snapshot()}
        mutate={vi.fn()}
        reducedMotion={false}
        onLaunchIntentConsumed={vi.fn()}
      />,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(ONBOARDING_TARGET_HANDOFF_EVENT, {
        detail: { flowKey: "first_estimate_value", stepKey: "add_priced_row" },
      }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(mocks.stop).toHaveBeenCalled();
    expect(target).toHaveFocus();
    expect(mocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("tour=first_estimate_value&mode=resume"),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.start).toHaveBeenCalledWith(stepIndex);
    expect(screen.queryByRole("button", { name: "Return to guide" })).not.toBeInTheDocument();
    target.remove();
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
      routeKey: eligibleFlow.steps[0]?.route,
      viewportClass: "desktop",
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

  it("silently reloads the latest saved run when a mid-guide state mutation conflicts", async () => {
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
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: "Guidance paused" }),
    ).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("silently reconciles an advance and modal-pause race from the same tab", async () => {
    const eligibleFlow = flow();
    const currentStepKey = eligibleFlow.steps[0]?.key ?? null;
    const nextStepKey = eligibleFlow.steps[1]?.key ?? currentStepKey;
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "in_progress",
      currentStepKey,
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: null,
      runId: "run-1",
    };
    const mutate = vi.fn()
      .mockResolvedValueOnce({
        status: "applied",
        state: {
          ...eligibleFlow.state,
          currentStepKey: nextStepKey,
          revision: 3,
        },
        runId: "run-1",
      })
      .mockResolvedValueOnce({
        status: "conflict",
        code: "ONBOARDING_STATE_CONFLICT",
        state: {
          ...eligibleFlow.state,
          currentStepKey: nextStepKey,
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
      mocks.onEvent?.(nextEvent(currentStepKey ?? ""));
      mocks.modalListener?.({ activeModalCount: 1, type: "opening" });
      await Promise.resolve();
    });

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(mutate.mock.calls.map(([command]) => command.command)).toEqual([
      "advance",
      "pause",
    ]);
    expect(mutate.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      expectedRevision: 3,
      expectedStepKey: currentStepKey,
    }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: "Guidance paused" }),
    ).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Skip this step" })).not.toBeInTheDocument();

    mocks.start.mockClear();
    await act(async () => {
      screen.getByRole("button", { name: "Try again" }).click();
    });
    expect(mocks.start).toHaveBeenCalledWith(
      eligibleFlow.steps.findIndex((step) => step.key === routedStepKey),
    );
  });

  it("advances an optional missing-target step through persisted state", async () => {
    const eligibleFlow = guidedPracticeFlow();
    const skippedIndex = eligibleFlow.steps.findIndex(
      (step) => step.key === "practice_row_math",
    );
    const skippedStep = eligibleFlow.steps[skippedIndex];
    const nextStep = eligibleFlow.steps[skippedIndex + 1];
    if (!skippedStep || !nextStep) {
      throw new Error("Guided-practice optional step sequence is unavailable.");
    }
    eligibleFlow.state = {
      flowKey: eligibleFlow.definition.key,
      flowVersion: eligibleFlow.definition.version,
      status: "in_progress",
      currentStepKey: skippedStep.key,
      generation: 1,
      revision: 2,
      resetCount: 0,
      tutorialBinding: { version: 2, generation: 1 },
      runId: "run-1",
    };
    const mutate = vi.fn()
      .mockResolvedValueOnce({
        status: "applied",
        state: { ...eligibleFlow.state, revision: 3 },
        runId: "run-1",
      })
      .mockResolvedValueOnce({
        status: "applied",
        state: {
          ...eligibleFlow.state,
          currentStepKey: nextStep.key,
          revision: 4,
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

    const routedStep = mocks.steps.find((step) => step.id === skippedStep.key);
    await act(async () => {
      await expect(routedStep?.before?.()).rejects.toThrow("target_timeout");
    });
    await act(async () => {
      mocks.onEvent?.(genericErrorEvent(skippedStep.key, skippedIndex));
      await Promise.resolve();
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mocks.start.mockClear();
    await act(async () => {
      screen.getByRole("button", { name: "Skip this step" }).click();
      await Promise.resolve();
    });

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(mutate.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      command: "advance",
      expectedRevision: 3,
      expectedStepKey: skippedStep.key,
      nextStepKey: nextStep.key,
      reasonCode: "target_timeout",
    }));
    expect(mocks.start).toHaveBeenCalledWith(skippedIndex + 1);
  });

  it("does not offer skip for required targets and exits stop-policy failures", async () => {
    const eligibleFlow = flow();
    const requiredStep = eligibleFlow.steps.find(
      (step) => step.key === "projects_entry",
    );
    const stopStep = eligibleFlow.steps.find(
      (step) => step.key === "welcome",
    );
    if (!requiredStep || !stopStep) {
      throw new Error("Core orientation recovery steps are unavailable.");
    }
    const mutate = vi.fn().mockResolvedValue({
      status: "applied",
      state: {
        flowKey: eligibleFlow.definition.key,
        flowVersion: eligibleFlow.definition.version,
        status: "in_progress",
        currentStepKey: requiredStep.key,
        generation: 1,
        revision: 1,
        resetCount: 0,
        tutorialBinding: null,
      },
      runId: "run-1",
    });
    const onLaunchIntentConsumed = vi.fn();

    const view = render(
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
        targetNotFoundEvent(
          requiredStep.key,
          eligibleFlow.steps.indexOf(requiredStep),
        ),
      );
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip this step" })).not.toBeInTheDocument();
    view.unmount();

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
        targetNotFoundEvent(
          stopStep.key,
          eligibleFlow.steps.indexOf(stopStep),
        ),
      );
      await Promise.resolve();
    });

    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip this step" })).not.toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Stop guide" }).click();
    });
    expect(onLaunchIntentConsumed).toHaveBeenCalledTimes(1);
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
