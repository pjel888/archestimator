import {
  ACTIVATION_ORIGIN_CLASSES,
  type ActivationOriginClass,
} from "./flow-types";

export {
  ACTIVATION_ORIGIN_CLASSES,
  ACTIVATION_PATHS,
  type ActivationOriginClass,
  type ActivationPath,
} from "./flow-types";

export const ACTIVATION_MILESTONES = [
  "invite_accepted",
  "workspace_ready",
  "project_created",
  "first_area_created",
  "first_row_priced",
  "first_valid_total",
  "health_reviewed",
  "export_completed",
  "publication_created",
  "recipient_opened",
  "recipient_engaged",
  "recipient_decided",
] as const;

export type ActivationMilestone = (typeof ACTIVATION_MILESTONES)[number];

export const ACTIVATION_SOURCES = [
  "invitation",
  "project",
  "estimate",
  "health",
  "export",
  "publication",
  "recipient",
] as const;

export type ActivationSource = (typeof ACTIVATION_SOURCES)[number];

export const ACTIVATION_OUTBOX_STATES = ["pending", "processing", "delivered", "dead"] as const;

export type ActivationOutboxState = (typeof ACTIVATION_OUTBOX_STATES)[number];

export type ActivationResourceChain = {
  userId: string;
  workspaceId: string;
  projectId?: string | null;
  estimateId?: string | null;
};

export type ActivationMilestoneInput = ActivationResourceChain & {
  milestone: ActivationMilestone;
  source: ActivationSource;
  occurredAt: string;
  dedupeKey: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export const ACTIVATION_MILESTONE_RANK = Object.fromEntries(
  ACTIVATION_MILESTONES.map((milestone, index) => [milestone, index]),
) as Record<ActivationMilestone, number>;

export function isActivationMilestone(value: string): value is ActivationMilestone {
  return (ACTIVATION_MILESTONES as readonly string[]).includes(value);
}

export function isActivationSource(value: string): value is ActivationSource {
  return (ACTIVATION_SOURCES as readonly string[]).includes(value);
}

export function isActivationOriginClass(value: string): value is ActivationOriginClass {
  return (ACTIVATION_ORIGIN_CLASSES as readonly string[]).includes(value);
}
