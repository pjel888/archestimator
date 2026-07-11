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
});
