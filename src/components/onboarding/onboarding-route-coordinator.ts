import type {
  OnboardingEligibilitySnapshot,
  OnboardingRouteIntent,
} from "@/lib/onboarding/flow-types";
import type { OnboardingTargetKey } from "@/lib/onboarding/target-catalog";
import {
  resolveOnboardingTarget,
  waitForOnboardingTarget,
} from "./onboarding-target-resolver";

const ROUTE_PREPARATION_TIMEOUT_MS = 4_000;

function isGlobalOnboardingTarget(target: OnboardingTargetKey) {
  return (
    target === "shell.workspace"
    || target === "header.getting_started"
    || target.startsWith("nav.")
  );
}

export type OnboardingRoutePreparationResult =
  | { ok: true; href: string }
  | {
      ok: false;
      reason: "route_unavailable" | "route_not_ready" | "target_timeout";
    };

export function resolveOnboardingRouteHref(
  route: OnboardingRouteIntent,
  snapshot: OnboardingEligibilitySnapshot,
) {
  if (!snapshot.availableRoutes.includes(route)) return null;
  const { projectId, estimateId, nodeId } = snapshot.resourceContext;
  switch (route) {
    case "workshop_home":
      return "/workshop";
    case "getting_started":
      return "/workshop/getting-started";
    case "projects":
      return "/workshop/projects";
    case "assigned_project":
      return projectId ? `/workshop/projects/${encodeURIComponent(projectId)}` : null;
    case "assigned_estimate":
    case "estimate_sheet":
      return projectId && estimateId
        ? `/workshop/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(nodeId ?? estimateId)}`
        : null;
    case "library_components":
      return "/workshop/library/components";
    case "library_templates":
      return "/workshop/library/templates";
    case "client_links":
      return "/workshop/publisher";
    case "settings_guidance":
      return "/workshop/settings";
    case "support":
      return "/workshop/feedback";
  }
}

function waitForPathname({
  href,
  signal,
  timeoutMs,
}: {
  href: string;
  signal: AbortSignal;
  timeoutMs: number;
}) {
  const expectedPathname = new URL(href, window.location.origin).pathname;
  if (window.location.pathname === expectedPathname) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const startedAt = performance.now();
    let frameId = 0;
    const finish = (ready: boolean) => {
      window.cancelAnimationFrame(frameId);
      signal.removeEventListener("abort", onAbort);
      resolve(ready);
    };
    const onAbort = () => finish(false);
    const check = () => {
      if (signal.aborted) return finish(false);
      if (window.location.pathname === expectedPathname) return finish(true);
      if (performance.now() - startedAt >= timeoutMs) return finish(false);
      frameId = window.requestAnimationFrame(check);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    frameId = window.requestAnimationFrame(check);
  });
}

export async function prepareOnboardingRoute({
  route,
  target,
  snapshot,
  signal,
  navigate,
}: {
  route: OnboardingRouteIntent;
  target: OnboardingTargetKey | "center";
  snapshot: OnboardingEligibilitySnapshot;
  signal: AbortSignal;
  navigate: (href: string) => void;
}): Promise<OnboardingRoutePreparationResult> {
  const href = resolveOnboardingRouteHref(route, snapshot);
  if (!href) return { ok: false, reason: "route_unavailable" };

  if (
    target !== "center"
    && isGlobalOnboardingTarget(target)
    && resolveOnboardingTarget(target)
  ) {
    return { ok: true, href };
  }

  if (window.location.pathname !== new URL(href, window.location.origin).pathname) {
    navigate(href);
  }
  const routeReady = await waitForPathname({
    href,
    signal,
    timeoutMs: ROUTE_PREPARATION_TIMEOUT_MS,
  });
  if (!routeReady) return { ok: false, reason: "route_not_ready" };
  if (target === "center") return { ok: true, href };

  const resolvedTarget = await waitForOnboardingTarget({
    key: target,
    signal,
    timeoutMs: ROUTE_PREPARATION_TIMEOUT_MS,
  });
  return resolvedTarget
    ? { ok: true, href }
    : { ok: false, reason: "target_timeout" };
}
