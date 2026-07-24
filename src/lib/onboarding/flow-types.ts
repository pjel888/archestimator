import type { OnboardingTargetKey } from "./target-catalog";

export const ONBOARDING_FLOW_KEYS = [
  "core_orientation",
  "collaborator_orientation",
  "first_estimate_value",
  "guided_estimate_practice",
  "estimate_reader_orientation",
  "library_reuse",
  "client_link_publishing",
] as const;

export type OnboardingFlowKey = (typeof ONBOARDING_FLOW_KEYS)[number];

export const ONBOARDING_FLOW_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "dismissed",
] as const;

export type OnboardingFlowStatus = (typeof ONBOARDING_FLOW_STATUSES)[number];

export const ONBOARDING_VIEWPORTS = ["mobile", "desktop"] as const;
export type OnboardingViewport = (typeof ONBOARDING_VIEWPORTS)[number];

export const ONBOARDING_LAUNCH_MODES = [
  "auto",
  "start",
  "resume",
  "replay",
  "restart",
  "task",
  "settings",
  "migration",
  "system",
] as const;

export type OnboardingLaunchMode = (typeof ONBOARDING_LAUNCH_MODES)[number];

export const ONBOARDING_EVENT_SOURCES = [
  "server_eligibility",
  "joyride_runtime",
  "user_command",
  "starter_seed",
  "tutorial_seed",
  "tutorial_practice",
  "non_starter_domain",
  "publication_domain",
  "migration",
  "system",
] as const;

export type OnboardingEventSource = (typeof ONBOARDING_EVENT_SOURCES)[number];

export const ACTIVATION_ORIGIN_CLASSES = [
  "user_domain",
  "starter_seed",
  "tutorial_seed",
] as const;

export type ActivationOriginClass = (typeof ACTIVATION_ORIGIN_CLASSES)[number];

export const ACTIVATION_PATHS = [
  "guided_sample",
  "workspace_template",
  "blank",
  "starter_reference",
  "starter_sandbox",
] as const;

export type ActivationPath = (typeof ACTIVATION_PATHS)[number];

export const ONBOARDING_EVENT_TYPES = [
  "eligibility_observed",
  "state_imported",
  "flow_started",
  "flow_resumed",
  "flow_replayed",
  "flow_paused",
  "step_shown",
  "step_completed",
  "step_skipped",
  "flow_completed",
  "flow_dismissed",
  "flow_restarted",
  "starter_pack_installed",
  "starter_pack_partial",
  "starter_asset_restored",
  "starter_group_reconciled",
  "sample_generated",
  "sample_fresh_copy_created",
  "sample_archived",
  "practice_action_completed",
  "practice_completed",
  "independent_transfer_observed",
  "all_guidance_reset",
  "target_not_found",
  "route_unavailable",
  "support_opened",
  "flow_error",
] as const;

export type OnboardingEventType = (typeof ONBOARDING_EVENT_TYPES)[number];

export const ONBOARDING_REASON_CODES = [
  "user_skip",
  "user_close",
  "escape_key",
  "app_modal_opened",
  "target_not_applicable",
  "target_timeout",
  "route_not_ready",
  "capability_changed",
  "resource_unavailable",
  "starter_pack_install_failed",
  "sample_seed_failed",
  "sample_generation_changed",
  "practice_state_changed",
  "publication_verification_pending",
  "publication_proof_missing",
  "publication_proof_expired",
  "publication_binding_mismatch",
  "publication_replaced",
  "clipboard_unavailable",
  "viewport_changed",
  "definition_changed",
  "persistence_unavailable",
] as const;

export type OnboardingReasonCode = (typeof ONBOARDING_REASON_CODES)[number];

export const ONBOARDING_ROUTE_INTENTS = [
  "workshop_home",
  "getting_started",
  "projects",
  "assigned_project",
  "assigned_estimate",
  "estimate_sheet",
  "library_components",
  "library_templates",
  "client_links",
  "settings_guidance",
  "support",
] as const;

