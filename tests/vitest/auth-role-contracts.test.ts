import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  APP_PLATFORM_ROLES,
  PROJECT_ESTIMATE_COLLABORATION_ROLES,
  WORKSPACE_ACCOUNT_ROLES,
  canEditProjectEstimateContentRole,
  canEditWorkspaceContentRole,
  canManageProjectEstimateCollaborationRole,
  canManageWorkspaceAccountRole,
  isAppPlatformRole,
  isPlatformAdminRole,
  normalizeAppPlatformRole,
  toProjectEstimateCollaborationRole,
  toWorkspaceAccountRole,
} from "@/lib/auth/roles";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("auth role contracts", () => {
  it("keeps active app platform roles narrow", () => {
    expect(APP_PLATFORM_ROLES).toEqual(["ceo", "admin", "member"]);
    expect(isAppPlatformRole("ceo")).toBe(true);
    expect(isAppPlatformRole("admin")).toBe(true);
    expect(isAppPlatformRole("member")).toBe(true);

    for (const staleRole of ["owner", "client", "editor", "viewer", "user", null]) {
      expect(isAppPlatformRole(staleRole)).toBe(false);
      expect(normalizeAppPlatformRole(staleRole)).toBe("member");
      expect(isPlatformAdminRole(staleRole)).toBe(false);
    }

    expect(isPlatformAdminRole("ceo")).toBe(true);
    expect(isPlatformAdminRole("admin")).toBe(true);
    expect(isPlatformAdminRole("member")).toBe(false);
  });

  it("keeps workspace roles separate from collaboration roles", () => {
    expect(WORKSPACE_ACCOUNT_ROLES).toEqual(["owner", "admin", "member", "viewer"]);
    expect(PROJECT_ESTIMATE_COLLABORATION_ROLES).toEqual(["owner", "admin", "editor", "viewer"]);

    expect(toWorkspaceAccountRole("member")).toBe("member");
    expect(toWorkspaceAccountRole("editor")).toBeNull();
    expect(toProjectEstimateCollaborationRole("editor")).toBe("editor");
    expect(toProjectEstimateCollaborationRole("member")).toBe("viewer");
  });

  it("documents content-edit authority separately from manager authority", () => {
    expect(canEditWorkspaceContentRole("member")).toBe(true);
    expect(canManageWorkspaceAccountRole("member")).toBe(false);
    expect(canManageWorkspaceAccountRole("owner")).toBe(true);
    expect(canManageWorkspaceAccountRole("admin")).toBe(true);

    expect(canEditProjectEstimateContentRole("editor")).toBe(true);
    expect(canManageProjectEstimateCollaborationRole("editor")).toBe(false);
    expect(canManageProjectEstimateCollaborationRole("owner")).toBe(true);
    expect(canManageProjectEstimateCollaborationRole("admin")).toBe(true);
  });

  it("removes the stale wide AppRole from database row types", () => {
    const databaseTypes = read("src/lib/types/database.ts");
    const profileStore = read("src/lib/auth/profile-d1-store.ts");
    const roleContracts = read("src/lib/auth/roles.ts");
    const workspaceRepository = read("src/lib/repositories/workspace-repository.ts");

    expect(databaseTypes).not.toContain('export type AppRole = "owner" | "admin" | "member" | "client" | "ceo"');
    expect(databaseTypes).toContain("role: AppPlatformRole");
    expect(workspaceRepository).not.toContain('role: "owner" | "admin" | "member" | "client" | "ceo"');
    expect(workspaceRepository).toContain("role: AppPlatformRole");
    expect(profileStore).toContain("normalizeAppPlatformRole(row.role)");
    expect(roleContracts).toContain("PublicShareRecipientAuthority");
    expect(roleContracts).toContain("Workspace member is content-edit authority");
    expect(roleContracts).toContain("Collaboration editor can edit scoped content but cannot manage access/publications");
  });
});
