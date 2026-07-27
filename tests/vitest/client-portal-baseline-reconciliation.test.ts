import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  ClientPortalBaselineReconciliationError,
  reconcileAcceptedClientPortalBaseline,
} from "@/lib/client-portal/baseline-service";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";

type Prepared = { sql: string; values: D1Value[] };

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): { changes: number | bigint };
  };
};

const requireRuntime = createRequire(import.meta.url);
const timestamp = "2026-07-27T00:00:00.000Z";
const contentHash = "a".repeat(64);

const manager: ClientPortalInternalActor = {
  kind: "internal",
  portalGrants: ["manager"],
  projectId: "project-1",
  projectRole: "viewer",
  userId: "owner-1",
  workspaceId: "workspace-1",
};

function fixtureDatabase(options: {
  approvedDecisionIds?: string[];
  existingBaseline?: { decision_id: string; id: string; status: "active" | "superseded" } | null;
} = {}) {
  const prepared: Prepared[] = [];
  const batches: Prepared[][] = [];
  const approvedDecisionIds = options.approvedDecisionIds ?? ["decision-1"];
  const existingBaseline = options.existingBaseline ?? null;
  const database: D1DatabaseLike = {
    prepare<T>(sql: string): D1PreparedStatementLike<T> {
      const captured: Prepared = { sql, values: [] };
      const statement: D1PreparedStatementLike<T> = {
        bind(...values) {
          captured.values = values;
          prepared.push(captured);
          return statement;
        },
        async first<R>() {
          if (sql.includes("baseline-reconciliation:issue")) return {
            content_hash: "a".repeat(64),
            currency_code: "USD",
            issue_id: "issue-1",
            issue_number: 2,
            portal_id: "portal-1",
            project_id: "project-1",
            version_label: "Approved v2",
            workspace_id: "workspace-1",
          } as R;
          if (sql.includes("baseline-reconciliation:evidence")) return {
            audit_id: `baseline-reconciliation_${existingBaseline?.id ?? "created"}`,
            baseline_id: existingBaseline?.id ?? "baseline-created",
            decision_id: existingBaseline?.decision_id ?? approvedDecisionIds[0],
            event_id: `commitment_${existingBaseline?.id ?? "created"}`,
          } as R;
          return null;
        },
        async all<R>() {
          if (sql.includes("baseline-reconciliation:baseline")) {
            return { success: true, results: existingBaseline ? [existingBaseline as R] : [] };
          }
          if (sql.includes("baseline-reconciliation:decisions")) {
            return { success: true, results: approvedDecisionIds.map((id) => ({ id })) as R[] };
          }
          return { success: true, results: [] };
        },
        async run() { return { success: true }; },
      };
      return statement;
    },
    async batch(statements) {
      const selected = statements.map((candidate) => prepared.find((entry) => candidate === (entry as unknown as D1PreparedStatementLike)) ?? null);
      void selected;
      const latest = prepared.slice(-statements.length);
      batches.push(latest);
      return statements.map(() => ({ success: true, meta: { changes: 1 } })) as D1Result[];
    },
  };
  return { batches, database, prepared };
}

