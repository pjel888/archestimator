"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  useJoyride,
  type Controls,
  type EventData,
  type Step,
} from "react-joyride";

import {
  resolveSemanticResume,
} from "@/lib/onboarding/flow-eligibility";
import type {
  EligibleOnboardingFlow,
  OnboardingLaunchMode,
  OnboardingReasonCode,
  OnboardingStepKey,
  OnboardingEligibilitySnapshot,
} from "@/lib/onboarding/flow-types";
import type {
  OnboardingMutationCommand,
  OnboardingMutationResult,
} from "@/lib/onboarding/flow-repository";
import type { OnboardingSupportContext } from "@/lib/onboarding/support-context";
import {
  hasActiveApplicationModal,
  subscribeToModalLifecycle,
} from "@/components/ui/overlays/modal-lifecycle";
import { Button } from "@/components/ui/button";
import { OnboardingPortal } from "./OnboardingPortal";
import { OnboardingRecovery } from "./OnboardingRecovery";
import { OnboardingTooltip } from "./OnboardingTooltip";
import {
  ONBOARDING_RUNTIME_BINDING_EVENT,
  ONBOARDING_TARGET_HANDOFF_EVENT,
  type OnboardingRuntimeBindingEventDetail,
  type OnboardingTargetHandoffEventDetail,
} from "./onboarding-runtime-events";
import { prepareOnboardingRoute } from "./onboarding-route-coordinator";
import { resolveOnboardingTarget } from "./onboarding-target-resolver";

export type OnboardingRuntimeMutation = (
  command: OnboardingMutationCommand,
) => Promise<OnboardingMutationResult>;

