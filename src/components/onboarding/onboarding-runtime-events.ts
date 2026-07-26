import type {
  OnboardingFlowKey,
  OnboardingStepKey,
} from "@/lib/onboarding/flow-types";

export const ONBOARDING_RUNTIME_BINDING_EVENT =
  "archestimator:onboarding-runtime-binding";
export const ONBOARDING_TARGET_HANDOFF_EVENT =
  "archestimator:onboarding-target-handoff";

export type OnboardingRuntimeBindingEventDetail = {
  flowKey: OnboardingFlowKey;
  flowVersion: number;
  runId: string;
  revision: number;
  currentStepKey: OnboardingStepKey | null;
};

export type OnboardingTargetHandoffEventDetail = {
  flowKey: OnboardingFlowKey;
  stepKey: OnboardingStepKey;
};
