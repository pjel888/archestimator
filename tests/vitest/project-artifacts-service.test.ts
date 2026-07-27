import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import {
  addArtifactVersion,
  archiveArtifact,
  assertArtifactTombstoneAllowed,
  assertArtifactVersionPublishable,
  createArtifact,
  listProjectArtifacts,
  ProjectArtifactError,
  readArtifact,
  readArtifactVersion,
} from "@/lib/project-artifacts/service";

const requireRuntime = createRequire(import.meta.url);
const timestamp = "2026-07-27T00:00:00.000Z";
const laterTimestamp = "2026-07-28T00:00:00.000Z";
const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): { changes: number | bigint };
  };
};

type SqliteD1Statement = D1PreparedStatementLike & {
  sql: string;
  values: D1Value[];
};

const databases: LocalSqliteDatabase[] = [];

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec("PRAGMA foreign_keys = ON;");

  for (const migration of readdirSync("migrations").filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort()) {
    if (migration > "0111_project_commitment_events_and_exposures.sql") break;
    sqlite.exec(readFileSync(`migrations/${migration}`, "utf8"));
  }

  sqlite.exec(`
    INSERT INTO workspaces (id, name, created_at, updated_at)
    VALUES ('workspace-1', 'Workspace', '${timestamp}', '${timestamp}');
    INSERT INTO projects (id, workspace_id, name, created_at, updated_at, currency_code)
    VALUES ('project-1', 'workspace-1', 'Project', '${timestamp}', '${timestamp}', 'USD');
  `);

  const database: D1DatabaseLike = {
    prepare(sql: string): SqliteD1Statement {
      const statement: SqliteD1Statement = {
        sql,
        values: [],
        bind(...values: D1Value[]) {
          statement.values = values;
          return statement;
        },
        async all<T>() {
          return { results: sqlite.prepare(sql).all(...statement.values) as T[], success: true };
        },
        async first<T>() {
          return (sqlite.prepare(sql).get(...statement.values) as T | undefined) ?? null;
        },
        async run() {
          const result = sqlite.prepare(sql).run(...statement.values);
          return { meta: { changes: Number(result.changes) }, success: true };
        },
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => {
          const prepared = statement as SqliteD1Statement;
          const result = sqlite.prepare(prepared.sql).run(...prepared.values);
          return { meta: { changes: Number(result.changes) }, success: true };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return { database, sqlite };
}

function seedUpload(
  sqlite: LocalSqliteDatabase,
  {
    assetId,
    checksum,
    overrideChecksum = null,
    overrideExpiresAt = null,
    scanStatus = "clean",
    status = "finalized",
  }: {
    assetId: string;
    checksum: string;
    overrideChecksum?: string | null;
    overrideExpiresAt?: string | null;
    scanStatus?: string;
    status?: string;
  },
) {
  sqlite.prepare(`
    INSERT INTO upload_sessions (
      id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id,
      storage_bucket, storage_path, file_name, content_type, size_bytes,
      checksum_sha256, status, created_at, updated_at
    ) VALUES (?, 'workspace-1', 'user-1', 'project-artifact', 'project', 'project-1',
      'project-artifacts', ?, ?, 'application/pdf', 128, ?, ?, ?, ?)
  `).run(`session-${assetId}`, `project-1/${assetId}.pdf`, `${assetId}.pdf`, checksum, status, timestamp, timestamp);
  sqlite.prepare(`
    INSERT INTO upload_assets (
      id, workspace_id, actor_user_id, project_id, upload_session_id, surface,
      target_entity_type, target_entity_id, status, file_name, content_type,
      size_bytes, checksum_sha256, scan_status, scan_override_actor_user_id,
      scan_override_reason, scan_override_expires_at, scan_override_checksum_sha256,
      storage_bucket, storage_path, created_at, updated_at
    ) VALUES (?, 'workspace-1', 'user-1', 'project-1', ?, 'project-artifact',
      'project', 'project-1', ?, ?, 'application/pdf', 128, ?, ?,
      ?, ?, ?, ?, 'project-artifacts', ?, ?, ?)
  `).run(
    assetId,
    `session-${assetId}`,
    status,
    `${assetId}.pdf`,
    checksum,
    scanStatus,
    scanStatus === "override_approved" ? "security-user" : null,
    scanStatus === "override_approved" ? "Approved after review" : null,
    overrideExpiresAt,
    overrideChecksum,
    `project-1/${assetId}.pdf`,
    timestamp,
    timestamp,
  );
}

function createInput(database: D1DatabaseLike) {
  return {
    actor: { id: "user-1", type: "internal_user" as const },
    artifactId: "artifact-1",
    artifactType: "drawing" as const,
    contentSha256: hashA,
    database,
    fileName: "drawing.pdf",
    projectId: "project-1",
    sizeBytes: 128,
    title: "Ground floor drawing",
    uploadAssetId: "asset-1",
    versionId: "artifact-version-1",
    workspaceId: "workspace-1",
    now: timestamp,
  };
}

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

describe("project artifact service", () => {
  it("atomically initializes an artifact with its first immutable active version", async () => {
    const { database, sqlite } = createDatabase();
    seedUpload(sqlite, { assetId: "asset-1", checksum: hashA });

    const created = await createArtifact(createInput(database));
    const replay = await createArtifact(createInput(database));

    expect(created.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(created.artifact.status).toBe("active");
    expect(created.artifact.currentVersion?.id).toBe("artifact-version-1");
    expect(sqlite.prepare("SELECT status, current_version_id FROM project_artifacts").get()).toEqual({
      current_version_id: "artifact-version-1",
      status: "active",
    });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_artifact_versions").get()).toEqual({ count: 1 });
    expect(sqlite.prepare("SELECT event_type, source_type FROM project_commitment_events").get()).toEqual({ event_type: "artifact.created", source_type: "artifact" });
  });

  it("adds versions optimistically, deduplicates content, and preserves prior bytes", async () => {
    const { database, sqlite } = createDatabase();
    seedUpload(sqlite, { assetId: "asset-1", checksum: hashA });
    seedUpload(sqlite, { assetId: "asset-2", checksum: hashB });
    seedUpload(sqlite, { assetId: "asset-3", checksum: hashB });
    await createArtifact(createInput(database));

    const added = await addArtifactVersion({
      actor: { id: "user-1", type: "internal_user" },
      artifactId: "artifact-1",
      contentSha256: hashB,
      database,
      expectedCurrentVersionId: "artifact-version-1",
      fileName: "drawing-rev-b.pdf",
      projectId: "project-1",
      sizeBytes: 128,
      uploadAssetId: "asset-2",
      versionId: "artifact-version-2",
      workspaceId: "workspace-1",
      now: laterTimestamp,
    });
    const duplicate = await addArtifactVersion({
      actor: { id: "user-1", type: "internal_user" },
      artifactId: "artifact-1",
      contentSha256: hashB,
      database,
      expectedCurrentVersionId: "artifact-version-2",
      fileName: "another-name.pdf",
      projectId: "project-1",
      sizeBytes: 128,
      uploadAssetId: "asset-3",
      versionId: "artifact-version-3",
      workspaceId: "workspace-1",
      now: laterTimestamp,
    });

    expect(added.version.versionNumber).toBe(2);
    expect(duplicate.replayed).toBe(true);
    expect(duplicate.version.id).toBe("artifact-version-2");
    expect(await readArtifactVersion({ database, projectId: "project-1", versionId: "artifact-version-1", workspaceId: "workspace-1" })).toMatchObject({
      contentSha256: hashA,
      versionNumber: 1,
    });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_artifact_versions").get()).toEqual({ count: 2 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_commitment_events WHERE source_type = 'artifact'").get()).toEqual({ count: 2 });
  });

  it("lists and reads only within the requested workspace and project, then archives without deleting versions", async () => {
    const { database, sqlite } = createDatabase();
    seedUpload(sqlite, { assetId: "asset-1", checksum: hashA });
    await createArtifact(createInput(database));

    expect(await listProjectArtifacts({ database, projectId: "project-1", workspaceId: "workspace-1" })).toHaveLength(1);
    expect(await readArtifact({ artifactId: "artifact-1", database, projectId: "wrong-project", workspaceId: "workspace-1" })).toBeNull();
    expect((await archiveArtifact({ actor: { id: "owner-1", type: "internal_user" }, artifactId: "artifact-1", database, projectId: "project-1", workspaceId: "workspace-1", now: laterTimestamp })).status).toBe("archived");
    expect(await listProjectArtifacts({ database, projectId: "project-1", workspaceId: "workspace-1" })).toEqual([]);
    expect(await listProjectArtifacts({ database, includeArchived: true, projectId: "project-1", workspaceId: "workspace-1" })).toHaveLength(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_artifact_versions").get()).toEqual({ count: 1 });
    expect(sqlite.prepare("SELECT event_type, actor_id FROM project_commitment_events WHERE event_type = 'artifact.archived'").get()).toEqual({ actor_id: "owner-1", event_type: "artifact.archived" });
  });

  it("requires finalized clean uploads or checksum-bound unexpired overrides", async () => {
    const { database, sqlite } = createDatabase();
    seedUpload(sqlite, { assetId: "pending", checksum: hashA, scanStatus: "pending" });
    seedUpload(sqlite, {
      assetId: "expired",
      checksum: hashA,
      overrideChecksum: hashA,
      overrideExpiresAt: "2026-07-26T00:00:00.000Z",
      scanStatus: "override_approved",
    });
    seedUpload(sqlite, {
      assetId: "override",
      checksum: hashA,
      overrideChecksum: hashA,
      overrideExpiresAt: "2026-07-29T00:00:00.000Z",
      scanStatus: "override_approved",
    });

    await expect(assertArtifactVersionPublishable({ contentSha256: hashA, database, projectId: "project-1", uploadAssetId: "pending", workspaceId: "workspace-1", now: timestamp })).rejects.toMatchObject({ code: "project_artifact_upload_not_publishable" });
    await expect(assertArtifactVersionPublishable({ contentSha256: hashA, database, projectId: "project-1", uploadAssetId: "expired", workspaceId: "workspace-1", now: timestamp })).rejects.toMatchObject({ code: "project_artifact_upload_not_publishable" });
    await expect(assertArtifactVersionPublishable({ contentSha256: hashA, database, projectId: "project-1", uploadAssetId: "override", workspaceId: "workspace-1", now: timestamp })).resolves.toMatchObject({ id: "override" });
  });

  it("fails closed when tombstone retention blockers exist", () => {
    expect(() => assertArtifactTombstoneAllowed({ activeLegalHolds: 1, baselineReferences: 0, issuedReferences: 0, retentionPolicyBlocksRemoval: false })).toThrowError(ProjectArtifactError);
    expect(() => assertArtifactTombstoneAllowed({ activeLegalHolds: 0, baselineReferences: 1, issuedReferences: 0, retentionPolicyBlocksRemoval: false })).toThrow(/retained/);
    expect(() => assertArtifactTombstoneAllowed({ activeLegalHolds: 0, baselineReferences: 0, issuedReferences: 0, retentionPolicyBlocksRemoval: false })).not.toThrow();
  });
});
