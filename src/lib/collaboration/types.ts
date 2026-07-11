import type { ProjectEstimateCollaborationRole } from "@/lib/auth/roles";

export type CollaborationRole = ProjectEstimateCollaborationRole;

type ProjectCollaboratorSource = "project" | "workspace" | "sheet";

export type ProjectCollaboratorSummary = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: CollaborationRole;
  source: ProjectCollaboratorSource;
  /** Present only to project-roster readers; required for direct-grant mutation controls. */
  directProjectRole?: CollaborationRole | null;
  online: boolean;
};

export type EligibleProjectMemberCandidate = {
  id: string;
  displayName: string;
  email: string | null;
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
  currentUserRole?: CollaborationRole;
  /** Present only when the manager is also authorized to read the project roster. */
  eligibleMemberCandidates?: EligibleProjectMemberCandidate[];
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
  canManage?: boolean;
};

export type ProjectCollaborationSummary = {
  projectId: string;
  workspaceId: string;
  currentUserId?: string;
  currentUserRole: CollaborationRole;
  canManageAccess: boolean;
  collaborators: ProjectCollaboratorSummary[];
  /** Manager-only same-workspace profiles without a direct project grant. */
  eligibleProjectMemberCandidates?: EligibleProjectMemberCandidate[];
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
