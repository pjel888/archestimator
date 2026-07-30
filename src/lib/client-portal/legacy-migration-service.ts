import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";
import type { ClientPortalPublicValue } from "@/lib/client-portal/section-registry";
import type { SharedLinkActivityResponseD1Row } from "@/lib/publication/d1-store";
import { createPublicationToken, encryptPublicationToken, hashPublicationToken, readPublicationTokenEncryptionSecret, readPublicationTokenHashSecret } from "@/lib/publication/security";
import { sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type LegacyPublication = {
  encrypted_token: string;
  expires_at: string | null;
  id: string;
  password_hash: string | null;
  project_id: string;
  published_at: string;
  published_by: string | null;
  selected_estimate_ids: string;
  snapshot_json: string;
  snapshot_version: number;
  status: "published" | "expired" | "revoked";
  token_hash: string;
  workspace_id: string;
};

type LegacyRecipient = { created_at: string; display_name: string | null; email: string; id: string; recipient_token_hash: string };
type LegacyComment = { author_email: string; author_name: string | null; body: string; created_at: string; estimate_id: string | null; id: string; is_internal: number; recipient_id: string | null; row_id: string | null; target_kind: "proposal" | "estimate" | "row"; target_label: string | null; target_secondary_label: string | null };
type LegacyResponse = SharedLinkActivityResponseD1Row & {
  signature_intent_hash: string | null;
  signer_name: string | null;
  snapshot_version_at_decision: number;
};

export type LegacyClientPortalMigrationReport = {
  audienceStrategy: "mapped" | "project_default" | "shared_recipients" | "separate_ambiguous";
  comments: { imported: number; unresolved: number };
  decisions: { imported: number; unresolved: number };
  dryRun: boolean;
  issueId: string;
  legacyPublicationId: string;
  portalId: string;
  recipients: { imported: number; unresolved: number };
  snapshot: { estimateCount: number; legacyHistorySha256: string; rowCount: number; sha256: string; sourceSha256: string };
  status: "already_migrated" | "planned" | "verified";
  unresolved: Array<{ id: string; kind: "comment" | "decision"; reason: string }>;
};

export type LegacyClientPortalMigrationRollbackReport = {
  issueId: string;
  legacyPublicationId: string;
  portalId: string;
  status: "rolled_back";
};

export class LegacyClientPortalMigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LegacyClientPortalMigrationError";
  }
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => Array.isArray(entry)
    ? entry.map(normalize)
    : entry && typeof entry === "object"
      ? Object.fromEntries(Object.keys(entry as Record<string, unknown>).sort().map((key) => [key, normalize((entry as Record<string, unknown>)[key])]))
      : entry;
  return JSON.stringify(normalize(value));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function legacyId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("base64url").slice(0, 30)}`;
}

function parseSnapshot(value: string): ProjectPublicationSnapshot {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || !("project" in parsed) || !("estimates" in parsed) || !Array.isArray(parsed.estimates)) {
    throw new LegacyClientPortalMigrationError("Legacy publication snapshot is invalid and cannot be migrated safely.");
  }
  return sanitizeProjectPublicationSnapshotForPublicRead(parsed as ProjectPublicationSnapshot);
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare(sql).bind(...values);
}

function legacyMigrationAuditStatement(database: D1DatabaseLike, input: {
  eventType: "legacy_migration_imported" | "legacy_migration_rolled_back" | "legacy_migration_verified";
  issueId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  portalId: string;
  workspaceId: string;
}) {
  return statement(
    database,
    "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'system', NULL, ?, 'owner', ?, ?, ?)",
    [`audit_${randomUUID()}`, input.workspaceId, input.portalId, input.issueId, input.eventType, canonicalJson(input.metadata), input.occurredAt, input.occurredAt],
  );
}

function legacyCommitmentEventStatements(database: D1DatabaseLike, input: {
  actorId: string;
  actorName: string | null;
  actorType: "internal_user" | "recipient" | "system";
  clientSafeSnapshot: Record<string, unknown>;
  decisionId?: string;
  eventId: string;
  eventType: string;
  internalMetadata: Record<string, unknown>;
  issueId?: string;
  legacyPublicationId?: string;
  occurredAt: string;
  portalId: string;
  projectId: string;
  publicEventId: string;
  sourceId: string;
  sourceType: "decision" | "issue" | "legacy_publication";
  summary: string | null;
  title: string;
  workspaceId: string;
}) {
  return [
    statement(database, `INSERT INTO project_commitment_events (
      id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
      source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
      artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
      causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
      actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
      internal_metadata_json, occurred_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`, [
      input.eventId,
      input.workspaceId,
      input.projectId,
      input.portalId,
      input.eventType,
      input.sourceType,
      input.sourceId,
      input.issueId ?? null,
      input.decisionId ?? null,
      input.legacyPublicationId ?? null,
      `legacy:${input.eventId}`,
      input.actorType,
      input.actorId,
      input.actorName,
      input.title,
      input.summary,
      canonicalJson(input.clientSafeSnapshot),
      canonicalJson(input.internalMetadata),
      input.occurredAt,
      input.occurredAt,
    ]),
    statement(database, `INSERT INTO client_portal_event_exposures (
      event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
      exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
    ) VALUES (?, ?, ?, 'visible', 'backfill', '{"capability":"timeline:view"}', 'system', 'legacy_migration', ?, NULL, NULL)`, [
      input.eventId,
      input.portalId,
      input.publicEventId,
      input.occurredAt,
    ]),
  ];
}

async function writeMigrationStatements(database: D1DatabaseLike, statements: D1PreparedStatementLike[], failureMessage: string) {
  if (database.batch) {
    const results = await database.batch(statements);
    if (results.some((result) => result.success === false)) throw new LegacyClientPortalMigrationError(failureMessage);
    return;
  }

  for (const preparedStatement of statements) {
    const result = await preparedStatement.run();
    if (result.success === false) throw new LegacyClientPortalMigrationError(failureMessage);
  }
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new LegacyClientPortalMigrationError("Legacy migration source query failed.");
  return result.results ?? [];
}

function policySnapshot(layoutMode: "standard" | "wide" | "split", commentable: boolean, downloadable: boolean) {
  return canonicalJson({ allowedOrganizations: [], allowedRecipientIds: [], commentable, downloadable, enabled: true, layoutMode, minimumCapability: null, visibleFields: [] });
}

function issuedSection(input: { id: string; key: string; kind: string; layout: "standard" | "wide" | "split"; payload: ClientPortalPublicValue; title: string }) {
  const payloadJson = canonicalJson(input.payload);
  return { ...input, payloadBytes: new TextEncoder().encode(payloadJson).byteLength, payloadHash: sha256(payloadJson), payloadJson };
}

type MigrationVerificationRow = {
  issue_content_hash: string;
  issue_id: string;
  portal_id: string;
  stable_token_hash: string;
  current_issue_id: string | null;
};

type ExistingPortal = {
  current_issue_id: string | null;
  id: string;
  stable_token_hash: string;
};

type CountRow = { count: number | null };

type LegacyCommentIdentity = {
  actorId: string;
  actorType: "internal_user" | "recipient";
  audience: "client" | "internal";
  authorSnapshotJson: string;
  body: string;
  createdAt: string;
  messageId: string;
  messageIdempotencyKey: string;
  subject: string;
  targetKind: "estimate" | "portal" | "row";
  targetLabel: string;
  targetPublicId: string | null;
  targetSecondaryLabel: string | null;
  threadId: string;
  visibility: "client" | "internal";
};

export type LegacyCutoverBarrierLease = {
  frozenAt: string;
  frozenBy: string;
};

type LegacyCommentIdentityRow = {
  actor_id: string;
  actor_type: "internal_user" | "recipient";
  audience: "client" | "internal";
  author_snapshot_json: string;
  body: string;
  created_at: string;
  message_id: string;
  message_idempotency_key: string;
  subject: string;
  target_kind: "estimate" | "portal" | "row";
  target_label: string;
  target_public_id: string | null;
  target_secondary_label: string | null;
  thread_id: string;
  visibility: "client" | "internal";
};

type LegacyDecisionIdentity = {
  decision: "approved" | "changes_requested" | "declined";
  decisionId: string;
  idempotencyKey: string;
  intentHash: string;
  issueContentHash: string;
  note: string | null;
  recipientId: string;
  signerEmailSnapshot: string;
  signerName: string | null;
  submittedAt: string;
};

type LegacyDecisionIdentityRow = {
  decision: "approved" | "changes_requested" | "declined";
  decision_id: string;
  idempotency_key: string;
  intent_hash: string;
  issue_content_hash: string;
  note: string | null;
  recipient_id: string;
  signer_email_snapshot: string;
  signer_name: string | null;
  submitted_at: string;
};

type LegacyPreservedDecisionIdentity = {
  auditId: string;
  metadataJson: string;
};

type LegacyPreservedDecisionIdentityRow = {
  audit_id: string;
  metadata_json: string;
};

type LegacyRecipientCredentialIdentity = {
  credentialId: string;
  emailNormalized: string;
  recipientId: string;
  revokedAt: null;
  status: "active";
  tokenHash: string;
};

type LegacyRecipientCredentialIdentityRow = {
  credential_id: string;
  email_normalized: string;
  recipient_id: string;
  revoked_at: string | null;
  status: string;
  token_hash: string;
};

async function countRows(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const row = await database.prepare<CountRow>(sql).bind(...values).first<CountRow>();
  return Number(row?.count ?? 0);
}

async function verifyLegacyMigrationWrite({
  contentHash,
  database,
  expectedCommentIdentities,
  expectedCredentialIdentities,
  expectedPreservedDecisionIdentities,
  forbiddenScopedDecisionIds,
  issueId,
  legacyPublicationId,
  portalId,
  recordVerification,
  expectedDecisionIdentities,
  expectedCurrentIssue,
  expectedStableTokenHash,
  workspaceId,
}: {
  contentHash: string;
  database: D1DatabaseLike;
  expectedCommentIdentities: LegacyCommentIdentity[];
  expectedCredentialIdentities: LegacyRecipientCredentialIdentity[];
  expectedDecisionIdentities: LegacyDecisionIdentity[];
  expectedPreservedDecisionIdentities: LegacyPreservedDecisionIdentity[];
  forbiddenScopedDecisionIds: string[];
  issueId: string;
  legacyPublicationId: string;
  portalId: string;
  recordVerification: boolean;
  expectedCurrentIssue: boolean;
  expectedStableTokenHash: string | null;
  workspaceId: string;
}) {
  const recipientCredentialRows = expectedCredentialIdentities.length === 0
    ? Promise.resolve([])
    : all<LegacyRecipientCredentialIdentityRow>(database, `SELECT
      credential.id AS credential_id,
      credential.recipient_id,
      recipient.email_normalized,
      credential.token_hash,
      credential.status,
      credential.revoked_at
      FROM client_portal_recipient_credentials AS credential
      JOIN client_portal_recipients AS recipient ON recipient.id = credential.recipient_id
      WHERE recipient.portal_id = ?
        AND credential.id IN (${expectedCredentialIdentities.map(() => "?").join(", ")})`, [
      portalId,
      ...expectedCredentialIdentities.map((identity) => identity.credentialId),
    ]);
  const commentIdentityRows = expectedCommentIdentities.length === 0
    ? Promise.resolve([])
    : all<LegacyCommentIdentityRow>(database, `SELECT
      thread.id AS thread_id,
      thread.target_kind,
      thread.target_public_id,
      thread.target_label,
      thread.target_secondary_label,
      thread.subject,
      thread.audience,
      message.id AS message_id,
      message.actor_type,
      message.actor_id,
      message.author_snapshot_json,
      message.body,
      message.idempotency_key AS message_idempotency_key,
      message.visibility,
      message.created_at
      FROM client_portal_threads AS thread
      JOIN client_portal_messages AS message ON message.thread_id = thread.id
      WHERE thread.portal_id = ?
        AND thread.issue_id = ?
        AND thread.id IN (${expectedCommentIdentities.map(() => "?").join(", ")})
        AND message.id IN (${expectedCommentIdentities.map(() => "?").join(", ")})`, [
      portalId,
      issueId,
      ...expectedCommentIdentities.map((identity) => identity.threadId),
      ...expectedCommentIdentities.map((identity) => identity.messageId),
    ]);
  const decisionIdentityRows = expectedDecisionIdentities.length === 0
    ? Promise.resolve([])
    : all<LegacyDecisionIdentityRow>(database, `SELECT
      id AS decision_id,
      recipient_id,
      decision,
      note,
      signer_name,
      signer_email_snapshot,
      issue_content_hash,
      intent_hash,
      submitted_at,
      idempotency_key
      FROM client_portal_decisions
      WHERE portal_id = ?
        AND issue_id = ?
        AND id IN (${expectedDecisionIdentities.map(() => "?").join(", ")})`, [
      portalId,
      issueId,
      ...expectedDecisionIdentities.map((identity) => identity.decisionId),
    ]);
  const preservedDecisionIdentityRows = expectedPreservedDecisionIdentities.length === 0
    ? Promise.resolve([])
    : all<LegacyPreservedDecisionIdentityRow>(database, `SELECT id AS audit_id, metadata_json
      FROM client_portal_audit_events
      WHERE portal_id = ?
        AND issue_id = ?
        AND event_type = 'legacy_scoped_decision_preserved'
        AND id IN (${expectedPreservedDecisionIdentities.map(() => "?").join(", ")})`, [
      portalId,
      issueId,
      ...expectedPreservedDecisionIdentities.map((identity) => identity.auditId),
    ]);
  const forbiddenScopedDecisionCount = forbiddenScopedDecisionIds.length === 0
    ? Promise.resolve(0)
    : countRows(database, `SELECT COUNT(*) AS count FROM client_portal_decisions
      WHERE portal_id = ? AND issue_id = ? AND id IN (${forbiddenScopedDecisionIds.map(() => "?").join(", ")})`, [portalId, issueId, ...forbiddenScopedDecisionIds]);
  const [mapping, importedCredentialIdentities, importedCommentIdentities, importedDecisionIdentities, importedPreservedDecisionIdentities, importedForbiddenScopedDecisions] = await Promise.all([
    database.prepare<MigrationVerificationRow>(`SELECT
      mapping.portal_id,
      mapping.issue_id,
      portal.current_issue_id,
      portal.stable_token_hash,
      issue.content_hash AS issue_content_hash
      FROM client_portal_legacy_mappings AS mapping
      JOIN project_publications AS publication ON publication.id = mapping.legacy_publication_id
      JOIN client_portals AS portal ON portal.id = mapping.portal_id
        AND portal.workspace_id = publication.workspace_id
        AND portal.project_id = publication.project_id
      JOIN client_portal_issues AS issue ON issue.id = mapping.issue_id AND issue.portal_id = portal.id
      WHERE mapping.legacy_publication_id = ?
      LIMIT 1`).bind(legacyPublicationId).first<MigrationVerificationRow>(),
    recipientCredentialRows,
    commentIdentityRows,
    decisionIdentityRows,
    preservedDecisionIdentityRows,
    forbiddenScopedDecisionCount,
  ]);

  const normalizedCredentialIdentities = importedCredentialIdentities.map((row) => ({
    credentialId: row.credential_id,
    emailNormalized: row.email_normalized,
    recipientId: row.recipient_id,
    revokedAt: row.revoked_at,
    status: row.status,
    tokenHash: row.token_hash,
  })).sort((left, right) => left.credentialId.localeCompare(right.credentialId));
  const expectedCredentials = [...expectedCredentialIdentities]
    .sort((left, right) => left.credentialId.localeCompare(right.credentialId));

  const normalizedCommentIdentities = importedCommentIdentities.map((row) => ({
    actorId: row.actor_id,
    actorType: row.actor_type,
    audience: row.audience,
    authorSnapshotJson: row.author_snapshot_json,
    body: row.body,
    createdAt: row.created_at,
    messageId: row.message_id,
    messageIdempotencyKey: row.message_idempotency_key,
    subject: row.subject,
    targetKind: row.target_kind,
    targetLabel: row.target_label,
    targetPublicId: row.target_public_id,
    targetSecondaryLabel: row.target_secondary_label,
    threadId: row.thread_id,
    visibility: row.visibility,
  })).sort((left, right) => left.threadId.localeCompare(right.threadId));
  const normalizedDecisionIdentities = importedDecisionIdentities.map((row) => ({
    decision: row.decision,
    decisionId: row.decision_id,
    idempotencyKey: row.idempotency_key,
    intentHash: row.intent_hash,
    issueContentHash: row.issue_content_hash,
    note: row.note,
    recipientId: row.recipient_id,
    signerEmailSnapshot: row.signer_email_snapshot,
    signerName: row.signer_name,
    submittedAt: row.submitted_at,
  })).sort((left, right) => left.decisionId.localeCompare(right.decisionId));
  const expectedComments = [...expectedCommentIdentities].sort((left, right) => left.threadId.localeCompare(right.threadId));
  const expectedDecisions = [...expectedDecisionIdentities].sort((left, right) => left.decisionId.localeCompare(right.decisionId));
  const normalizedPreservedDecisions = importedPreservedDecisionIdentities.map((row) => ({ auditId: row.audit_id, metadataJson: row.metadata_json }))
    .sort((left, right) => left.auditId.localeCompare(right.auditId));
  const expectedPreservedDecisions = [...expectedPreservedDecisionIdentities].sort((left, right) => left.auditId.localeCompare(right.auditId));

  const mismatches = [
    mapping?.portal_id !== portalId ? "portal mapping" : null,
    mapping?.issue_id !== issueId ? "issue mapping" : null,
    expectedCurrentIssue && mapping?.current_issue_id !== issueId ? "current issue" : null,
    expectedStableTokenHash !== null && mapping?.stable_token_hash !== expectedStableTokenHash ? "stable token hash" : null,
    mapping?.issue_content_hash !== contentHash ? "issue content hash" : null,
    canonicalJson(normalizedCredentialIdentities) !== canonicalJson(expectedCredentials) ? "recipient credential identities" : null,
    canonicalJson(normalizedCommentIdentities) !== canonicalJson(expectedComments) ? "comment child identities" : null,
    canonicalJson(normalizedDecisionIdentities) !== canonicalJson(expectedDecisions) ? "decision child identities" : null,
    canonicalJson(normalizedPreservedDecisions) !== canonicalJson(expectedPreservedDecisions) ? "preserved scoped decision identities" : null,
    importedForbiddenScopedDecisions !== 0 ? "scoped decision authority" : null,
  ].filter((value): value is string => value !== null);

  if (mismatches.length > 0) {
    throw new LegacyClientPortalMigrationError(`Legacy Client Portal migration was imported but verification failed: ${mismatches.join(", ")}.`);
  }
  if (!recordVerification) return;

  const verifiedAt = new Date().toISOString();
  await writeMigrationStatements(database, [
    statement(
      database,
      "UPDATE client_portal_legacy_mappings SET migration_status = 'verified', verified_at = ?, notes = json_set(CASE WHEN json_valid(notes) THEN notes ELSE '{}' END, '$.verified_at', ?, '$.fix_forward_at', ?) WHERE legacy_publication_id = ? AND portal_id = ? AND issue_id = ? AND migration_status IN ('imported', 'rejected')",
      [verifiedAt, verifiedAt, verifiedAt, legacyPublicationId, portalId, issueId],
    ),
    legacyMigrationAuditStatement(database, {
      eventType: "legacy_migration_verified",
      issueId,
      metadata: { commentsImported: expectedCommentIdentities.length, decisionsImported: expectedDecisionIdentities.length, legacyPublicationId, recipientCredentialsImported: expectedCredentialIdentities.length, snapshotContentHash: contentHash },
      occurredAt: verifiedAt,
      portalId,
      workspaceId,
    }),
  ], "Legacy Client Portal migration verification status could not be recorded.");
}

export async function rollbackLegacyPublicationClientPortalMigration({
  database,
  legacyPublicationId,
}: {
  database: D1DatabaseLike;
  legacyPublicationId: string;
}): Promise<LegacyClientPortalMigrationRollbackReport> {
  const mapping = await database.prepare<{ issue_id: string; migration_status: "verified"; portal_id: string; workspace_id: string }>(
    "SELECT mapping.portal_id, mapping.issue_id, mapping.migration_status, portal.workspace_id FROM client_portal_legacy_mappings AS mapping JOIN client_portals AS portal ON portal.id = mapping.portal_id WHERE mapping.legacy_publication_id = ? AND mapping.migration_status = 'verified' LIMIT 1",
  ).bind(legacyPublicationId).first<{ issue_id: string; migration_status: "verified"; portal_id: string; workspace_id: string }>();
  if (!mapping) {
    throw new LegacyClientPortalMigrationError("A verified Client Portal migration was not found for this legacy publication.");
  }

  const rolledBackAt = new Date().toISOString();
  const rollbackOperationId = randomUUID();
  const rollbackMetadata = canonicalJson({
    legacyPublicationId,
    rollbackFrom: mapping.migration_status,
    rollbackOperationId,
    rollbackReason: "manager_requested",
  });
  await writeMigrationStatements(database, [
    statement(
      database,
      "UPDATE client_portal_legacy_mappings SET migration_status = 'rejected', notes = json_set(CASE WHEN json_valid(notes) THEN notes ELSE '{}' END, '$.rollback_at', ?, '$.rollback_reason', 'manager_requested', '$.rollback_from', ?, '$.rollback_operation_id', ?) WHERE legacy_publication_id = ? AND portal_id = ? AND issue_id = ? AND migration_status = 'verified'",
      [rolledBackAt, mapping.migration_status, rollbackOperationId, legacyPublicationId, mapping.portal_id, mapping.issue_id],
    ),
    statement(database, `INSERT INTO client_portal_audit_events (
      id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type,
      visibility, metadata_json, occurred_at, created_at
    )
    SELECT ?, ?, mapping.portal_id, mapping.issue_id, 'system', NULL, ?,
           'owner', ?, ?, ?
    FROM client_portal_legacy_mappings mapping
    WHERE mapping.legacy_publication_id = ? AND mapping.portal_id = ? AND mapping.issue_id = ?
      AND mapping.migration_status = 'rejected'
      AND json_extract(mapping.notes, '$.rollback_at') = ?
      AND json_extract(mapping.notes, '$.rollback_from') = 'verified'
      AND json_extract(mapping.notes, '$.rollback_operation_id') = ?
      AND json_extract(mapping.notes, '$.rollback_reason') = 'manager_requested'`, [
      `audit_${randomUUID()}`,
      mapping.workspace_id,
      "legacy_migration_rolled_back",
      rollbackMetadata,
      rolledBackAt,
      rolledBackAt,
      legacyPublicationId,
      mapping.portal_id,
      mapping.issue_id,
      rolledBackAt,
      rollbackOperationId,
    ]),
  ], "Legacy Client Portal rollback status could not be recorded.");

  const rolledBackMapping = await database.prepare<{ migration_status: string }>(
    `SELECT migration_status FROM client_portal_legacy_mappings
     WHERE legacy_publication_id = ? AND portal_id = ? AND issue_id = ?
       AND migration_status = 'rejected'
       AND json_extract(notes, '$.rollback_at') = ?
       AND json_extract(notes, '$.rollback_from') = 'verified'
       AND json_extract(notes, '$.rollback_operation_id') = ?
       AND json_extract(notes, '$.rollback_reason') = 'manager_requested'
     LIMIT 1`,
  ).bind(legacyPublicationId, mapping.portal_id, mapping.issue_id, rolledBackAt, rollbackOperationId).first<{ migration_status: string }>();
  if (!rolledBackMapping) {
    throw new LegacyClientPortalMigrationError("Legacy Client Portal rollback could not be confirmed because the migration state changed.");
  }

  return {
    issueId: mapping.issue_id,
    legacyPublicationId,
    portalId: mapping.portal_id,
    status: "rolled_back",
  };
}

export async function migrateLegacyPublicationToClientPortal({
  apply = false,
  cutoverLease,
  database,
  legacyPublicationId,
}: {
  apply?: boolean;
  cutoverLease?: LegacyCutoverBarrierLease;
  database: D1DatabaseLike;
  legacyPublicationId: string;
}): Promise<LegacyClientPortalMigrationReport> {
  const publication = await database.prepare<LegacyPublication>(`SELECT id, workspace_id, project_id, token_hash, encrypted_token, password_hash, status, snapshot_version, selected_estimate_ids, snapshot_json, published_by, published_at, expires_at
    FROM project_publications WHERE id = ? LIMIT 1`).bind(legacyPublicationId).first<LegacyPublication>();
  if (!publication) throw new LegacyClientPortalMigrationError("Legacy publication was not found.");

  const [recipients, comments, responses] = await Promise.all([
    all<LegacyRecipient>(database, "SELECT id, email, display_name, recipient_token_hash, created_at FROM shared_link_recipients WHERE publication_id = ? ORDER BY created_at ASC, id ASC", [publication.id]),
    all<LegacyComment>(database, "SELECT id, recipient_id, author_email, author_name, estimate_id, row_id, body, is_internal, target_kind, target_label, target_secondary_label, created_at FROM shared_link_comments WHERE publication_id = ? ORDER BY created_at ASC, id ASC", [publication.id]),
    all<LegacyResponse>(database, "SELECT id, recipient_id, decision, note, snapshot_version_at_decision, estimate_id, row_id, target_kind, target_label, target_secondary_label, signer_name, signature_intent_hash, created_at FROM shared_link_responses WHERE publication_id = ? ORDER BY created_at ASC, id ASC", [publication.id]),
  ]);
  let snapshot: ProjectPublicationSnapshot;
  try {
    snapshot = parseSnapshot(publication.snapshot_json);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new LegacyClientPortalMigrationError("Legacy publication snapshot is invalid and cannot be migrated safely.", { cause: error });
    }
    throw error;
  }
  const mapping = await database.prepare<{ issue_id: string; migration_status: string; portal_id: string }>("SELECT portal_id, issue_id, migration_status FROM client_portal_legacy_mappings WHERE legacy_publication_id = ? LIMIT 1").bind(publication.id).first<{ issue_id: string; migration_status: string; portal_id: string }>();
  let existingPortal = mapping
    ? await database.prepare<ExistingPortal>("SELECT id, stable_token_hash, current_issue_id FROM client_portals WHERE id = ? LIMIT 1").bind(mapping.portal_id).first<ExistingPortal>()
    : await database.prepare<ExistingPortal>("SELECT id, stable_token_hash, current_issue_id FROM client_portals WHERE project_id = ? AND workspace_id = ? AND archived_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 1").bind(publication.project_id, publication.workspace_id).first<ExistingPortal>();
  const recipientEmails = new Set(recipients.map((recipient) => recipient.email.trim().toLowerCase()).filter(Boolean));
  let audienceStrategy: LegacyClientPortalMigrationReport["audienceStrategy"] = mapping ? "mapped" : "project_default";
  if (!mapping && existingPortal) {
    const existingRecipientEmails = new Set((await all<{ email_normalized: string }>(database, "SELECT email_normalized FROM client_portal_recipients WHERE portal_id = ? AND status != 'revoked'", [existingPortal.id])).map((recipient) => recipient.email_normalized));
    if (recipientEmails.size > 0 && existingRecipientEmails.size > 0) {
      const sharesRecipient = [...recipientEmails].some((email) => existingRecipientEmails.has(email));
      if (!sharesRecipient) {
        existingPortal = null;
        audienceStrategy = "separate_ambiguous";
      } else {
        audienceStrategy = "shared_recipients";
      }
    }
  }
  const portalId = mapping?.portal_id ?? existingPortal?.id ?? (audienceStrategy === "separate_ambiguous" ? legacyId("portal_legacy_audience", publication.id) : legacyId("portal_legacy_project", publication.project_id));
  const issueId = mapping?.issue_id ?? legacyId("issue_legacy", publication.id);
  const createsPortal = !mapping && !existingPortal;
  const stableToken = createsPortal ? createPublicationToken() : null;
  const stableTokenHash = stableToken ? hashPublicationToken(stableToken, readPublicationTokenHashSecret()) : null;
  const encryptedStableToken = stableToken ? encryptPublicationToken(stableToken, readPublicationTokenEncryptionSecret()) : null;
  const issueNumber = existingPortal ? await countRows(database, "SELECT COALESCE(MAX(issue_number), 0) AS count FROM client_portal_issues WHERE portal_id = ?", [portalId]) + 1 : 1;
  const migratedBy = publication.published_by?.trim() || "legacy_migration";
  const existingRecipientIds = new Map(await Promise.all(recipients.map(async (recipient) => {
    const email = recipient.email.trim().toLowerCase();
    const existing = await database.prepare<{ id: string }>("SELECT id FROM client_portal_recipients WHERE portal_id = ? AND email_normalized = ? LIMIT 1").bind(portalId, email).first<{ id: string }>();
    return [email, existing?.id] as const;
  })));
  const recipientIds = new Map(recipients.map((recipient) => [recipient.id, existingRecipientIds.get(recipient.email.trim().toLowerCase()) ?? legacyId("recipient_legacy", recipient.id)]));
  const decisionRecipientIds = new Set(responses.flatMap((response) => response.recipient_id ? [response.recipient_id] : []));
  const acceptedIssueEvidence = responses.length > 0 && responses.every((response) =>
    response.recipient_id !== null
    && recipientIds.has(response.recipient_id)
    && response.target_kind === "proposal"
    && response.estimate_id === null
    && response.row_id === null
    && response.snapshot_version_at_decision === publication.snapshot_version
    && response.decision === "accepted");
  const unresolved: LegacyClientPortalMigrationReport["unresolved"] = [];
  const expectedCommentIdentities: LegacyCommentIdentity[] = [];
  const expectedCredentialIdentities: LegacyRecipientCredentialIdentity[] = recipients.map((recipient) => ({
    credentialId: legacyId("credential_legacy", recipient.id),
    emailNormalized: recipient.email.trim().toLowerCase(),
    recipientId: recipientIds.get(recipient.id)!,
    revokedAt: null,
    status: "active",
    tokenHash: recipient.recipient_token_hash,
  }));
  const expectedDecisionIdentities: LegacyDecisionIdentity[] = [];
  const expectedPreservedDecisionIdentities: LegacyPreservedDecisionIdentity[] = [];
  const forbiddenScopedDecisionIds: string[] = [];
  const overviewPayload: ClientPortalPublicValue = { schemaVersion: 1, project: { code: snapshot.project.projectCode, name: snapshot.project.name }, estimateCount: snapshot.estimates.length, totalCost: snapshot.totalCost, currencyCode: snapshot.project.currencyCode };
  const browserPayload = buildClientPortalEstimateBrowserPayload({ currencyCode: snapshot.project.currencyCode, estimates: snapshot.estimates });
  const sections = [
    issuedSection({ id: legacyId("issue_section", `${publication.id}:overview`), key: "overview", kind: "overview", layout: "standard", payload: overviewPayload, title: "Overview" }),
    issuedSection({ id: legacyId("issue_section", `${publication.id}:estimate_browser`), key: "estimate_browser", kind: "estimate_browser", layout: "wide", payload: browserPayload, title: "Estimates" }),
  ];
  const manifest = { schemaVersion: 1, portalId, issueId, issueNumber, versionLabel: `Legacy issue ${publication.snapshot_version}`, issuedAt: publication.published_at, contentHash: "", totalCost: snapshot.totalCost, currencyCode: snapshot.project.currencyCode, project: { code: snapshot.project.projectCode, name: snapshot.project.name }, sections: sections.map((section, sortOrder) => ({ id: section.id, kind: section.kind, title: section.title, sortOrder, layoutMode: section.layout, payloadHash: section.payloadHash, sectionKey: section.key })) };
  const contentHash = sha256(canonicalJson({ legacyPublicationId: publication.id, manifest, snapshotSha256: sha256(canonicalJson(snapshot)) }));
  manifest.contentHash = contentHash;
  const importedAt = new Date().toISOString();
  const migrationNotes = canonicalJson({
    commentCount: comments.length,
    decisionCount: responses.length,
    recipientCount: recipients.length,
    snapshotSha256: sha256(canonicalJson(snapshot)),
    ...(cutoverLease ? {
      cutover_lease_frozen_at: cutoverLease.frozenAt,
      cutover_lease_frozen_by: cutoverLease.frozenBy,
    } : {}),
  });
  const statements: D1PreparedStatementLike[] = [
    ...(createsPortal ? [statement(database, `INSERT INTO client_portals (id, workspace_id, project_id, name, purpose, status, stable_token_hash, encrypted_stable_token, password_hash, access_policy_json, current_issue_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?)`, [portalId, publication.workspace_id, publication.project_id, `${snapshot.project.name} (legacy)`, "Migrated legacy publication", publication.status === "published" ? "live" : "access_off", stableTokenHash!, encryptedStableToken!, publication.password_hash, issueId, migratedBy, publication.published_at, publication.published_at]),
    ] : []),
    statement(database, `INSERT INTO client_portal_issues (id, portal_id, issue_number, version_label, status, issued_at, issued_by, idempotency_key, valid_through, supersedes_issue_id, manifest_json, content_hash, total_cost, currency_code, selected_estimate_ids_json, brand_snapshot_json, decision_policy_snapshot_json, assumptions_json, exclusions_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{"scope":"issue","legacy":true}', '[]', '[]', ?)`, [issueId, portalId, issueNumber, manifest.versionLabel, acceptedIssueEvidence ? "accepted" : "issued", publication.published_at, migratedBy, `legacy:${publication.id}`, publication.expires_at, existingPortal?.current_issue_id ?? null, canonicalJson(manifest), contentHash, snapshot.totalCost, snapshot.project.currencyCode, JSON.stringify(snapshot.estimates.map((estimate) => estimate.id)), publication.published_at]),
    ...sections.map((section, sortOrder) => statement(database, `INSERT INTO client_portal_issue_sections (id, issue_id, section_key, kind, title, sort_order, payload_storage, payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'd1_json', ?, NULL, ?, ?, 1, ?, ?)`, [section.id, issueId, section.key, section.kind, section.title, sortOrder, section.payloadJson, section.payloadHash, section.payloadBytes, policySnapshot(section.layout, section.kind === "estimate_browser", section.kind === "estimate_browser"), publication.published_at])),
    statement(database, "INSERT INTO client_portal_legacy_mappings (legacy_publication_id, portal_id, issue_id, migration_status, legacy_snapshot_version, imported_at, verified_at, notes) VALUES (?, ?, ?, 'imported', ?, ?, NULL, ?)", [publication.id, portalId, issueId, publication.snapshot_version, importedAt, migrationNotes]),
    ...legacyCommitmentEventStatements(database, {
      actorId: migratedBy,
      actorName: null,
      actorType: publication.published_by ? "internal_user" : "system",
      clientSafeSnapshot: { issueNumber, status: publication.status, versionLabel: manifest.versionLabel },
      eventId: legacyId("event_legacy_publication", publication.id),
      eventType: "legacy_publication.imported",
      internalMetadata: { comparisonCapability: "aggregate_only", legacyPublicationId: publication.id },
      legacyPublicationId: publication.id,
      occurredAt: publication.published_at,
      portalId,
      projectId: publication.project_id,
      publicEventId: legacyId("public_event_legacy_publication", publication.id),
      sourceId: publication.id,
      sourceType: "legacy_publication",
      summary: "Historical publication evidence is available with aggregate-only comparison.",
      title: "Legacy publication was added to the commitment timeline",
      workspaceId: publication.workspace_id,
    }),
    ...legacyCommitmentEventStatements(database, {
      actorId: migratedBy,
      actorName: null,
      actorType: publication.published_by ? "internal_user" : "system",
      clientSafeSnapshot: { issueNumber, status: acceptedIssueEvidence ? "accepted" : "issued", versionLabel: manifest.versionLabel },
      eventId: legacyId("event_legacy_issue", publication.id),
      eventType: "issue.issued",
      internalMetadata: { legacyPublicationId: publication.id },
      issueId,
      occurredAt: publication.published_at,
      portalId,
      projectId: publication.project_id,
      publicEventId: legacyId("public_event_legacy_issue", publication.id),
      sourceId: issueId,
      sourceType: "issue",
      summary: null,
      title: `${manifest.versionLabel} was issued`,
      workspaceId: publication.workspace_id,
    }),
  ];

  for (const recipient of recipients) {
    const recipientId = recipientIds.get(recipient.id)!;
    const isApprover = decisionRecipientIds.has(recipient.id);
    if (!existingRecipientIds.get(recipient.email.trim().toLowerCase())) {
      statements.push(statement(database, "INSERT INTO client_portal_recipients (id, portal_id, email_normalized, display_name, client_organization, role_template, status, is_required_approver, verification_state, recipient_credential_version, created_at, updated_at, revoked_at) VALUES (?, ?, ?, ?, NULL, ?, 'active', ?, 'unverified', 1, ?, ?, NULL)", [recipientId, portalId, recipient.email.trim().toLowerCase(), recipient.display_name, isApprover ? "approver" : "commenter", Number(isApprover), recipient.created_at, recipient.created_at]));
    } else if (isApprover) {
      statements.push(statement(database, "UPDATE client_portal_recipients SET role_template = 'approver', is_required_approver = 1, updated_at = ? WHERE id = ?", [recipient.created_at, recipientId]));
    }
    statements.push(statement(database, "INSERT INTO client_portal_recipient_credentials (id, recipient_id, token_hash, status, expires_at, created_at, revoked_at) VALUES (?, ?, ?, 'active', NULL, ?, NULL) ON CONFLICT(token_hash) DO NOTHING", [legacyId("credential_legacy", recipient.id), recipientId, recipient.recipient_token_hash, recipient.created_at]));
  }

  for (const comment of comments) {
    const recipientId = comment.recipient_id ? recipientIds.get(comment.recipient_id) : undefined;
    if (!comment.is_internal && !recipientId) {
      unresolved.push({ id: comment.id, kind: "comment", reason: "missing_or_ambiguous_recipient" });
      continue;
    }
    const audience = comment.is_internal ? "internal" : "client";
    const actorType = recipientId ? "recipient" : "internal_user";
    const actorId = recipientId ?? migratedBy;
    const targetKind = comment.target_kind === "proposal" ? "portal" : comment.target_kind;
    const targetPublicId = targetKind === "portal" ? null : comment.target_kind === "estimate" ? comment.estimate_id : comment.row_id;
    if (targetKind !== "portal" && !targetPublicId) {
      unresolved.push({ id: comment.id, kind: "comment", reason: "missing_legacy_target" });
      continue;
    }
    const threadId = legacyId("thread_legacy", comment.id);
    const messageId = legacyId("message_legacy", comment.id);
    const title = comment.target_label?.trim().slice(0, 300) || "Legacy discussion";
    const body = comment.body.trim().slice(0, 4_000);
    if (!body) {
      unresolved.push({ id: comment.id, kind: "comment", reason: "empty_comment_body" });
      continue;
    }
    const authorSnapshotJson = canonicalJson({ legacyAuthorEmail: comment.author_email, name: comment.author_name, side: audience === "client" ? "client" : "owner" });
    statements.push(
      statement(database, "INSERT INTO client_portal_threads (id, portal_id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, audience, status, waiting_state, assignee_user_id, created_by_actor_type, created_by_actor_id, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?, ?, ?)", [threadId, portalId, issueId, targetKind, targetPublicId, title, comment.target_secondary_label, title, audience, audience === "client" ? "waiting_on_owner" : "no_response_required", actorType, actorId, comment.created_at, comment.created_at]),
      statement(database, "INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)", [messageId, threadId, actorType, actorId, authorSnapshotJson, body, `legacy:${comment.id}`, audience === "client" ? "client" : "internal", comment.created_at]),
    );
    expectedCommentIdentities.push({
      actorId,
      actorType,
      audience,
      authorSnapshotJson,
      body,
      createdAt: comment.created_at,
      messageId,
      messageIdempotencyKey: `legacy:${comment.id}`,
      subject: title,
      targetKind,
      targetLabel: title,
      targetPublicId,
      targetSecondaryLabel: comment.target_secondary_label,
      threadId,
      visibility: audience === "client" ? "client" : "internal",
    });
  }

  for (const response of responses) {
    const recipientId = response.recipient_id ? recipientIds.get(response.recipient_id) : undefined;
    if (!recipientId) {
      unresolved.push({ id: response.id, kind: "decision", reason: "missing_or_ambiguous_recipient" });
      continue;
    }
    const recipient = recipients.find((entry) => entry.id === response.recipient_id)!;
    const decision = response.decision === "accepted" ? "approved" : response.decision === "revision_requested" ? "changes_requested" : "declined";
    const isIssueWide = response.target_kind === "proposal"
      && response.estimate_id === null
      && response.row_id === null
      && response.snapshot_version_at_decision === publication.snapshot_version;
    if (!isIssueWide) {
      const hasMissingTarget = response.target_kind === "estimate"
        ? !response.estimate_id
        : response.target_kind === "row" && !response.row_id;
      if (hasMissingTarget) {
        unresolved.push({ id: response.id, kind: "decision", reason: "missing_legacy_target" });
        continue;
      }
      const eventId = legacyId("event_legacy_scoped_decision", response.id);
      const auditId = legacyId("audit_legacy_scoped_decision", response.id);
      const scopedMetadata = {
        decision,
        estimateId: response.estimate_id,
        legacyResponseId: response.id,
        note: response.note,
        rowId: response.row_id,
        signatureIntentHash: response.signature_intent_hash,
        signerName: response.signer_name,
        snapshotVersionAtDecision: response.snapshot_version_at_decision,
        targetKind: response.target_kind,
        targetLabel: response.target_label,
        targetSecondaryLabel: response.target_secondary_label,
      };
      statements.push(
        statement(database, `INSERT INTO client_portal_audit_events (
          id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type,
          visibility, metadata_json, occurred_at, created_at
        ) VALUES (?, ?, ?, ?, 'recipient', ?, 'legacy_scoped_decision_preserved', 'owner', ?, ?, ?)`, [
          auditId,
          publication.workspace_id,
          portalId,
          issueId,
          recipientId,
          canonicalJson(scopedMetadata),
          response.created_at,
          response.created_at,
        ]),
        ...legacyCommitmentEventStatements(database, {
          actorId: recipientId,
          actorName: response.signer_name,
          actorType: "recipient",
          clientSafeSnapshot: { decision, targetKind: response.target_kind, targetLabel: response.target_label },
          eventId,
          eventType: "legacy_decision.preserved",
          internalMetadata: scopedMetadata,
          legacyPublicationId: publication.id,
          occurredAt: response.created_at,
          portalId,
          projectId: publication.project_id,
          publicEventId: legacyId("public_event_legacy_scoped_decision", response.id),
          sourceId: publication.id,
          sourceType: "legacy_publication",
          summary: response.note,
          title: `Legacy ${decision.replace("_", " ")} decision preserved for ${response.target_label ?? response.target_kind}`,
          workspaceId: publication.workspace_id,
        }),
      );
      expectedPreservedDecisionIdentities.push({ auditId, metadataJson: canonicalJson(scopedMetadata) });
      forbiddenScopedDecisionIds.push(legacyId("decision_legacy", response.id));
      continue;
    }
    const decisionId = legacyId("decision_legacy", response.id);
    const note = response.note?.slice(0, 2000) ?? null;
    const signerName = response.signer_name?.slice(0, 120) ?? null;
    const intentHash = sha256(canonicalJson({ legacyResponseId: response.id, decision, issueId, signatureIntentHash: response.signature_intent_hash }));
    statements.push(
      statement(database, "INSERT INTO client_portal_decisions (id, portal_id, issue_id, recipient_id, scope_kind, scope_key, decision, note, signer_name, signer_email_snapshot, signer_role_snapshot, issue_content_hash, intent_hash, idempotency_key, submitted_at) VALUES (?, ?, ?, ?, 'issue', 'issue', ?, ?, ?, ?, 'approver', ?, ?, ?, ?)", [decisionId, portalId, issueId, recipientId, decision, note, signerName, recipient.email, contentHash, intentHash, `legacy:${response.id}`, response.created_at]),
      ...legacyCommitmentEventStatements(database, {
        actorId: recipientId,
        actorName: signerName,
        actorType: "recipient",
        clientSafeSnapshot: { decision, issueNumber, signerName },
        decisionId,
        eventId: legacyId("event_legacy_decision", response.id),
        eventType: `decision.${decision}`,
        internalMetadata: { issueContentHash: contentHash, legacyResponseId: response.id },
        occurredAt: response.created_at,
        portalId,
        projectId: publication.project_id,
        publicEventId: legacyId("public_event_legacy_decision", response.id),
        sourceId: decisionId,
        sourceType: "decision",
        summary: note,
        title: `${manifest.versionLabel} was ${decision.replace("_", " ")}`,
        workspaceId: publication.workspace_id,
      }),
    );
    expectedDecisionIdentities.push({
      decision,
      decisionId,
      idempotencyKey: `legacy:${response.id}`,
      intentHash,
      issueContentHash: contentHash,
      note,
      recipientId,
      signerEmailSnapshot: recipient.email,
      signerName,
      submittedAt: response.created_at,
    });
  }

  const importedCommentCount = comments.length - unresolved.filter((item) => item.kind === "comment").length;
  const importedDecisionCount = expectedDecisionIdentities.length;
  statements.push(legacyMigrationAuditStatement(database, {
    eventType: "legacy_migration_imported",
    issueId,
    metadata: { commentsImported: importedCommentCount, decisionsImported: importedDecisionCount, legacyPublicationId: publication.id, recipientCredentialsImported: recipients.length, snapshotContentHash: contentHash },
    occurredAt: importedAt,
    portalId,
    workspaceId: publication.workspace_id,
  }));
  const legacyHistorySha256 = sha256(canonicalJson({ comments, recipients, responses }));
  const report: LegacyClientPortalMigrationReport = { audienceStrategy, comments: { imported: importedCommentCount, unresolved: unresolved.filter((item) => item.kind === "comment").length }, decisions: { imported: importedDecisionCount, unresolved: unresolved.filter((item) => item.kind === "decision").length }, dryRun: !apply, issueId, legacyPublicationId: publication.id, portalId, recipients: { imported: recipients.length, unresolved: 0 }, snapshot: { estimateCount: snapshot.estimates.length, legacyHistorySha256, rowCount: snapshot.rowCount, sha256: sha256(canonicalJson(snapshot)), sourceSha256: sha256(canonicalJson({ comments, publication, recipients, responses })) }, status: apply ? "verified" : "planned", unresolved };
  const verifyMigration = (recordVerification = true) => verifyLegacyMigrationWrite({
    contentHash,
    database,
    expectedCommentIdentities,
    expectedCredentialIdentities,
    expectedDecisionIdentities,
    expectedPreservedDecisionIdentities,
    forbiddenScopedDecisionIds,
    issueId,
    legacyPublicationId: publication.id,
    portalId,
    recordVerification,
    expectedCurrentIssue: createsPortal,
    expectedStableTokenHash: stableTokenHash,
    workspaceId: publication.workspace_id,
  });
  if (mapping) {
    if (mapping.portal_id !== portalId || mapping.issue_id !== issueId) {
      throw new LegacyClientPortalMigrationError("Legacy Client Portal mapping does not match the deterministic migration identity.");
    }
    if (apply && cutoverLease && mapping.migration_status !== "cutover_complete") {
      await writeMigrationStatements(database, [
        statement(database, `UPDATE client_portal_legacy_mappings
          SET notes = json_set(
            CASE WHEN json_valid(notes) THEN notes ELSE '{}' END,
            '$.cutover_lease_frozen_at', ?,
            '$.cutover_lease_frozen_by', ?
          )
          WHERE legacy_publication_id = ? AND portal_id = ? AND issue_id = ?
            AND migration_status IN ('imported', 'verified', 'rejected')`, [
          cutoverLease.frozenAt,
          cutoverLease.frozenBy,
          publication.id,
          portalId,
          issueId,
        ]),
      ], "Legacy Client Portal mapping could not be bound to the active cutover barrier lease.");
    }
    if (apply && (mapping.migration_status === "imported" || mapping.migration_status === "rejected")) {
      await verifyMigration();
      return report;
    }
    await verifyMigration(false);
    return { ...report, audienceStrategy: "mapped", dryRun: !apply, status: "already_migrated" };
  }
  if (!apply) return report;
  if (!database.batch) throw new LegacyClientPortalMigrationError("Legacy Client Portal migration requires D1 batch support.");
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) throw new LegacyClientPortalMigrationError("Legacy Client Portal migration write failed.");
  await verifyMigration();
  return report;
}