export type OnboardingRouteIntent = (typeof ONBOARDING_ROUTE_INTENTS)[number];

export const ONBOARDING_CAPABILITIES = [
  "view_workshop",
  "view_projects",
  "create_projects",
  "group_projects",
  "view_assigned_project",
  "view_estimate",
  "edit_estimate",
  "manage_components",
  "manage_templates",
  "manage_client_links",
] as const;

export type OnboardingCapability = (typeof ONBOARDING_CAPABILITIES)[number];

export const ONBOARDING_DATA_PREDICATES = [
  "workspace_creator",
  "assigned_work_available",
  "first_project_incomplete",
  "first_estimate_incomplete",
  "first_area_incomplete",
  "first_priced_row_incomplete",
  "first_valid_total_incomplete",
  "estimate_context_available",
  "tutorial_binding_current",
  "tutorial_core_incomplete",
  "non_starter_transfer_incomplete",
  "library_content_available",
  "library_reuse_incomplete",
  "client_link_project_available",
  "client_link_core_incomplete",
  "verified_publication_receipt_available",
] as const;

export type OnboardingDataPredicate = (typeof ONBOARDING_DATA_PREDICATES)[number];

export const ONBOARDING_AUDIENCE_KINDS = [
  "workspace_creator",
  "workspace_editor",
  "project_collaborator",
  "estimate_collaborator",
  "estimate_reader",
  "publication_manager",
] as const;

export type OnboardingAudienceKind = (typeof ONBOARDING_AUDIENCE_KINDS)[number];

export const ONBOARDING_LESSON_KEYS = [
  "read_the_workspace",
  "understand_row_math",
  "price_and_save",
  "add_and_source",
  "organize_work",
  "reuse_structure",
  "recover_and_trust",
  "graduate",
  "read_client_links",
  "scope_and_publish",
  "verify_and_share",
  "recipients_and_activity",
  "keep_it_current",
  "replace_or_turn_off_safely",
] as const;

export type OnboardingLessonKey = (typeof ONBOARDING_LESSON_KEYS)[number];

export const ONBOARDING_STEP_KEYS = [
  "welcome",
  "workspace_map",
  "mobile_navigation",
  "projects_entry",
  "assigned_work",
  "effective_access",
  "guidance_and_help",
  "hierarchy",
  "add_area",
  "add_priced_row",
  "price_and_scope",
  "total_and_save",
  "reader_hierarchy",
  "reader_row_math",
  "reader_total_and_status",
  "reader_access_and_help",
  "practice_workspace",
  "practice_row_math",
  "practice_price_and_save",
  "practice_add_and_source",
  "practice_organize",
  "practice_reuse",
  "practice_recovery",
  "practice_transfer",
  "library_sources",
  "library_folders",
  "library_templates",
  "client_links_roster",
  "client_links_publish",
  "client_links_verify",
  "client_links_optional",
  "client_links_recipients",
  "client_links_maintenance",
  "client_links_safety",
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];
export type OnboardingContentKey = OnboardingStepKey;

export const STARTER_SCOPE_KINDS = ["workspace", "user"] as const;
export type StarterScopeKind = (typeof STARTER_SCOPE_KINDS)[number];

export const STARTER_ASSET_KINDS = [
  "project_group",
  "project_group_membership",
  "project",
  "component",
  "component_folder",
  "template",
] as const;

export type StarterAssetKind = (typeof STARTER_ASSET_KINDS)[number];

export const STARTER_INSTALL_STATUSES = ["installing", "partial", "complete"] as const;

export type StarterInstallStatus = (typeof STARTER_INSTALL_STATUSES)[number];

export const STARTER_READINESS_STATES = [
  "not_started",
  "installing",
  "partial",
  "complete",
  "explicit_add",
  "inactive_key_restore",
] as const;

export type StarterReadinessState = (typeof STARTER_READINESS_STATES)[number];

