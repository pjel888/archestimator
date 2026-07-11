import { describe, expect, it } from "vitest";

import {
  canAssignCollaborationRole,
  canMutateCollaborationTarget,
  canPerformCollaborationAction,
  resolveEffectiveCollaborationAccess,
} from "@/lib/authz/collaboration-policy";

describe("canonical collaboration policy", () => {
  it("keeps direct sheet access scoped away from whole-project reads and rooms", () => {
    const access = resolveEffectiveCollaborationAccess({
      estimateId: "estimate-1",
      inheritProjectAccess: false,
      grants: [{ source: "estimate", estimateId: "estimate-1", role: "editor" }],
    });

    expect(access).toMatchObject({
      role: "editor",
      source: "estimate",
      reason: "direct_estimate_grant",
      authorizedEstimateIds: ["estimate-1"],
    });
    expect(canPerformCollaborationAction(access, "read_estimate")).toBe(true);
    expect(canPerformCollaborationAction(access, "edit_estimate")).toBe(true);
    expect(canPerformCollaborationAction(access, "manage_estimate_access")).toBe(false);
    expect(canPerformCollaborationAction(access, "read_project")).toBe(false);
    expect(canPerformCollaborationAction(access, "subscribe_project_room")).toBe(false);
  });

  it("allows direct grants to raise but never lower inherited access", () => {
    const access = resolveEffectiveCollaborationAccess({
      estimateId: "estimate-1",
      grants: [
        { source: "project", role: "admin" },
        { source: "estimate", estimateId: "estimate-1", role: "viewer" },
      ],
    });

    expect(access).toMatchObject({ role: "admin", source: "project", reason: "workspace_or_project_grant" });
    expect(canPerformCollaborationAction(access, "manage_estimate_access")).toBe(true);
  });

  it("makes estimate restriction fail closed against inherited authority", () => {
    const access = resolveEffectiveCollaborationAccess({
      estimateId: "estimate-1",
      inheritProjectAccess: false,
      grants: [{ source: "project", role: "admin" }],
    });

    expect(access).toEqual({
      role: null,
      source: null,
      reason: "inheritance_restricted",
      authorizedEstimateIds: [],
    });
    expect(canPerformCollaborationAction(access, "read_estimate")).toBe(false);
  });

  it("enforces manager and target-dominance floors for all role mutations", () => {
    expect(canAssignCollaborationRole("admin", "editor")).toEqual({ allowed: true });
    expect(canAssignCollaborationRole("admin", "admin")).toEqual({ allowed: false, reason: "target_not_lower" });
    expect(canAssignCollaborationRole("admin", "owner")).toEqual({ allowed: false, reason: "owner_requires_transfer" });
    expect(canAssignCollaborationRole("editor", "viewer")).toEqual({ allowed: false, reason: "actor_not_manager" });
    expect(canMutateCollaborationTarget("owner", "admin")).toEqual({ allowed: true });
    expect(canMutateCollaborationTarget("admin", "owner")).toEqual({ allowed: false, reason: "owner_requires_transfer" });
  });
});
