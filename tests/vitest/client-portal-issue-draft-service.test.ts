import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import {
  abandonClientPortalIssueDraft,
  ClientPortalIssueDraftError,
  getClientPortalIssueDraft,
  markClientPortalIssueDraftReady,
  openClientPortalIssueDraft,
  saveClientPortalIssueDraft,
} from "@/lib/client-portal/issue-draft-service";

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

function seedFixture(sqlite: LocalSqliteDatabase) {
  sqlite.exec(`
    INSERT INTO workspaces (id, name, created_at, updated_at)
    VALUES ('workspace-1', 'Workspace', '${timestamp}', '${timestamp}');
    INSERT INTO projects (id, workspace_id, name, created_at, updated_at, currency_code)
    VALUES
      ('project-1', 'workspace-1', 'Project One', '${timestamp}', '${timestamp}', 'USD'),
      ('project-2', 'workspace-1', 'Project Two', '${timestamp}', '${timestamp}', 'USD');
    INSERT INTO estimates (id, project_id, name, created_at, updated_at, currency_code)
    VALUES
      ('estimate-1', 'project-1', 'Estimate One', '${timestamp}', '${timestamp}', 'USD'),
      ('estimate-2', 'project-2', 'Estimate Two', '${timestamp}', '${timestamp}', 'USD');

    INSERT INTO client_portals (
      id, workspace_id, project_id, name, stable_token_hash, encrypted_stable_token,
      created_by, created_at, updated_at
    ) VALUES
      ('portal-1', 'workspace-1', 'project-1', 'Portal One', 'token-hash-1', 'encrypted-token-1',
       'internal-1', '${timestamp}', '${timestamp}'),
      ('portal-2', 'workspace-1', 'project-2', 'Portal Two', 'token-hash-2', 'encrypted-token-2',
       'internal-1', '${timestamp}', '${timestamp}');

    INSERT INTO upload_sessions (
      id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id,
      storage_bucket, storage_path, file_name, content_type, size_bytes,
      checksum_sha256, status, created_at, updated_at
    ) VALUES (
      'session-1', 'workspace-1', 'internal-1', 'project-artifact', 'project', 'project-1',
      'project-artifacts', 'project-1/evidence.pdf', 'evidence.pdf', 'application/pdf',
      128, '${hashA}', 'finalized', '${timestamp}', '${timestamp}'
    );
    INSERT INTO upload_assets (
      id, workspace_id, actor_user_id, project_id, upload_session_id, surface,
      target_entity_type, target_entity_id, status, file_name, content_type,
      size_bytes, checksum_sha256, scan_status, storage_bucket, storage_path,
      created_at, updated_at
    ) VALUES (
      'asset-1', 'workspace-1', 'internal-1', 'project-1', 'session-1',
      'project-artifact', 'project', 'project-1', 'finalized', 'evidence.pdf',
      'application/pdf', 128, '${hashA}', 'clean', 'project-artifacts',
      'project-1/evidence.pdf', '${timestamp}', '${timestamp}'
    );
    INSERT INTO project_artifacts (
      id, workspace_id, project_id, artifact_code, title, artifact_type, status,
      current_version_id, created_by, created_at, updated_at
    ) VALUES (
      'artifact-1', 'workspace-1', 'project-1', 'A-001', 'Evidence', 'evidence',
      'initializing', NULL, 'internal-1', '${timestamp}', '${timestamp}'
    );
    INSERT INTO project_artifact_versions (
      id, workspace_id, project_id, artifact_id, version_number, upload_asset_id,
      file_name, content_type, size_bytes, content_sha256, source_kind,
      created_by_actor_type, created_by_actor_id, created_at
    ) VALUES (
      'artifact-version-1', 'workspace-1', 'project-1', 'artifact-1', 1, 'asset-1',
      'evidence.pdf', 'application/pdf', 128, '${hashA}', 'internal_upload',
      'internal_user', 'internal-1', '${timestamp}'
    );
    UPDATE project_artifacts
    SET current_version_id = 'artifact-version-1', status = 'active'
    WHERE id = 'artifact-1';

    INSERT INTO project_change_requests (
      id, workspace_id, project_id, request_number, request_code, status,
      requested_by_actor_type, requested_by_actor_id, requested_at, created_at, updated_at
    ) VALUES (
      'request-1', 'workspace-1', 'project-1', 1, 'CR-0001', 'initializing',
      'internal_user', 'internal-1', '${timestamp}', '${timestamp}', '${timestamp}'
    );
    INSERT INTO project_change_request_versions (
      id, request_id, version_number, title, description, content_hash,
      created_by_actor_type, created_by_actor_id, created_at
    ) VALUES (
      'request-version-1', 'request-1', 1, 'Move wall', 'Move wall by 300mm.', '${hashB}',
      'internal_user', 'internal-1', '${timestamp}'
    );
    UPDATE project_change_requests
    SET current_version_id = 'request-version-1', status = 'submitted'
    WHERE id = 'request-1';
  `);
}

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const migration of readdirSync("migrations").filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort()) {
    if (migration > "0123_client_portal_ai_narrative_provenance.sql") break;
    sqlite.exec(readFileSync(`migrations/${migration}`, "utf8"));
  }
  seedFixture(sqlite);

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

