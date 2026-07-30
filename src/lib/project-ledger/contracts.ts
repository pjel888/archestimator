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

export type ProjectCommitmentExposureKind = "automatic" | "manual" | "backfill";

export type ProjectCommitmentActorType = "internal_user" | "recipient" | "system";
