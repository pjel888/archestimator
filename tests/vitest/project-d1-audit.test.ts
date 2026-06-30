import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  recordMassDeletionStorageCleanupResultInD1,
  recordProjectMetadataUpdatedEventInD1,
} from "@/lib/projects/d1-audit";

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first() {
    return null;
  }

  async all() {
    return { results: [] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("insert into mass_deletion_storage_cleanup_results")) {
      const [, targetEventId, cleanupResultJson, createdAt, updatedAt] = this.values;
      this.database.cleanupResults.set(String(targetEventId), {
        cleanup_result_json: String(cleanupResultJson),
        created_at: String(createdAt),
        target_event_id: String(targetEventId),
        updated_at: String(updatedAt),
      });
    }
    if (normalizedSql.includes("insert into collaboration_audit_events")) {
      const [
        id,
        invitationId,
        projectId,
        estimateId,
        actorUserId,
        eventType,
        metadataJson,
        createdAt,
      ] = this.values;
      this.database.auditEvents.push({
        actor_user_id: actorUserId as string | null,
        created_at: String(createdAt),
        estimate_id: estimateId as string | null,
        event_type: String(eventType),
        id: String(id),
        invitation_id: invitationId as string | null,
        metadata_json: String(metadataJson),
        project_id: projectId as string | null,
      });
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  auditEvents: Array<Record<string, string | null>> = [];
  cleanupResults = new Map<string, Record<string, string>>();

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

describe("Cloudflare D1 project audit sidecars", () => {
  it("stores mass-deletion cleanup results by Supabase audit event id", async () => {
    const database = new FakeD1Database();

    await recordMassDeletionStorageCleanupResultInD1(database, {
      targetEventId: "event-1",
      cleanupResult: {
        failed: [],
        rejected: [],
        removed: [{ bucket: "project-images", path: "workspace/project-images/file.webp" }],
      },
    });

    const row = database.cleanupResults.get("event-1");
    expect(row?.target_event_id).toBe("event-1");
    expect(JSON.parse(String(row?.cleanup_result_json))).toEqual({
      failed: [],
      rejected: [],
      removed: [{ bucket: "project-images", path: "workspace/project-images/file.webp" }],
    });
  });

  it("writes project metadata update events into the D1 collaboration audit log", async () => {
    const database = new FakeD1Database();

    await recordProjectMetadataUpdatedEventInD1(database, {
      actorUserId: "user-1",
      changedFields: ["name", "client_name"],
      projectId: "project-1",
    });

    expect(database.auditEvents).toHaveLength(1);
    expect(database.auditEvents[0]).toMatchObject({
      actor_user_id: "user-1",
      event_type: "project_metadata_updated",
      project_id: "project-1",
    });
    expect(JSON.parse(String(database.auditEvents[0].metadata_json))).toEqual({
      changed_fields: ["name", "client_name"],
    });
  });

  it("keeps project audit sidecars off Supabase service-role clients", () => {
    const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const d1Audit = readFileSync("src/lib/projects/d1-audit.ts", "utf8");
    const migration = readFileSync("migrations/0012_project_audit_sidecars.sql", "utf8");

    expect(actions).toContain("recordProjectMetadataUpdatedEventInCloudflareD1");
    expect(d1Audit).toContain("getCloudflareD1Database");
    expect(migration).toContain("mass_deletion_storage_cleanup_results");
    expect(`${actions}\n${d1Audit}`).not.toMatch(/createSupabaseServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js/);
  });
});
