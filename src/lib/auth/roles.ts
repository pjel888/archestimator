export const APP_PLATFORM_ROLES = ["ceo", "admin", "member"] as const;
export type AppPlatformRole = (typeof APP_PLATFORM_ROLES)[number];
export type PlatformAdminRole = Extract<AppPlatformRole, "ceo" | "admin">;

export const WORKSPACE_ACCOUNT_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type WorkspaceAccountRole = (typeof WORKSPACE_ACCOUNT_ROLES)[number];

export const PROJECT_ESTIMATE_COLLABORATION_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export type ProjectEstimateCollaborationRole = (typeof PROJECT_ESTIMATE_COLLABORATION_ROLES)[number];

// Public-share authority is token/session-scoped, not a signed-in app role.
export type PublicShareRecipientAuthority = {
  kind: "public-share-recipient";
  shareTokenHash: string;
  sessionId: string | null;
};

export function isAppPlatformRole(value: unknown): value is AppPlatformRole {
  return typeof value === "string" && APP_PLATFORM_ROLES.includes(value as AppPlatformRole);
}

export function normalizeAppPlatformRole(value: unknown): AppPlatformRole {
  return isAppPlatformRole(value) ? value : "member";
}

export function isPlatformAdminRole(value: unknown): value is PlatformAdminRole {
  return value === "ceo" || value === "admin";
}

export function isWorkspaceAccountRole(value: unknown): value is WorkspaceAccountRole {
  return typeof value === "string" && WORKSPACE_ACCOUNT_ROLES.includes(value as WorkspaceAccountRole);
}

export function toWorkspaceAccountRole(value: unknown): WorkspaceAccountRole | null {
  return isWorkspaceAccountRole(value) ? value : null;
}

export function canManageWorkspaceAccountRole(role: WorkspaceAccountRole | null | undefined) {
  return role === "owner" || role === "admin";
}

// Workspace member is content-edit authority for workspace-owned data.
export function canEditWorkspaceContentRole(role: WorkspaceAccountRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "member";
}

export function isProjectEstimateCollaborationRole(value: unknown): value is ProjectEstimateCollaborationRole {
  return (
    typeof value === "string" &&
    PROJECT_ESTIMATE_COLLABORATION_ROLES.includes(value as ProjectEstimateCollaborationRole)
  );
}

export function toProjectEstimateCollaborationRole(value: unknown): ProjectEstimateCollaborationRole {
  return isProjectEstimateCollaborationRole(value) ? value : "viewer";
}

export function projectEstimateCollaborationRoleRank(role: ProjectEstimateCollaborationRole) {
  if (role === "owner") return 40;
  if (role === "admin") return 30;
  if (role === "editor") return 20;
  return 10;
}

export function canManageProjectEstimateCollaborationRole(role: ProjectEstimateCollaborationRole | null | undefined) {
  return role === "owner" || role === "admin";
}

// Collaboration editor can edit scoped content but cannot manage access/publications.
export function canEditProjectEstimateContentRole(role: ProjectEstimateCollaborationRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "editor";
}
