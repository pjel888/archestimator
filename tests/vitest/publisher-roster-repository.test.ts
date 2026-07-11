import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  composePublisherRosterResult,
  PUBLISHER_ROSTER_CHILD_SCAN_LIMIT,
  PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT,
  type PublisherRosterProjectInput,
  type PublisherRosterPublicationInput,
} from "@/lib/publisher/roster-repository";
import type { PublisherRosterFilters } from "@/lib/publisher/roster-filter";
import { encryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";

const defaultFilters: PublisherRosterFilters = {
  page: 1,
  pageSize: 50,
  projectId: null,
  search: "",
  status: "all",
};

const projects: PublisherRosterProjectInput[] = [
  {
    canManagePublication: true,
    canReadPublicationRoster: true,
    clientName: "Lewis Family",
    currentUserRole: "owner",
    id: "project-active",
    location: "Makati",
    name: "Lewis Residence",
    projectCode: "LR-001",
    workspaceId: "workspace-1",
  },
  {
    canManagePublication: false,
    canReadPublicationRoster: true,
    clientName: "Maya Co",
    currentUserRole: "editor",
    id: "project-stale",
    location: null,
    name: "Maya Hotel",
    projectCode: "MH-002",
    workspaceId: "workspace-1",
  },
  {
    canManagePublication: true,
    canReadPublicationRoster: true,
    clientName: "Revoked Client",
    currentUserRole: "admin",
    id: "project-revoked",
    location: null,
    name: "Revoked Villa",
    projectCode: null,
    workspaceId: "workspace-1",
  },
  {
    canManagePublication: true,
    canReadPublicationRoster: true,
    clientName: null,
    currentUserRole: "owner",
    id: "project-draft",
    location: null,
    name: "Draft Tower",
    projectCode: null,
    workspaceId: "workspace-1",
  },
  {
    canManagePublication: false,
    canReadPublicationRoster: false,
    clientName: "Viewer Client",
    currentUserRole: "viewer",
    id: "project-viewer",
    location: null,
    name: "Viewer Only",
    projectCode: null,
    workspaceId: "workspace-1",
  },
];

const publications: PublisherRosterPublicationInput[] = [
  {
    encryptedToken: null,
    expiresAt: null,
    id: "pub-active",
    latestOpenedAt: "2026-06-20T09:00:00.000Z",
    openCount: 3,
    passwordRequired: false,
    projectId: "project-active",
    publishedAt: "2026-06-10T00:00:00.000Z",
    revokedAt: null,
    selectedEstimateIds: ["estimate-active"],
    snapshotJson: { generatedAt: "2026-06-19T00:00:00.000Z" },
    snapshotVersion: 2,
    status: "published",
    workspaceId: "workspace-1",
  },
  {
    encryptedToken: null,
    expiresAt: null,
    id: "pub-stale",
    latestOpenedAt: "2026-06-12T00:00:00.000Z",
    openCount: 5,
    passwordRequired: true,
    projectId: "project-stale",
    publishedAt: "2026-06-01T00:00:00.000Z",
    revokedAt: null,
    selectedEstimateIds: ["estimate-stale"],
    snapshotJson: { generatedAt: "2026-06-01T00:00:00.000Z" },
    snapshotVersion: 1,
    status: "published",
    workspaceId: "workspace-1",
  },
  {
    encryptedToken: null,
    expiresAt: null,
    id: "pub-revoked",
    latestOpenedAt: null,
    openCount: 0,
    passwordRequired: false,
    projectId: "project-revoked",
    publishedAt: "2026-05-01T00:00:00.000Z",
    revokedAt: "2026-06-15T00:00:00.000Z",
    selectedEstimateIds: [],
    snapshotJson: { generatedAt: "2026-05-01T00:00:00.000Z" },
    snapshotVersion: 3,
    status: "revoked",
    workspaceId: "workspace-1",
  },
  {
    encryptedToken: null,
    expiresAt: null,
    id: "pub-viewer-hidden",
    latestOpenedAt: "2026-06-25T00:00:00.000Z",
    openCount: 10,
    passwordRequired: false,
    projectId: "project-viewer",
    publishedAt: "2026-06-25T00:00:00.000Z",
    revokedAt: null,
    selectedEstimateIds: [],
    snapshotJson: { generatedAt: "2026-06-25T00:00:00.000Z" },
    snapshotVersion: 1,
    status: "published",
    workspaceId: "workspace-1",
  },
];

describe("Publisher roster repository composer", () => {
  it("sorts by latest activity desc, filters viewer rows, and includes manager drafts", () => {
    const result = composePublisherRosterResult({
      estimateRows: [
        { id: "estimate-active", projectId: "project-active", updatedAt: "2026-06-20T00:00:00.000Z" },
        { id: "estimate-stale", projectId: "project-stale", updatedAt: "2026-06-20T00:00:00.000Z" },
      ],
      filters: defaultFilters,
      latestCommentAtByPublicationId: new Map([["pub-stale", "2026-06-23T00:00:00.000Z"]]),
      latestResponseAtByPublicationId: new Map([["pub-active", "2026-06-24T00:00:00.000Z"]]),
      projects,
      publications,
      recipientCountByPublicationId: new Map([
        ["pub-active", 2],
        ["pub-stale", 5],
      ]),
    });

    expect(result.rows.map((row) => row.publicationId ?? `draft:${row.projectId}`)).toEqual([
      "pub-active",
      "pub-stale",
      "pub-revoked",
      "draft:project-draft",
    ]);
    expect(result.rows.find((row) => row.publicationId === "pub-viewer-hidden")).toBeUndefined();
    expect(result.rows.find((row) => row.publicationId === "pub-stale")?.canManagePublication).toBe(false);
    expect(result.rows.find((row) => row.publicationId === "pub-active")?.recipientCount).toBe(2);
    expect(result.projectOptions.map((project) => project.id)).toEqual([
      "project-draft",
      "project-active",
      "project-stale",
      "project-revoked",
    ]);
  });

  it("applies UX status, project, search, and pagination filters", () => {
    const stale = composePublisherRosterResult({
      estimateRows: [{ id: "estimate-stale", projectId: "project-stale", updatedAt: "2026-06-20T00:00:00.000Z" }],
      filters: { ...defaultFilters, status: "stale" },
      projects,
      publications,
    });
    expect(stale.rows.map((row) => row.publicationId)).toEqual(["pub-stale"]);

    const active = composePublisherRosterResult({
      estimateRows: [{ id: "estimate-stale", projectId: "project-stale", updatedAt: "2026-06-20T00:00:00.000Z" }],
      filters: { ...defaultFilters, status: "active" },
      projects,
      publications,
    });
    expect(active.rows.map((row) => row.publicationId)).toEqual(["pub-active"]);

    const draft = composePublisherRosterResult({
      filters: { ...defaultFilters, status: "drafts" },
      projects,
      publications,
    });
    expect(draft.rows.map((row) => row.projectId)).toEqual(["project-draft"]);

    const projectFiltered = composePublisherRosterResult({
      filters: { ...defaultFilters, projectId: "project-active" },
      projects,
      publications,
    });
    expect(projectFiltered.rows.map((row) => row.publicationId)).toEqual(["pub-active"]);

    const searched = composePublisherRosterResult({
      filters: { ...defaultFilters, search: "Lewis" },
      projects,
      publications,
    });
    expect(searched.rows.map((row) => row.projectId)).toEqual(["project-active"]);

    const paginated = composePublisherRosterResult({
      filters: { ...defaultFilters, pageSize: 2 },
      projects,
      publications,
    });
    expect(paginated.rows).toHaveLength(2);
    expect(paginated.totalRows).toBe(4);
    expect(paginated.hasNextPage).toBe(true);
  });

  it("does not synthesize draft rows when the publication scan is truncated", () => {
    const result = composePublisherRosterResult({
      filters: defaultFilters,
      projects: [projects[3]!],
      publications: [],
      truncated: true,
    });

    expect(result.rows).toEqual([]);
    expect(result.truncated).toBe(true);
    expect(result.projectOptions).toEqual([
      {
        id: "project-draft",
        name: "Draft Tower",
        projectCode: null,
      },
    ]);
  });

  it("marks published rows with unavailable links when encrypted token decryption fails", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const result = composePublisherRosterResult({
        filters: defaultFilters,
        projects: [projects[0]!],
        publications: [
          {
            ...publications[0]!,
            encryptedToken: "not-a-valid-encrypted-token",
          },
        ],
      });

      expect(result.rows[0]?.clientLinkPath).toBeNull();
      expect(result.rows[0]?.linkUnavailableReason).toBe("token-unavailable");
      expect(result.rows[0]?.tokenCopyAvailable).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith("[publisher-roster] unable to decrypt publication token", {
        publicationId: "pub-active",
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("redacts copyable bearer links from read-only editor roster rows", () => {
    const tokenSecret = readPublicationTokenEncryptionSecret();
    const result = composePublisherRosterResult({
      filters: defaultFilters,
      projects: [projects[0]!, projects[1]!],
      publications: [
        {
          ...publications[0]!,
          encryptedToken: encryptPublicationToken("manager-token", tokenSecret),
        },
        {
          ...publications[1]!,
          encryptedToken: encryptPublicationToken("editor-token", tokenSecret),
        },
      ],
    });

    const managerRow = result.rows.find((row) => row.publicationId === "pub-active");
    const editorRow = result.rows.find((row) => row.publicationId === "pub-stale");

    expect(managerRow?.clientLinkPath).toBe("/share/manager-token");
    expect(managerRow?.tokenCopyAvailable).toBe(true);
    expect(editorRow?.canManagePublication).toBe(false);
    expect(editorRow?.clientLinkPath).toBeNull();
    expect(editorRow?.tokenCopyAvailable).toBe(false);
    expect(editorRow?.linkUnavailableReason).toBeNull();
  });
});

describe("Publisher roster server repository contract", () => {
  it("stays on Cloudflare D1 and keeps Phase 1 scans bounded", () => {
    const source = readFileSync("src/lib/publisher/roster-repository.ts", "utf8");

    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("listCurrentWorkspaceProjects");
    expect(source).not.toContain("@/lib/supabase");
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).not.toContain("createSupabaseServiceRoleClient");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain(`PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT = ${PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT}`);
    expect(source).toContain(`PUBLISHER_ROSTER_CHILD_SCAN_LIMIT = ${PUBLISHER_ROSTER_CHILD_SCAN_LIMIT}`);
    expect(source).toContain("LIMIT ?");
    expect(source.match(/PUBLISHER_ROSTER_CHILD_SCAN_LIMIT/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).toContain("COUNT(*) AS recipient_count");
    expect(source.match(/MAX\(created_at\) AS latest_created_at/g)?.length ?? 0).toBe(2);
    expect(source.match(/GROUP BY publication_id/g)?.length ?? 0).toBe(3);
    expect(source).toContain("WHERE workspace_id = ? AND project_id IN");
    expect(source).toContain("workspace.id !== workspaceId || currentUser.userId !== userId");
  });
});