function openInput(database: D1DatabaseLike, draftId: string) {
  return {
    actorId: "internal-1",
    database,
    draftId,
    now: timestamp,
    portalId: "portal-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
  };
}

function metadata() {
  return {
    assumptions: ["Existing structure remains serviceable."],
    basedOnBaselineId: null,
    basedOnIssueId: null,
    comparisonIssueId: null,
    decisionPolicy: { requiredApprovers: 1 },
    exclusions: ["Permits are excluded."],
    issueKind: "revision" as const,
    requestedDecision: "formal" as const,
    revisionNote: "This revision incorporates the requested wall movement.",
    sectionOverrides: { artifacts: { enabled: true } },
    unresolvedItems: ["Confirm final paint selection."],
    versionLabel: "Revision 2",
  };
}

function saveInput(database: D1DatabaseLike, draftId: string, expectedRevision = 1) {
  return {
    actorId: "internal-1",
    artifacts: [{
      artifactVersionId: "artifact-version-1",
      commentable: true,
      decisionRelevant: true,
      description: "Marked-up drawing",
      displayTitle: "Wall revision drawing",
      downloadable: true,
      purpose: "review" as const,
      sortOrder: 0,
    }],
    database,
    draftId,
    estimates: [{ estimateId: "estimate-1", included: true, sortOrder: 0 }],
    expectedRevision,
    metadata: metadata(),
    now: laterTimestamp,
    portalId: "portal-1",
    projectId: "project-1",
    requests: [{
      relationship: "origin" as const,
      requestId: "request-1",
      requestVersionId: "request-version-1",
      sortOrder: 0,
    }],
    workspaceId: "workspace-1",
  };
}

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

