export type CollaborationRole = "owner" | "admin" | "editor" | "viewer";

type ProjectCollaboratorSource = "project" | "workspace" | "sheet";

export type ProjectCollaboratorSummary = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: CollaborationRole;
  source: ProjectCollaboratorSource;
  online: boolean;
};

export type EstimateSheetMemberSummary = ProjectCollaboratorSummary & {
  estimateId: string;
};

export type EstimateSheetAccessMode = "inherits-project" | "sheet-overrides" | "restricted";

export type EstimateSheetAccessSummary = {
  estimateId: string;
  sheetCode: string;
  name: string;
  accessMode: EstimateSheetAccessMode;
  overrideCount: number;
  canManageAccess: boolean;
  members: EstimateSheetMemberSummary[];
};

export type CollaborationInvitationSummary = {
  id: string;
  email: string;
  role: CollaborationRole;
  scope: "project" | "estimate";
  estimateId: string | null;
  expiresAt: string;
  invitePath?: string | null;
  tokenHint?: string | null;
};

export type ProjectCollaborationSummary = {
  projectId: string;
  workspaceId: string;
  currentUserId?: string;
  currentUserRole: CollaborationRole;
  canManageAccess: boolean;
  collaborators: ProjectCollaboratorSummary[];
  pendingInvitations: CollaborationInvitationSummary[];
  estimateSheets: EstimateSheetAccessSummary[];
  realtime: {
    privateChannels: true;
    projectChannel: `project:${string}`;
    estimateChannelPrefix: "estimate:";
    presenceTransport: "presence";
    cursorTransport: "broadcast";
  };
};
