import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const timestamp = "2026-07-26T00:00:00.000Z";
const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

const migrationFiles = readdirSync("migrations")
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort();

function createDatabaseThrough(maximumMigration: string) {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");

  for (const file of migrationFiles) {
    if (file > maximumMigration) break;
    database.exec(readFileSync(`migrations/${file}`, "utf8"));
  }

  return database;
}

function applyMigrationRange(
  database: LocalSqliteDatabase,
  firstMigration: string,
  lastMigration = "0116_project_change_request_notification_outbox.sql",
) {
  for (const file of migrationFiles) {
    if (file < firstMigration) continue;
    if (file > lastMigration) break;
    database.exec(`BEGIN;\n${readFileSync(`migrations/${file}`, "utf8")}\nCOMMIT;`);
  }
}

function seedPreLedgerGraph(database: LocalSqliteDatabase) {
  database.exec(`
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
    ) VALUES (
      'portal-1', 'workspace-1', 'project-1', 'Client Portal', 'token-hash',
      'encrypted-token', 'owner-1', '${timestamp}', '${timestamp}'
    );

    INSERT INTO client_portal_issues (
      id, portal_id, issue_number, version_label, status, issued_at, issued_by,
      idempotency_key, manifest_json, content_hash, total_cost, currency_code,
      brand_snapshot_json, decision_policy_snapshot_json, created_at
    ) VALUES (
      'issue-1', 'portal-1', 1, 'Rev 1', 'accepted', '${timestamp}', 'owner-1',
      'issue-idempotency', '{}', '${hashA}', 123.45, 'USD', '{}', '{}', '${timestamp}'
    );

    INSERT INTO client_portal_recipients (
      id, portal_id, email_normalized, role_template, status, verification_state,
      created_at, updated_at
    ) VALUES (
      'recipient-1', 'portal-1', 'client@example.test', 'approver', 'active',
      'verified', '${timestamp}', '${timestamp}'
    );

    INSERT INTO client_portal_recipient_credentials (
      id, recipient_id, token_hash, created_at
    ) VALUES ('credential-1', 'recipient-1', 'recipient-token', '${timestamp}');

    INSERT INTO client_portal_recipient_grants (
      id, recipient_id, capability, effect, created_by, created_at
    ) VALUES ('grant-1', 'recipient-1', 'issue.view', 'allow', 'owner-1', '${timestamp}');

    INSERT INTO client_portal_decisions (
      id, portal_id, issue_id, recipient_id, decision, signer_email_snapshot,
      signer_role_snapshot, issue_content_hash, intent_hash, idempotency_key, submitted_at
    ) VALUES (
      'decision-1', 'portal-1', 'issue-1', 'recipient-1', 'approved',
      'client@example.test', 'approver', '${hashA}', '${hashB}', 'decision-idempotency', '${timestamp}'
    );

    INSERT INTO client_portal_analytics_events (
      id, portal_id, issue_id, recipient_id, event_type, verified_human, occurred_at, created_at
    ) VALUES (
      'analytics-1', 'portal-1', 'issue-1', 'recipient-1', 'decision_submitted', 1,
      '${timestamp}', '${timestamp}'
    );

    INSERT INTO client_portal_notification_outbox (
      id, portal_id, issue_id, recipient_id, event_type, idempotency_key,
      payload_json, next_attempt_at, created_at, updated_at
    ) VALUES (
      'outbox-1', 'portal-1', 'issue-1', 'recipient-1', 'decision_submitted',
      'outbox-idempotency', '{}', '${timestamp}', '${timestamp}', '${timestamp}'
    );

    INSERT INTO upload_sessions (
      id, workspace_id, actor_user_id, surface, storage_bucket, storage_path,
      file_name, content_type, size_bytes, checksum_sha256, status, created_at, updated_at
    ) VALUES (
      'session-1', 'workspace-1', 'owner-1', 'component-attachment',
      'component-attachments', 'project-1/file.pdf', 'file.pdf', 'application/pdf',
      100, '${hashA}', 'pending', '${timestamp}', '${timestamp}'
    );

    INSERT INTO upload_assets (
      id, workspace_id, actor_user_id, project_id, upload_session_id, surface,
      status, file_name, content_type, size_bytes, checksum_sha256, scan_status,
      storage_bucket, storage_path, created_at, updated_at
    ) VALUES (
      'asset-1', 'workspace-1', 'owner-1', 'project-1', 'session-1',
      'component-attachment', 'pending', 'file.pdf', 'application/pdf', 100,
      '${hashA}', 'pending', 'component-attachments', 'project-1/file.pdf',
      '${timestamp}', '${timestamp}'
    );

    INSERT INTO upload_events (
      id, upload_session_id, upload_asset_id, workspace_id, actor_user_id,
      event_type, created_at
    ) VALUES (
      'upload-event-1', 'session-1', 'asset-1', 'workspace-1', 'owner-1',
      'scan_pending', '${timestamp}'
    );

    INSERT INTO upload_asset_cleanup_objects (
      id, upload_asset_id, storage_bucket, storage_path, created_at, updated_at
    ) VALUES (
      'cleanup-1', 'asset-1', 'component-attachments', 'project-1/file.pdf',
      '${timestamp}', '${timestamp}'
    );

    INSERT INTO component_variant_attachments (
      id, owner_scope, price_option_id, project_id, project_component_id,
      workspace_id, upload_asset_id, storage_bucket, storage_path, file_name,
      content_type, size_bytes, created_at, updated_at
    ) VALUES (
      'attachment-1', 'project', 'project-price-option-1', 'project-1',
      'project-component-1', 'workspace-1', 'asset-1', 'component-attachments',
      'project-1/file.pdf', 'file.pdf', 'application/pdf', 100,
      '${timestamp}', '${timestamp}'
    );

    INSERT INTO project_component_attachment_retention_holds (
      source_delete_event_id, attachment_id, upload_asset_id, workspace_id,
      project_id, project_component_id, restore_expires_at, created_at
    ) VALUES (
      'delete-event-1', 'attachment-1', 'asset-1', 'workspace-1', 'project-1',
      'project-component-1', '2026-08-26T00:00:00.000Z', '${timestamp}'
    );

    INSERT INTO client_portal_threads (
      id, portal_id, target_kind, target_label, subject, audience,
      created_by_actor_type, created_by_actor_id, created_at, updated_at
    ) VALUES (
      'thread-1', 'portal-1', 'portal', 'Portal', 'Existing thread', 'client',
      'recipient', 'recipient-1', '${timestamp}', '${timestamp}'
    );

    INSERT INTO client_portal_messages (
      id, thread_id, actor_type, actor_id, author_snapshot_json, body,
      created_at, idempotency_key, visibility
    ) VALUES (
      'message-1', 'thread-1', 'recipient', 'recipient-1', '{}', 'Existing message',
      '${timestamp}', 'message-idempotency', 'client'
    );

    INSERT INTO client_portal_thread_reads (
      thread_id, actor_type, actor_id, last_read_message_id, read_at
    ) VALUES ('thread-1', 'recipient', 'recipient-1', 'message-1', '${timestamp}');

    INSERT INTO client_portal_thread_subscriptions (
      thread_id, actor_type, actor_id, subscribed_at
    ) VALUES ('thread-1', 'recipient', 'recipient-1', '${timestamp}');

    INSERT INTO client_portal_message_mentions (
      message_id, mentioned_actor_type, mentioned_actor_id, created_at
    ) VALUES ('message-1', 'recipient', 'recipient-1', '${timestamp}');
  `);
}

