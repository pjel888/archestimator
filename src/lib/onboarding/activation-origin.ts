import "server-only";

import {
  isActivationOriginClass,
  type ActivationMilestoneInput,
  type ActivationOriginClass,
} from "./activation-types";

const starterCapabilities = new WeakSet<object>();
const tutorialCapabilities = new WeakSet<object>();
const trustedIntents = new WeakSet<object>();

declare const starterSeedCapabilityBrand: unique symbol;
declare const tutorialSeedCapabilityBrand: unique symbol;
declare const trustedActivationIntentBrand: unique symbol;

export type StarterSeedActivationCapability = {
  readonly [starterSeedCapabilityBrand]: true;
};

export type TutorialSeedActivationCapability = {
  readonly [tutorialSeedCapabilityBrand]: true;
};

export type TrustedActivationMilestoneInput = ActivationMilestoneInput & {
  readonly originClass: ActivationOriginClass;
  readonly [trustedActivationIntentBrand]: true;
};

function issueCapability<T extends object>(registry: WeakSet<object>): T {
  const capability = Object.freeze({});
  registry.add(capability);
  return capability as T;
}

function classify(
  input: ActivationMilestoneInput,
  originClass: ActivationOriginClass,
): TrustedActivationMilestoneInput {
  const trusted = Object.freeze({ ...input, originClass }) as TrustedActivationMilestoneInput;
  trustedIntents.add(trusted);
  return trusted;
}

export function issueStarterSeedActivationCapability(): StarterSeedActivationCapability {
  return issueCapability<StarterSeedActivationCapability>(starterCapabilities);
}

export function issueTutorialSeedActivationCapability(): TutorialSeedActivationCapability {
  return issueCapability<TutorialSeedActivationCapability>(tutorialCapabilities);
}

export function prepareUserDomainActivation(
  input: ActivationMilestoneInput,
): TrustedActivationMilestoneInput {
  return classify(input, "user_domain");
}

export function prepareStarterSeedActivation(
  capability: StarterSeedActivationCapability,
  input: ActivationMilestoneInput,
): TrustedActivationMilestoneInput {
  if (!starterCapabilities.has(capability)) {
    throw new Error("Starter activation requires a server-issued capability.");
  }
  return classify(input, "starter_seed");
}

export function prepareTutorialSeedActivation(
  capability: TutorialSeedActivationCapability,
  input: ActivationMilestoneInput,
): TrustedActivationMilestoneInput {
  if (!tutorialCapabilities.has(capability)) {
    throw new Error("Tutorial activation requires a server-issued capability.");
  }
  return classify(input, "tutorial_seed");
}

export function restorePersistedActivationClassification(
  input: ActivationMilestoneInput,
  originClass: string,
): TrustedActivationMilestoneInput {
  if (!isActivationOriginClass(originClass)) {
    throw new Error("Persisted activation origin is invalid.");
  }
  return classify(input, originClass);
}

export function assertTrustedActivation(
  input: TrustedActivationMilestoneInput,
): void {
  if (!trustedIntents.has(input)) {
    throw new Error("Activation origin must be assigned by a trusted server helper.");
  }
}
