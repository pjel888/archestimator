import {
  isOnboardingTargetKey,
  type OnboardingTargetKey,
} from "@/lib/onboarding/target-catalog";
import { prepareEstimateOnboardingTarget } from "./estimate-target-adapter";

function isVisibleTarget(element: HTMLElement) {
  return (
    element.isConnected &&
    !element.closest("[inert]") &&
    element.getAttribute("aria-hidden") !== "true" &&
    element.getClientRects().length > 0
  );
}

export function resolveOnboardingTarget(
  key: OnboardingTargetKey,
): HTMLElement | null {
  if (typeof document === "undefined" || !isOnboardingTargetKey(key)) return null;
  const elements = document.querySelectorAll<HTMLElement>(
    `[data-onboarding-target="${CSS.escape(key)}"]`,
  );
  return Array.from(elements).find(isVisibleTarget) ?? null;
}

export async function waitForOnboardingTarget({
  key,
  signal,
  timeoutMs,
}: {
  key: OnboardingTargetKey;
  signal: AbortSignal;
  timeoutMs: number;
}): Promise<HTMLElement | null> {
  const immediate = resolveOnboardingTarget(key);
  if (immediate || signal.aborted || typeof document === "undefined") {
    return immediate;
  }
  const prepared = await prepareEstimateOnboardingTarget(key, signal);
  if (prepared || signal.aborted) return prepared;

  return new Promise((resolve) => {
    let settled = false;
    let preparing = false;
    const finish = (target: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
      resolve(target);
    };
    const check = () => {
      const target = resolveOnboardingTarget(key);
      if (target) {
        finish(target);
        return;
      }
      if (preparing) return;
      preparing = true;
      void prepareEstimateOnboardingTarget(key, signal)
        .then((prepared) => {
          if (prepared) finish(prepared);
        })
        .finally(() => {
          preparing = false;
        });
    };
    const onAbort = () => finish(null);
    const observer = new MutationObserver(check);
    const intervalId = window.setInterval(check, 50);
    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "class", "data-onboarding-target"],
    });
    signal.addEventListener("abort", onAbort, { once: true });
    check();
  });
}