function createMigratedFixture() {
  const database = createDatabaseThrough("0105");
  seedPreLedgerGraph(database);
  applyMigrationRange(database, "0106");
  return database;
}

describe("project ledger migrations", () => {
  it("preserves constrained portal, upload, and discussion child rows", () => {
    const database = createMigratedFixture();

    for (const table of [
      "client_portal_recipients",
      "client_portal_recipient_credentials",
      "client_portal_recipient_grants",
      "client_portal_decisions",
      "client_portal_analytics_events",
      "client_portal_notification_outbox",
      "upload_sessions",
      "upload_assets",
      "upload_events",
      "upload_asset_cleanup_objects",
      "component_variant_attachments",
      "project_component_attachment_retention_holds",
      "client_portal_threads",
      "client_portal_messages",
      "client_portal_thread_reads",
      "client_portal_thread_subscriptions",
      "client_portal_message_mentions",
    ]) {
      expect(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 1 });
    }

    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(
      database
        .prepare("SELECT name FROM sqlite_master WHERE name GLOB '*__01[0-9][0-9]*'")
        .all(),
    ).toEqual([]);
    database.close();
  });

  it("enforces request, baseline, event, and exposure ownership invariants", () => {
    const database = createMigratedFixture();

    expect(() =>
      database.exec(`
        INSERT INTO project_change_requests (
          id, workspace_id, project_id, origin_portal_id, request_number, request_code,
          requested_by_actor_type, requested_by_actor_id, requested_at, created_at, updated_at
        ) VALUES (
          'request-1', 'workspace-1', 'project-1', 'portal-1', 1, 'CR-001',
          'recipient', 'recipient-1', '${timestamp}', '${timestamp}', '${timestamp}'
        );
        INSERT INTO project_change_request_versions (
          id, request_id, version_number, title, description, content_hash,
          created_by_actor_type, created_by_actor_id, created_at
        ) VALUES (
          'request-version-1', 'request-1', 1, 'Move wall', 'Move the east wall', '${hashA}',
          'recipient', 'recipient-1', '${timestamp}'
        );
        UPDATE project_change_requests
        SET current_version_id = 'request-version-1', status = 'submitted'
        WHERE id = 'request-1';
      `),
    ).not.toThrow();

    expect(() =>
      database.exec(`
        INSERT INTO project_change_request_targets (
          id, request_version_id, target_kind, estimate_id, target_label_snapshot
        ) VALUES ('target-bad', 'request-version-1', 'estimate', 'estimate-2', 'Wrong project');
      `),
    ).toThrow(/ownership mismatch/);

    database.exec(`
      INSERT INTO project_change_request_targets (
        id, request_version_id, target_kind, target_label_snapshot
      ) VALUES ('target-1', 'request-version-1', 'project', 'Project One');

      INSERT INTO upload_sessions (
        id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id,
        storage_bucket, storage_path, file_name, content_type, size_bytes,
        checksum_sha256, status, created_at, updated_at
      ) VALUES (
        'session-evidence-1', 'workspace-1', 'recipient-1', 'portal-request-evidence',
        'change-request', 'request-1', 'project-artifacts', 'request-1/evidence.pdf',
        'evidence.pdf', 'application/pdf', 100, '${hashA}', 'finalized', '${timestamp}', '${timestamp}'
      );

      INSERT INTO upload_assets (
        id, workspace_id, actor_user_id, project_id, upload_session_id, surface,
        status, purge_state, file_name, content_type, size_bytes, checksum_sha256,
        scan_status, storage_bucket, storage_path, created_at, updated_at
      ) VALUES (
        'asset-evidence-1', 'workspace-1', 'recipient-1', 'project-1', 'session-evidence-1',
        'portal-request-evidence', 'finalized', 'active', 'evidence.pdf', 'application/pdf',
        100, '${hashA}', 'pending', 'project-artifacts', 'request-1/evidence.pdf', '${timestamp}', '${timestamp}'
      );

      INSERT INTO project_change_request_evidence_uploads (
        id, request_version_id, upload_asset_id, recipient_id, relationship,
        status, created_at, updated_at
      ) VALUES (
        'request-evidence-1', 'request-version-1', 'asset-evidence-1', 'recipient-1',
        'evidence', 'pending_scan', '${timestamp}', '${timestamp}'
      );
    `);

    expect(() =>
      database.exec(`
        INSERT INTO client_portal_issue_source_estimates (
          issue_id, source_estimate_id, name_snapshot, total_minor_units,
          currency_code, source_hash
        ) VALUES ('issue-1', 'estimate-2', 'Wrong project', 12345, 'USD', '${hashA}');
      `),
    ).toThrow(/source estimate ownership mismatch/);

    database.exec(`
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

      INSERT INTO project_commitment_events (
        id, workspace_id, project_id, origin_portal_id, event_type, source_type,
        source_id, issue_id, correlation_id, actor_type, actor_id, title,
        client_safe_snapshot_json, internal_metadata_json, occurred_at, created_at
      ) VALUES (
        'event-1', 'workspace-1', 'project-1', 'portal-1', 'issue_accepted', 'issue',
        'issue-1', 'issue-1', 'correlation-1', 'recipient', 'recipient-1',
        'Issue accepted', '{}', '{}', '${timestamp}', '${timestamp}'
      );

      INSERT INTO client_portal_event_exposures (
        event_id, portal_id, public_event_id, exposure_kind, exposed_by_actor_type,
        exposed_by_actor_id, exposed_at
      ) VALUES (
        'event-1', 'portal-1', 'public-event-1', 'automatic', 'system', 'system', '${timestamp}'
      );

      INSERT INTO client_portal_request_exposures (
        request_id, portal_id, public_request_id, exposure_kind,
        exposed_by_actor_type, exposed_by_actor_id, exposed_at
      ) VALUES (
        'request-1', 'portal-1', 'request_public_1', 'automatic',
        'recipient', 'recipient-1', '${timestamp}'
      );

      INSERT INTO client_portal_threads (
        id, portal_id, target_kind, target_public_id, target_label, subject, audience,
        created_by_actor_type, created_by_actor_id, created_at, updated_at
      ) VALUES (
        'thread-2', 'portal-1', 'timeline_event', 'public-event-1', 'Issue accepted',
        'Discuss acceptance', 'client', 'recipient', 'recipient-1', '${timestamp}', '${timestamp}'
      );
    `);

    expect(() =>
      database.exec(`
        UPDATE project_change_requests
        SET project_id = 'project-2'
        WHERE id = 'request-1';
      `),
    ).toThrow(/identity scope is immutable/);

    expect(() =>
      database.exec(`
        UPDATE project_change_request_targets
        SET target_label_snapshot = 'Changed'
        WHERE request_version_id = 'request-version-1';
      `),
    ).toThrow(/targets are immutable/);

    expect(() =>
      database.exec(`
        DELETE FROM project_change_request_evidence_uploads
        WHERE id = 'request-evidence-1';
      `),
    ).toThrow(/evidence uploads are retained/);

    expect(() =>
      database.exec(`
        INSERT INTO project_commitment_events (
          id, workspace_id, project_id, origin_portal_id, event_type, source_type,
          source_id, issue_id, correlation_id, causation_event_id, actor_type, actor_id,
          title, client_safe_snapshot_json, internal_metadata_json, occurred_at, created_at
        ) VALUES (
          'event-bad-cause', 'workspace-1', 'project-1', 'portal-1', 'bad_cause', 'issue',
          'issue-1', 'issue-1', 'correlation-bad-cause', 'event-1', 'system', 'system',
          'Bad cause', '{}', '{}', '${timestamp}', '${timestamp}'
        );
      `),
    ).toThrow(/causation mismatch/);

    expect(() =>
      database.exec(`
        UPDATE client_portal_request_exposures
        SET public_request_id = 'request_public_changed'
        WHERE request_id = 'request-1' AND portal_id = 'portal-1';
      `),
    ).toThrow(/exposure evidence is immutable/);

    expect(() =>
      database.exec(`
        INSERT INTO project_commitment_events (
          id, workspace_id, project_id, event_type, source_type, source_id,
          artifact_id, correlation_id, actor_type, actor_id, title,
          occurred_at, created_at
        ) VALUES (
          'event-bad', 'workspace-1', 'project-1', 'bad', 'issue', 'issue-1',
          'missing-artifact', 'correlation-bad', 'system', 'system', 'Bad event',
          '${timestamp}', '${timestamp}'
        );
      `),
    ).toThrow();

    expect(() =>
      database.exec(`
        INSERT INTO client_portal_baselines (
          id, workspace_id, project_id, portal_id, baseline_number, issue_id, status,
          content_hash, total_minor_units, currency_code, established_by_decision_id,
          established_at, created_at
        ) VALUES (
          'baseline-duplicate', 'workspace-1', 'project-1', 'portal-1', 2, 'issue-1', 'active',
          '${hashA}', 12345, 'USD', 'decision-1', '${timestamp}', '${timestamp}'
        );
      `),
    ).toThrow();

    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    database.close();
  });
});
