import {
  ONBOARDING_FLOW_KEYS,
  ONBOARDING_REASON_CODES,
  ONBOARDING_ROUTE_INTENTS,
  ONBOARDING_STEP_KEYS,
  ONBOARDING_VIEWPORTS,
  type OnboardingFlowKey,
  type OnboardingReasonCode,
  type OnboardingRouteIntent,
  type OnboardingStepKey,
  type OnboardingViewport,
} from "./flow-types";

export const ONBOARDING_SUPPORT_CONTEXT_KEYS = [
  "flowKey",
  "flowVersion",
  "stepKey",
  "reasonCode",
  "routeKey",
  "viewportClass",
] as const;

export type OnboardingSupportContext = {
  flowKey: OnboardingFlowKey;
  flowVersion: number;
  stepKey: OnboardingStepKey | null;
  reasonCode: OnboardingReasonCode;
  routeKey: OnboardingRouteIntent | null;
  viewportClass: OnboardingViewport;
};

function isClosedValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

export function sanitizeOnboardingSupportContext(
  value: unknown,
): OnboardingSupportContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !ONBOARDING_SUPPORT_CONTEXT_KEYS.includes(
    key as (typeof ONBOARDING_SUPPORT_CONTEXT_KEYS)[number],
  ))) return null;
  const flowVersion = typeof input.flowVersion === "string"
    ? Number(input.flowVersion)
    : input.flowVersion;
  const stepKey = input.stepKey === null || input.stepKey === undefined || input.stepKey === ""
    ? null
    : input.stepKey;
  const routeKey = input.routeKey === null || input.routeKey === undefined || input.routeKey === ""
    ? null
    : input.routeKey;
  if (
    !isClosedValue(ONBOARDING_FLOW_KEYS, input.flowKey)
    || !Number.isInteger(flowVersion)
    || Number(flowVersion) < 1
    || Number(flowVersion) > 1_000
    || (stepKey !== null && !isClosedValue(ONBOARDING_STEP_KEYS, stepKey))
    || !isClosedValue(ONBOARDING_REASON_CODES, input.reasonCode)
    || (routeKey !== null && !isClosedValue(ONBOARDING_ROUTE_INTENTS, routeKey))
    || !isClosedValue(ONBOARDING_VIEWPORTS, input.viewportClass)
  ) return null;
  return {
    flowKey: input.flowKey,
    flowVersion: Number(flowVersion),
    stepKey,
    reasonCode: input.reasonCode,
    routeKey,
    viewportClass: input.viewportClass,
  };
}

export function onboardingSupportContextHref(context: OnboardingSupportContext) {
  const params = new URLSearchParams({
    flowKey: context.flowKey,
    flowVersion: String(context.flowVersion),
    reasonCode: context.reasonCode,
    viewportClass: context.viewportClass,
  });
  if (context.stepKey) params.set("stepKey", context.stepKey);
  if (context.routeKey) params.set("routeKey", context.routeKey);
  return `/workshop/feedback?${params}`;
}

export function onboardingSupportContextFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  return sanitizeOnboardingSupportContext({
    flowKey: searchParams.flowKey,
    flowVersion: searchParams.flowVersion,
    stepKey: searchParams.stepKey,
    reasonCode: searchParams.reasonCode,
    routeKey: searchParams.routeKey,
    viewportClass: searchParams.viewportClass,
  });
}
