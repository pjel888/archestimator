import type {
  OnboardingFlowKey,
  OnboardingStepKey,
} from "@/lib/onboarding/flow-types";

export const ONBOARDING_RUNTIME_BINDING_EVENT =
  "archestimator:onboarding-runtime-binding";

export type OnboardingRuntimeBindingEventDetail = {
  flowKey: OnboardingFlowKey;
  flowVersion: number;
  runId: string;
  revision: number;
  currentStepKey: OnboardingStepKey | null;
};
