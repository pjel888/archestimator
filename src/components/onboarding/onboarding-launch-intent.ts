import {
  ONBOARDING_FLOW_KEYS,
  type OnboardingFlowKey,
  type OnboardingLaunchMode,
} from "@/lib/onboarding/flow-types";

const QUERY_LAUNCH_MODES = [
  "start",
  "resume",
  "replay",
  "restart",
] as const satisfies readonly OnboardingLaunchMode[];

export type OnboardingLaunchIntent = {
  flowKey: OnboardingFlowKey;
  mode: (typeof QUERY_LAUNCH_MODES)[number];
};

export function parseOnboardingLaunchIntent(
  searchParams: Pick<URLSearchParams, "get">,
): OnboardingLaunchIntent | null {
  const flowKey = searchParams.get("tour");
  const mode = searchParams.get("mode");
  if (
    !ONBOARDING_FLOW_KEYS.includes(flowKey as OnboardingFlowKey) ||
    !QUERY_LAUNCH_MODES.includes(mode as OnboardingLaunchIntent["mode"])
  ) {
    return null;
  }
  return {
    flowKey: flowKey as OnboardingFlowKey,
    mode: mode as OnboardingLaunchIntent["mode"],
  };
}

export function removeOnboardingLaunchIntent(search: string) {
  const params = new URLSearchParams(search);
  params.delete("tour");
  params.delete("mode");
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}