describe("client portal issue draft service", () => {
  it("creates or replays exactly one active draft per portal under concurrent opens", async () => {
    const { database, sqlite } = createDatabase();
    const [first, second] = await Promise.all([
      openClientPortalIssueDraft(openInput(database, "draft-a")),
      openClientPortalIssueDraft(openInput(database, "draft-b")),
    ]);

    expect(first.draft.id).toBe(second.draft.id);
    expect([first.replayed, second.replayed]).toContain(true);
    expect(sqlite.prepare(
      "SELECT COUNT(*) AS count FROM client_portal_issue_drafts WHERE portal_id = 'portal-1' AND status IN ('draft', 'ready', 'publishing')",
    ).get()).toEqual({ count: 1 });
    await expect(openClientPortalIssueDraft({
      ...openInput(database, "wrong-scope"),
      projectId: "project-2",
    })).rejects.toMatchObject({ code: "client_portal_issue_draft_not_found" });
  });

  it("rejects stale CAS updates without partially replacing selections", async () => {
    const { database, sqlite } = createDatabase();
    const { draft } = await openClientPortalIssueDraft(openInput(database, "draft-1"));
    const saved = await saveClientPortalIssueDraft(saveInput(database, draft.id));

    expect(saved).toMatchObject({ draftRevision: 2, issueKind: "revision", status: "draft" });
    await expect(saveClientPortalIssueDraft({
      ...saveInput(database, draft.id),
      metadata: { ...metadata(), versionLabel: "Stale overwrite" },
    })).rejects.toMatchObject({
      code: "client_portal_issue_draft_conflict",
      details: { actualRevision: 2, expectedRevision: 1 },
    });
    expect(sqlite.prepare(
      "SELECT version_label, draft_revision FROM client_portal_issue_drafts WHERE id = 'draft-1'",
    ).get()).toEqual({ draft_revision: 2, version_label: "Revision 2" });
    expect(sqlite.prepare(
      "SELECT COUNT(*) AS count FROM client_portal_issue_draft_artifacts WHERE draft_id = 'draft-1'",
    ).get()).toEqual({ count: 1 });
  });

  it("atomically saves package metadata, narrative fields, and exact selected relationships", async () => {
    const { database, sqlite } = createDatabase();
    const { draft } = await openClientPortalIssueDraft(openInput(database, "draft-1"));
    const saved = await saveClientPortalIssueDraft(saveInput(database, draft.id));

    expect(saved).toMatchObject({
      artifacts: [{ artifactVersionId: "artifact-version-1", purpose: "review" }],
      assumptions: ["Existing structure remains serviceable."],
      estimates: [{ estimateId: "estimate-1", included: true }],
      requests: [{ requestId: "request-1", requestVersionId: "request-version-1", relationship: "origin" }],
      revisionNote: "This revision incorporates the requested wall movement.",
      versionLabel: "Revision 2",
    });
    await expect(saveClientPortalIssueDraft({
      ...saveInput(database, draft.id, 2),
      estimates: [{ estimateId: "estimate-2", included: true, sortOrder: 0 }],
    })).rejects.toThrow(/ownership mismatch/);
    const retained = await getClientPortalIssueDraft(database, {
      draftId: draft.id,
      portalId: "portal-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
    });
    expect(retained).toMatchObject({ draftRevision: 2, estimates: [{ estimateId: "estimate-1" }] });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM estimates").get()).toEqual({ count: 2 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM client_portal_baselines").get()).toEqual({ count: 0 });
  });

  it("requires explicit readiness, invalidates readiness on change, and retains abandoned drafts", async () => {
    const { database, sqlite } = createDatabase();
    const { draft } = await openClientPortalIssueDraft(openInput(database, "draft-1"));
    const scope = {
      actorId: "internal-1",
      database,
      draftId: draft.id,
      now: laterTimestamp,
      portalId: "portal-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
    };

    await expect(markClientPortalIssueDraftReady({ ...scope, expectedRevision: 1 })).rejects.toMatchObject({
      code: "client_portal_issue_draft_not_ready",
      details: { failures: ["visible_content_required", "final_narrative_required", "formal_decision_policy_required"] },
    });
    await saveClientPortalIssueDraft(saveInput(database, draft.id));
    const ready = await markClientPortalIssueDraftReady({ ...scope, expectedRevision: 2 });
    expect(ready).toMatchObject({ draftRevision: 3, status: "ready" });

    const changed = await saveClientPortalIssueDraft({
      ...saveInput(database, draft.id, 3),
      metadata: { ...metadata(), revisionNote: "Readiness must be confirmed again." },
    });
    expect(changed).toMatchObject({ draftRevision: 4, status: "draft" });

    const abandoned = await abandonClientPortalIssueDraft({ ...scope, expectedRevision: 4 });
    expect(abandoned).toMatchObject({ abandonedAt: laterTimestamp, draftRevision: 5, status: "abandoned" });
    await expect(saveClientPortalIssueDraft(saveInput(database, draft.id, 5))).rejects.toBeInstanceOf(ClientPortalIssueDraftError);
    await expect(saveClientPortalIssueDraft(saveInput(database, draft.id, 5))).rejects.toMatchObject({
      code: "client_portal_issue_draft_immutable",
    });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM client_portal_issue_draft_requests WHERE draft_id = 'draft-1'").get()).toEqual({ count: 1 });

    const replacement = await openClientPortalIssueDraft(openInput(database, "draft-2"));
    expect(replacement).toMatchObject({ draft: { id: "draft-2", draftRevision: 1, status: "draft" }, replayed: false });
  });
});
