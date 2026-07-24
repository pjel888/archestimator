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
import { OnboardingPortal } from "./OnboardingPortal";
import { OnboardingRecovery } from "./OnboardingRecovery";
import { OnboardingTooltip } from "./OnboardingTooltip";
import {
  ONBOARDING_RUNTIME_BINDING_EVENT,
  type OnboardingRuntimeBindingEventDetail,
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
    message: string;
    context: OnboardingSupportContext;
    retryMode: "latest" | "step";
  } | null>(null);
  const [applicationModalActive, setApplicationModalActive] = useState(
    () => hasActiveApplicationModal(),
  );
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
            runId: runIdRef.current,
          });
          if (result.status === "conflict") {
            if (isInitialLaunchCommand) {
              launchPersistedRef.current = false;
              revisionRef.current = result.state?.revision ?? revisionRef.current;
              programmaticStopRef.current = true;
              controlsRef.current?.stop();
              router.refresh();
              return result;
            }
            revisionRef.current = result.state?.revision ?? revisionRef.current;
            programmaticStopRef.current = true;
            controlsRef.current?.stop();
            setRecovery({
              message: "Guidance progress changed. Retry to continue from the latest saved step.",
              context: recoveryContext(expectedStepKey, "practice_state_changed"),
              retryMode: "latest",
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
            message: "Guidance progress could not be saved. Retry when your connection is available.",
            context: recoveryContext(expectedStepKey, "persistence_unavailable"),
            retryMode: "latest",
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
                    const currentParams = new URLSearchParams(
                      window.location.search,
                    );
                    const flowKey = currentParams.get("tour");
                    const mode = currentParams.get("mode");
                    if (!flowKey || !mode) {
                      router.push(href);
                      return;
                    }
                    const nextUrl = new URL(href, window.location.origin);
                    nextUrl.searchParams.set("tour", flowKey);
                    nextUrl.searchParams.set("mode", mode);
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
                    message:
                      reasonCode === "target_timeout"
                        ? "The next control is not available in the current view."
                        : "The guide could not prepare the next step.",
                    context: recoveryContext(definition.key, reasonCode),
                    retryMode: "step",
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
    [flow.steps, persist, recoveryContext, router, snapshot],
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
          flow.definition.key === "client_link_publishing"
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
        programmaticStopRef.current = true;
        eventControls.stop();
        if (launchMode !== "replay") {
          void persist("pause", stepKey, stepKey, "target_timeout");
        }
        setRecovery({
          message: "The next control is not available in the current view.",
          context: recoveryContext(stepKey, "target_timeout"),
          retryMode: "step",
        });
        return;
      }
      if (event.type === "error") {
        if (routeFailureRef.current?.stepKey === stepKey) return;
        programmaticStopRef.current = true;
        eventControls.stop();
        if (launchMode !== "replay") {
          void persist("pause", stepKey, stepKey, "route_not_ready");
        }
        setRecovery({
          message: "The guide could not prepare the next step.",
          context: recoveryContext(stepKey, "route_not_ready"),
          retryMode: "step",
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
      {recovery ? (
        <OnboardingRecovery
          message={recovery.message}
          supportContext={recovery.context}
          onRetry={() => {
            const retryMode = recovery.retryMode;
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
            controls.replay();
          }}
          onSkip={() => {
            setRecovery(null);
            routeFailureRef.current = null;
            controls.next();
          }}
          onExit={() => {
            setRecovery(null);
            routeFailureRef.current = null;
            controls.stop();
          }}
        />
      ) : null}
    </>
  );
}
