import { describe, expect, it } from "vitest";

import {
  composePublisherRosterResult,
  type PublisherRosterProjectInput,
  type PublisherRosterPublicationInput,
} from "@/lib/publisher/roster-repository";
import type { PublisherRosterFilters } from "@/lib/publisher/roster-filter";
import type { CollaborationRole } from "@/lib/collaboration/types";

const filters: PublisherRosterFilters = {
  page: 1,
  pageSize: 50,
  projectId: null,
  search: "",
  status: "all",
};

function canReadRole(role: CollaborationRole) {
  return role !== "viewer";
}

function canManageRole(role: CollaborationRole) {
  return role === "owner" || role === "admin";
}

function project(
  id: string,
  role: CollaborationRole,
  options: { canReadPublicationRoster?: boolean; canManagePublication?: boolean } = {},
): PublisherRosterProjectInput {
  return {
    canManagePublication: options.canManagePublication ?? canManageRole(role),
    canReadPublicationRoster: options.canReadPublicationRoster ?? canReadRole(role),
    clientName: null,
    currentUserRole: role,
    id,
    location: null,
    name: `${role} project ${id}`,
    projectCode: null,
    workspaceId: "workspace-1",
  };
}

function publication(id: string, projectId: string, workspaceId = "workspace-1"): PublisherRosterPublicationInput {
  return {
    encryptedToken: null,
    expiresAt: null,
    id,
    latestOpenedAt: null,
    openCount: 0,
    passwordRequired: false,
    projectId,
    publishedAt: "2026-06-20T00:00:00.000Z",
    revokedAt: null,
    selectedEstimateIds: [],
    snapshotJson: { generatedAt: "2026-06-20T00:00:00.000Z" },
    snapshotVersion: 1,
    status: "published",
    workspaceId,
  };
}

describe("Publisher roster RBAC contract", () => {
  it("hides all publications from a viewer-only project scope", () => {
    const result = composePublisherRosterResult({
      filters,
      projects: [project("project-viewer", "viewer")],
      publications: [publication("pub-viewer", "project-viewer")],
    });

    expect(result.rows).toEqual([]);
  });

  it("shows only the editor's accessible project publications", () => {
    const result = composePublisherRosterResult({
      filters,
      projects: [
        project("project-editor", "editor"),
        project("project-viewer", "viewer"),
      ],
      publications: [
        publication("pub-editor", "project-editor"),
        publication("pub-viewer", "project-viewer"),
      ],
    });

    expect(result.rows.map((row) => row.publicationId)).toEqual(["pub-editor"]);
    expect(result.rows[0]?.currentUserRole).toBe("editor");
    expect(result.rows[0]?.canManagePublication).toBe(false);
  });

  it("does not synthesize draft rows for editor-only project scopes", () => {
    const result = composePublisherRosterResult({
      filters,
      projects: [project("project-editor", "editor")],
      publications: [],
    });

    expect(result.rows).toEqual([]);
  });

  it("shows all scoped publications for admin and owner roles", () => {
    const result = composePublisherRosterResult({
      filters,
      projects: [
        project("project-admin", "admin"),
        project("project-owner", "owner"),
      ],
      publications: [
        publication("pub-admin", "project-admin"),
        publication("pub-owner", "project-owner"),
      ],
    });

    expect(new Set(result.rows.map((row) => row.publicationId))).toEqual(new Set(["pub-admin", "pub-owner"]));
  });

  it("does not surface publications outside the current project scope", () => {
    const result = composePublisherRosterResult({
      filters,
      projects: [],
      publications: [publication("pub-foreign", "project-foreign", "workspace-foreign")],
    });

    expect(result.rows).toEqual([]);
  });
});