export type OnboardingTourClientProps = {
  flow: EligibleOnboardingFlow;
  launchMode: OnboardingLaunchMode;
  snapshot: OnboardingEligibilitySnapshot;
  mutate: OnboardingRuntimeMutation;
  reducedMotion: boolean;
  onLaunchIntentConsumed: () => void;
};

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function OnboardingTourClient({
  flow,
  launchMode,
  snapshot,
  mutate,
  reducedMotion,
  onLaunchIntentConsumed,
}: OnboardingTourClientProps) {
  const router = useRouter();
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
  const [recovery, setRecovery] = useState<{
    canRetry: boolean;
    canSkip: boolean;
    message: string;
    context: OnboardingSupportContext;
    retryMode: "latest" | "step";
    stepKey: OnboardingStepKey | null;
  } | null>(null);
  const [applicationModalActive, setApplicationModalActive] = useState(
    () => hasActiveApplicationModal(),
  );
  const [handoffStepKey, setHandoffStepKey] = useState<OnboardingStepKey | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const pausedForModalRef = useRef(false);
  const programmaticStopRef = useRef(false);
  const resumingFromModalRef = useRef(false);
  const startedRef = useRef(false);
  const launchPersistedRef = useRef(false);
  const eventKeysRef = useRef(new Set<string>());
  const revisionRef = useRef(flow.state?.revision ?? null);
  const runIdRef = useRef<string | null>(flow.state?.runId ?? null);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const controlsRef = useRef<Controls | null>(null);
  const routeFailureRef = useRef<{
    reasonCode: "route_not_ready" | "target_timeout";
    stepKey: OnboardingStepKey;
  } | null>(null);
  const resume = useMemo(
    () =>
      resolveSemanticResume(
        flow.definition,
        flow.steps,
        flow.state?.currentStepKey ?? null,
      ),
    [flow],
  );
  const initialStepIndex =
    launchMode === "resume" && resume.kind === "step"
      ? resume.index
      : 0;
  const recoveryContext = useCallback(
    (
      stepKey: OnboardingStepKey | null,
      reasonCode: OnboardingReasonCode,
    ): OnboardingSupportContext => {
      const step = flow.steps.find((candidate) => candidate.key === stepKey);
      return {
        flowKey: flow.definition.key,
        flowVersion: flow.definition.version,
        stepKey,
        reasonCode,
        routeKey: step?.route ?? null,
        viewportClass: window.matchMedia("(max-width: 767px)").matches
          ? "mobile"
          : "desktop",
      };
    },
    [flow.definition.key, flow.definition.version, flow.steps],
  );

  const persist = useCallback(
    (
      command: OnboardingMutationCommand["command"],
      expectedStepKey: OnboardingStepKey | null,
      nextStepKey?: OnboardingStepKey | null,
      reasonCode?: OnboardingReasonCode,
    ) => {
      const execute = async () => {
        const isInitialLaunchCommand =
          command === "start"
          || command === "replay"
          || command === "restart"
          || (command === "resume" && launchMode === "resume");
        const currentStep = flow.steps.find((step) =>
          step.key === expectedStepKey
        );
        try {
          const result = await mutate({
            command,
            flowKey: flow.definition.key,
            mutationId: createRequestId(),
            expectedRevision: revisionRef.current,
            expectedStepKey,
            nextStepKey,
            expectedTutorialBinding: flow.state?.tutorialBinding ?? null,
            launchMode,
            reasonCode,
            routeKey: currentStep?.route ?? null,
            runId: runIdRef.current,
            viewportClass: window.matchMedia("(max-width: 767px)").matches
              ? "mobile"
              : "desktop",
          });
          if (result.status === "conflict") {
            if (
              isInitialLaunchCommand
              || result.code === "ONBOARDING_STATE_CONFLICT"
            ) {
              if (isInitialLaunchCommand) {
                launchPersistedRef.current = false;
              }
              revisionRef.current = result.state?.revision ?? revisionRef.current;
              runIdRef.current = result.state?.runId ?? runIdRef.current;
              programmaticStopRef.current = true;
              controlsRef.current?.stop();
              router.refresh();
              return result;
            }
            revisionRef.current = result.state?.revision ?? revisionRef.current;
            programmaticStopRef.current = true;
            controlsRef.current?.stop();
            setRecovery({
              canRetry: true,
              canSkip: false,
              message: "Guidance progress changed. Retry to continue from the latest saved step.",
              context: recoveryContext(expectedStepKey, "practice_state_changed"),
              retryMode: "latest",
              stepKey: expectedStepKey,
            });
            return result;
          }
          revisionRef.current = result.state.revision;
          runIdRef.current = result.runId;
          window.dispatchEvent(
            new CustomEvent<OnboardingRuntimeBindingEventDetail>(
              ONBOARDING_RUNTIME_BINDING_EVENT,
              {
                detail: {
                  flowKey: flow.definition.key,
                  flowVersion: flow.definition.version,
                  runId: result.runId,
                  revision: result.state.revision,
                  currentStepKey: result.state.currentStepKey,
                },
              },
            ),
          );
          if (command === "complete" || command === "dismiss") {
            router.refresh();
          }
          return result;
        } catch {
          if (isInitialLaunchCommand) {
            launchPersistedRef.current = false;
          }
          programmaticStopRef.current = true;
          controlsRef.current?.stop();
          setRecovery({
            canRetry: true,
            canSkip: false,
            message: "Guidance progress could not be saved. Retry when your connection is available.",
            context: recoveryContext(expectedStepKey, "persistence_unavailable"),
            retryMode: "latest",
            stepKey: expectedStepKey,
          });
          return null;
        }
      };
      const result = mutationQueueRef.current.then(execute, execute);
      mutationQueueRef.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    [
      flow.definition.key,
      flow.definition.version,
      flow.state,
      flow.steps,
      launchMode,
      mutate,
      recoveryContext,
      router,
    ],
  );

  const steps = useMemo<Step[]>(
    () =>
      flow.steps.map((definition) => {
        const target = definition.target;
        return {
          id: definition.key,
          target:
            target === "center"
              ? () => document.body
              : () => resolveOnboardingTarget(target),
          placement:
            target === "center" || target === "shell.workspace"
              ? "center"
              : "auto",
          content: definition.content,
          data: {
            contentKey: definition.content,
            flowKey: flow.definition.key,
            interaction: definition.interaction,
            stepKey: definition.key,
          },
          blockTargetInteraction: definition.interaction === "passive",
          targetWaitTimeout: 1_800,
          before: definition.route
            ? async () => {
                routeAbortRef.current?.abort();
                const controller = new AbortController();
                routeAbortRef.current = controller;
                routeFailureRef.current = null;
                const result = await prepareOnboardingRoute({
                  route: definition.route!,
                  target,
                  snapshot,
                  signal: controller.signal,
                  navigate: (href) => {
                    const nextUrl = new URL(href, window.location.origin);
                    nextUrl.searchParams.set("tour", flow.definition.key);
                    nextUrl.searchParams.set("mode", "resume");
                    router.push(
                      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
                    );
                  },
                });
                if (!result.ok) {
                  if (controller.signal.aborted) return;
                  const reasonCode =
                    result.reason === "target_timeout"
                      ? "target_timeout"
                      : "route_not_ready";
                  routeFailureRef.current = {
                    reasonCode,
                    stepKey: definition.key,
                  };
                  programmaticStopRef.current = true;
                  controlsRef.current?.stop();
                  setRecovery({
                    canRetry: definition.missingTarget !== "stop",
                    canSkip: definition.missingTarget === "skip",
                    message:
                      reasonCode === "target_timeout"
                        ? "The next control is not available in the current view."
                        : "The guide could not prepare the next step.",
                    context: recoveryContext(definition.key, reasonCode),
                    retryMode: "step",
                    stepKey: definition.key,
                  });
                  void persist(
                    "pause",
                    definition.key,
                    definition.key,
                    reasonCode,
                  );
                  throw new Error(result.reason);
                }
              }
            : undefined,
        };
      }),
    [flow.definition.key, flow.steps, persist, recoveryContext, router, snapshot],
  );

  const handleEvent = useCallback(
    (event: EventData, eventControls: Controls) => {
      const stepKey =
        typeof event.step.id === "string"
          ? (event.step.id as OnboardingStepKey)
          : null;
      const eventKey = `${event.type}:${event.index}:${event.action}:${event.status}`;
      if (event.type === "tour:start") {
        const resumingFromModal = resumingFromModalRef.current;
        if (!resumingFromModal && launchPersistedRef.current) return;
        if (!resumingFromModal) launchPersistedRef.current = true;
      } else if (
        event.type !== "tour:status"
        && eventKeysRef.current.has(eventKey)
      ) {
        return;
      }
      eventKeysRef.current.add(eventKey);

      if (event.type === "tour:start") {
        const command = resumingFromModalRef.current
          ? "resume"
          : launchMode === "resume"
            ? "resume"
            : launchMode === "replay"
              ? "replay"
              : launchMode === "restart"
                ? "restart"
                : "start";
        resumingFromModalRef.current = false;
        void persist(command, stepKey);
        return;
      }
      if (event.type === "step:before") {
        return;
      }
      if (
        event.type === "step:after" &&
        event.action === "close"
      ) {
        if (launchMode === "replay") {
          onLaunchIntentConsumed();
          return;
        }
        const reasonCode =
          event.origin === "keyboard" ? "escape_key" : "user_close";
        void persist("pause", stepKey, stepKey, reasonCode)
          .finally(onLaunchIntentConsumed);
        return;
      }
      if (
        event.type === "step:after" &&
        (event.action === "next" || event.action === "complete")
      ) {
        if (launchMode === "replay") return;
        const nextStepKey = flow.steps[event.index + 1]?.key ?? stepKey;
        void persist("advance", stepKey, nextStepKey);
        return;
      }
      if (event.type === "tour:end" && event.status === "finished") {
        const requiresDomainProof =
          flow.definition.key === "first_estimate_value"
          || flow.definition.key === "guided_estimate_practice"
          || flow.definition.key === "client_link_publishing"
          || flow.definition.key === "library_reuse";
        if (launchMode !== "replay" && !requiresDomainProof) {
          void persist("complete", stepKey).finally(onLaunchIntentConsumed);
        } else {
          onLaunchIntentConsumed();
        }
        return;
      }
      if (event.action === "skip" || event.status === "skipped") {
        if (launchMode === "replay") {
          onLaunchIntentConsumed();
          return;
        }
        void persist("dismiss", stepKey, stepKey, "user_skip")
          .finally(onLaunchIntentConsumed);
        return;
      }
      if (
        event.type === "tour:status" &&
        event.status === "paused" &&
        event.action === "stop"
      ) {
        if (programmaticStopRef.current) {
          programmaticStopRef.current = false;
          return;
        }
        if (launchMode === "replay") {
          onLaunchIntentConsumed();
          return;
        }
        void persist("pause", stepKey, stepKey, "user_close")
          .finally(onLaunchIntentConsumed);
        return;
      }
      if (event.type === "error:target_not_found") {
        if (routeFailureRef.current?.stepKey === stepKey) return;
        const definition = flow.steps.find((candidate) => candidate.key === stepKey);
        programmaticStopRef.current = true;
        eventControls.stop();
        if (launchMode !== "replay") {
          void persist("pause", stepKey, stepKey, "target_timeout");
        }
        setRecovery({
          canRetry: definition?.missingTarget !== "stop",
          canSkip: definition?.missingTarget === "skip",
          message: "The next control is not available in the current view.",
          context: recoveryContext(stepKey, "target_timeout"),
          retryMode: "step",
          stepKey,
        });
        return;
      }
      if (event.type === "error") {
        if (routeFailureRef.current?.stepKey === stepKey) return;
        const definition = flow.steps.find((candidate) => candidate.key === stepKey);
        programmaticStopRef.current = true;
        eventControls.stop();
        if (launchMode !== "replay") {
          void persist("pause", stepKey, stepKey, "route_not_ready");
        }
        setRecovery({
          canRetry: definition?.missingTarget !== "stop",
          canSkip: definition?.missingTarget === "skip",
          message: "The guide could not prepare the next step.",
          context: recoveryContext(stepKey, "route_not_ready"),
          retryMode: "step",
          stepKey,
        });
      }
    },
    [
      flow.definition.key,
      flow.steps,
      launchMode,
      onLaunchIntentConsumed,
      persist,
      recoveryContext,
    ],
  );

  const { controls, state, Tour } = useJoyride({
    steps,
    continuous: true,
    initialStepIndex,
    portalElement,
    tooltipComponent: OnboardingTooltip,
    onEvent: handleEvent,
    options: {
      showProgress: true,
      skipBeacon: true,
      blockTargetInteraction: true,
      dismissKeyAction: "close",
      scrollDuration: reducedMotion ? 0 : 300,
      targetWaitTimeout: 1_800,
      zIndex: 900,
      buttons: ["back", "close", "primary", "skip"],
    },
  });

  useEffect(() => {
    controlsRef.current = controls;
    return () => {
      if (controlsRef.current === controls) controlsRef.current = null;
    };
  }, [controls]);

  useEffect(() => {
    const handleHandoff = (event: Event) => {
      const detail = (event as CustomEvent<OnboardingTargetHandoffEventDetail>).detail;
      if (detail?.flowKey !== flow.definition.key) return;
      const step = flow.steps.find((candidate) =>
        candidate.key === detail.stepKey
        && candidate.interaction === "handoff_to_target"
      );
      if (!step || step.target === "center") return;
      const targetKey = step.target;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("tour", flow.definition.key);
      nextUrl.searchParams.set("mode", "resume");
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath !== currentPath) router.replace(nextPath);
      programmaticStopRef.current = true;
      routeAbortRef.current?.abort();
      controls.stop();
      setHandoffStepKey(step.key);
      requestAnimationFrame(() => {
        const target = resolveOnboardingTarget(targetKey);
        if (target instanceof HTMLElement) target.focus({ preventScroll: reducedMotion });
      });
    };
    window.addEventListener(ONBOARDING_TARGET_HANDOFF_EVENT, handleHandoff);
    return () => window.removeEventListener(ONBOARDING_TARGET_HANDOFF_EVENT, handleHandoff);
  }, [controls, flow.definition.key, flow.steps, reducedMotion, router]);

  const returnFromHandoff = useCallback(() => {
    const resumeIndex = flow.steps.findIndex((step) => step.key === handoffStepKey);
    setHandoffStepKey(null);
    requestAnimationFrame(() => {
      controls.start(resumeIndex >= 0 ? resumeIndex : state.index);
    });
  }, [controls, flow.steps, handoffStepKey, state.index]);

  useEffect(() => {
    if (!handoffStepKey) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      returnFromHandoff();
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handoffStepKey, returnFromHandoff]);

  useEffect(() => {
    if (
      !portalElement ||
      startedRef.current ||
      applicationModalActive ||
      (
        resume.kind === "completed"
        && launchMode !== "replay"
        && launchMode !== "restart"
      )
    ) {
      return;
    }
    startedRef.current = true;
    controls.start(initialStepIndex);
  }, [
    controls,
    applicationModalActive,
    initialStepIndex,
    launchMode,
    portalElement,
    resume.kind,
  ]);

  useEffect(() => {
    return subscribeToModalLifecycle((event) => {
      setApplicationModalActive(event.activeModalCount > 0);
      if (event.type !== "opening" || state.status !== "running") return;
      const stepKey = flow.steps[state.index]?.key ?? null;
      void persist("pause", stepKey, stepKey, "app_modal_opened");
      pausedForModalRef.current = true;
      programmaticStopRef.current = true;
      routeAbortRef.current?.abort();
      controls.stop();
    });
  }, [controls, flow.steps, persist, state.index, state.status]);

  useEffect(() => {
    if (
      applicationModalActive
      || recovery
      || !pausedForModalRef.current
    ) {
      return;
    }
    pausedForModalRef.current = false;
    resumingFromModalRef.current = true;
    controls.start(state.index);
  }, [applicationModalActive, controls, recovery, state.index]);

  useEffect(
    () => () => {
      routeAbortRef.current?.abort();
    },
    [],
  );

  return (
    <>
      <OnboardingPortal portalRef={setPortalElement} />
      {Tour}
      {handoffStepKey ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="fixed bottom-4 right-4 z-[901] rounded-full shadow-lg"
          onClick={returnFromHandoff}
        >
          Return to guide
        </Button>
      ) : null}
      {recovery ? (
        <OnboardingRecovery
          message={recovery.message}
          supportContext={recovery.context}
          onRetry={recovery.canRetry
            ? () => {
                const retryMode = recovery.retryMode;
                const retryStepKey = recovery.stepKey;
                setRecovery(null);
                routeFailureRef.current = null;
                eventKeysRef.current.clear();
                if (retryMode === "latest") {
                  const nextUrl = new URL(window.location.href);
                  nextUrl.searchParams.set("tour", flow.definition.key);
                  nextUrl.searchParams.set("mode", "resume");
                  router.replace(
                    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
                  );
                  router.refresh();
                  return;
                }
                const retryIndex = flow.steps.findIndex(
                  (step) => step.key === retryStepKey,
                );
                controls.start(retryIndex >= 0 ? retryIndex : state.index);
              }
            : undefined}
          onSkip={recovery.canSkip
            ? () => {
                const skippedStepKey = recovery.stepKey;
                const skippedIndex = flow.steps.findIndex(
                  (step) => step.key === skippedStepKey,
                );
                const nextStep = flow.steps[skippedIndex + 1];
                setRecovery(null);
                routeFailureRef.current = null;
                eventKeysRef.current.clear();

                if (skippedIndex < 0 || !skippedStepKey) {
                  onLaunchIntentConsumed();
                  return;
                }
                if (launchMode === "replay") {
                  if (nextStep) {
                    controls.start(skippedIndex + 1);
                  } else {
                    onLaunchIntentConsumed();
                  }
                  return;
                }

                const advance = persist(
                  "advance",
                  skippedStepKey,
                  nextStep?.key ?? skippedStepKey,
                  recovery.context.reasonCode,
                );
                if (nextStep) {
                  void advance.then((result) => {
                    if (result && result.status !== "conflict") {
                      controls.start(skippedIndex + 1);
                    }
                  });
                  return;
                }
                if (
                  flow.definition.key === "library_reuse"
                  || flow.definition.key === "client_link_publishing"
                ) {
                  void advance.finally(onLaunchIntentConsumed);
                  return;
                }
                void advance
                  .then((result) =>
                    result && result.status !== "conflict"
                      ? persist("complete", skippedStepKey)
                      : null
                  )
                  .finally(onLaunchIntentConsumed);
              }
            : undefined}
          onExit={() => {
            setRecovery(null);
            routeFailureRef.current = null;
            controls.stop();
            onLaunchIntentConsumed();
          }}
        />
      ) : null}
    </>
  );
}
