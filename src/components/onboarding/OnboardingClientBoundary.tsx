"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getEligibleOnboardingFlows } from "@/lib/onboarding/flow-eligibility";
import type {
  OnboardingEligibilitySnapshot,
  OnboardingLaunchMode,
  OnboardingViewport,
} from "@/lib/onboarding/flow-types";
import {
  parseOnboardingLaunchIntent,
  removeOnboardingLaunchIntent,
} from "./onboarding-launch-intent";
import type {
  OnboardingRuntimeMutation,
  OnboardingTourClientProps,
} from "./OnboardingTourClient";

const DynamicOnboardingTour = dynamic<OnboardingTourClientProps>(
  () =>
    import("./OnboardingTourClient").then(
      (module) => module.OnboardingTourClient,
    ),
  { ssr: false, loading: () => null },
);

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeViewport(listener: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getViewportSnapshot(): OnboardingViewport {
  return window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop";
}

function getServerViewportSnapshot(): OnboardingViewport {
  return "desktop";
}

function subscribeReducedMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

export function OnboardingClientBoundary({
  snapshot,
  mutate,
}: {
  snapshot: OnboardingEligibilitySnapshot;
  mutate: OnboardingRuntimeMutation;
}) {
  const viewport = useSyncExternalStore(
    subscribeViewport,
    getViewportSnapshot,
    getServerViewportSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suppressedFlowKey, setSuppressedFlowKey] = useState<string | null>(
    null,
  );
  const eligibleFlows = useMemo(
    () => getEligibleOnboardingFlows(snapshot, viewport),
    [snapshot, viewport],
  );
  const launchIntent = parseOnboardingLaunchIntent(searchParams);
  const selection = useMemo(() => {
    if (launchIntent) {
      const requested = eligibleFlows.find(
        (flow) => flow.definition.key === launchIntent.flowKey,
      );
      if (requested) {
        return { flow: requested, launchMode: launchIntent.mode };
      }
    }
    if (
      pathname === "/workshop/settings"
      || pathname.startsWith("/workshop/settings/")
    ) {
      return null;
    }
    if (!snapshot.activation.automaticGuidanceEnabled) {
      return null;
    }
    const resumable = eligibleFlows.find(
      (flow) => flow.state?.status === "in_progress",
    );
    if (resumable) {
      return { flow: resumable, launchMode: "resume" as const };
    }
    const automatic = eligibleFlows.find(
      (flow) =>
        flow.definition.autoStart === "first_eligible_session" &&
        (!flow.state || flow.state.status === "not_started"),
    );
    return automatic
      ? { flow: automatic, launchMode: "auto" as const }
      : null;
  }, [
    eligibleFlows,
    launchIntent,
    pathname,
    snapshot.activation.automaticGuidanceEnabled,
  ]);
  const consumeLaunchIntent = useCallback(() => {
    if (selection) {
      setSuppressedFlowKey(selection.flow.definition.key);
    }
    if (!launchIntent) return;
    router.replace(`${pathname}${removeOnboardingLaunchIntent(window.location.search)}`);
  }, [launchIntent, pathname, router, selection]);

  if (
    !selection
    || (
      !launchIntent
      && selection.flow.definition.key === suppressedFlowKey
    )
  ) {
    return null;
  }
  return (
    <DynamicOnboardingTour
      key={[
        selection.flow.definition.key,
        selection.flow.state?.revision ?? "new",
        selection.flow.state?.runId ?? "unbound",
        selection.launchMode,
      ].join(":")}
      flow={selection.flow}
      launchMode={selection.launchMode as OnboardingLaunchMode}
      snapshot={snapshot}
      mutate={mutate}
      reducedMotion={reducedMotion}
      onLaunchIntentConsumed={consumeLaunchIntent}
    />
  );
}
