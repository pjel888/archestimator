import { ONBOARDING_FLOW_CATALOG } from "./flow-catalog";
import type {
  EligibleOnboardingFlow,
  OnboardingAudienceRule,
  OnboardingEligibilitySnapshot,
  OnboardingFlowDefinition,
  OnboardingStepDefinition,
  OnboardingStepKey,
  OnboardingViewport,
} from "./flow-types";

function hasCapabilities(
  required: readonly string[],
  available: ReadonlySet<string>,
): boolean {
  return required.every((capability) => available.has(capability));
}

function matchesAudience(
  rule: OnboardingAudienceRule,
  snapshot: OnboardingEligibilitySnapshot,
  capabilities: ReadonlySet<string>,
): boolean {
  return (
    snapshot.audience.includes(rule.audience) &&
    hasCapabilities(rule.requires, capabilities)
  );
}

function isStepEligible(
  step: OnboardingStepDefinition,
  snapshot: OnboardingEligibilitySnapshot,
  viewport: OnboardingViewport,
  capabilities: ReadonlySet<string>,
  routes: ReadonlySet<string>,
  targets: ReadonlySet<string>,
): boolean {
  if (!step.viewports.includes(viewport)) {
    return false;
  }
  if (!hasCapabilities(step.requires, capabilities)) {
    return false;
  }
  if (step.route && !routes.has(step.route)) {
    return false;
  }
  if (step.target !== "center" && !targets.has(step.target)) {
    return !step.optional;
  }
  return step.dataPredicate
    ? snapshot.dataPredicates[step.dataPredicate] === true
    : true;
}

export function filterEligibleOnboardingSteps(
  definition: OnboardingFlowDefinition,
  snapshot: OnboardingEligibilitySnapshot,
  viewport: OnboardingViewport,
): readonly OnboardingStepDefinition[] {
  const capabilities = new Set<string>(snapshot.capabilities);
  const routes = new Set<string>(snapshot.availableRoutes);
  const targets = new Set<string>(snapshot.availableTargets);

  return definition.steps.filter((step) =>
    isStepEligible(step, snapshot, viewport, capabilities, routes, targets),
  );
}

export function getEligibleOnboardingFlows(
  snapshot: OnboardingEligibilitySnapshot,
  viewport: OnboardingViewport,
): readonly EligibleOnboardingFlow[] {
  const capabilities = new Set<string>(snapshot.capabilities);

  return ONBOARDING_FLOW_CATALOG.flatMap((definition) => {
    const audienceMatches = definition.audience.some((rule) =>
      matchesAudience(rule, snapshot, capabilities),
    );
    if (!audienceMatches) {
      return [];
    }

    const steps = filterEligibleOnboardingSteps(definition, snapshot, viewport);
    if (steps.length === 0) {
      return [];
    }

    return [
      {
        definition,
        steps,
        state:
          snapshot.flowStates.find(
            (state) =>
              state.flowKey === definition.key &&
              state.flowVersion === definition.version,
          ) ?? null,
      },
    ];
  });
}

export type SemanticResumeResolution =
  | {
      kind: "step";
      step: OnboardingStepDefinition;
      index: number;
      definitionChanged: boolean;
    }
  | {
      kind: "completed";
      definitionChanged: boolean;
    };

export function resolveSemanticResume(
  definition: OnboardingFlowDefinition,
  eligibleSteps: readonly OnboardingStepDefinition[],
  persistedStepKey: OnboardingStepKey | null,
): SemanticResumeResolution {
  if (eligibleSteps.length === 0) {
    return { kind: "completed", definitionChanged: persistedStepKey !== null };
  }

  if (persistedStepKey === null) {
    return {
      kind: "step",
      step: eligibleSteps[0],
      index: 0,
      definitionChanged: false,
    };
  }

  const directIndex = eligibleSteps.findIndex(
    (step) => step.key === persistedStepKey,
  );
  if (directIndex >= 0) {
    return {
      kind: "step",
      step: eligibleSteps[directIndex],
      index: directIndex,
      definitionChanged: false,
    };
  }

  const compatibleStepKey = definition.compatibility[persistedStepKey];
  if (compatibleStepKey) {
    const compatibleIndex = eligibleSteps.findIndex(
      (step) => step.key === compatibleStepKey,
    );
    if (compatibleIndex >= 0) {
      return {
        kind: "step",
        step: eligibleSteps[compatibleIndex],
        index: compatibleIndex,
        definitionChanged: true,
      };
    }
  }

  const originalIndex = definition.steps.findIndex(
    (step) => step.key === persistedStepKey,
  );
  const nextStep =
    originalIndex >= 0
      ? definition.steps
          .slice(originalIndex + 1)
          .map((step) => eligibleSteps.find((eligible) => eligible.key === step.key))
          .find((step) => step !== undefined)
      : eligibleSteps[0];

  if (!nextStep) {
    return { kind: "completed", definitionChanged: true };
  }

  return {
    kind: "step",
    step: nextStep,
    index: eligibleSteps.indexOf(nextStep),
    definitionChanged: true,
  };
}
