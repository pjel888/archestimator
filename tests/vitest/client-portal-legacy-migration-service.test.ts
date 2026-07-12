import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { migrateLegacyPublicationToClientPortal } from "@/lib/client-portal/legacy-migration-service";

function migrationDatabase(): D1DatabaseLike {
  const snapshot = {
    schemaVersion: 1,
    generatedAt: "2026-07-12T00:00:00.000Z",
    project: { id: "project_1", name: "Makati Tower", projectCode: "MK-100", clientName: null, location: null, locationVisibility: "hidden", currencyCode: "USD" },
    estimateCount: 1,
    rowCount: 1,
    totalCost: 100,
    estimates: [{ id: "estimate_1", name: "Main estimate", sheetCode: "A-100", updatedAt: null, rowCount: 1, totalCost: 100, rows: [{ id: "row_1", description: "Wall finish", designation: "W1", discipline: "Build", material: "Private", quantity: 2, unit: "m2", rowTotal: 100 }] }],
  };
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { void values; return statement; },
        async first<T>() {
          if (sql.includes("FROM project_publications")) return { encrypted_token: "aes-256-gcm-v1:legacy", expires_at: null, id: "publication_1", password_hash: null, project_id: "project_1", published_at: "2026-07-11T00:00:00.000Z", published_by: "owner_1", selected_estimate_ids: "[\"estimate_1\"]", snapshot_json: JSON.stringify(snapshot), snapshot_version: 3, status: "published", token_hash: "hmac-sha256-v1:legacy", workspace_id: "workspace_1" } as T;
          return null as T | null;
        },
        async all<T>() {
          if (sql.includes("shared_link_recipients")) return { results: [{ id: "legacy_recipient_1", email: "client@example.com", display_name: "Client", recipient_token_hash: "hmac-sha256-v1:recipient", created_at: "2026-07-11T00:00:00.000Z" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("shared_link_comments")) return { results: [{ id: "comment_1", recipient_id: "legacy_recipient_1", author_email: "client@example.com", author_name: "Client", estimate_id: null, row_id: null, body: "Please revise the lobby.", is_internal: 0, target_kind: "proposal", target_label: "Proposal", target_secondary_label: null, created_at: "2026-07-11T01:00:00.000Z" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("shared_link_responses")) return { results: [{ id: "response_1", recipient_id: "legacy_recipient_1", decision: "revision_requested", note: "Adjust scope", signer_name: null, created_at: "2026-07-11T02:00:00.000Z" }] as T[], success: true } as D1Result<T>;
          return { results: [], success: true } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
  };
}

function verifiedMigrationDatabase() {
  const source = migrationDatabase();
  let issueContentHash = "";
  let issueId = "";
  let portalId = "";
  let stableTokenHash = "";
  let verified = false;
  const auditEvents: Array<{ eventType: string; metadata: string }> = [];

  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...nextValues: D1Value[]) {
          values = nextValues;
          if (sql.includes("INSERT INTO client_portals")) {
            portalId = String(nextValues[0]);
            stableTokenHash = String(nextValues[6]);
          }
          if (sql.includes("INSERT INTO client_portal_issues")) {
            issueId = String(nextValues[0]);
            issueContentHash = String(nextValues[10]);
          }
          if (sql.includes("INSERT INTO client_portal_audit_events")) {
            auditEvents.push({ eventType: String(nextValues[4]), metadata: String(nextValues[5]) });
          }
          return statement;
        },
        async first<T>() {
          if (sql.includes("FROM client_portal_legacy_mappings AS mapping")) {
            return {
              current_issue_id: issueId,
              issue_content_hash: issueContentHash,
              issue_id: issueId,
              portal_id: portalId,
              stable_token_hash: stableTokenHash,
            } as T;
          }
          if (sql.includes("COUNT(*) AS count") || sql.includes("COUNT(DISTINCT credential.token_hash) AS count")) {
            const count = sql.includes("client_portal_recipient_credentials") || sql.includes("client_portal_threads") || sql.includes("client_portal_messages") || sql.includes("client_portal_decisions") ? 1 : 0;
            return { count } as T;
          }
          return source.prepare(sql).bind(...values).first<T>();
        },
        async all<T>() { return source.prepare(sql).bind(...values).all<T>(); },
        async run<T>() {
          if (sql.includes("UPDATE client_portal_legacy_mappings SET migration_status = 'verified'")) verified = true;
          return { success: true } as D1Result<T>;
        },
      };
      return statement;
    },
    async batch(statements) {
      return Promise.all(statements.map((preparedStatement) => preparedStatement.run()));
    },
  };

  return { auditEvents: () => auditEvents, database, stableTokenHash: () => stableTokenHash, wasVerified: () => verified };
}

