import { getEligibleOnboardingFlows } from "@/lib/onboarding/flow-eligibility";
import {
  loadCurrentOnboardingEligibilitySnapshot,
  mutateCurrentOnboardingFlow,
} from "@/lib/onboarding/flow-actions";
import { OnboardingClientBoundary } from "./OnboardingClientBoundary";

export async function AuthenticatedOnboardingHost() {
  let snapshot;
  try {
    snapshot = await loadCurrentOnboardingEligibilitySnapshot();
  } catch {
    return null;
  }

  const hasAnyEligibleFlow =
    getEligibleOnboardingFlows(snapshot, "desktop").length > 0 ||
    getEligibleOnboardingFlows(snapshot, "mobile").length > 0;
  if (!hasAnyEligibleFlow) return null;
  return (
    <OnboardingClientBoundary
      snapshot={snapshot}
      mutate={mutateCurrentOnboardingFlow}
    />
  );
}