export const STARTER_CLAIM_STATUSES = ["active", "missing", "archived"] as const;
export type StarterClaimStatus = (typeof STARTER_CLAIM_STATUSES)[number];

export const ESTIMATE_PRACTICE_PREDICATES = [
  "price_and_save",
  "add_and_source",
  "hierarchy_mutation",
  "template_reuse",
  "recovery_readback",
  "non_starter_transfer",
] as const;

export type EstimatePracticePredicate = (typeof ESTIMATE_PRACTICE_PREDICATES)[number];

export type OnboardingAudienceRule = {
  audience: OnboardingAudienceKind;
  requires: readonly OnboardingCapability[];
};

export type OnboardingStepDefinition = {
  key: OnboardingStepKey;
  lesson: OnboardingLessonKey | null;
  target: OnboardingTargetKey | "center";
  route: OnboardingRouteIntent | null;
  viewports: readonly OnboardingViewport[];
  requires: readonly OnboardingCapability[];
  dataPredicate: OnboardingDataPredicate | null;
  optional: boolean;
  interaction: "passive" | "handoff_to_target";
  missingTarget: "skip" | "pause_with_recovery" | "stop";
  content: OnboardingContentKey;
};

export type OnboardingFlowDefinition = {
  key: OnboardingFlowKey;
  version: number;
  autoStart: "never" | "first_eligible_session";
  reenrollment: "manual_only" | "incomplete_only";
  audience: readonly OnboardingAudienceRule[];
  steps: readonly OnboardingStepDefinition[];
  compatibility: Readonly<Partial<Record<OnboardingStepKey, OnboardingStepKey>>>;
};

export type TutorialBinding = {
  version: number;
  generation: number;
};

export type OnboardingFlowStateSnapshot = {
  flowKey: OnboardingFlowKey;
  flowVersion: number;
  status: OnboardingFlowStatus;
  currentStepKey: OnboardingStepKey | null;
  generation: number;
  revision: number;
  resetCount: number;
  tutorialBinding: TutorialBinding | null;
  runId?: string | null;
};

export type SanitizedActivationSnapshot = {
  selectedPath: ActivationPath | null;
  projectStarted: boolean;
  estimateStarted: boolean;
  firstAreaCreated: boolean;
  firstRowPriced: boolean;
  firstValidTotalReached: boolean;
  automaticGuidanceEnabled: boolean;
  checklistDismissed: boolean;
};

export type StarterReadinessSnapshot = {
  state: StarterReadinessState;
  packVersion: number;
  workspaceRevision: number | null;
  userRevision: number | null;
  inactiveAssetKeys: readonly string[];
};

export type OnboardingEligibilitySnapshot = {
  userId: string;
  workspaceId: string;
  workspaceRole: "owner" | "admin" | "member" | "viewer" | null;
  accessSource: "workspace" | "project" | "estimate";
  effectiveRole: "owner" | "admin" | "editor" | "member" | "viewer";
  entryKind:
    | "workspace_creator"
    | "workspace_member"
    | "invited_collaborator"
    | "direct_estimate";
  viewportHint: "unknown";
  resourceContext: {
    projectId?: string;
    estimateId?: string;
    nodeId?: string;
  };
  activation: SanitizedActivationSnapshot;
  starter: StarterReadinessSnapshot | null;
  audience: readonly OnboardingAudienceKind[];
  capabilities: readonly OnboardingCapability[];
  dataPredicates: Readonly<Partial<Record<OnboardingDataPredicate, boolean>>>;
  availableRoutes: readonly OnboardingRouteIntent[];
  availableTargets: readonly OnboardingTargetKey[];
  flowStates: readonly OnboardingFlowStateSnapshot[];
};

export type EligibleOnboardingFlow = {
  definition: OnboardingFlowDefinition;
  steps: readonly OnboardingStepDefinition[];
  state: OnboardingFlowStateSnapshot | null;
};

export function isClosedValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.includes(value as T);
}
