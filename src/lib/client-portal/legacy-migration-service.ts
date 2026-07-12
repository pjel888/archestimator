import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";
import type { ClientPortalPublicValue } from "@/lib/client-portal/section-registry";
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
type LegacyResponse = { created_at: string; decision: "accepted" | "declined" | "revision_requested"; id: string; note: string | null; recipient_id: string | null; signer_name: string | null };

export type LegacyClientPortalMigrationReport = {
  audienceStrategy: "mapped" | "project_default" | "shared_recipients" | "separate_ambiguous";
  comments: { imported: number; unresolved: number };
  decisions: { imported: number; unresolved: number };
  dryRun: boolean;
  issueId: string;
  legacyPublicationId: string;
  portalId: string;
  recipients: { imported: number; unresolved: number };
  snapshot: { estimateCount: number; rowCount: number; sha256: string };
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
  constructor(message: string) {
    super(message);
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
  try {
    const parsed = JSON.parse(value) as ProjectPublicationSnapshot;
    if (!parsed || typeof parsed !== "object" || !parsed.project || !Array.isArray(parsed.estimates)) throw new Error("shape");
    return sanitizeProjectPublicationSnapshotForPublicRead(parsed);
  } catch {
    throw new LegacyClientPortalMigrationError("Legacy publication snapshot is invalid and cannot be migrated safely.");
  }
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

async function countRows(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const row = await database.prepare<CountRow>(sql).bind(...values).first<CountRow>();
  return Number(row?.count ?? 0);
}

async function verifyLegacyMigrationWrite({
  commentCount,
  contentHash,
  database,
  decisionCount,
  issueId,
  legacyPublicationId,
  portalId,
  recipientTokenHashes,
  expectedCurrentIssue,
  expectedStableTokenHash,
  workspaceId,
}: {
  commentCount: number;
  contentHash: string;
  database: D1DatabaseLike;
  decisionCount: number;
  issueId: string;
  legacyPublicationId: string;
  portalId: string;
  recipientTokenHashes: string[];
  expectedCurrentIssue: boolean;
  expectedStableTokenHash: string | null;
  workspaceId: string;
}) {
  const recipientCredentialCount = recipientTokenHashes.length === 0
    ? Promise.resolve(0)
    : countRows(database, `SELECT COUNT(DISTINCT credential.token_hash) AS count FROM client_portal_recipient_credentials AS credential JOIN client_portal_recipients AS recipient ON recipient.id = credential.recipient_id WHERE recipient.portal_id = ? AND credential.token_hash IN (${recipientTokenHashes.map(() => "?").join(", ")})`, [portalId, ...recipientTokenHashes]);
  const [mapping, importedRecipients, importedThreads, importedMessages, importedDecisions] = await Promise.all([
    database.prepare<MigrationVerificationRow>(`SELECT
      mapping.portal_id,
      mapping.issue_id,
      portal.current_issue_id,
      portal.stable_token_hash,
      issue.content_hash AS issue_content_hash
      FROM client_portal_legacy_mappings AS mapping
      JOIN client_portals AS portal ON portal.id = mapping.portal_id
      JOIN client_portal_issues AS issue ON issue.id = mapping.issue_id
      WHERE mapping.legacy_publication_id = ?
      LIMIT 1`).bind(legacyPublicationId).first<MigrationVerificationRow>(),
    recipientCredentialCount,
    countRows(database, "SELECT COUNT(*) AS count FROM client_portal_threads WHERE portal_id = ? AND issue_id = ?", [portalId, issueId]),
    countRows(database, "SELECT COUNT(*) AS count FROM client_portal_messages WHERE thread_id IN (SELECT id FROM client_portal_threads WHERE portal_id = ? AND issue_id = ?)", [portalId, issueId]),
    countRows(database, "SELECT COUNT(*) AS count FROM client_portal_decisions WHERE portal_id = ? AND issue_id = ?", [portalId, issueId]),
  ]);

  const mismatches = [
    mapping?.portal_id !== portalId ? "portal mapping" : null,
    mapping?.issue_id !== issueId ? "issue mapping" : null,
    expectedCurrentIssue && mapping?.current_issue_id !== issueId ? "current issue" : null,
    expectedStableTokenHash !== null && mapping?.stable_token_hash !== expectedStableTokenHash ? "stable token hash" : null,
    mapping?.issue_content_hash !== contentHash ? "issue content hash" : null,
    importedRecipients !== recipientTokenHashes.length ? "recipient credential count" : null,
    importedThreads !== commentCount ? "thread count" : null,
    importedMessages !== commentCount ? "message count" : null,
    importedDecisions !== decisionCount ? "decision count" : null,
  ].filter((value): value is string => value !== null);

  if (mismatches.length > 0) {
    throw new LegacyClientPortalMigrationError(`Legacy Client Portal migration was imported but verification failed: ${mismatches.join(", ")}.`);
  }

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
      metadata: { commentsImported: commentCount, decisionsImported: decisionCount, legacyPublicationId, recipientCredentialsImported: recipientTokenHashes.length, snapshotContentHash: contentHash },
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
  const mapping = await database.prepare<{ issue_id: string; migration_status: "cutover_complete" | "verified"; portal_id: string; workspace_id: string }>(
    "SELECT mapping.portal_id, mapping.issue_id, mapping.migration_status, portal.workspace_id FROM client_portal_legacy_mappings AS mapping JOIN client_portals AS portal ON portal.id = mapping.portal_id WHERE mapping.legacy_publication_id = ? AND mapping.migration_status IN ('verified', 'cutover_complete') LIMIT 1",
  ).bind(legacyPublicationId).first<{ issue_id: string; migration_status: "cutover_complete" | "verified"; portal_id: string; workspace_id: string }>();
  if (!mapping) {
    throw new LegacyClientPortalMigrationError("A verified Client Portal migration was not found for this legacy publication.");
  }

  const rolledBackAt = new Date().toISOString();
  await writeMigrationStatements(database, [
    statement(
      database,
      "UPDATE client_portal_legacy_mappings SET migration_status = 'rejected', notes = json_set(CASE WHEN json_valid(notes) THEN notes ELSE '{}' END, '$.rollback_at', ?, '$.rollback_reason', 'manager_requested', '$.rollback_from', ?) WHERE legacy_publication_id = ? AND portal_id = ? AND issue_id = ? AND migration_status IN ('verified', 'cutover_complete')",
      [rolledBackAt, mapping.migration_status, legacyPublicationId, mapping.portal_id, mapping.issue_id],
    ),
    legacyMigrationAuditStatement(database, {
      eventType: "legacy_migration_rolled_back",
      issueId: mapping.issue_id,
      metadata: { legacyPublicationId, rollbackFrom: mapping.migration_status, rollbackReason: "manager_requested" },
      occurredAt: rolledBackAt,
      portalId: mapping.portal_id,
      workspaceId: mapping.workspace_id,
    }),
  ], "Legacy Client Portal rollback status could not be recorded.");

  return {
    issueId: mapping.issue_id,
    legacyPublicationId,
    portalId: mapping.portal_id,
    status: "rolled_back",
  };
}

export async function migrateLegacyPublicationToClientPortal({ apply = false, database, legacyPublicationId }: { apply?: boolean; database: D1DatabaseLike; legacyPublicationId: string }): Promise<LegacyClientPortalMigrationReport> {
  const publication = await database.prepare<LegacyPublication>(`SELECT id, workspace_id, project_id, token_hash, encrypted_token, password_hash, status, snapshot_version, selected_estimate_ids, snapshot_json, published_by, published_at, expires_at
    FROM project_publications WHERE id = ? LIMIT 1`).bind(legacyPublicationId).first<LegacyPublication>();
  if (!publication) throw new LegacyClientPortalMigrationError("Legacy publication was not found.");

  const [recipients, comments, responses] = await Promise.all([
    all<LegacyRecipient>(database, "SELECT id, email, display_name, recipient_token_hash, created_at FROM shared_link_recipients WHERE publication_id = ? ORDER BY created_at ASC, id ASC", [publication.id]),
    all<LegacyComment>(database, "SELECT id, recipient_id, author_email, author_name, estimate_id, row_id, body, is_internal, target_kind, target_label, target_secondary_label, created_at FROM shared_link_comments WHERE publication_id = ? ORDER BY created_at ASC, id ASC", [publication.id]),
    all<LegacyResponse>(database, "SELECT id, recipient_id, decision, note, signer_name, created_at FROM shared_link_responses WHERE publication_id = ? ORDER BY created_at ASC, id ASC", [publication.id]),
  ]);
  const snapshot = parseSnapshot(publication.snapshot_json);
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
  const unresolved: LegacyClientPortalMigrationReport["unresolved"] = [];
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
  const statements: D1PreparedStatementLike[] = [
    ...(createsPortal ? [statement(database, `INSERT INTO client_portals (id, workspace_id, project_id, name, purpose, status, stable_token_hash, encrypted_stable_token, password_hash, access_policy_json, current_issue_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?)`, [portalId, publication.workspace_id, publication.project_id, `${snapshot.project.name} (legacy)`, "Migrated legacy publication", publication.status === "published" ? "live" : "access_off", stableTokenHash!, encryptedStableToken!, publication.password_hash, issueId, migratedBy, publication.published_at, publication.published_at]),
    ] : []),
    statement(database, `INSERT INTO client_portal_issues (id, portal_id, issue_number, version_label, status, issued_at, issued_by, idempotency_key, valid_through, supersedes_issue_id, manifest_json, content_hash, total_cost, currency_code, selected_estimate_ids_json, brand_snapshot_json, decision_policy_snapshot_json, assumptions_json, exclusions_json, created_at)
      VALUES (?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{"scope":"issue","legacy":true}', '[]', '[]', ?)`, [issueId, portalId, issueNumber, manifest.versionLabel, publication.published_at, migratedBy, `legacy:${publication.id}`, publication.expires_at, existingPortal?.current_issue_id ?? null, canonicalJson(manifest), contentHash, snapshot.totalCost, snapshot.project.currencyCode, JSON.stringify(snapshot.estimates.map((estimate) => estimate.id)), publication.published_at]),
    ...sections.map((section, sortOrder) => statement(database, `INSERT INTO client_portal_issue_sections (id, issue_id, section_key, kind, title, sort_order, payload_storage, payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'd1_json', ?, NULL, ?, ?, 1, ?, ?)`, [section.id, issueId, section.key, section.kind, section.title, sortOrder, section.payloadJson, section.payloadHash, section.payloadBytes, policySnapshot(section.layout, section.kind === "estimate_browser", section.kind === "estimate_browser"), publication.published_at])),
    statement(database, "INSERT INTO client_portal_legacy_mappings (legacy_publication_id, portal_id, issue_id, migration_status, legacy_snapshot_version, imported_at, verified_at, notes) VALUES (?, ?, ?, 'imported', ?, ?, NULL, ?)", [publication.id, portalId, issueId, publication.snapshot_version, importedAt, canonicalJson({ commentCount: comments.length, decisionCount: responses.length, recipientCount: recipients.length, snapshotSha256: sha256(canonicalJson(snapshot)) })]),
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
    const title = (comment.target_label ?? "Legacy discussion").trim().slice(0, 300) || "Legacy discussion";
    const body = comment.body.trim().slice(0, 4_000);
    if (!body) {
      unresolved.push({ id: comment.id, kind: "comment", reason: "empty_comment_body" });
      continue;
    }
    statements.push(
      statement(database, "INSERT INTO client_portal_threads (id, portal_id, issue_id, section_key, target_kind, target_public_id, target_label, target_secondary_label, subject, audience, status, waiting_state, assignee_user_id, created_by_actor_type, created_by_actor_id, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?, ?, ?)", [threadId, portalId, issueId, targetKind, targetPublicId, title, comment.target_secondary_label, title, audience, audience === "client" ? "waiting_on_owner" : "no_response_required", actorType, actorId, comment.created_at, comment.created_at]),
      statement(database, "INSERT INTO client_portal_messages (id, thread_id, actor_type, actor_id, author_snapshot_json, body, reply_to_message_id, idempotency_key, visibility, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)", [messageId, threadId, actorType, actorId, canonicalJson({ legacyAuthorEmail: comment.author_email, name: comment.author_name, side: audience === "client" ? "client" : "owner" }), body, `legacy:${comment.id}`, audience === "client" ? "client" : "internal", comment.created_at]),
    );
  }

  for (const response of responses) {
    const recipientId = response.recipient_id ? recipientIds.get(response.recipient_id) : undefined;
    if (!recipientId) {
      unresolved.push({ id: response.id, kind: "decision", reason: "missing_or_ambiguous_recipient" });
      continue;
    }
    const recipient = recipients.find((entry) => entry.id === response.recipient_id)!;
    const decision = response.decision === "accepted" ? "approved" : response.decision === "revision_requested" ? "changes_requested" : "declined";
    statements.push(statement(database, "INSERT INTO client_portal_decisions (id, portal_id, issue_id, recipient_id, scope_kind, scope_key, decision, note, signer_name, signer_email_snapshot, signer_role_snapshot, issue_content_hash, intent_hash, idempotency_key, submitted_at) VALUES (?, ?, ?, ?, 'issue', 'issue', ?, ?, ?, ?, 'approver', ?, ?, ?, ?)", [legacyId("decision_legacy", response.id), portalId, issueId, recipientId, decision, response.note?.slice(0, 2000) ?? null, response.signer_name?.slice(0, 120) ?? null, recipient.email, contentHash, sha256(canonicalJson({ legacyResponseId: response.id, decision, issueId })), `legacy:${response.id}`, response.created_at]));
  }

  const importedCommentCount = comments.length - unresolved.filter((item) => item.kind === "comment").length;
  const importedDecisionCount = responses.length - unresolved.filter((item) => item.kind === "decision").length;
  statements.push(legacyMigrationAuditStatement(database, {
    eventType: "legacy_migration_imported",
    issueId,
    metadata: { commentsImported: importedCommentCount, decisionsImported: importedDecisionCount, legacyPublicationId: publication.id, recipientCredentialsImported: recipients.length, snapshotContentHash: contentHash },
    occurredAt: importedAt,
    portalId,
    workspaceId: publication.workspace_id,
  }));
  const report: LegacyClientPortalMigrationReport = { audienceStrategy, comments: { imported: importedCommentCount, unresolved: unresolved.filter((item) => item.kind === "comment").length }, decisions: { imported: importedDecisionCount, unresolved: unresolved.filter((item) => item.kind === "decision").length }, dryRun: !apply, issueId, legacyPublicationId: publication.id, portalId, recipients: { imported: recipients.length, unresolved: 0 }, snapshot: { estimateCount: snapshot.estimates.length, rowCount: snapshot.rowCount, sha256: sha256(canonicalJson(snapshot)) }, status: apply ? "verified" : "planned", unresolved };
  if (mapping) {
    if (mapping.portal_id !== portalId || mapping.issue_id !== issueId) {
      throw new LegacyClientPortalMigrationError("Legacy Client Portal mapping does not match the deterministic migration identity.");
    }
    if (apply && (mapping.migration_status === "imported" || mapping.migration_status === "rejected")) {
      await verifyLegacyMigrationWrite({
        commentCount: importedCommentCount,
        contentHash,
        database,
        decisionCount: importedDecisionCount,
        issueId,
        legacyPublicationId: publication.id,
        portalId,
        recipientTokenHashes: recipients.map((recipient) => recipient.recipient_token_hash),
        expectedCurrentIssue: createsPortal,
        expectedStableTokenHash: stableTokenHash,
        workspaceId: publication.workspace_id,
      });
      return report;
    }
    return { audienceStrategy: "mapped", comments: { imported: 0, unresolved: 0 }, decisions: { imported: 0, unresolved: 0 }, dryRun: !apply, issueId: mapping.issue_id, legacyPublicationId: publication.id, portalId: mapping.portal_id, recipients: { imported: 0, unresolved: 0 }, snapshot: { estimateCount: 0, rowCount: 0, sha256: "already_migrated" }, status: "already_migrated", unresolved: [] };
  }
  if (!apply) return report;
  if (!database.batch) throw new LegacyClientPortalMigrationError("Legacy Client Portal migration requires D1 batch support.");
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) throw new LegacyClientPortalMigrationError("Legacy Client Portal migration write failed.");
  await verifyLegacyMigrationWrite({
    commentCount: importedCommentCount,
    contentHash,
    database,
    decisionCount: importedDecisionCount,
    issueId,
    legacyPublicationId: publication.id,
    portalId,
    recipientTokenHashes: recipients.map((recipient) => recipient.recipient_token_hash),
    expectedCurrentIssue: createsPortal,
    expectedStableTokenHash: stableTokenHash,
    workspaceId: publication.workspace_id,
  });
  return report;
}
