import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import {
  acknowledgeChangeRequest,
  amendChangeRequest,
  assignChangeRequestAssessment,
  createChangeRequest,
  ProjectChangeRequestError,
  rejectChangeRequest,
  updateChangeRequestAssessment,
  withdrawChangeRequest,
} from "@/lib/change-requests/service";

const requireRuntime = createRequire(import.meta.url);
const timestamp = "2026-07-27T00:00:00.000Z";
const laterTimestamp = "2026-07-28T00:00:00.000Z";
const hashA = "a".repeat(64);

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
    if (migration > "0116_project_change_request_notification_outbox.sql") break;
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

function seedFixture(sqlite: LocalSqliteDatabase) {
  sqlite.exec(`
    INSERT INTO workspaces (id, name, created_at, updated_at)
    VALUES ('workspace-1', 'Workspace', '${timestamp}', '${timestamp}');
    INSERT INTO projects (id, workspace_id, name, created_at, updated_at, currency_code)
    VALUES
      ('project-1', 'workspace-1', 'Project One', '${timestamp}', '${timestamp}', 'USD'),
      ('project-2', 'workspace-1', 'Project Two', '${timestamp}', '${timestamp}', 'USD');
    INSERT INTO estimates (id, project_id, name, created_at, updated_at, currency_code)
    VALUES ('estimate-1', 'project-1', 'Estimate One', '${timestamp}', '${timestamp}', 'USD');

    INSERT INTO client_portals (
      id, workspace_id, project_id, name, stable_token_hash, encrypted_stable_token,
      created_by, created_at, updated_at
    ) VALUES (
      'portal-1', 'workspace-1', 'project-1', 'Portal', 'token-hash', 'encrypted-token',
      'internal-1', '${timestamp}', '${timestamp}'
    );
    INSERT INTO client_portal_recipients (
      id, portal_id, email_normalized, display_name, client_organization,
      role_template, domain_role, status, verification_state, created_at, updated_at
    ) VALUES
      ('recipient-1', 'portal-1', 'owner@example.test', 'Owner', 'Owner Org',
       'requester', 'client', 'active', 'verified', '${timestamp}', '${timestamp}'),
      ('recipient-2', 'portal-1', 'other@example.test', 'Other', 'Other Org',
       'requester', 'client', 'active', 'verified', '${timestamp}', '${timestamp}');

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

    INSERT INTO client_portal_issues (
      id, portal_id, issue_number, version_label, status, issued_at, issued_by,
      idempotency_key, manifest_json, content_hash, total_cost, currency_code,
      brand_snapshot_json, decision_policy_snapshot_json, created_at
    ) VALUES (
      'issue-1', 'portal-1', 1, 'Rev 1', 'accepted', '${timestamp}', 'internal-1',
      'issue-idempotency', '{}', '${hashA}', 123.45, 'USD', '{}', '{}', '${timestamp}'
    );
    INSERT INTO client_portal_decisions (
      id, portal_id, issue_id, recipient_id, decision, signer_email_snapshot,
      signer_role_snapshot, issue_content_hash, intent_hash, idempotency_key, submitted_at
    ) VALUES (
      'decision-1', 'portal-1', 'issue-1', 'recipient-1', 'approved',
      'owner@example.test', 'approver', '${hashA}', '${hashA}',
      'decision-idempotency', '${timestamp}'
    );
    INSERT INTO client_portal_issue_source_estimates (
      issue_id, source_estimate_id, name_snapshot, total_minor_units,
      currency_code, source_hash
    ) VALUES ('issue-1', 'estimate-1', 'Estimate One', 12345, 'USD', '${hashA}');
    INSERT INTO client_portal_baselines (
      id, workspace_id, project_id, portal_id, baseline_number, issue_id, status,
      content_hash, total_minor_units, currency_code, established_by_decision_id,
      established_at, created_at
    ) VALUES (
      'baseline-1', 'workspace-1', 'project-1', 'portal-1', 1, 'issue-1', 'active',
      '${hashA}', 12345, 'USD', 'decision-1', '${timestamp}', '${timestamp}'
    );
  `);
}

const recipient = {
  id: "recipient-1",
  type: "recipient" as const,
  name: "Owner",
  email: "owner@example.test",
  domainRole: "client",
  permissionRole: "requester",
  organization: "Owner Org",
};

const otherRecipient = {
  ...recipient,
  id: "recipient-2",
  name: "Other",
  email: "other@example.test",
  organization: "Other Org",
};