function sharedProjectMigrationDatabase(existingRecipientEmail = "client@example.com") {
  const source = migrationDatabase();
  const preparedSql: string[] = [];
  let issueContentHash = "";
  let issueId = "";
  let verified = false;

  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      preparedSql.push(sql);
      const statement: D1PreparedStatementLike = {
        bind(...nextValues: D1Value[]) {
          values = nextValues;
          if (sql.includes("INSERT INTO client_portal_issues")) {
            issueId = String(nextValues[0]);
            issueContentHash = String(nextValues[10]);
          }
          return statement;
        },
        async first<T>() {
          if (sql.includes("WHERE project_id = ? AND workspace_id = ?")) return { current_issue_id: "issue_existing", id: "portal_existing", stable_token_hash: "portal-token" } as T;
          if (sql.includes("COALESCE(MAX(issue_number), 0)")) return { count: 4 } as T;
          if (sql.includes("email_normalized = ?")) return { id: "recipient_existing" } as T;
          if (sql.includes("FROM client_portal_legacy_mappings AS mapping")) return { current_issue_id: "issue_existing", issue_content_hash: issueContentHash, issue_id: issueId, portal_id: "portal_existing", stable_token_hash: "portal-token" } as T;
          if (sql.includes("COUNT(DISTINCT credential.token_hash) AS count") || sql.includes("COUNT(*) AS count")) {
            const count = sql.includes("client_portal_recipient_credentials") || sql.includes("client_portal_threads") || sql.includes("client_portal_messages") || sql.includes("client_portal_decisions") ? 1 : 0;
            return { count } as T;
          }
          return source.prepare(sql).bind(...values).first<T>();
        },
        async all<T>() {
          if (sql.includes("SELECT email_normalized FROM client_portal_recipients")) return { results: [{ email_normalized: existingRecipientEmail }] as T[], success: true } as D1Result<T>;
          return source.prepare(sql).bind(...values).all<T>();
        },
        async run<T>() {
          if (sql.includes("UPDATE client_portal_legacy_mappings SET migration_status = 'verified'")) verified = true;
          return { success: true } as D1Result<T>;
        },
      };
      return statement;
    },
    async batch(statements) { return Promise.all(statements.map((preparedStatement) => preparedStatement.run())); },
  };

  return { database, preparedSql, wasVerified: () => verified };
}

describe("legacy Client Portal migration", () => {
  it("plans a stable-token migration with recipient-linked history and issue-wide decisions", async () => {
    const report = await migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ dryRun: true, status: "planned", recipients: { imported: 1, unresolved: 0 }, comments: { imported: 1, unresolved: 0 }, decisions: { imported: 1, unresolved: 0 }, snapshot: { estimateCount: 1, rowCount: 1 } });
    expect(report.portalId).toMatch(/^portal_legacy_/);
    expect(report.issueId).toMatch(/^issue_legacy_/);
    expect(report.unresolved).toEqual([]);
  });

  it("marks an applied migration verified only after count and hash readback", async () => {
    const fixture = verifiedMigrationDatabase();
    const report = await migrateLegacyPublicationToClientPortal({ apply: true, database: fixture.database, legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ dryRun: false, status: "verified", recipients: { imported: 1 }, comments: { imported: 1 }, decisions: { imported: 1 } });
    expect(fixture.stableTokenHash()).not.toBe("hmac-sha256-v1:legacy");
    expect(fixture.wasVerified()).toBe(true);
    expect(fixture.auditEvents()).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: "legacy_migration_imported" }),
      expect.objectContaining({ eventType: "legacy_migration_verified" }),
    ]));
  });

  it("reuses the project portal and merges a matching recipient by normalized email", async () => {
    const fixture = sharedProjectMigrationDatabase();
    const report = await migrateLegacyPublicationToClientPortal({ apply: true, database: fixture.database, legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ audienceStrategy: "shared_recipients", portalId: "portal_existing", issueId: expect.stringMatching(/^issue_legacy_/), status: "verified" });
    expect(fixture.preparedSql.some((sql) => sql.includes("INSERT INTO client_portals"))).toBe(false);
    expect(fixture.preparedSql.some((sql) => sql.includes("UPDATE client_portal_recipients SET role_template = 'approver'"))).toBe(true);
    expect(fixture.wasVerified()).toBe(true);
  });

  it("keeps a disjoint legacy audience in a separate portal", async () => {
    const fixture = sharedProjectMigrationDatabase("other@example.com");
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ audienceStrategy: "separate_ambiguous", dryRun: true, portalId: expect.stringMatching(/^portal_legacy_audience_/) });
    expect(fixture.preparedSql.some((sql) => sql.includes("INSERT INTO client_portals"))).toBe(true);
  });
});