function sqliteFixture() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const file of readdirSync("migrations").filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  }
  sqlite.exec(`
    INSERT INTO workspaces (id, name, created_at, updated_at)
    VALUES ('workspace-1', 'Workspace', '${timestamp}', '${timestamp}');
    INSERT INTO projects (id, workspace_id, name, currency_code, created_at, updated_at)
    VALUES ('project-1', 'workspace-1', 'Project', 'USD', '${timestamp}', '${timestamp}');
    INSERT INTO estimates (id, project_id, name, currency_code, created_at, updated_at)
    VALUES ('estimate-1', 'project-1', 'Estimate', 'USD', '${timestamp}', '${timestamp}');
    INSERT INTO client_portals (
      id, workspace_id, project_id, name, stable_token_hash, encrypted_stable_token,
      created_by, created_at, updated_at
    ) VALUES (
      'portal-1', 'workspace-1', 'project-1', 'Owner approvals', 'token-hash',
      'encrypted-token', 'owner-1', '${timestamp}', '${timestamp}'
    );
    INSERT INTO client_portal_issues (
      id, portal_id, issue_number, version_label, status, issued_at, issued_by,
      idempotency_key, manifest_json, content_hash, total_cost, currency_code,
      brand_snapshot_json, decision_policy_snapshot_json, created_at
    ) VALUES (
      'issue-1', 'portal-1', 1, 'Approved v1', 'accepted', '${timestamp}', 'owner-1',
      'issue-key', '{}', '${contentHash}', 123.45, 'USD', '{}', '{}', '${timestamp}'
    );
    UPDATE client_portals SET current_issue_id = 'issue-1', status = 'live' WHERE id = 'portal-1';
    INSERT INTO client_portal_recipients (
      id, portal_id, email_normalized, role_template, status, verification_state,
      created_at, updated_at
    ) VALUES (
      'recipient-1', 'portal-1', 'client@example.test', 'approver', 'active',
      'verified', '${timestamp}', '${timestamp}'
    );
    INSERT INTO client_portal_decisions (
      id, portal_id, issue_id, recipient_id, decision, signer_email_snapshot,
      signer_role_snapshot, issue_content_hash, intent_hash, idempotency_key, submitted_at
    ) VALUES (
      'decision-1', 'portal-1', 'issue-1', 'recipient-1', 'approved',
      'client@example.test', 'approver', '${contentHash}', '${contentHash}',
      'decision-key', '${timestamp}'
    );
    INSERT INTO client_portal_issue_source_estimates (
      issue_id, source_estimate_id, name_snapshot, total_minor_units, currency_code, source_hash
    ) VALUES ('issue-1', 'estimate-1', 'Estimate', 12345, 'USD', '${contentHash}');
  `);

  type SqliteStatement = D1PreparedStatementLike & { sql: string; values: D1Value[] };
  const database: D1DatabaseLike = {
    prepare<T>(sql: string): D1PreparedStatementLike<T> {
      const statement: SqliteStatement = {
        sql,
        values: [],
        bind(...values) { statement.values = values; return statement; },
        async first<R>() { return (sqlite.prepare(sql).get(...statement.values) as R | undefined) ?? null; },
        async all<R>() { return { success: true, results: sqlite.prepare(sql).all(...statement.values) as R[] }; },
        async run() {
          const result = sqlite.prepare(sql).run(...statement.values);
          return { success: true, meta: { changes: Number(result.changes) } };
        },
      };
      return statement as D1PreparedStatementLike<T>;
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((candidate) => {
          const statement = candidate as SqliteStatement;
          const result = sqlite.prepare(statement.sql).run(...statement.values);
          return { success: true, meta: { changes: Number(result.changes) } };
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

describe("accepted Client Portal baseline reconciliation", () => {
  it("atomically creates the baseline, commitment event, audit record, and request resolution", async () => {
    const fixture = fixtureDatabase();

    const receipt = await reconcileAcceptedClientPortalBaseline({
      actor: manager,
      database: fixture.database,
      issueId: "issue-1",
      portalId: "portal-1",
    });

    expect(receipt).toMatchObject({ baselineCreated: true, decisionId: "decision-1" });
    expect(fixture.batches).toHaveLength(1);
    expect(fixture.batches[0]).toHaveLength(6);
    const sql = fixture.batches[0]!.map((entry) => entry.sql);
    expect(sql.slice(0, 4)).toEqual([
      expect.stringContaining("UPDATE client_portal_baselines"),
      expect.stringContaining("INSERT INTO client_portal_baselines"),
      expect.stringContaining("INSERT INTO project_change_request_state_events"),
      expect.stringContaining("UPDATE project_change_requests"),
    ]);
    expect(sql[4]).toContain("INSERT INTO project_commitment_events");
    expect(sql[5]).toContain("INSERT INTO client_portal_audit_events");
    expect(sql[4]).toContain("issue.status = 'accepted'");
    expect(sql[4]).toContain("decision.decision = 'approved'");
  });

  it("fails closed without approved decision evidence", async () => {
    const fixture = fixtureDatabase({ approvedDecisionIds: [] });

    await expect(reconcileAcceptedClientPortalBaseline({
      actor: manager,
      database: fixture.database,
      issueId: "issue-1",
      portalId: "portal-1",
    })).rejects.toMatchObject({ code: "client_portal_baseline_decision_missing" });
    expect(fixture.batches).toHaveLength(0);
  });

  it("uses the latest approval that made a multi-approver issue accepted", async () => {
    const fixture = fixtureDatabase({ approvedDecisionIds: ["decision-2", "decision-1"] });

    const receipt = await reconcileAcceptedClientPortalBaseline({
      actor: manager,
      database: fixture.database,
      issueId: "issue-1",
      portalId: "portal-1",
    });

    expect(receipt).toMatchObject({ baselineCreated: true, decisionId: "decision-2" });
  });

  it("denies non-manager actors before reading or writing baseline state", async () => {
    const fixture = fixtureDatabase();

    await expect(reconcileAcceptedClientPortalBaseline({
      actor: { ...manager, portalGrants: [], projectRole: "editor" },
      database: fixture.database,
      issueId: "issue-1",
      portalId: "portal-1",
    })).rejects.toBeInstanceOf(ClientPortalBaselineReconciliationError);
    expect(fixture.prepared).toHaveLength(0);
    expect(fixture.batches).toHaveLength(0);
  });

  it("recovers missing evidence idempotently from the surviving active baseline", async () => {
    const fixture = fixtureDatabase({
      approvedDecisionIds: ["decision-1", "decision-2"],
      existingBaseline: { decision_id: "decision-2", id: "baseline-existing", status: "active" },
    });

    const receipt = await reconcileAcceptedClientPortalBaseline({
      actor: manager,
      database: fixture.database,
      issueId: "issue-1",
      portalId: "portal-1",
    });

    expect(receipt).toMatchObject({
      baselineCreated: false,
      baselineId: "baseline-existing",
      decisionId: "decision-2",
    });
    expect(fixture.batches[0]).toHaveLength(2);
    expect(fixture.batches[0]![0]!.sql).toContain("NOT EXISTS");
    expect(fixture.batches[0]![1]!.sql).toContain("NOT EXISTS");
  });

  it("commits against the real D1 schema and replays without duplicate evidence", async () => {
    const fixture = sqliteFixture();
    try {
      const first = await reconcileAcceptedClientPortalBaseline({
        actor: manager,
        database: fixture.database,
        issueId: "issue-1",
        portalId: "portal-1",
      });
      const second = await reconcileAcceptedClientPortalBaseline({
        actor: manager,
        database: fixture.database,
        issueId: "issue-1",
        portalId: "portal-1",
      });

      expect(first).toMatchObject({ baselineCreated: true, decisionId: "decision-1" });
      expect(second).toMatchObject({ baselineCreated: false, baselineId: first.baselineId });
      expect(fixture.sqlite.prepare("SELECT count(*) AS count FROM client_portal_baselines").get()).toEqual({ count: 1 });
      expect(fixture.sqlite.prepare("SELECT count(*) AS count FROM project_commitment_events WHERE source_type = 'baseline'").get()).toEqual({ count: 1 });
      expect(fixture.sqlite.prepare("SELECT count(*) AS count FROM client_portal_audit_events WHERE event_type = 'baseline_reconciled'").get()).toEqual({ count: 1 });
      expect(fixture.sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      fixture.sqlite.close();
    }
  });
});
