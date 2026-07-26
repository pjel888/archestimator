export const PROJECT_ARTIFACT_STATUSES = ["initializing", "active", "archived", "tombstoned"] as const;
export type ProjectArtifactStatus = (typeof PROJECT_ARTIFACT_STATUSES)[number];

export const PROJECT_ARTIFACT_TYPES = [
  "drawing",
  "design_proposal",
  "contract",
  "quotation",
  "site_instruction",
  "change_order",
  "correspondence",
  "photo",
  "evidence",
  "specification",
  "report",
  "other",
] as const;
export type ProjectArtifactType = (typeof PROJECT_ARTIFACT_TYPES)[number];

export const PROJECT_ARTIFACT_VERSION_SOURCE_KINDS = [
  "internal_upload",
  "recipient_upload",
  "email_export",
  "message_snapshot",
  "imported_reference",
] as const;
export type ProjectArtifactVersionSourceKind = (typeof PROJECT_ARTIFACT_VERSION_SOURCE_KINDS)[number];

export const PROJECT_ARTIFACT_AVAILABILITY_STATES = ["pending_scan", "available", "blocked", "withdrawn"] as const;
export type ProjectArtifactAvailabilityState = (typeof PROJECT_ARTIFACT_AVAILABILITY_STATES)[number];

export type ProjectArtifactVersionIdentity = {
  artifactId: string;
  versionId: string;
  versionNumber: number;
  contentSha256: string;
};

export const PROJECT_ARTIFACT_ACTOR_TYPES = ["internal_user", "recipient", "system"] as const;
export type ProjectArtifactActorType = (typeof PROJECT_ARTIFACT_ACTOR_TYPES)[number];

export type ProjectArtifactActor = {
  id: string;
  type: ProjectArtifactActorType;
  domainRole?: string | null;
};

export type ProjectArtifactVersion = {
  id: string;
  workspaceId: string;
  projectId: string;
  artifactId: string;
  versionNumber: number;
  revisionLabel: string | null;
  uploadAssetId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  contentSha256: string;
  sourceKind: ProjectArtifactVersionSourceKind;
  sourcePlatform: string | null;
  sourceReferenceUrl: string | null;
  originalAuthoredAt: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdByActorType: ProjectArtifactActorType;
  createdByActorId: string;
  createdByDomainRoleSnapshot: string | null;
  createdAt: string;
  supersedesVersionId: string | null;
};

export type ProjectArtifact = {
  id: string;
  workspaceId: string;
  projectId: string;
  artifactCode: string | null;
  title: string;
  artifactType: ProjectArtifactType;
  discipline: string | null;
  description: string | null;
  status: ProjectArtifactStatus;
  currentVersionId: string | null;
  currentVersion: ProjectArtifactVersion | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProjectArtifactRetentionState = {
  issuedReferences: number;
  baselineReferences: number;
  activeLegalHolds: number;
  retentionPolicyBlocksRemoval: boolean;
};
