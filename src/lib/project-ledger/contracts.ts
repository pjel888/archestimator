export const PROJECT_COMMITMENT_EVENT_SOURCE_TYPES = [
  "issue",
  "decision",
  "baseline",
  "change_request",
  "artifact",
  "legacy_publication",
] as const;
export type ProjectCommitmentEventSourceType = (typeof PROJECT_COMMITMENT_EVENT_SOURCE_TYPES)[number];

export const PROJECT_COMMITMENT_EXPOSURE_STATUSES = ["visible", "withdrawn", "redacted"] as const;
export type ProjectCommitmentExposureStatus = (typeof PROJECT_COMMITMENT_EXPOSURE_STATUSES)[number];

export const PROJECT_COMMITMENT_EXPOSURE_KINDS = ["automatic", "manual", "backfill"] as const;
export type ProjectCommitmentExposureKind = (typeof PROJECT_COMMITMENT_EXPOSURE_KINDS)[number];

export const PROJECT_COMMITMENT_ACTOR_TYPES = ["internal_user", "recipient", "system"] as const;
export type ProjectCommitmentActorType = (typeof PROJECT_COMMITMENT_ACTOR_TYPES)[number];

export type ProjectCommitmentSourceIdentity = {
  sourceType: ProjectCommitmentEventSourceType;
  sourceId: string;
  sourceVersionId: string | null;
};
