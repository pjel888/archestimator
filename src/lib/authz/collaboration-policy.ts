import {
  canEditProjectEstimateContentRole,
  canManageProjectEstimateCollaborationRole,
  projectEstimateCollaborationRoleRank,
  type ProjectEstimateCollaborationRole,
} from "@/lib/auth/roles";

export type CollaborationGrantSource = "platform" | "workspace" | "project" | "estimate";

export type CollaborationGrant = {
  source: CollaborationGrantSource;
  role: ProjectEstimateCollaborationRole;
  estimateId?: string;
};

export type CollaborationDecisionReason =
  | "platform_admin"
  | "workspace_or_project_grant"
  | "direct_estimate_grant"
  | "inheritance_restricted"
  | "no_grant"
  | "scope_mismatch";

export type EffectiveCollaborationAccess = {
  role: ProjectEstimateCollaborationRole | null;
  source: CollaborationGrantSource | null;
  reason: CollaborationDecisionReason;
  authorizedEstimateIds: readonly string[];
};

export type CollaborationPolicyAction =
  | "read_project"
  | "edit_project"
  | "manage_project_access"
  | "read_estimate"
  | "edit_estimate"
  | "manage_estimate_access"
  | "subscribe_project_room"
  | "subscribe_estimate_room";

const SOURCE_PRIORITY: Record<CollaborationGrantSource, number> = {
  platform: 4,
  workspace: 3,
  project: 2,
  estimate: 1,
};

function pickHigherGrant(left: CollaborationGrant | null, right: CollaborationGrant): CollaborationGrant {
  if (!left) return right;
  const rankDifference = projectEstimateCollaborationRoleRank(right.role) - projectEstimateCollaborationRoleRank(left.role);
  if (rankDifference !== 0) return rankDifference > 0 ? right : left;
  return SOURCE_PRIORITY[right.source] > SOURCE_PRIORITY[left.source] ? right : left;
}

function isProjectGrant(grant: CollaborationGrant) {
  return grant.source === "platform" || grant.source === "workspace" || grant.source === "project";
}

/**
 * Computes the effective access for one resource without relying on client
 * filtering. A restricted estimate ignores inherited grants; otherwise a
 * direct grant can only raise, never lower, inherited authority.
 */
export function resolveEffectiveCollaborationAccess(input: {
  grants: readonly CollaborationGrant[];
  estimateId?: string;
  inheritProjectAccess?: boolean;
}): EffectiveCollaborationAccess {
  const estimateId = input.estimateId;
  const inheritedGrants = input.grants.filter(isProjectGrant);
  const directGrants = input.grants.filter((grant) => grant.source === "estimate" && grant.estimateId === estimateId);
  const authorizedEstimateIds = [...new Set(
    input.grants
      .filter((grant) => grant.source === "estimate" && typeof grant.estimateId === "string")
      .map((grant) => grant.estimateId as string),
  )].sort();

  let effective: CollaborationGrant | null = null;
  const includeInherited = estimateId === undefined || input.inheritProjectAccess !== false;
  if (includeInherited) {
    for (const grant of inheritedGrants) effective = pickHigherGrant(effective, grant);
  }
  for (const grant of directGrants) effective = pickHigherGrant(effective, grant);

  if (effective) {
    return {
      role: effective.role,
      source: effective.source,
      reason: effective.source === "platform"
        ? "platform_admin"
        : effective.source === "estimate"
          ? "direct_estimate_grant"
          : "workspace_or_project_grant",
      authorizedEstimateIds,
    };
  }

  return {
    role: null,
    source: null,
    reason: estimateId !== undefined && input.inheritProjectAccess === false && inheritedGrants.length > 0
      ? "inheritance_restricted"
      : "no_grant",
    authorizedEstimateIds,
  };
}

export function canPerformCollaborationAction(
  access: EffectiveCollaborationAccess,
  action: CollaborationPolicyAction,
): boolean {
  if (!access.role) return false;
  const hasWholeProjectAccess = access.source !== "estimate";
  switch (action) {
    case "read_project":
    case "subscribe_project_room":
      return hasWholeProjectAccess;
    case "edit_project":
    case "manage_project_access":
      return hasWholeProjectAccess && (action === "edit_project"
        ? canEditProjectEstimateContentRole(access.role)
        : canManageProjectEstimateCollaborationRole(access.role));
    case "read_estimate":
    case "subscribe_estimate_room":
      return true;
    case "edit_estimate":
      return canEditProjectEstimateContentRole(access.role);
    case "manage_estimate_access":
      return canManageProjectEstimateCollaborationRole(access.role);
  }
}

export type CollaborationRoleMutationDecision =
  | { allowed: true }
  | { allowed: false; reason: "actor_not_manager" | "owner_requires_transfer" | "target_not_lower" };

export function canAssignCollaborationRole(
  actorRole: ProjectEstimateCollaborationRole | null,
  requestedRole: ProjectEstimateCollaborationRole,
): CollaborationRoleMutationDecision {
  if (!canManageProjectEstimateCollaborationRole(actorRole)) return { allowed: false, reason: "actor_not_manager" };
  if (requestedRole === "owner") return { allowed: false, reason: "owner_requires_transfer" };
  if (projectEstimateCollaborationRoleRank(requestedRole) >= projectEstimateCollaborationRoleRank(actorRole)) {
    return { allowed: false, reason: "target_not_lower" };
  }
  return { allowed: true };
}

export function canMutateCollaborationTarget(
  actorRole: ProjectEstimateCollaborationRole | null,
  targetRole: ProjectEstimateCollaborationRole,
): CollaborationRoleMutationDecision {
  if (!canManageProjectEstimateCollaborationRole(actorRole)) return { allowed: false, reason: "actor_not_manager" };
  if (targetRole === "owner") return { allowed: false, reason: "owner_requires_transfer" };
  if (projectEstimateCollaborationRoleRank(targetRole) >= projectEstimateCollaborationRoleRank(actorRole)) {
    return { allowed: false, reason: "target_not_lower" };
  }
  return { allowed: true };
}
