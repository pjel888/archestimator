import { describe, expect, it, vi } from "vitest";

import { createPublicationAdminD1Client } from "@/lib/publication/admin-d1-client";

describe("project publication immutable issuance", () => {
  it("persists an immutable issue identity and supersession marker with the replacement snapshot", async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      batch: vi.fn().mockResolvedValue([]),
      prepare(sql: string) {
        const statement = {
          bind(...values: unknown[]) {
            prepared.push({ sql, values });
            return statement;
          },
          first: vi.fn(async () => {
            if (sql.includes("FROM projects")) return { id: "project-1" };
            if (sql.includes("MAX(snapshot_version)")) return { snapshot_version: 4 };
            if (sql.includes("status = 'published'")) return { snapshot_version: 4 };
            return null;
          }),
          run: vi.fn(),
        };
        return statement;
      },
    };
    const admin = createPublicationAdminD1Client(Promise.resolve(database as never));

    const result = await admin.callProcedure<string>("replace_project_publication", {
      p_activity_target_labels_json: {},
      p_encrypted_token: "encrypted-token",
      p_expires_at: "2026-12-31T00:00:00.000Z",
      p_location_visibility: "locality",
      p_password_hash: null,
      p_published_by: "user-1",
      p_selected_estimate_ids: ["estimate-1"],
      p_snapshot_json: {
        estimates: [],
        project: { senderName: "Owner One" },
        schemaVersion: 1.3,
      },
      p_token_hash: "token-hash",
      target_project_id: "project-1",
      target_workspace_id: "workspace-1",
    });

    expect(result.error).toBeNull();
    const insert = prepared.find(({ sql }) => sql.includes("INSERT INTO project_publications"));
    expect(insert).toBeDefined();
    const snapshot = JSON.parse(String(insert?.values[6]));
    expect(snapshot.issuance).toEqual({
      assumptions: [],
      exclusions: [],
      issueNumber: 5,
      issuedAt: expect.any(String),
      selectedEstimateIds: ["estimate-1"],
      senderName: "Owner One",
      supersedes: { issueNumber: 4, version: 4 },
      validThrough: "2026-12-31T00:00:00.000Z",
      version: 5,
    });
  });

  it("returns source-changed when the guarded replacement header writes zero rows", async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      batch: vi.fn().mockResolvedValue([
        { success: true, meta: { changes: 0 } },
        { success: true, meta: { changes: 0 } },
        { success: true, meta: { changes: 0 } },
      ]),
      prepare(sql: string) {
        const statement = {
          bind(...values: unknown[]) {
            prepared.push({ sql, values });
            return statement;
          },
          first: vi.fn(async () => {
            if (sql.includes("FROM projects")) return { id: "project-1", publication_source_revision: 8 };
            if (sql.includes("MAX(snapshot_version)")) return { snapshot_version: 4 };
            if (sql.includes("status = 'published'")) return { snapshot_version: 4 };
            return null;
          }),
          run: vi.fn(),
        };
        return statement;
      },
    };
    const admin = createPublicationAdminD1Client(Promise.resolve(database as never));

    const result = await admin.callProcedure<string>("replace_project_publication", {
      p_activity_target_labels_json: {},
      p_encrypted_token: "encrypted-token",
      p_expected_source_revision: 7,
      p_expires_at: null,
      p_location_visibility: "locality",
      p_password_hash: null,
      p_published_by: "user-1",
      p_selected_estimate_ids: ["estimate-1"],
      p_snapshot_json: { estimates: [], schemaVersion: 1.6, sourceRevision: 7 },
      p_token_hash: "token-hash",
      target_project_id: "project-1",
      target_workspace_id: "workspace-1",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("Publication source changed before commit");
    const revoke = prepared.find(({ sql }) => sql.includes("UPDATE project_publications"));
    const header = prepared.find(({ sql }) => sql.includes("INSERT INTO project_publications"));
    const activation = prepared.find(({ sql }) => sql.includes("INSERT OR IGNORE INTO beta_activation_outbox"));
    expect(revoke?.sql).toContain("source_project.publication_source_revision = ?");
    expect(header?.sql).toContain("source_project.publication_source_revision = ?");
    expect(header?.values.at(-1)).toBe(7);
    expect(activation?.sql).toContain("WHERE EXISTS");
    expect(database.batch).toHaveBeenCalledOnce();
  });

  it("leaves credentials and recipients unchanged when rotation loses the revision fence", async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      batch: vi.fn().mockResolvedValue([
        { success: true, meta: { changes: 0 } },
        { success: true, meta: { changes: 0 } },
      ]),
      prepare(sql: string) {
        const statement = {
          bind(...values: unknown[]) {
            prepared.push({ sql, values });
            return statement;
          },
          first: vi.fn(async () => sql.includes("FROM project_publications")
            ? {
                encrypted_token: "encrypted-old-token",
                expires_at: null,
                project_id: "project-1",
                revoked_at: null,
                snapshot_version: 4,
                status: "published",
              }
            : null),
          run: vi.fn(),
        };
        return statement;
      },
    };
    const admin = createPublicationAdminD1Client(Promise.resolve(database as never));

    const result = await admin.callProcedure<number>("rotate_project_publication_credentials", {
      expected_encrypted_token: "encrypted-old-token",
      p_activity_target_labels_json: {},
      p_encrypted_token: "encrypted-new-token",
      p_expected_source_revision: 7,
      p_password_hash: null,
      p_selected_estimate_ids: ["estimate-1"],
      p_snapshot_json: { estimates: [], schemaVersion: 1.6, sourceRevision: 7 },
      p_token_hash: "new-token-hash",
      target_publication_id: "publication-1",
    });

    expect(result).toEqual({ data: -1, error: null });
    const credentialUpdate = prepared.find(({ sql }) => sql.includes("SET token_hash"));
    const recipientUpdate = prepared.find(({ sql }) => sql.includes("UPDATE shared_link_recipients"));
    expect(credentialUpdate?.sql).toContain("source_project.publication_source_revision = ?");
    expect(credentialUpdate?.values.at(-1)).toBe(7);
    expect(recipientUpdate?.sql).toContain("committed_publication.encrypted_token = ?");
    expect(database.batch).toHaveBeenCalledOnce();
  });
});
