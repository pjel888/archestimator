export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE";

export type DeleteAccountBlocker = {
  code: "sole_owner_with_members" | "sole_corporate_owner_with_members" | "unavailable";
  message: string;
  workspaceId?: string;
  workspaceName?: string;
  corporateAccountId?: string;
  corporateAccountName?: string;
  otherMemberCount: number;
};

export type DeleteAccountPreview = {
  ok: boolean;
  blockers: DeleteAccountBlocker[];
  closedWorkspaceIds: string[];
  leftWorkspaceIds: string[];
  closedWorkspaceNames: string[];
  leftWorkspaceNames: string[];
  publicationRevokeCount: number;
  portalDisableCount: number;
  pendingInviteRevokeCount: number;
};

export function validateDeleteAccountConfirmation(value: string) {
  return value.trim() === DELETE_ACCOUNT_CONFIRMATION_PHRASE;
}
