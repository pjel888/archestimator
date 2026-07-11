import {
  ACTIVATION_MILESTONES,
  ACTIVATION_SOURCES,
  isActivationMilestone,
  isActivationSource,
  type ActivationMilestone,
  type ActivationSource,
} from "./activation-types";

export const ACTIVATION_PRODUCER_CONTRACT_VERSION = "ACTIVATION-PRODUCER-CONTRACT-v1" as const;

export type ActivationProducerRule = {
  milestone: ActivationMilestone;
  source: ActivationSource;
  requiresProject: boolean;
  requiresEstimate: boolean;
};

export const ACTIVATION_PRODUCER_RULES: readonly ActivationProducerRule[] = [
  { milestone: "invite_accepted", source: "invitation", requiresProject: false, requiresEstimate: false },
  { milestone: "workspace_ready", source: "project", requiresProject: false, requiresEstimate: false },
  { milestone: "project_created", source: "project", requiresProject: true, requiresEstimate: false },
  { milestone: "first_area_created", source: "estimate", requiresProject: true, requiresEstimate: true },
  { milestone: "first_row_priced", source: "estimate", requiresProject: true, requiresEstimate: true },
  { milestone: "first_valid_total", source: "estimate", requiresProject: true, requiresEstimate: true },
  { milestone: "health_reviewed", source: "health", requiresProject: true, requiresEstimate: true },
  { milestone: "export_completed", source: "export", requiresProject: true, requiresEstimate: true },
  { milestone: "publication_created", source: "publication", requiresProject: true, requiresEstimate: false },
  { milestone: "recipient_opened", source: "recipient", requiresProject: true, requiresEstimate: false },
  { milestone: "recipient_engaged", source: "recipient", requiresProject: true, requiresEstimate: false },
  { milestone: "recipient_decided", source: "recipient", requiresProject: true, requiresEstimate: false },
];

export type ActivationProducerIntent = {
  domainMutationId: string;
  userId: string;
  workspaceId: string;
  projectId?: string | null;
  estimateId?: string | null;
  milestone: ActivationMilestone;
  source: ActivationSource;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ActivationProducerResult =
  | { status: "accepted"; dedupeKey: string; contractVersion: typeof ACTIVATION_PRODUCER_CONTRACT_VERSION }
  | { status: "rejected"; code: "activation_invalid_producer_intent"; contractVersion: typeof ACTIVATION_PRODUCER_CONTRACT_VERSION };

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function ruleFor(milestone: ActivationMilestone) {
  return ACTIVATION_PRODUCER_RULES.find((rule) => rule.milestone === milestone) ?? null;
}

export function canonicalActivationDedupeKey(input: Pick<ActivationProducerIntent, "domainMutationId" | "milestone" | "workspaceId">) {
  return `${input.workspaceId}:${input.domainMutationId}:${input.milestone}`;
}

export function validateActivationProducerIntent(input: ActivationProducerIntent): ActivationProducerResult {
  if (!hasText(input.domainMutationId) || !hasText(input.userId) || !hasText(input.workspaceId)) {
    return { code: "activation_invalid_producer_intent", contractVersion: ACTIVATION_PRODUCER_CONTRACT_VERSION, status: "rejected" };
  }
  if (!isActivationMilestone(input.milestone) || !isActivationSource(input.source) || Number.isNaN(Date.parse(input.occurredAt))) {
    return { code: "activation_invalid_producer_intent", contractVersion: ACTIVATION_PRODUCER_CONTRACT_VERSION, status: "rejected" };
  }
  const rule = ruleFor(input.milestone);
  if (!rule || rule.source !== input.source || (rule.requiresProject && !hasText(input.projectId)) || (rule.requiresEstimate && !hasText(input.estimateId))) {
    return { code: "activation_invalid_producer_intent", contractVersion: ACTIVATION_PRODUCER_CONTRACT_VERSION, status: "rejected" };
  }
  if (input.estimateId && !input.projectId) {
    return { code: "activation_invalid_producer_intent", contractVersion: ACTIVATION_PRODUCER_CONTRACT_VERSION, status: "rejected" };
  }
  return {
    contractVersion: ACTIVATION_PRODUCER_CONTRACT_VERSION,
    dedupeKey: canonicalActivationDedupeKey(input),
    status: "accepted",
  };
}

export const ACTIVATION_PRODUCER_FIXTURE = {
  contractVersion: ACTIVATION_PRODUCER_CONTRACT_VERSION,
  milestones: ACTIVATION_MILESTONES,
  sources: ACTIVATION_SOURCES,
  publisher: {
    publication_created: { source: "publication", requiresProject: true },
    recipient_opened: { source: "recipient", requiresProject: true },
    recipient_engaged: { source: "recipient", requiresProject: true },
    recipient_decided: { source: "recipient", requiresProject: true },
  },
} as const;
