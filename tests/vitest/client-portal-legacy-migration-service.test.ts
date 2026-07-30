import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  LegacyClientPortalMigrationError,
  migrateLegacyPublicationToClientPortal,
  rollbackLegacyPublicationClientPortalMigration,
} from "@/lib/client-portal/legacy-migration-service";

function legacyId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("base64url").slice(0, 30)}`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const expectedCommentIdentity = {
  actor_id: legacyId("recipient_legacy", "legacy_recipient_1"),
  actor_type: "recipient",
  audience: "client",
  author_snapshot_json: JSON.stringify({ legacyAuthorEmail: "client@example.com", name: "Client", side: "client" }),
  body: "Please revise the lobby.",
  created_at: "2026-07-11T01:00:00.000Z",
  message_id: legacyId("message_legacy", "comment_1"),
  message_idempotency_key: "legacy:comment_1",
  subject: "Proposal",
  target_kind: "portal",
  target_label: "Proposal",
  target_public_id: null,
  target_secondary_label: null,
  thread_id: legacyId("thread_legacy", "comment_1"),
  visibility: "client",
};

function expectedDecisionIdentity(issueContentHash: string, issueId: string, recipientId: string) {
  return {
    decision: "changes_requested",
    decision_id: legacyId("decision_legacy", "response_1"),
    idempotency_key: "legacy:response_1",
    intent_hash: sha256(JSON.stringify({ decision: "changes_requested", issueId, legacyResponseId: "response_1", signatureIntentHash: null })),
    issue_content_hash: issueContentHash,
    note: "Adjust scope",
    recipient_id: recipientId,
    signer_email_snapshot: "client@example.com",
    signer_name: null,
    submitted_at: "2026-07-11T02:00:00.000Z",
  };
}

function legacyRecipient(id: string, email: string) {
  return { created_at: "2026-07-11T00:00:00.000Z", display_name: `Recipient ${id}`, email, id, recipient_token_hash: `token:${id}` };
}

function legacyComment(id: string, overrides: Record<string, unknown> = {}) {
  return {
    author_email: "client@example.com",
    author_name: "Client",
    body: `Comment ${id}`,
    created_at: "2026-07-11T01:00:00.000Z",
    estimate_id: null,
    id,
    is_internal: 0,
    recipient_id: "legacy_recipient_1",
    row_id: null,
    target_kind: "proposal",
    target_label: "Proposal",
    target_secondary_label: null,
    ...overrides,
  };
}

function legacyResponse(id: string, overrides: Record<string, unknown> = {}) {
  return {
    created_at: "2026-07-11T02:00:00.000Z",
    decision: "revision_requested",
    estimate_id: null,
    id,
    note: "Adjust scope",
    recipient_id: "legacy_recipient_1",
    row_id: null,
    signature_intent_hash: null,
    signer_name: null,
    snapshot_version_at_decision: 3,
    target_kind: "proposal",
    target_label: "Proposal",
    target_secondary_label: null,
    ...overrides,
  };
}

function migrationDatabase(publicationOverrides: Partial<{
  expires_at: string | null;
  password_hash: string | null;
  published_by: string | null;
  snapshot_json: string;
  snapshot_version: number;
  status: "published" | "expired" | "revoked";
}> = {}): D1DatabaseLike {
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
          if (sql.includes("FROM project_publications")) return { encrypted_token: "aes-256-gcm-v1:legacy", expires_at: null, id: "publication_1", password_hash: null, project_id: "project_1", published_at: "2026-07-11T00:00:00.000Z", published_by: "owner_1", selected_estimate_ids: "[\"estimate_1\"]", snapshot_json: JSON.stringify(snapshot), snapshot_version: 3, status: "published", token_hash: "hmac-sha256-v1:legacy", workspace_id: "workspace_1", ...publicationOverrides } as T;
          return null as T | null;
        },
        async all<T>() {
          if (sql.includes("shared_link_recipients")) return { results: [{ id: "legacy_recipient_1", email: "client@example.com", display_name: "Client", recipient_token_hash: "hmac-sha256-v1:recipient", created_at: "2026-07-11T00:00:00.000Z" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("shared_link_comments")) return { results: [{ id: "comment_1", recipient_id: "legacy_recipient_1", author_email: "client@example.com", author_name: "Client", estimate_id: null, row_id: null, body: "Please revise the lobby.", is_internal: 0, target_kind: "proposal", target_label: "Proposal", target_secondary_label: null, created_at: "2026-07-11T01:00:00.000Z" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("shared_link_responses")) return { results: [{ id: "response_1", recipient_id: "legacy_recipient_1", decision: "revision_requested", note: "Adjust scope", snapshot_version_at_decision: 3, estimate_id: null, row_id: null, target_kind: "proposal", target_label: "Proposal", target_secondary_label: null, signer_name: null, signature_intent_hash: null, created_at: "2026-07-11T02:00:00.000Z" }] as T[], success: true } as D1Result<T>;
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
  let migrationNotes = "";
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
            issueContentHash = String(nextValues[11]);
          }
          if (sql.includes("INSERT INTO client_portal_legacy_mappings")) migrationNotes = String(nextValues[5]);
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
        async all<T>() {
          if (sql.includes("FROM client_portal_recipient_credentials AS credential")) return { results: [{ credential_id: legacyId("credential_legacy", "legacy_recipient_1"), email_normalized: "client@example.com", recipient_id: legacyId("recipient_legacy", "legacy_recipient_1"), revoked_at: null, status: "active", token_hash: "hmac-sha256-v1:recipient" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("FROM client_portal_threads AS thread")) return { results: [expectedCommentIdentity] as T[], success: true } as D1Result<T>;
          if (sql.includes("FROM client_portal_decisions")) return { results: [expectedDecisionIdentity(issueContentHash, issueId, legacyId("recipient_legacy", "legacy_recipient_1"))] as T[], success: true } as D1Result<T>;
          return source.prepare(sql).bind(...values).all<T>();
        },
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

  return { auditEvents: () => auditEvents, database, migrationNotes: () => migrationNotes, stableTokenHash: () => stableTokenHash, wasVerified: () => verified };
}

function sharedProjectMigrationDatabase(existingRecipientEmail: string | null = "client@example.com") {
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
            issueContentHash = String(nextValues[11]);
          }
          return statement;
        },
        async first<T>() {
          if (sql.includes("WHERE project_id = ? AND workspace_id = ?")) return { current_issue_id: "issue_existing", id: "portal_existing", stable_token_hash: "portal-token" } as T;
          if (sql.includes("COALESCE(MAX(issue_number), 0)")) return { count: 4 } as T;
          if (sql.includes("email_normalized = ?")) return (values[1] === existingRecipientEmail ? { id: "recipient_existing" } : null) as T | null;
          if (sql.includes("FROM client_portal_legacy_mappings AS mapping")) return { current_issue_id: "issue_existing", issue_content_hash: issueContentHash, issue_id: issueId, portal_id: "portal_existing", stable_token_hash: "portal-token" } as T;
          if (sql.includes("COUNT(DISTINCT credential.token_hash) AS count") || sql.includes("COUNT(*) AS count")) {
            const count = sql.includes("client_portal_recipient_credentials") || sql.includes("client_portal_threads") || sql.includes("client_portal_messages") || sql.includes("client_portal_decisions") ? 1 : 0;
            return { count } as T;
          }
          return source.prepare(sql).bind(...values).first<T>();
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_recipient_credentials AS credential")) return { results: [{ credential_id: legacyId("credential_legacy", "legacy_recipient_1"), email_normalized: "client@example.com", recipient_id: "recipient_existing", revoked_at: null, status: "active", token_hash: "hmac-sha256-v1:recipient" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("SELECT email_normalized FROM client_portal_recipients")) return { results: (existingRecipientEmail === null ? [] : [{ email_normalized: existingRecipientEmail }]) as T[], success: true } as D1Result<T>;
          if (sql.includes("FROM client_portal_threads AS thread")) return { results: [{ ...expectedCommentIdentity, actor_id: "recipient_existing" }] as T[], success: true } as D1Result<T>;
          if (sql.includes("FROM client_portal_decisions")) return { results: [expectedDecisionIdentity(issueContentHash, issueId, "recipient_existing")] as T[], success: true } as D1Result<T>;
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

function sourceRowsDatabase(input: {
  comments?: unknown[];
  failQueryContaining?: string;
  publicationOverrides?: Parameters<typeof migrationDatabase>[0];
  recipients?: unknown[];
  responses?: unknown[];
  source?: D1DatabaseLike;
}) {
  const source = input.source ?? migrationDatabase(input.publicationOverrides);
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) {
          sourceStatement.bind(...values);
          return statement;
        },
        async first<T>() {
          return sourceStatement.first<T>();
        },
        async all<T>() {
          if (input.failQueryContaining && sql.includes(input.failQueryContaining)) {
            return { results: [], success: false } as D1Result<T>;
          }
          if (sql.includes("shared_link_recipients") && input.recipients) return { results: input.recipients as T[], success: true } as D1Result<T>;
          if (sql.includes("shared_link_comments") && input.comments) return { results: input.comments as T[], success: true } as D1Result<T>;
          if (sql.includes("shared_link_responses") && input.responses) return { results: input.responses as T[], success: true } as D1Result<T>;
          return sourceStatement.all<T>();
        },
        async run<T>() {
          return sourceStatement.run<T>();
        },
      };
      return statement;
    },
  } satisfies D1DatabaseLike;
}

function recordingDatabase(source: D1DatabaseLike = migrationDatabase()) {
  const prepared: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const record = { sql, values: [] as D1Value[] };
      prepared.push(record);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) {
          record.values = values;
          sourceStatement.bind(...values);
          return statement;
        },
        async first<T>() { return sourceStatement.first<T>(); },
        async all<T>() { return sourceStatement.all<T>(); },
        async run<T>() { return sourceStatement.run<T>(); },
      };
      return statement;
    },
  };
  return { database, prepared };
}

type VerificationMismatch =
  | "comment"
  | "content"
  | "credential"
  | "current-issue"
  | "decision"
  | "forbidden-scoped-decision"
  | "issue"
  | "portal"
  | "preserved-decision"
  | "stable-token";

function statefulAppliedMigrationDatabase(source: D1DatabaseLike, mismatch?: VerificationMismatch) {
  const prepared: Array<{ sql: string; values: D1Value[] }> = [];
  const recordsContaining = (fragment: string) => prepared.filter(({ sql }) => sql.includes(fragment));
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const record = { sql, values: [] as D1Value[] };
      prepared.push(record);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) {
          record.values = values;
          sourceStatement.bind(...values);
          return statement;
        },
        async first<T>() {
          if (sql.includes("FROM client_portal_legacy_mappings AS mapping")) {
            const portal = recordsContaining("INSERT INTO client_portals")[0]?.values ?? [];
            const issue = recordsContaining("INSERT INTO client_portal_issues")[0]?.values ?? [];
            return {
              current_issue_id: mismatch === "current-issue" ? "issue_other" : issue[0],
              issue_content_hash: mismatch === "content" ? "content_other" : issue[11],
              issue_id: mismatch === "issue" ? "issue_other" : issue[0],
              portal_id: mismatch === "portal" ? "portal_other" : portal[0],
              stable_token_hash: mismatch === "stable-token" ? "token_other" : portal[6],
            } as T;
          }
          if (sql.includes("COUNT(*) AS count FROM client_portal_decisions")) {
            return { count: mismatch === "forbidden-scoped-decision" ? 1 : 0 } as T;
          }
          return sourceStatement.first<T>();
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_recipient_credentials AS credential")) {
            const rows = recordsContaining("INSERT INTO client_portal_recipient_credentials").map(({ values }, index) => ({
              credential_id: values[0],
              email_normalized: recordsContaining("INSERT INTO client_portal_recipients")[index]?.values[2],
              recipient_id: values[1],
              revoked_at: null,
              status: "active",
              token_hash: mismatch === "credential" && index === 0 ? "token_other" : values[2],
            })).sort((left, right) => String(right.credential_id).localeCompare(String(left.credential_id)));
            return { results: rows as T[], success: true } as D1Result<T>;
          }
          if (sql.includes("FROM client_portal_threads AS thread")) {
            const messages = recordsContaining("INSERT INTO client_portal_messages");
            const rows = recordsContaining("INSERT INTO client_portal_threads").map(({ values }, index) => {
              const message = messages.find(({ values: messageValues }) => messageValues[1] === values[0])?.values ?? [];
              return {
                actor_id: message[3],
                actor_type: message[2],
                audience: values[8],
                author_snapshot_json: message[4],
                body: mismatch === "comment" && index === 0 ? "body_other" : message[5],
                created_at: message[8],
                message_id: message[0],
                message_idempotency_key: message[6],
                subject: values[7],
                target_kind: values[3],
                target_label: values[5],
                target_public_id: values[4],
                target_secondary_label: values[6],
                thread_id: values[0],
                visibility: message[7],
              };
            }).sort((left, right) => String(right.thread_id).localeCompare(String(left.thread_id)));
            return { results: rows as T[], success: true } as D1Result<T>;
          }
          if (sql.includes("FROM client_portal_decisions")) {
            const rows = recordsContaining("INSERT INTO client_portal_decisions").map(({ values }, index) => ({
              decision: values[4],
              decision_id: values[0],
              idempotency_key: values[10],
              intent_hash: values[9],
              issue_content_hash: values[8],
              note: mismatch === "decision" && index === 0 ? "note_other" : values[5],
              recipient_id: values[3],
              signer_email_snapshot: values[7],
              signer_name: values[6],
              submitted_at: values[11],
            })).sort((left, right) => String(right.decision_id).localeCompare(String(left.decision_id)));
            return { results: rows as T[], success: true } as D1Result<T>;
          }
          if (sql.includes("event_type = 'legacy_scoped_decision_preserved'")) {
            const rows = prepared.filter(({ sql: preparedSql }) => preparedSql.includes("INSERT INTO client_portal_audit_events") && preparedSql.includes("'legacy_scoped_decision_preserved'")).map(({ values }, index) => ({
              audit_id: values[0],
              metadata_json: mismatch === "preserved-decision" && index === 0 ? "{}" : values[5],
            })).sort((left, right) => String(right.audit_id).localeCompare(String(left.audit_id)));
            return { results: rows as T[], success: true } as D1Result<T>;
          }
          return sourceStatement.all<T>();
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  };
  return { database, prepared };
}

function failingRunDatabase(source: D1DatabaseLike, sqlFragment: string) {
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { sourceStatement.bind(...values); return statement; },
        async first<T>() { return sourceStatement.first<T>(); },
        async all<T>() { return sourceStatement.all<T>(); },
        async run<T>() { return sql.includes(sqlFragment) ? { success: false } as D1Result<T> : sourceStatement.run<T>(); },
      };
      return statement;
    },
  } satisfies D1DatabaseLike;
}

function overrideFirstDatabase(source: D1DatabaseLike, sqlFragment: string, result: unknown) {
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { sourceStatement.bind(...values); return statement; },
        async first<T>() { return sql.includes(sqlFragment) ? result as T | null : sourceStatement.first<T>(); },
        async all<T>() { return sourceStatement.all<T>(); },
        async run<T>() { return sourceStatement.run<T>(); },
      };
      return statement;
    },
  } satisfies D1DatabaseLike;
}

function transformFirstDatabase(source: D1DatabaseLike, sqlFragment: string, transform: (row: unknown) => unknown) {
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { sourceStatement.bind(...values); return statement; },
        async first<T>() {
          const row = await sourceStatement.first<T>();
          return (sql.includes(sqlFragment) ? transform(row) : row) as T | null;
        },
        async all<T>() { return sourceStatement.all<T>(); },
        async run<T>() { return sourceStatement.run<T>(); },
      };
      return statement;
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  } satisfies D1DatabaseLike;
}

function unstableMappedDatabase(field: "issue" | "portal") {
  const source = mappedMigrationDatabase("expected");
  let issueReads = 0;
  let portalReads = 0;
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const sourceStatement = source.prepare(sql);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { sourceStatement.bind(...values); return statement; },
        async first<T>() {
          if (sql.includes("SELECT portal_id, issue_id, migration_status FROM client_portal_legacy_mappings")) {
            return {
              get issue_id() { issueReads += 1; return field === "issue" && issueReads >= 2 ? "issue_changed" : "issue_mapped"; },
              migration_status: "verified",
              get portal_id() { portalReads += 1; return field === "portal" && portalReads >= 3 ? "portal_changed" : "portal_mapped"; },
            } as T;
          }
          return sourceStatement.first<T>();
        },
        async all<T>() { return sourceStatement.all<T>(); },
        async run<T>() { return sourceStatement.run<T>(); },
      };
      return statement;
    },
  } satisfies D1DatabaseLike;
}

function rollbackDatabase(input: {
  batchResults?: Array<{ success: boolean }>;
  confirmRollback?: boolean;
  includeBatch?: boolean;
  mapping?: boolean;
  runSuccess?: boolean;
} = {}) {
  const prepared: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      const record = { sql, values: [] as D1Value[] };
      prepared.push(record);
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { record.values = values; return statement; },
        async first<T>() {
          if (sql.includes("JOIN client_portals AS portal")) {
            return (input.mapping === false ? null : { issue_id: "issue_1", migration_status: "verified", portal_id: "portal_1", workspace_id: "workspace_1" }) as T | null;
          }
          if (sql.includes("SELECT migration_status FROM client_portal_legacy_mappings")) {
            return (input.confirmRollback === false ? null : { migration_status: "rejected" }) as T | null;
          }
          return null;
        },
        async all<T>() { return { results: [], success: true } as D1Result<T>; },
        async run<T>() { return { success: input.runSuccess !== false } as D1Result<T>; },
      };
      return statement;
    },
  };
  if (input.includeBatch) {
    database.batch = async (statements) => input.batchResults
      ? input.batchResults as D1Result<unknown>[]
      : Promise.all(statements.map((statement) => statement.run()));
  }
  return { database, prepared };
}

function mappedMigrationDatabase(
  commentIdentity: "content" | "expected" | "missing" | "wrong",
  credentialIdentity: "expected" | "revoked" | "wrong-email" | "wrong-recipient" = "expected",
  mappingStatus: "cutover_complete" | "imported" | "rejected" | "verified" = "verified",
) {
  const source = migrationDatabase();
  const leaseBindings: D1Value[][] = [];
  let issueContentHash = "";
  let verified = false;
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...nextValues: D1Value[]) {
          values = nextValues;
          if (sql.includes("$.cutover_lease_frozen_at")) leaseBindings.push(nextValues);
          if (sql.includes("INSERT INTO client_portal_issues")) issueContentHash = String(nextValues[11]);
          return statement;
        },
        async first<T>() {
          if (sql.includes("SELECT portal_id, issue_id, migration_status FROM client_portal_legacy_mappings")) {
            return { issue_id: "issue_mapped", migration_status: mappingStatus, portal_id: "portal_mapped" } as T;
          }
          if (sql.includes("FROM client_portals WHERE id = ?")) {
            return { current_issue_id: "issue_mapped", id: "portal_mapped", stable_token_hash: "portal-token" } as T;
          }
          if (sql.includes("COALESCE(MAX(issue_number), 0)")) return { count: 1 } as T;
          if (sql.includes("email_normalized = ?")) return { id: "recipient_mapped" } as T;
          if (sql.includes("FROM client_portal_legacy_mappings AS mapping")) {
            return {
              current_issue_id: "issue_mapped",
              issue_content_hash: issueContentHash,
              issue_id: "issue_mapped",
              portal_id: "portal_mapped",
              stable_token_hash: "portal-token",
            } as T;
          }
          if (sql.includes("COUNT(DISTINCT credential.token_hash) AS count")) return { count: 1 } as T;
          return source.prepare(sql).bind(...values).first<T>();
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_recipient_credentials AS credential")) {
            return {
              results: [{
                credential_id: legacyId("credential_legacy", "legacy_recipient_1"),
                email_normalized: credentialIdentity === "wrong-email" ? "other@example.com" : "client@example.com",
                recipient_id: credentialIdentity === "wrong-recipient" ? "recipient_other" : "recipient_mapped",
                revoked_at: credentialIdentity === "revoked" ? "2026-07-12T00:00:00.000Z" : null,
                status: credentialIdentity === "revoked" ? "revoked" : "active",
                token_hash: "hmac-sha256-v1:recipient",
              }] as T[],
              success: true,
            } as D1Result<T>;
          }
          if (sql.includes("FROM client_portal_threads AS thread")) {
            const results = commentIdentity === "missing"
              ? []
              : [{
                ...expectedCommentIdentity,
                actor_id: "recipient_mapped",
                ...(commentIdentity === "wrong" ? { message_id: "message_modern_equal_count" } : {}),
                ...(commentIdentity === "content" ? { body: "Corrupted replacement content" } : {}),
                }];
            return { results: results as T[], success: true } as D1Result<T>;
          }
          if (sql.includes("FROM client_portal_decisions")) return { results: [expectedDecisionIdentity(issueContentHash, "issue_mapped", "recipient_mapped")] as T[], success: true } as D1Result<T>;
          return source.prepare(sql).bind(...values).all<T>();
        },
        async run<T>() {
          if (sql.includes("UPDATE client_portal_legacy_mappings SET migration_status = 'verified'")) verified = true;
          return { success: true } as D1Result<T>;
        },
      };
      return statement;
    },
  };
  return Object.assign(database, { leaseBindings, wasVerified: () => verified });
}

describe("legacy Client Portal migration", () => {
  it.each([
    ["null", "null"],
    ["array", "[]"],
    ["missing project", JSON.stringify({ estimates: [] })],
    ["non-array estimates", JSON.stringify({ project: {}, estimates: {} })],
  ])("rejects an %s snapshot with the exact migration error", async (_case, snapshotJson) => {
    const operation = migrateLegacyPublicationToClientPortal({
      database: migrationDatabase({ snapshot_json: snapshotJson }),
      legacyPublicationId: "publication_1",
    });

    await expect(operation).rejects.toEqual(expect.objectContaining({
      message: "Legacy publication snapshot is invalid and cannot be migrated safely.",
      name: "LegacyClientPortalMigrationError",
    }));
    await expect(operation).rejects.toBeInstanceOf(LegacyClientPortalMigrationError);
    await expect(operation).rejects.not.toHaveProperty("cause");
  });

  it("rejects invalid JSON with the exact migration error and syntax cause", async () => {
    const operation = migrateLegacyPublicationToClientPortal({
      database: migrationDatabase({ snapshot_json: "{" }),
      legacyPublicationId: "publication_1",
    });

    await expect(operation).rejects.toEqual(expect.objectContaining({
      cause: expect.any(SyntaxError),
      message: "Legacy publication snapshot is invalid and cannot be migrated safely.",
      name: "LegacyClientPortalMigrationError",
    }));
    await expect(operation).rejects.toBeInstanceOf(LegacyClientPortalMigrationError);
  });

  it("rejects a non-array estimates collection even when it implements map", async () => {
    const estimatesMap = vi.fn(() => []);
    const parseSpy = vi.spyOn(JSON, "parse").mockReturnValue({
      estimateCount: 0,
      estimates: { length: 0, map: estimatesMap },
      generatedAt: "2026-07-12T00:00:00.000Z",
      project: { currencyCode: "USD", id: "project_1", location: null, locationVisibility: "hidden", name: "Project", projectCode: "P-1" },
      rowCount: 0,
      schemaVersion: 1,
      totalCost: 0,
    });
    try {
      await expect(migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" }))
        .rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy publication snapshot is invalid and cannot be migrated safely."));
      expect(estimatesMap).not.toHaveBeenCalled();
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("returns the exact error when the legacy publication does not exist", async () => {
    const database: D1DatabaseLike = {
      prepare(): D1PreparedStatementLike {
        const statement: D1PreparedStatementLike = {
          bind() { return statement; },
          async first<T>() { return null as T | null; },
          async all<T>() { return { results: [], success: true } as D1Result<T>; },
          async run<T>() { return { success: true } as D1Result<T>; },
        };
        return statement;
      },
    };

    await expect(migrateLegacyPublicationToClientPortal({ database, legacyPublicationId: "missing_publication" }))
      .rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy publication was not found."));
  });

  it("returns the exact error when a legacy source query reports failure", async () => {
    await expect(migrateLegacyPublicationToClientPortal({
      database: sourceRowsDatabase({ failQueryContaining: "shared_link_comments" }),
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy migration source query failed."));
  });

  it("plans a stable-token migration with recipient-linked history and issue-wide decisions", async () => {
    const report = await migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ dryRun: true, status: "planned", recipients: { imported: 1, unresolved: 0 }, comments: { imported: 1, unresolved: 0 }, decisions: { imported: 1, unresolved: 0 }, snapshot: { estimateCount: 1, rowCount: 1 } });
    expect(report.portalId).toMatch(/^portal_legacy_/);
    expect(report.issueId).toMatch(/^issue_legacy_/);
    expect(report.unresolved).toEqual([]);
  });

  it("produces a deterministic complete report for identical legacy source data", async () => {
    const first = await migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" });
    const second = await migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" });

    expect(second).toEqual(first);
    expect(first).toEqual(expect.objectContaining({
      audienceStrategy: "project_default",
      comments: { imported: 1, unresolved: 0 },
      decisions: { imported: 1, unresolved: 0 },
      dryRun: true,
      issueId: legacyId("issue_legacy", "publication_1"),
      legacyPublicationId: "publication_1",
      portalId: legacyId("portal_legacy_project", "project_1"),
      recipients: { imported: 1, unresolved: 0 },
      snapshot: {
        estimateCount: 1,
        legacyHistorySha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        rowCount: 1,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        sourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      status: "planned",
      unresolved: [],
    }));
    expect(new Set([first.snapshot.legacyHistorySha256, first.snapshot.sha256, first.snapshot.sourceSha256])).toHaveLength(3);
  });

  it("classifies unresolved comments by missing recipient, missing target, and empty body", async () => {
    const baseComment = {
      author_email: "client@example.com",
      author_name: "Client",
      created_at: "2026-07-11T01:00:00.000Z",
      estimate_id: null,
      is_internal: 0,
      row_id: null,
      target_label: "Legacy discussion",
      target_secondary_label: null,
    };
    const report = await migrateLegacyPublicationToClientPortal({
      database: sourceRowsDatabase({
        comments: [
          { ...baseComment, body: "Missing actor", id: "comment_missing_recipient", recipient_id: null, target_kind: "proposal" },
          { ...baseComment, body: "Missing estimate", id: "comment_missing_target", recipient_id: "legacy_recipient_1", target_kind: "estimate" },
          { ...baseComment, body: "   ", id: "comment_empty", recipient_id: "legacy_recipient_1", target_kind: "proposal" },
        ],
        responses: [],
      }),
      legacyPublicationId: "publication_1",
    });

    expect(report.comments).toEqual({ imported: 0, unresolved: 3 });
    expect(report.decisions).toEqual({ imported: 0, unresolved: 0 });
    expect(report.unresolved).toEqual([
      { id: "comment_missing_recipient", kind: "comment", reason: "missing_or_ambiguous_recipient" },
      { id: "comment_missing_target", kind: "comment", reason: "missing_legacy_target" },
      { id: "comment_empty", kind: "comment", reason: "empty_comment_body" },
    ]);
  });

  it("classifies unresolved decisions by missing recipient and missing target", async () => {
    const baseResponse = {
      created_at: "2026-07-11T02:00:00.000Z",
      decision: "accepted",
      estimate_id: null,
      note: null,
      row_id: null,
      signature_intent_hash: null,
      signer_name: null,
      snapshot_version_at_decision: 3,
      target_label: "Legacy decision",
      target_secondary_label: null,
    };
    const report = await migrateLegacyPublicationToClientPortal({
      database: sourceRowsDatabase({
        comments: [],
        responses: [
          { ...baseResponse, id: "decision_missing_recipient", recipient_id: null, target_kind: "proposal" },
          { ...baseResponse, id: "decision_missing_target", recipient_id: "legacy_recipient_1", target_kind: "row" },
        ],
      }),
      legacyPublicationId: "publication_1",
    });

    expect(report.comments).toEqual({ imported: 0, unresolved: 0 });
    expect(report.decisions).toEqual({ imported: 0, unresolved: 2 });
    expect(report.unresolved).toEqual([
      { id: "decision_missing_recipient", kind: "decision", reason: "missing_or_ambiguous_recipient" },
      { id: "decision_missing_target", kind: "decision", reason: "missing_legacy_target" },
    ]);
  });

  it("prepares exact section policies and commitment event exposure SQL with deterministic bindings", async () => {
    const fixture = recordingDatabase();
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();
    const sectionStatements = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_issue_sections"));
    const exposureStatements = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_event_exposures"));
    const eventStatements = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO project_commitment_events"));
    const migrationAudit = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_audit_events"));
    const portal = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portals"));
    const issue = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_issues"));
    const recipientInsert = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_recipients"));
    const sourceQueries = fixture.prepared.filter(({ sql }) => sql.includes("FROM shared_link_"));
    const existingPortalQuery = fixture.prepared.find(({ sql }) => sql.includes("WHERE project_id = ? AND workspace_id = ?"));

    expect(sectionStatements.map(({ values }) => values[9])).toEqual([
      "{\"allowedOrganizations\":[],\"allowedRecipientIds\":[],\"commentable\":false,\"downloadable\":false,\"enabled\":true,\"layoutMode\":\"standard\",\"minimumCapability\":null,\"visibleFields\":[]}",
      "{\"allowedOrganizations\":[],\"allowedRecipientIds\":[],\"commentable\":true,\"downloadable\":true,\"enabled\":true,\"layoutMode\":\"wide\",\"minimumCapability\":null,\"visibleFields\":[]}",
    ]);
    expect(portal?.values.slice(0, 6)).toEqual([
      legacyId("portal_legacy_project", "project_1"),
      "workspace_1",
      "project_1",
      "Makati Tower (legacy)",
      "Migrated legacy publication",
      "live",
    ]);
    expect(recipientInsert?.values.slice(4, 6)).toEqual(["approver", 1]);
    expect(issue?.values.slice(0, 10)).toEqual([
      legacyId("issue_legacy", "publication_1"),
      legacyId("portal_legacy_project", "project_1"),
      1,
      "Legacy issue 3",
      "issued",
      "2026-07-11T00:00:00.000Z",
      "owner_1",
      "legacy:publication_1",
      null,
      null,
    ]);
    expect(issue?.values.slice(11, 15)).toEqual(["46e5979b80f43e5f8d3332172ac019c0fd3da35051065b0f39c888c51af55165", 100, "USD", "[\"estimate_1\"]"]);
    expect(normalizeSql(issue?.sql ?? "")).toContain("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{\"scope\":\"issue\",\"legacy\":true}', '[]', '[]', ?)");
    expect(JSON.parse(String(issue?.values[10]))).toEqual(expect.objectContaining({
      contentHash: issue?.values[11],
      currencyCode: "USD",
      issueId: legacyId("issue_legacy", "publication_1"),
      issueNumber: 1,
      issuedAt: "2026-07-11T00:00:00.000Z",
      portalId: legacyId("portal_legacy_project", "project_1"),
      project: { code: "MK-100", name: "Makati Tower" },
      schemaVersion: 1,
      totalCost: 100,
      versionLabel: "Legacy issue 3",
    }));
    expect(JSON.parse(String(issue?.values[10])).sections).toEqual([
      expect.objectContaining({ id: legacyId("issue_section", "publication_1:overview"), kind: "overview", layoutMode: "standard", sectionKey: "overview", sortOrder: 0, title: "Overview" }),
      expect.objectContaining({ id: legacyId("issue_section", "publication_1:estimate_browser"), kind: "estimate_browser", layoutMode: "wide", sectionKey: "estimate_browser", sortOrder: 1, title: "Estimates" }),
    ]);
    expect(sectionStatements.map(({ values }) => values.slice(0, 6))).toEqual([
      [legacyId("issue_section", "publication_1:overview"), legacyId("issue_legacy", "publication_1"), "overview", "overview", "Overview", 0],
      [legacyId("issue_section", "publication_1:estimate_browser"), legacyId("issue_legacy", "publication_1"), "estimate_browser", "estimate_browser", "Estimates", 1],
    ]);
    expect(JSON.parse(String(sectionStatements[0]?.values[6]))).toEqual({ currencyCode: "USD", estimateCount: 1, project: { code: "MK-100", name: "Makati Tower" }, schemaVersion: 1, totalCost: 100 });
    expect(JSON.parse(String(sectionStatements[1]?.values[6]))).toEqual(expect.objectContaining({ allowRowDiscussion: false, currencyCode: "USD", defaultGrouping: "area", paging: { mode: "inline" }, schemaVersion: 1, totalRowCount: 1 }));
    expect(sourceQueries.map(({ values }) => values)).toEqual([["publication_1"], ["publication_1"], ["publication_1"]]);
    expect(existingPortalQuery?.values).toEqual(["project_1", "workspace_1"]);
    expect(new Set(exposureStatements.map(({ sql }) => normalizeSql(sql)))).toEqual(new Set([
      "INSERT INTO client_portal_event_exposures ( event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json, exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason ) VALUES (?, ?, ?, 'visible', 'backfill', '{\"capability\":\"timeline:view\"}', 'system', 'legacy_migration', ?, NULL, NULL)",
    ]));
    expect(exposureStatements.map(({ values }) => values)).toEqual([
      [legacyId("event_legacy_publication", "publication_1"), legacyId("portal_legacy_project", "project_1"), legacyId("public_event_legacy_publication", "publication_1"), "2026-07-11T00:00:00.000Z"],
      [legacyId("event_legacy_issue", "publication_1"), legacyId("portal_legacy_project", "project_1"), legacyId("public_event_legacy_issue", "publication_1"), "2026-07-11T00:00:00.000Z"],
      [legacyId("event_legacy_decision", "response_1"), legacyId("portal_legacy_project", "project_1"), legacyId("public_event_legacy_decision", "response_1"), "2026-07-11T02:00:00.000Z"],
    ]);
    expect(eventStatements.map(({ values }) => [values[4], values[5], values[6], values[7], values[8], values[9]])).toEqual([
      ["legacy_publication.imported", "legacy_publication", "publication_1", null, null, "publication_1"],
      ["issue.issued", "issue", legacyId("issue_legacy", "publication_1"), legacyId("issue_legacy", "publication_1"), null, null],
      ["decision.changes_requested", "decision", legacyId("decision_legacy", "response_1"), null, legacyId("decision_legacy", "response_1"), null],
    ]);
    expect(eventStatements[0]?.values.slice(10, 18)).toEqual([
      `legacy:${legacyId("event_legacy_publication", "publication_1")}`,
      "internal_user",
      "owner_1",
      null,
      "Legacy publication was added to the commitment timeline",
      "Historical publication evidence is available with aggregate-only comparison.",
      "{\"issueNumber\":1,\"status\":\"published\",\"versionLabel\":\"Legacy issue 3\"}",
      "{\"comparisonCapability\":\"aggregate_only\",\"legacyPublicationId\":\"publication_1\"}",
    ]);
    expect(eventStatements[1]?.values.slice(10, 18)).toEqual([
      `legacy:${legacyId("event_legacy_issue", "publication_1")}`,
      "internal_user",
      "owner_1",
      null,
      "Legacy issue 3 was issued",
      null,
      "{\"issueNumber\":1,\"status\":\"issued\",\"versionLabel\":\"Legacy issue 3\"}",
      "{\"legacyPublicationId\":\"publication_1\"}",
    ]);
    expect(migrationAudit?.values).toEqual([
      expect.stringMatching(/^audit_[0-9a-f-]{36}$/),
      "workspace_1",
      legacyId("portal_legacy_project", "project_1"),
      legacyId("issue_legacy", "publication_1"),
      "legacy_migration_imported",
      JSON.stringify({ commentsImported: 1, decisionsImported: 1, legacyPublicationId: "publication_1", recipientCredentialsImported: 1, snapshotContentHash: issue?.values[11] }),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    ]);
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

  it("requires D1 batch support before writing a new migration", async () => {
    await expect(migrateLegacyPublicationToClientPortal({
      apply: true,
      database: migrationDatabase(),
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal migration requires D1 batch support."));
  });

  it("rejects a mixed D1 batch result when any migration statement fails", async () => {
    const fixture = verifiedMigrationDatabase();
    fixture.database.batch = async () => [{ success: true }, { success: false }] as D1Result<unknown>[];

    await expect(migrateLegacyPublicationToClientPortal({
      apply: true,
      database: fixture.database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal migration write failed."));
    expect(fixture.wasVerified()).toBe(false);
  });

  it("reports the exact error when verification status batch recording fails", async () => {
    const fixture = verifiedMigrationDatabase();
    let batchCall = 0;
    fixture.database.batch = async (statements) => {
      batchCall += 1;
      if (batchCall === 1) return Promise.all(statements.map((preparedStatement) => preparedStatement.run()));
      return [{ success: false }] as D1Result<unknown>[];
    };

    await expect(migrateLegacyPublicationToClientPortal({
      apply: true,
      database: fixture.database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal migration verification status could not be recorded."));
    expect(batchCall).toBe(2);
  });

  it("binds an applied migration mapping to the exact cutover barrier lease", async () => {
    const fixture = verifiedMigrationDatabase();
    const cutoverLease = {
      frozenAt: "2026-07-28T00:00:00.000Z",
      frozenBy: "legacy_cutover_pending:admin_1",
    };
    await migrateLegacyPublicationToClientPortal({
      apply: true,
      cutoverLease,
      database: fixture.database,
      legacyPublicationId: "publication_1",
    });

    expect(JSON.parse(fixture.migrationNotes())).toMatchObject({
      cutover_lease_frozen_at: cutoverLease.frozenAt,
      cutover_lease_frozen_by: cutoverLease.frozenBy,
    });
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

  it("fingerprints every migration-consumed publication field even when row counts stay constant", async () => {
    const baseline = await migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" });
    const variants = await Promise.all([
      migrateLegacyPublicationToClientPortal({ database: migrationDatabase({ password_hash: "password-v2" }), legacyPublicationId: "publication_1" }),
      migrateLegacyPublicationToClientPortal({ database: migrationDatabase({ expires_at: "2026-08-01T00:00:00.000Z" }), legacyPublicationId: "publication_1" }),
      migrateLegacyPublicationToClientPortal({ database: migrationDatabase({ status: "expired" }), legacyPublicationId: "publication_1" }),
      migrateLegacyPublicationToClientPortal({ database: migrationDatabase({ snapshot_version: 4 }), legacyPublicationId: "publication_1" }),
    ]);

    expect(new Set(variants.map((report) => report.snapshot.sourceSha256)).size).toBe(4);
    for (const report of variants) {
      expect(report.snapshot.sourceSha256).not.toBe(baseline.snapshot.sourceSha256);
    }
  });

  it("revalidates every mapped publication against exact imported child identities", async () => {
    await expect(migrateLegacyPublicationToClientPortal({
      database: mappedMigrationDatabase("missing"),
      legacyPublicationId: "publication_1",
    })).rejects.toThrow(/comment child identities/i);

    await expect(migrateLegacyPublicationToClientPortal({
      database: mappedMigrationDatabase("wrong"),
      legacyPublicationId: "publication_1",
    })).rejects.toThrow(/comment child identities/i);

    await expect(migrateLegacyPublicationToClientPortal({
      database: mappedMigrationDatabase("content"),
      legacyPublicationId: "publication_1",
    })).rejects.toThrow(/comment child identities/i);

    await expect(migrateLegacyPublicationToClientPortal({
      database: mappedMigrationDatabase("expected"),
      legacyPublicationId: "publication_1",
    })).resolves.toMatchObject({
      comments: { imported: 1, unresolved: 0 },
      decisions: { imported: 1, unresolved: 0 },
      dryRun: true,
      status: "already_migrated",
    });
  });

  it.each(["wrong-recipient", "wrong-email", "revoked"] as const)(
    "rejects an existing mapping with a %s recipient credential identity",
    async (credentialIdentity) => {
      await expect(migrateLegacyPublicationToClientPortal({
        database: mappedMigrationDatabase("expected", credentialIdentity),
        legacyPublicationId: "publication_1",
      })).rejects.toThrow(/recipient credential identities/i);
    },
  );

  it("upgrades a verified pre-lease mapping onto the acquired cutover barrier", async () => {
    const fixture = mappedMigrationDatabase("expected");
    const cutoverLease = {
      frozenAt: "2026-07-28T00:00:00.000Z",
      frozenBy: "legacy_cutover_pending:admin_1",
    };
    await migrateLegacyPublicationToClientPortal({
      apply: true,
      cutoverLease,
      database: fixture,
      legacyPublicationId: "publication_1",
    });

    expect(fixture.leaseBindings).toContainEqual(expect.arrayContaining([
      cutoverLease.frozenAt,
      cutoverLease.frozenBy,
      "publication_1",
    ]));
  });

  it.each(["imported", "rejected"] as const)("verifies an applied %s mapping before reporting success", async (mappingStatus) => {
    const fixture = mappedMigrationDatabase("expected", "expected", mappingStatus);
    const report = await migrateLegacyPublicationToClientPortal({
      apply: true,
      database: fixture,
      legacyPublicationId: "publication_1",
    });

    expect(report.status).toBe("verified");
    expect(report.dryRun).toBe(false);
    expect(fixture.wasVerified()).toBe(true);
  });

  it("does not rewrite the cutover lease for a completed mapping", async () => {
    const fixture = mappedMigrationDatabase("expected", "expected", "cutover_complete");
    await migrateLegacyPublicationToClientPortal({
      apply: true,
      cutoverLease: { frozenAt: "2026-07-28T00:00:00.000Z", frozenBy: "legacy_cutover_pending:admin_1" },
      database: fixture,
      legacyPublicationId: "publication_1",
    });

    expect(fixture.leaseBindings).toEqual([]);
    expect(fixture.wasVerified()).toBe(false);
  });

  it("uses exact dynamic identity placeholders, bindings, and verification status metadata", async () => {
    const source = sourceRowsDatabase({
      comments: [
        legacyComment("comment_2", { estimate_id: "estimate_1", recipient_id: "legacy_recipient_2", target_kind: "estimate", target_label: "Estimate" }),
        legacyComment("comment_1"),
      ],
      recipients: [legacyRecipient("legacy_recipient_1", " CLIENT@EXAMPLE.COM "), legacyRecipient("legacy_recipient_2", "second@example.com")],
      responses: [
        legacyResponse("response_1"),
        legacyResponse("response_2", { recipient_id: "legacy_recipient_2" }),
        legacyResponse("response_scoped_2", { row_id: "row_1", target_kind: "row", target_label: "Row" }),
        legacyResponse("response_scoped", { estimate_id: "estimate_1", recipient_id: "legacy_recipient_2", target_kind: "estimate", target_label: "Estimate" }),
      ],
    });
    const fixture = statefulAppliedMigrationDatabase(source);
    const report = await migrateLegacyPublicationToClientPortal({ apply: true, database: fixture.database, legacyPublicationId: "publication_1" });
    const query = (fragment: string) => fixture.prepared.find(({ sql }) => sql.includes(fragment) && sql.includes("SELECT"));
    const portalId = legacyId("portal_legacy_project", "project_1");
    const issueId = legacyId("issue_legacy", "publication_1");
    const verificationUpdate = fixture.prepared.find(({ sql }) => sql.startsWith("UPDATE client_portal_legacy_mappings SET migration_status = 'verified'"));
    const verificationAudit = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_audit_events")).at(-1);
    const decisionTwo = fixture.prepared.find(({ sql, values }) => sql.includes("INSERT INTO client_portal_decisions") && values[0] === legacyId("decision_legacy", "response_2"));

    expect(report).toMatchObject({ comments: { imported: 2, unresolved: 0 }, decisions: { imported: 2, unresolved: 0 }, recipients: { imported: 2, unresolved: 0 }, status: "verified" });
    expect(query("FROM client_portal_recipient_credentials AS credential")?.sql).toContain("credential.id IN (?, ?)");
    expect(query("FROM client_portal_recipient_credentials AS credential")?.values).toEqual([
      portalId,
      legacyId("credential_legacy", "legacy_recipient_1"),
      legacyId("credential_legacy", "legacy_recipient_2"),
    ]);
    expect(query("FROM client_portal_threads AS thread")?.sql).toContain("thread.id IN (?, ?)");
    expect(query("FROM client_portal_threads AS thread")?.sql).toContain("message.id IN (?, ?)");
    expect(query("FROM client_portal_threads AS thread")?.values).toEqual([
      portalId,
      issueId,
      legacyId("thread_legacy", "comment_2"),
      legacyId("thread_legacy", "comment_1"),
      legacyId("message_legacy", "comment_2"),
      legacyId("message_legacy", "comment_1"),
    ]);
    expect(query("FROM client_portal_decisions")?.sql).toContain("id IN (?, ?)");
    expect(query("FROM client_portal_decisions")?.values).toEqual([portalId, issueId, legacyId("decision_legacy", "response_1"), legacyId("decision_legacy", "response_2")]);
    expect(query("event_type = 'legacy_scoped_decision_preserved'")?.sql).toContain("id IN (?, ?)");
    expect(query("event_type = 'legacy_scoped_decision_preserved'")?.values).toEqual([portalId, issueId, legacyId("audit_legacy_scoped_decision", "response_scoped_2"), legacyId("audit_legacy_scoped_decision", "response_scoped")]);
    expect(query("COUNT(*) AS count FROM client_portal_decisions")?.sql).toContain("id IN (?, ?)");
    expect(query("COUNT(*) AS count FROM client_portal_decisions")?.values).toEqual([portalId, issueId, legacyId("decision_legacy", "response_scoped_2"), legacyId("decision_legacy", "response_scoped")]);
    expect(decisionTwo?.values.slice(3, 11)).toEqual([
      legacyId("recipient_legacy", "legacy_recipient_2"),
      "changes_requested",
      "Adjust scope",
      null,
      "second@example.com",
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      "legacy:response_2",
    ]);
    expect(verificationUpdate?.values).toEqual([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      verificationUpdate?.values[0],
      verificationUpdate?.values[0],
      "publication_1",
      portalId,
      issueId,
    ]);
    expect(verificationAudit?.values[4]).toBe("legacy_migration_verified");
    expect(JSON.parse(String(verificationAudit?.values[5]))).toEqual({
      commentsImported: 2,
      decisionsImported: 2,
      legacyPublicationId: "publication_1",
      recipientCredentialsImported: 2,
      snapshotContentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("skips every dynamic identity query when there are no legacy child records", async () => {
    const source = sourceRowsDatabase({ comments: [], recipients: [], responses: [] });
    const fixture = statefulAppliedMigrationDatabase(source);
    const report = await migrateLegacyPublicationToClientPortal({ apply: true, database: fixture.database, legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ comments: { imported: 0, unresolved: 0 }, decisions: { imported: 0, unresolved: 0 }, recipients: { imported: 0, unresolved: 0 }, status: "verified" });
    expect(fixture.prepared.some(({ sql }) => sql.includes("FROM client_portal_recipient_credentials AS credential"))).toBe(false);
    expect(fixture.prepared.some(({ sql }) => sql.includes("FROM client_portal_threads AS thread"))).toBe(false);
    expect(fixture.prepared.some(({ sql }) => sql.includes("FROM client_portal_decisions"))).toBe(false);
    expect(fixture.prepared.some(({ sql }) => sql.includes("legacy_scoped_decision_preserved") && sql.includes("SELECT"))).toBe(false);
  });

  it("does not record verification again when validating an existing verified mapping", async () => {
    const fixture = recordingDatabase(mappedMigrationDatabase("expected"));
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });

    expect(report.status).toBe("already_migrated");
    expect(fixture.prepared).toContainEqual({
      sql: "SELECT id, stable_token_hash, current_issue_id FROM client_portals WHERE id = ? LIMIT 1",
      values: ["portal_mapped"],
    });
    expect(fixture.prepared.some(({ sql }) => sql.startsWith("UPDATE client_portal_legacy_mappings SET migration_status = 'verified'"))).toBe(false);
    expect(fixture.prepared.some(({ sql, values }) => sql.includes("INSERT INTO client_portal_audit_events") && values[4] === "legacy_migration_verified")).toBe(false);
  });

  it.each([
    ["portal", "portal mapping"],
    ["issue", "issue mapping"],
    ["current-issue", "current issue"],
    ["stable-token", "stable token hash"],
    ["content", "issue content hash"],
    ["credential", "recipient credential identities"],
    ["comment", "comment child identities"],
    ["decision", "decision child identities"],
    ["preserved-decision", "preserved scoped decision identities"],
    ["forbidden-scoped-decision", "scoped decision authority"],
  ] as const)("reports the exact %s verification mismatch", async (mismatch, label) => {
    const source = sourceRowsDatabase({
      comments: [legacyComment("comment_1")],
      recipients: [legacyRecipient("legacy_recipient_1", "client@example.com")],
      responses: [legacyResponse("response_1"), legacyResponse("response_scoped", { estimate_id: "estimate_1", target_kind: "estimate" })],
    });
    const fixture = statefulAppliedMigrationDatabase(source, mismatch);

    await expect(migrateLegacyPublicationToClientPortal({ apply: true, database: fixture.database, legacyPublicationId: "publication_1" }))
      .rejects.toEqual(expect.objectContaining({ message: `Legacy Client Portal migration was imported but verification failed: ${label}.` }));
  });

  it("joins multiple verification mismatch labels with comma-space delimiters", async () => {
    const source = sourceRowsDatabase({ comments: [], recipients: [], responses: [] });
    const stateful = statefulAppliedMigrationDatabase(source);
    const database = transformFirstDatabase(stateful.database, "FROM client_portal_legacy_mappings AS mapping", (row) => ({
      ...(row as Record<string, unknown>),
      issue_id: "issue_other",
      portal_id: "portal_other",
    }));

    await expect(migrateLegacyPublicationToClientPortal({ apply: true, database, legacyPublicationId: "publication_1" }))
      .rejects.toEqual(expect.objectContaining({
        message: "Legacy Client Portal migration was imported but verification failed: portal mapping, issue mapping.",
      }));
  });

  it("shares an existing portal when any normalized recipient overlaps and derives exact recipient identities", async () => {
    const shared = sharedProjectMigrationDatabase("client@example.com");
    const source = sourceRowsDatabase({
      comments: [],
      recipients: [legacyRecipient("legacy_recipient_1", " CLIENT@EXAMPLE.COM "), legacyRecipient("legacy_recipient_2", "second@example.com")],
      responses: [legacyResponse("response_1")],
      source: shared.database,
    });
    const fixture = recordingDatabase(source);
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const insertedRecipient = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_recipients"));
    const promotedRecipient = fixture.prepared.find(({ sql }) => sql.includes("UPDATE client_portal_recipients SET role_template = 'approver'"));
    const credentials = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_recipient_credentials"));
    const issue = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_issues"));
    const existingRecipientQuery = fixture.prepared.find(({ sql }) => sql.includes("SELECT email_normalized FROM client_portal_recipients"));
    const issueCountQuery = fixture.prepared.find(({ sql }) => sql.includes("COALESCE(MAX(issue_number), 0)"));

    expect(report).toMatchObject({ audienceStrategy: "shared_recipients", portalId: "portal_existing" });
    expect(issue?.values[2]).toBe(5);
    expect(existingRecipientQuery?.values).toEqual(["portal_existing"]);
    expect(issueCountQuery?.values).toEqual(["portal_existing"]);
    expect(promotedRecipient?.values).toEqual(["2026-07-11T00:00:00.000Z", "recipient_existing"]);
    expect(insertedRecipient?.values).toEqual([
      legacyId("recipient_legacy", "legacy_recipient_2"),
      "portal_existing",
      "second@example.com",
      "Recipient legacy_recipient_2",
      "commenter",
      0,
      "2026-07-11T00:00:00.000Z",
      "2026-07-11T00:00:00.000Z",
    ]);
    expect(credentials.map(({ values }) => values.slice(0, 3))).toEqual([
      [legacyId("credential_legacy", "legacy_recipient_1"), "recipient_existing", "token:legacy_recipient_1"],
      [legacyId("credential_legacy", "legacy_recipient_2"), legacyId("recipient_legacy", "legacy_recipient_2"), "token:legacy_recipient_2"],
    ]);
  });

  it.each([
    [[], "client@example.com"],
    [[legacyRecipient("legacy_recipient_1", "client@example.com")], null],
  ] as const)("keeps the project default portal when one audience side is empty", async (recipients, existingRecipientEmail) => {
    const shared = sharedProjectMigrationDatabase(existingRecipientEmail);
    const database = sourceRowsDatabase({ comments: [], recipients: [...recipients], responses: [], source: shared.database });
    const report = await migrateLegacyPublicationToClientPortal({ database, legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ audienceStrategy: "project_default", portalId: "portal_existing" });
  });

  it("ignores blank legacy recipient emails when comparing portal audiences", async () => {
    const shared = sharedProjectMigrationDatabase("existing@example.com");
    const database = sourceRowsDatabase({ comments: [], recipients: [legacyRecipient("legacy_recipient_blank", "   ")], responses: [], source: shared.database });
    const report = await migrateLegacyPublicationToClientPortal({ database, legacyPublicationId: "publication_1" });

    expect(report).toMatchObject({ audienceStrategy: "project_default", portalId: "portal_existing" });
  });

  it("does not promote an existing recipient when no legacy decision names them", async () => {
    const shared = sharedProjectMigrationDatabase("client@example.com");
    const fixture = recordingDatabase(sourceRowsDatabase({ comments: [], recipients: [legacyRecipient("legacy_recipient_1", "client@example.com")], responses: [], source: shared.database }));
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });

    expect(fixture.prepared.some(({ sql }) => sql.includes("UPDATE client_portal_recipients SET role_template = 'approver'"))).toBe(false);
  });

  it("does not treat a missing response recipient as a named approver", async () => {
    const fixture = recordingDatabase(sourceRowsDatabase({
      comments: [],
      recipients: [legacyRecipient("Stryker was here", "client@example.com")],
      responses: [legacyResponse("response_missing", { recipient_id: null })],
    }));
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const insertedRecipient = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_recipients"));

    expect(insertedRecipient?.values.slice(4, 6)).toEqual(["commenter", 0]);
  });

  it("uses issue number one when the existing portal count row is absent", async () => {
    const shared = sharedProjectMigrationDatabase(null);
    const source = overrideFirstDatabase(shared.database, "COALESCE(MAX(issue_number), 0)", null);
    const fixture = recordingDatabase(sourceRowsDatabase({ comments: [], recipients: [], responses: [], source }));
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });

    expect(fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_issues"))?.values[2]).toBe(1);
  });

  it("maps valid estimate and internal row comments to exact thread and message bindings", async () => {
    const fixture = recordingDatabase(sourceRowsDatabase({
      comments: [
        legacyComment("comment_estimate", { body: "  Estimate comment  ", estimate_id: "estimate_1", target_kind: "estimate", target_label: "  Estimate A  ", target_secondary_label: "Secondary" }),
        legacyComment("comment_row", { author_email: "owner@example.com", author_name: "Owner", body: "Internal row note", is_internal: 1, recipient_id: null, row_id: "row_1", target_kind: "row", target_label: "Row A" }),
      ],
      responses: [],
    }));
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const threads = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_threads"));
    const messages = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_messages"));

    expect(report).toMatchObject({ comments: { imported: 2, unresolved: 0 }, unresolved: [] });
    expect(threads.map(({ values }) => values.slice(3, 14))).toEqual([
      ["estimate", "estimate_1", "Estimate A", "Secondary", "Estimate A", "client", "waiting_on_owner", "recipient", legacyId("recipient_legacy", "legacy_recipient_1"), "2026-07-11T01:00:00.000Z", "2026-07-11T01:00:00.000Z"],
      ["row", "row_1", "Row A", null, "Row A", "internal", "no_response_required", "internal_user", "owner_1", "2026-07-11T01:00:00.000Z", "2026-07-11T01:00:00.000Z"],
    ]);
    expect(messages.map(({ values }) => values.slice(2))).toEqual([
      ["recipient", legacyId("recipient_legacy", "legacy_recipient_1"), "{\"legacyAuthorEmail\":\"client@example.com\",\"name\":\"Client\",\"side\":\"client\"}", "Estimate comment", "legacy:comment_estimate", "client", "2026-07-11T01:00:00.000Z"],
      ["internal_user", "owner_1", "{\"legacyAuthorEmail\":\"owner@example.com\",\"name\":\"Owner\",\"side\":\"owner\"}", "Internal row note", "legacy:comment_row", "internal", "2026-07-11T01:00:00.000Z"],
    ]);
  });

  it("applies exact fallback and truncation limits to migrated comment content", async () => {
    const fixture = recordingDatabase(sourceRowsDatabase({
      comments: [
        legacyComment("comment_long", { body: `  ${"B".repeat(4_010)}  `, row_id: "legacy_row_residue", target_label: "L".repeat(305) }),
        legacyComment("comment_fallback", { body: "Fallback title", estimate_id: "estimate_1", target_kind: "estimate", target_label: "   " }),
        legacyComment("comment_null_label", { body: "Null label", estimate_id: "estimate_1", target_kind: "estimate", target_label: null }),
      ],
      responses: [],
    }));
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const threads = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_threads"));
    const messages = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_messages"));

    expect(threads.map(({ values }) => [values[5], values[7]])).toEqual([
      ["L".repeat(300), "L".repeat(300)],
      ["Legacy discussion", "Legacy discussion"],
      ["Legacy discussion", "Legacy discussion"],
    ]);
    expect(threads[0]?.values.slice(3, 5)).toEqual(["portal", null]);
    expect(messages.map(({ values }) => values[5])).toEqual(["B".repeat(4_000), "Fallback title", "Null label"]);
  });

  it("verifies exact internal comment identity fields after apply", async () => {
    const source = sourceRowsDatabase({
      comments: [legacyComment("comment_internal", { author_email: "owner@example.com", author_name: "Owner", body: "Internal", is_internal: 1, recipient_id: null, row_id: "row_1", target_kind: "row", target_label: "Row" })],
      responses: [],
    });
    const fixture = statefulAppliedMigrationDatabase(source);

    await expect(migrateLegacyPublicationToClientPortal({ apply: true, database: fixture.database, legacyPublicationId: "publication_1" }))
      .resolves.toMatchObject({ comments: { imported: 1, unresolved: 0 }, status: "verified" });
  });

  it("preserves a valid scoped decision with exact audit and timeline evidence but no issue decision", async () => {
    const response = legacyResponse("response_scoped", {
      decision: "accepted",
      estimate_id: "estimate_1",
      note: "Scoped approval",
      signature_intent_hash: "signature-hash",
      signer_name: "Client Signer",
      target_kind: "estimate",
      target_label: "Estimate A",
      target_secondary_label: "Budget",
    });
    const fixture = recordingDatabase(sourceRowsDatabase({ comments: [], responses: [response] }));
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const audit = fixture.prepared.find(({ sql }) => sql.includes("'legacy_scoped_decision_preserved'"));
    const event = fixture.prepared.find(({ sql, values }) => sql.includes("INSERT INTO project_commitment_events") && values[4] === "legacy_decision.preserved");
    const exposure = fixture.prepared.find(({ sql, values }) => sql.includes("INSERT INTO client_portal_event_exposures") && values[0] === legacyId("event_legacy_scoped_decision", "response_scoped"));
    const metadata = "{\"decision\":\"approved\",\"estimateId\":\"estimate_1\",\"legacyResponseId\":\"response_scoped\",\"note\":\"Scoped approval\",\"rowId\":null,\"signatureIntentHash\":\"signature-hash\",\"signerName\":\"Client Signer\",\"snapshotVersionAtDecision\":3,\"targetKind\":\"estimate\",\"targetLabel\":\"Estimate A\",\"targetSecondaryLabel\":\"Budget\"}";

    expect(report).toMatchObject({ decisions: { imported: 0, unresolved: 0 }, unresolved: [] });
    expect(fixture.prepared.some(({ sql }) => sql.includes("INSERT INTO client_portal_decisions"))).toBe(false);
    expect(audit?.values).toEqual([
      legacyId("audit_legacy_scoped_decision", "response_scoped"),
      "workspace_1",
      legacyId("portal_legacy_project", "project_1"),
      legacyId("issue_legacy", "publication_1"),
      legacyId("recipient_legacy", "legacy_recipient_1"),
      metadata,
      "2026-07-11T02:00:00.000Z",
      "2026-07-11T02:00:00.000Z",
    ]);
    expect(event?.values.slice(4, 18)).toEqual([
      "legacy_decision.preserved",
      "legacy_publication",
      "publication_1",
      null,
      null,
      "publication_1",
      `legacy:${legacyId("event_legacy_scoped_decision", "response_scoped")}`,
      "recipient",
      legacyId("recipient_legacy", "legacy_recipient_1"),
      "Client Signer",
      "Legacy approved decision preserved for Estimate A",
      "Scoped approval",
      "{\"decision\":\"approved\",\"targetKind\":\"estimate\",\"targetLabel\":\"Estimate A\"}",
      metadata,
    ]);
    expect(exposure?.values).toEqual([
      legacyId("event_legacy_scoped_decision", "response_scoped"),
      legacyId("portal_legacy_project", "project_1"),
      legacyId("public_event_legacy_scoped_decision", "response_scoped"),
      "2026-07-11T02:00:00.000Z",
    ]);
  });

  it("preserves a row-scoped decision with its row target and fallback event title", async () => {
    const fixture = recordingDatabase(sourceRowsDatabase({
      comments: [],
      responses: [legacyResponse("response_row", { row_id: "row_1", target_kind: "row", target_label: null })],
    }));
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const event = fixture.prepared.find(({ sql, values }) => sql.includes("INSERT INTO project_commitment_events") && values[4] === "legacy_decision.preserved");

    expect(report).toMatchObject({ decisions: { imported: 0, unresolved: 0 }, unresolved: [] });
    expect(event?.values[14]).toBe("Legacy changes requested decision preserved for row");
    expect(JSON.parse(String(event?.values[17]))).toMatchObject({ rowId: "row_1", targetKind: "row", targetLabel: null });
  });

  it("maps every issue decision kind and truncates note and signer snapshots in exact event payloads", async () => {
    const longNote = "N".repeat(2_010);
    const longSigner = "S".repeat(130);
    const fixture = recordingDatabase(sourceRowsDatabase({
      comments: [],
      responses: [
        legacyResponse("response_approved", { decision: "accepted", note: longNote, signer_name: longSigner }),
        legacyResponse("response_changes", { decision: "revision_requested", note: null, signer_name: null }),
        legacyResponse("response_declined", { decision: "declined", note: "No", signer_name: "Decliner" }),
      ],
    }));
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const decisions = fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_decisions"));
    const events = fixture.prepared.filter(({ sql, values }) => sql.includes("INSERT INTO project_commitment_events") && String(values[4]).startsWith("decision."));
    const issue = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_issues"));

    expect(report.decisions).toEqual({ imported: 3, unresolved: 0 });
    expect(issue?.values[4]).toBe("issued");
    expect(decisions.map(({ values }) => [values[4], values[5], values[6], values[10]])).toEqual([
      ["approved", "N".repeat(2_000), "S".repeat(120), "legacy:response_approved"],
      ["changes_requested", null, null, "legacy:response_changes"],
      ["declined", "No", "Decliner", "legacy:response_declined"],
    ]);
    expect(events.map(({ values }) => [values[4], values[6], values[8], values[13], values[14], values[15], values[16], values[17]])).toEqual([
      ["decision.approved", legacyId("decision_legacy", "response_approved"), legacyId("decision_legacy", "response_approved"), "S".repeat(120), "Legacy issue 3 was approved", "N".repeat(2_000), `{\"decision\":\"approved\",\"issueNumber\":1,\"signerName\":\"${"S".repeat(120)}\"}`, expect.stringContaining("\"legacyResponseId\":\"response_approved\"")],
      ["decision.changes_requested", legacyId("decision_legacy", "response_changes"), legacyId("decision_legacy", "response_changes"), null, "Legacy issue 3 was changes requested", null, "{\"decision\":\"changes_requested\",\"issueNumber\":1,\"signerName\":null}", expect.stringContaining("\"legacyResponseId\":\"response_changes\"")],
      ["decision.declined", legacyId("decision_legacy", "response_declined"), legacyId("decision_legacy", "response_declined"), "Decliner", "Legacy issue 3 was declined", "No", "{\"decision\":\"declined\",\"issueNumber\":1,\"signerName\":\"Decliner\"}", expect.stringContaining("\"legacyResponseId\":\"response_declined\"")],
    ]);
  });

  it.each([
    ["one accepted issue-wide response", [legacyResponse("response_a", { decision: "accepted" })], "accepted", 1, 0, 0],
    ["no responses", [], "issued", 0, 0, 0],
    ["mixed accepted and declined responses", [legacyResponse("response_a", { decision: "accepted" }), legacyResponse("response_b", { decision: "declined" })], "issued", 2, 0, 0],
    ["missing recipient", [legacyResponse("response_a", { decision: "accepted", recipient_id: null })], "issued", 0, 1, 0],
    ["unknown recipient", [legacyResponse("response_a", { decision: "accepted", recipient_id: "missing" })], "issued", 0, 1, 0],
    ["non-proposal target", [legacyResponse("response_a", { decision: "accepted", target_kind: "estimate" })], "issued", 0, 1, 0],
    ["proposal estimate residue", [legacyResponse("response_a", { decision: "accepted", estimate_id: "estimate_1" })], "issued", 0, 0, 1],
    ["row target residue", [legacyResponse("response_a", { decision: "accepted", row_id: "row_1" })], "issued", 0, 0, 1],
    ["snapshot mismatch", [legacyResponse("response_a", { decision: "accepted", snapshot_version_at_decision: 2 })], "issued", 0, 0, 1],
  ] as const)("sets issue status from all acceptance predicates for %s", async (_case, responses, expectedStatus, issueDecisionCount, unresolvedCount, preservedDecisionCount) => {
    const fixture = recordingDatabase(sourceRowsDatabase({ comments: [], responses: [...responses] }));
    const report = await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });

    expect(fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_issues"))?.values[4]).toBe(expectedStatus);
    expect(fixture.prepared.filter(({ sql }) => sql.includes("INSERT INTO client_portal_decisions"))).toHaveLength(issueDecisionCount);
    expect(fixture.prepared.filter(({ sql }) => sql.includes("'legacy_scoped_decision_preserved'"))).toHaveLength(preservedDecisionCount);
    const issueEvent = fixture.prepared.find(({ sql, values }) => sql.includes("INSERT INTO project_commitment_events") && values[4] === "issue.issued");
    expect(JSON.parse(String(issueEvent?.values[16])).status).toBe(expectedStatus);
    expect(report.unresolved).toHaveLength(unresolvedCount);
  });

  it.each([
    [" published_by ", "published_by", "internal_user"],
    [null, "legacy_migration", "system"],
  ] as const)("derives the exact migration actor from publisher value %s", async (publishedBy, expectedActorId, expectedActorType) => {
    const fixture = recordingDatabase(migrationDatabase({ published_by: publishedBy }));
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });
    const publicationEvent = fixture.prepared.find(({ sql, values }) => sql.includes("INSERT INTO project_commitment_events") && values[4] === "legacy_publication.imported");

    expect(publicationEvent?.values.slice(11, 14)).toEqual([expectedActorType, expectedActorId, null]);
    expect(fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_issues"))?.values[6]).toBe(expectedActorId);
  });

  it.each([
    ["published", "live"],
    ["expired", "access_off"],
    ["revoked", "access_off"],
  ] as const)("derives portal access status %s as %s", async (publicationStatus, portalStatus) => {
    const fixture = recordingDatabase(migrationDatabase({ status: publicationStatus }));
    await migrateLegacyPublicationToClientPortal({ database: fixture.database, legacyPublicationId: "publication_1" });

    expect(fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portals"))?.values[5]).toBe(portalStatus);
  });

  it("reports exact source and history hashes for the canonical fixture", async () => {
    const report = await migrateLegacyPublicationToClientPortal({ database: migrationDatabase(), legacyPublicationId: "publication_1" });

    expect(report.snapshot).toEqual({
      estimateCount: 1,
      legacyHistorySha256: "ecaae0753ffc0986fde43505fa9bb1a35c9de9fccd4f709cc60d97b7e0bb9e2b",
      rowCount: 1,
      sha256: "9e1100208282fd6463c078ce14f39c6ddb2ec4e1d6c26d016b098187065b5e7d",
      sourceSha256: "bda5fd35212718d884467e72b6d62a1df3ac99402b2b54d84d34df33cbc7ca7b",
    });
  });

  it.each(["portal", "issue"] as const)("rejects a %s-only mapping identity change", async (field) => {
    await expect(migrateLegacyPublicationToClientPortal({ database: unstableMappedDatabase(field), legacyPublicationId: "publication_1" }))
      .rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal mapping does not match the deterministic migration identity."));
  });

  it("reports the exact cutover barrier binding failure", async () => {
    const database = failingRunDatabase(mappedMigrationDatabase("expected"), "$.cutover_lease_frozen_at");

    await expect(migrateLegacyPublicationToClientPortal({
      apply: true,
      cutoverLease: { frozenAt: "2026-07-28T00:00:00.000Z", frozenBy: "legacy_cutover_pending:admin_1" },
      database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal mapping could not be bound to the active cutover barrier lease."));
  });

  it("requires a verified mapping before rollback", async () => {
    const fixture = rollbackDatabase({ mapping: false });

    await expect(rollbackLegacyPublicationClientPortalMigration({
      database: fixture.database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("A verified Client Portal migration was not found for this legacy publication."));
  });

  it("rejects a mixed D1 rollback batch result when any statement fails", async () => {
    const fixture = rollbackDatabase({ batchResults: [{ success: true }, { success: false }], includeBatch: true });

    await expect(rollbackLegacyPublicationClientPortalMigration({
      database: fixture.database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal rollback status could not be recorded."));
  });

  it("rejects a failed fallback rollback statement without D1 batch support", async () => {
    const fixture = rollbackDatabase({ runSuccess: false });

    await expect(rollbackLegacyPublicationClientPortalMigration({
      database: fixture.database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal rollback status could not be recorded."));
  });

  it("rejects rollback when exact state readback cannot confirm the transition", async () => {
    const fixture = rollbackDatabase({ confirmRollback: false });

    await expect(rollbackLegacyPublicationClientPortalMigration({
      database: fixture.database,
      legacyPublicationId: "publication_1",
    })).rejects.toThrowError(new LegacyClientPortalMigrationError("Legacy Client Portal rollback could not be confirmed because the migration state changed."));
  });

  it("writes and confirms rollback with exact SQL bindings and report identity", async () => {
    const fixture = rollbackDatabase();
    const report = await rollbackLegacyPublicationClientPortalMigration({
      database: fixture.database,
      legacyPublicationId: "publication_1",
    });
    const update = fixture.prepared.find(({ sql }) => sql.startsWith("UPDATE client_portal_legacy_mappings SET migration_status = 'rejected'"));
    const audit = fixture.prepared.find(({ sql }) => sql.includes("INSERT INTO client_portal_audit_events"));
    const confirmation = fixture.prepared.find(({ sql }) => sql.includes("SELECT migration_status FROM client_portal_legacy_mappings"));

    expect(report).toEqual({ issueId: "issue_1", legacyPublicationId: "publication_1", portalId: "portal_1", status: "rolled_back" });
    expect(update?.values).toEqual([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      "verified",
      expect.any(String),
      "publication_1",
      "portal_1",
      "issue_1",
    ]);
    expect(audit?.values.slice(0, 4)).toEqual([expect.stringMatching(/^audit_[0-9a-f-]{36}$/), "workspace_1", "legacy_migration_rolled_back", expect.stringContaining("\"rollbackReason\":\"manager_requested\"")]);
    expect(confirmation?.values).toEqual([
      "publication_1",
      "portal_1",
      "issue_1",
      update?.values[0],
      update?.values[2],
    ]);
  });
});
