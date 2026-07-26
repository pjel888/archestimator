export const PROJECT_CHANGE_REQUEST_STATUSES = [
  "initializing",
  "submitted",
  "acknowledged",
  "under_assessment",
  "proposal_issued",
  "resolved",
  "rejected",
  "withdrawn",
] as const;
export type ProjectChangeRequestStatus = (typeof PROJECT_CHANGE_REQUEST_STATUSES)[number];

export const PROJECT_CHANGE_REQUEST_TARGET_KINDS = [
  "project",
  "estimate",
  "estimate_tab",
  "area_group",
  "row",
  "artifact",
  "discipline",
  "location",
  "other",
] as const;
export type ProjectChangeRequestTargetKind = (typeof PROJECT_CHANGE_REQUEST_TARGET_KINDS)[number];

export const PROJECT_CHANGE_REQUEST_ARTIFACT_RELATIONSHIPS = [
  "evidence",
  "reference",
  "markup",
  "instruction",
  "correspondence",
  "supporting_document",
] as const;
export type ProjectChangeRequestArtifactRelationship = (typeof PROJECT_CHANGE_REQUEST_ARTIFACT_RELATIONSHIPS)[number];

export const PROJECT_CHANGE_REQUEST_ACTOR_TYPES = ["internal_user", "recipient", "system"] as const;
export type ProjectChangeRequestActorType = (typeof PROJECT_CHANGE_REQUEST_ACTOR_TYPES)[number];

export type ProjectChangeRequestVersionIdentity = {
  requestId: string;
  versionId: string;
  versionNumber: number;
  contentHash: string;
};

export const PROJECT_CHANGE_REQUEST_SOURCE_KINDS = [
  "client_portal",
  "verbal",
  "email",
  "site",
  "other",
] as const;
export type ProjectChangeRequestSourceKind = (typeof PROJECT_CHANGE_REQUEST_SOURCE_KINDS)[number];

export type ProjectChangeRequestActor = {
  id: string;
  type: ProjectChangeRequestActorType;
  name?: string | null;
  email?: string | null;
  domainRole?: string | null;
  permissionRole?: string | null;
  organization?: string | null;
};

export type ProjectChangeRequestTarget = {
  id: string;
  kind: ProjectChangeRequestTargetKind;
  label: string;
  estimateId?: string | null;
  estimateTabId?: string | null;
  nodeId?: string | null;
  rowId?: string | null;
  artifactId?: string | null;
  disciplineKey?: string | null;
  locationKey?: string | null;
  otherKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type ProjectChangeRequestArtifactLink = {
  artifactVersionId: string;
  relationship: ProjectChangeRequestArtifactRelationship;
  sortOrder: number;
};

export type ProjectChangeRequestVersion = ProjectChangeRequestVersionIdentity & {
  title: string;
  description: string;
  reason: string | null;
  requestedEffectiveDate: string | null;
  metadata: Record<string, unknown>;
  createdByActorType: ProjectChangeRequestActorType;
  createdByActorId: string;
  createdAt: string;
  supersedesVersionId: string | null;
  targets: ProjectChangeRequestTarget[];
  artifacts: ProjectChangeRequestArtifactLink[];
};

export type ProjectChangeRequestExposure = {
  requestId: string;
  portalId: string;
  publicRequestId: string;
  status: "visible" | "withdrawn" | "redacted";
  exposureKind: "automatic" | "manual" | "backfill";
  policySnapshot: Record<string, unknown>;
  exposedByActorType: ProjectChangeRequestActorType;
  exposedByActorId: string;
  exposedAt: string;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
};

export type ProjectChangeRequest = {
  id: string;
  workspaceId: string;
  projectId: string;
  originPortalId: string | null;
  requestNumber: number;
  requestCode: string;
  currentVersionId: string;
  currentVersion: ProjectChangeRequestVersion;
  status: Exclude<ProjectChangeRequestStatus, "initializing">;
  requestedByActorType: ProjectChangeRequestActorType;
  requestedByActorId: string;
  requestedByNameSnapshot: string | null;
  requestedByEmailSnapshot: string | null;
  requestedByDomainRoleSnapshot: string | null;
  requestedByPermissionRoleSnapshot: string | null;
  requestedByOrganizationSnapshot: string | null;
  requestedAt: string;
  acknowledgedByUserId: string | null;
  acknowledgedAt: string | null;
  assessmentOwnerUserId: string | null;
  resolvedByIssueId: string | null;
  resolvedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};