const internalActor = { id: "internal-1", type: "internal_user" as const };

function createInput(database: D1DatabaseLike, requestId = "request-1") {
  return {
    actor: recipient,
    artifacts: [{ artifactVersionId: "artifact-version-1", relationship: "evidence" as const, sortOrder: 0 }],
    database,
    description: "Move the east wall by 300mm.",
    eventId: `${requestId}-submitted`,
    exposurePolicySnapshot: { capability: "request:view" },
    idempotencyKey: `${requestId}-create`,
    now: timestamp,
    originPortalId: "portal-1",
    projectId: "project-1",
    publicRequestId: `public-${requestId}`,
    requestId,
    sourceKind: "client_portal" as const,
    targets: [{ id: `${requestId}-target`, kind: "project" as const, label: "Project One" }],
    title: "Move east wall",
    versionId: `${requestId}-version-1`,
    workspaceId: "workspace-1",
  };
}

function internalAction(database: D1DatabaseLike, requestId: string, action: string) {
  return {
    actor: internalActor,
    database,
    eventId: `${requestId}-${action}`,
    idempotencyKey: `${requestId}-${action}`,
    now: laterTimestamp,
    projectId: "project-1",
    requestId,
    workspaceId: "workspace-1",
  };
}

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

describe("change request service", () => {
  it("allocates project request numbers atomically and replays the same automatic exposure", async () => {
    const { database, sqlite } = createDatabase();
    const first = await createChangeRequest(createInput(database));
    const replay = await createChangeRequest(createInput(database));
    const [internalWithExposure, internalWithoutExposure] = await Promise.all([
      createChangeRequest({
        ...createInput(database, "request-2"),
        actor: internalActor,
        exposurePortalId: "portal-1",
        originPortalId: null,
        publicRequestId: "public-internal-request-2",
        sourceKind: "email",
      }),
      createChangeRequest({
        ...createInput(database, "request-3"),
        actor: internalActor,
        exposurePortalId: undefined,
        originPortalId: null,
        publicRequestId: null,
        sourceKind: "site",
      }),
    ]);

    expect(first).toMatchObject({
      replayed: false,
      request: { requestCode: "CR-0001", requestNumber: 1, status: "submitted" },
      exposure: { exposureKind: "automatic", publicRequestId: "public-request-1", status: "visible" },
    });
    expect(replay).toMatchObject({
      replayed: true,
      request: { id: first.request.id, requestNumber: 1 },
      exposure: { publicRequestId: first.exposure?.publicRequestId },
    });
    expect([internalWithExposure.request.requestNumber, internalWithoutExposure.request.requestNumber].sort()).toEqual([2, 3]);
    expect(internalWithExposure.exposure).toMatchObject({ exposureKind: "manual", publicRequestId: "public-internal-request-2" });
    expect(sqlite.prepare("SELECT next_request_number FROM project_change_request_counters WHERE project_id = 'project-1'").get()).toEqual({ next_request_number: 4 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM client_portal_request_exposures").get()).toEqual({ count: 2 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_commitment_events WHERE source_type = 'change_request'").get()).toEqual({ count: 3 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM client_portal_event_exposures").get()).toEqual({ count: 2 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_change_request_notification_outbox").get()).toEqual({ count: 3 });
  });

  it("uses optimistic current-version CAS and retains immutable target and artifact evidence", async () => {
    const { database, sqlite } = createDatabase();
    await createChangeRequest(createInput(database));
    const amendment = {
      actor: recipient,
      artifacts: [{ artifactVersionId: "artifact-version-1", relationship: "reference" as const, sortOrder: 0 }],
      database,
      description: "Move the east wall by 450mm.",
      expectedCurrentVersionId: "request-1-version-1",
      now: laterTimestamp,
      projectId: "project-1",
      requestId: "request-1",
      sourceKind: "client_portal" as const,
      targets: [{ id: "request-1-target-v2", kind: "project" as const, label: "Project One" }],
      title: "Move east wall further",
      versionId: "request-1-version-2",
      workspaceId: "workspace-1",
    };
    const saved = await amendChangeRequest(amendment);
    const replay = await amendChangeRequest(amendment);

    expect(saved).toMatchObject({ replayed: false, version: { versionNumber: 2, supersedesVersionId: "request-1-version-1" } });
    expect(replay).toMatchObject({ replayed: true, request: { currentVersionId: "request-1-version-2" } });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_commitment_events WHERE request_id = 'request-1'").get()).toEqual({ count: 2 });
    await expect(amendChangeRequest({
      ...amendment,
      description: "Stale overwrite",
      versionId: "request-1-version-3",
    })).rejects.toMatchObject({ code: "project_change_request_conflict" });
    expect(() => sqlite.exec("UPDATE project_change_request_targets SET target_label_snapshot = 'Changed' WHERE id = 'request-1-target-v2'")).toThrow(/immutable/);
    expect(() => sqlite.exec("UPDATE project_change_request_artifacts SET sort_order = 1 WHERE request_version_id = 'request-1-version-2'")).toThrow(/immutable/);
  });

  it("enforces recipient ownership and internal assessment state transitions", async () => {
    const { database, sqlite } = createDatabase();
    await createChangeRequest(createInput(database));
    await expect(amendChangeRequest({
      ...createInput(database),
      actor: otherRecipient,
      expectedCurrentVersionId: "request-1-version-1",
      versionId: "request-1-version-other",
    })).rejects.toMatchObject({ code: "project_change_request_forbidden" });
    await expect(withdrawChangeRequest({
      ...internalAction(database, "request-1", "other-withdraw"),
      actor: otherRecipient,
    })).rejects.toMatchObject({ code: "project_change_request_forbidden" });

    expect((await acknowledgeChangeRequest(internalAction(database, "request-1", "ack"))).request.status).toBe("acknowledged");
    expect((await assignChangeRequestAssessment({
      ...internalAction(database, "request-1", "assign"),
      assessmentOwnerUserId: "assessor-1",
    })).request).toMatchObject({ assessmentOwnerUserId: "assessor-1", status: "under_assessment" });
    const assessed = await updateChangeRequestAssessment({
      ...internalAction(database, "request-1", "assessment"),
      assessment: { costImpact: "pending", scheduleImpactDays: 2 },
    });
    const assessedReplay = await updateChangeRequestAssessment({
      ...internalAction(database, "request-1", "assessment"),
      assessment: { costImpact: "pending", scheduleImpactDays: 2 },
    });
    expect(assessed.request.status).toBe("under_assessment");
    expect(assessedReplay.replayed).toBe(true);
    expect((await rejectChangeRequest({ ...internalAction(database, "request-1", "reject"), note: "Not feasible" })).request.status).toBe("rejected");
    await expect(acknowledgeChangeRequest(internalAction(database, "request-1", "late-ack"))).rejects.toBeInstanceOf(ProjectChangeRequestError);

    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_change_request_state_events WHERE request_id = 'request-1'").get()).toEqual({ count: 5 });
  });

  it("allows the originating recipient to withdraw without mutating estimates or baselines", async () => {
    const { database, sqlite } = createDatabase();
    const estimateBefore = sqlite.prepare("SELECT name, updated_at FROM estimates WHERE id = 'estimate-1'").get();
    const baselineBefore = sqlite.prepare("SELECT status, content_hash, total_minor_units FROM client_portal_baselines WHERE id = 'baseline-1'").get();
    await createChangeRequest(createInput(database));
    const withdrawn = await withdrawChangeRequest({
      actor: recipient,
      database,
      eventId: "request-1-withdraw",
      idempotencyKey: "request-1-withdraw",
      note: "No longer required",
      now: laterTimestamp,
      projectId: "project-1",
      requestId: "request-1",
      workspaceId: "workspace-1",
    });

    expect(withdrawn.request).toMatchObject({ status: "withdrawn", withdrawnAt: laterTimestamp });
    expect(sqlite.prepare("SELECT status, withdrawal_reason FROM client_portal_request_exposures WHERE request_id = 'request-1'").get()).toEqual({ status: "withdrawn", withdrawal_reason: "No longer required" });
    expect(sqlite.prepare("SELECT name, updated_at FROM estimates WHERE id = 'estimate-1'").get()).toEqual(estimateBefore);
    expect(sqlite.prepare("SELECT status, content_hash, total_minor_units FROM client_portal_baselines WHERE id = 'baseline-1'").get()).toEqual(baselineBefore);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_commitment_events WHERE request_id = 'request-1' AND event_type = 'request.withdraw'").get()).toEqual({ count: 1 });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM project_change_request_notification_outbox WHERE request_id = 'request-1'").get()).toEqual({ count: 2 });
  });
});
