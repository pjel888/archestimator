export const ONBOARDING_TARGET_KEYS = [
  "shell.workspace",
  "header.getting_started",
  "nav.mobile_menu",
  "nav.projects",
  "estimate.header",
  "estimate.tab",
  "estimate.hierarchy",
  "estimate.add_area",
  "estimate.add_row",
  "estimate.library",
  "estimate.price_input",
  "estimate.row_math",
  "estimate.total",
  "estimate.save_state",
  "library.components",
  "library.templates",
  "commitment_center.overview",
  "commitment_center.views",
  "commitment_center.action_required",
  "commitment_center.portals",
  "commitment_center.compose",
  "commitment_center.access_delivery",
  "publisher.roster",
  "publisher.filters",
  "publisher.create",
  "publisher.drawer",
  "publisher.status",
  "publisher.link",
  "publisher.preview",
  "publisher.recipients",
  "publisher.activity",
  "publisher.wizard",
  "publisher.wizard_estimates",
  "publisher.wizard_client",
  "publisher.wizard_access",
  "publisher.wizard_save_state",
] as const;

export type OnboardingTargetKey = (typeof ONBOARDING_TARGET_KEYS)[number];

const ONBOARDING_TARGET_SET = new Set<string>(ONBOARDING_TARGET_KEYS);

export function isOnboardingTargetKey(value: unknown): value is OnboardingTargetKey {
  return typeof value === "string" && ONBOARDING_TARGET_SET.has(value);
}

export function onboardingTarget(
  target: OnboardingTargetKey,
): { "data-onboarding-target": OnboardingTargetKey } {
  return { "data-onboarding-target": target };
}
