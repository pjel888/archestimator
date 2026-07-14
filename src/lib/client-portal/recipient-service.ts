import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES, type ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { createPublicationToken, encryptPublicationToken, hashPublicationToken, readPublicationTokenEncryptionSecret, readPublicationTokenHashSecret } from "@/lib/publication/security";

type PortalRow = {
  encrypted_stable_token: string;
  id: string;
  workspace_id: string;
  project_id: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
};

type RecipientRow = {
  id: string;
  recipient_credential_version: number;
  status: "invited" | "active" | "revoked" | "expired";
};

export type ClientPortalRecipientInput = {
  clientOrganization?: string | null;
  displayName?: string | null;
  email: string;
  isRequiredApprover?: boolean;
  roleTemplate: ClientPortalRecipientRoleTemplate;
};

export type ClientPortalRecipientLifecycleInput = {
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  portalId: string;
  recipient: ClientPortalRecipientInput;
};

export type ClientPortalRecipientCredentialResult = {
  deliveryState: "pending";
  outboxId: string;
  recipientId: string;
  recipientCredentialVersion: number;
};

export class ClientPortalRecipientError extends Error {
  constructor(
    readonly code:
      | "client_portal_batch_required"
      | "client_portal_invalid_input"
      | "client_portal_not_found"
      | "client_portal_recipient_not_found"
      | "client_portal_recipient_denied"
      | "client_portal_recipient_write_failed",
    message: string,
  ) {
    super(message);
  }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateRecipient(input: ClientPortalRecipientInput) {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ClientPortalRecipientError("client_portal_invalid_input", "Recipient email is invalid.");
  }
  if (input.displayName && input.displayName.trim().length > 160) {
    throw new ClientPortalRecipientError("client_portal_invalid_input", "Recipient display name is too long.");
  }
  if (input.clientOrganization && input.clientOrganization.trim().length > 160) {
    throw new ClientPortalRecipientError("client_portal_invalid_input", "Recipient organization is too long.");
  }
  if (!CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES.includes(input.roleTemplate)) {
    throw new ClientPortalRecipientError("client_portal_invalid_input", "Recipient role template is invalid.");
  }
  return {
    clientOrganization: input.clientOrganization?.trim() || null,
    displayName: input.displayName?.trim() || null,
    email,
    isRequiredApprover: Boolean(input.isRequiredApprover),
    roleTemplate: input.roleTemplate,
  };
}

async function resolvePortal(input: Pick<ClientPortalRecipientLifecycleInput, "actor" | "database" | "portalId">, action: "recipient:invite" | "recipient:update_role" | "recipient:revoke" | "recipient:remind") {
  const portal = await first<PortalRow>(
    input.database,
    "SELECT id, workspace_id, project_id, status, encrypted_stable_token FROM client_portals WHERE id = ? LIMIT 1",
    [input.portalId],
  );
  if (!portal) throw new ClientPortalRecipientError("client_portal_not_found", "Client Portal was not found.");

  const authorization = evaluateClientPortalPolicy({
    actor: input.actor,
    action,
    portal: {
      id: portal.id,
      workspaceId: portal.workspace_id,
      projectId: portal.project_id,
      status: portal.status,
      allowAnonymousView: false,
    },
  });
  if (!authorization.allowed) {
    throw new ClientPortalRecipientError("client_portal_recipient_denied", "Actor cannot manage recipients for this Client Portal.");
  }
  return portal;
}

async function requireRecipient(database: D1DatabaseLike, portalId: string, recipientId: string) {
  const recipient = await first<RecipientRow>(
    database,
    "SELECT id, recipient_credential_version, status FROM client_portal_recipients WHERE id = ? AND portal_id = ? LIMIT 1",
    [recipientId, portalId],
  );
  if (!recipient) {
    throw new ClientPortalRecipientError("client_portal_recipient_not_found", "Client Portal recipient was not found.");
  }
  return recipient;
}

function queueAuditAndNotification({
  actorId,
  database,
  eventType,
  metadata,
  outboxId = `outbox_${randomUUID()}`,
  payload = {},
  portal,
  recipientId,
  timestamp,
}: {
  actorId: string;
  database: D1DatabaseLike;
  eventType: string;
  metadata: Record<string, boolean | number | string>;
  outboxId?: string;
  payload?: Record<string, boolean | number | string>;
  portal: PortalRow;
  recipientId: string;
  timestamp: string;
}) {
  const idempotencyKey = `${eventType}:${recipientId}:${timestamp}`;
  return [
    statement(
      database,
      `INSERT INTO client_portal_audit_events
        (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at)
       VALUES (?, ?, ?, NULL, 'internal_user', ?, ?, 'owner', ?, ?, ?)`,
      [randomUUID(), portal.workspace_id, portal.id, actorId, eventType, JSON.stringify(metadata), timestamp, timestamp],
    ),
    statement(
      database,
      `INSERT INTO client_portal_notification_outbox
        (id, portal_id, issue_id, recipient_id, event_type, idempotency_key, payload_json, state, attempt_count, next_attempt_at, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      [outboxId, portal.id, recipientId, eventType, idempotencyKey, JSON.stringify({ recipientId, ...payload }), timestamp, timestamp, timestamp],
    ),
  ];
}

async function runBatch(database: D1DatabaseLike, statements: D1PreparedStatementLike[]) {
  if (!database.batch) {
    throw new ClientPortalRecipientError("client_portal_batch_required", "Client Portal recipient changes require D1 batch support.");
  }
  const result = await database.batch(statements);
  if (result.some((entry) => entry.success === false)) {
    throw new ClientPortalRecipientError("client_portal_recipient_write_failed", "Client Portal recipient change failed.");
  }
}

async function rotateCredential({
  actor,
  database,
  eventType,
  beforeStatements = [],
  portal,
  recipient,
}: {
  actor: ClientPortalInternalActor;
  beforeStatements?: readonly D1PreparedStatementLike[];
  database: D1DatabaseLike;
  eventType: "portal.recipient.invited" | "portal.recipient.resent";
  portal: PortalRow;
  recipient: RecipientRow;
}): Promise<ClientPortalRecipientCredentialResult> {
  const timestamp = new Date().toISOString();
  const recipientCredentialVersion = recipient.status === "invited"
    ? recipient.recipient_credential_version
    : recipient.recipient_credential_version + 1;
  const bootstrapToken = createPublicationToken();
  const credentialId = `credential_${randomUUID()}`;
  const outboxId = `outbox_${randomUUID()}`;
  const expiresAt = new Date(Date.parse(timestamp) + 7 * 24 * 60 * 60 * 1_000).toISOString();

  await runBatch(database, [
    ...beforeStatements,
    statement(
      database,
      `UPDATE client_portal_recipients
       SET status = 'active', verification_state = 'unverified', last_verified_at = NULL,
           recipient_credential_version = ?, revoked_at = NULL, updated_at = ?
       WHERE id = ? AND portal_id = ?`,
      [recipientCredentialVersion, timestamp, recipient.id, portal.id],
    ),
    statement(
      database,
      `UPDATE client_portal_recipient_credentials
       SET status = 'revoked', revoked_at = ?
       WHERE recipient_id = ? AND status = 'active'`,
      [timestamp, recipient.id],
    ),
    statement(
      database,
      `INSERT INTO client_portal_recipient_credentials
        (id, recipient_id, token_hash, status, expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, 'active', ?, ?, NULL)`,
      [credentialId, recipient.id, hashPublicationToken(bootstrapToken, readPublicationTokenHashSecret()), expiresAt, timestamp],
    ),
    ...queueAuditAndNotification({
      actorId: actor.userId,
      database,
      eventType,
      metadata: { recipientCredentialVersion, recipientId: recipient.id },
      outboxId,
      payload: {
        encryptedBootstrapToken: encryptPublicationToken(bootstrapToken, readPublicationTokenEncryptionSecret()),
        encryptedStableToken: portal.encrypted_stable_token,
        recipientCredentialVersion,
      },
      portal,
      recipientId: recipient.id,
      timestamp,
    }),
  ]);

  return { deliveryState: "pending", outboxId, recipientId: recipient.id, recipientCredentialVersion };
}

export async function inviteClientPortalRecipient(input: ClientPortalRecipientLifecycleInput): Promise<ClientPortalRecipientCredentialResult> {
  const normalized = validateRecipient(input.recipient);
  const portal = await resolvePortal(input, "recipient:invite");
  const existingRecipient = await first<RecipientRow>(
    input.database,
    "SELECT id, recipient_credential_version, status FROM client_portal_recipients WHERE portal_id = ? AND email_normalized = ? LIMIT 1",
    [portal.id, normalized.email],
  );

  if (existingRecipient) {
    const timestamp = new Date().toISOString();
    return rotateCredential({
      actor: input.actor,
      beforeStatements: [
      statement(
        input.database,
        `UPDATE client_portal_recipients
         SET display_name = ?, client_organization = ?, role_template = ?, is_required_approver = ?, updated_at = ?
         WHERE id = ? AND portal_id = ?`,
        [normalized.displayName, normalized.clientOrganization, normalized.roleTemplate, Number(normalized.isRequiredApprover), timestamp, existingRecipient.id, portal.id],
      ),
      ],
      database: input.database,
      eventType: "portal.recipient.invited",
      portal,
      recipient: existingRecipient,
    });
  }

  const timestamp = new Date().toISOString();
  const recipient: RecipientRow = { id: `recipient_${randomUUID()}`, recipient_credential_version: 1, status: "invited" };
  return rotateCredential({
    actor: input.actor,
    beforeStatements: [
      statement(
        input.database,
        `INSERT INTO client_portal_recipients
          (id, portal_id, email_normalized, display_name, client_organization, role_template, status, is_required_approver,
           verification_state, recipient_credential_version, created_at, updated_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, 'invited', ?, 'unverified', 1, ?, ?, NULL)`,
        [recipient.id, portal.id, normalized.email, normalized.displayName, normalized.clientOrganization, normalized.roleTemplate, Number(normalized.isRequiredApprover), timestamp, timestamp],
      ),
    ],
    database: input.database,
    eventType: "portal.recipient.invited",
    portal,
    recipient,
  });
}

export async function updateClientPortalRecipientRole({
  actor,
  database,
  isRequiredApprover,
  portalId,
  recipientId,
  roleTemplate,
}: {
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  isRequiredApprover: boolean;
  portalId: string;
  recipientId: string;
  roleTemplate: ClientPortalRecipientRoleTemplate;
}) {
  const portal = await resolvePortal({ actor, database, portalId }, "recipient:update_role");
  await requireRecipient(database, portal.id, recipientId);
  const timestamp = new Date().toISOString();
  await runBatch(database, [
    statement(
      database,
      `UPDATE client_portal_recipients
       SET role_template = ?, is_required_approver = ?, updated_at = ?
       WHERE id = ? AND portal_id = ?`,
      [roleTemplate, Number(isRequiredApprover), timestamp, recipientId, portal.id],
    ),
    ...queueAuditAndNotification({
      actorId: actor.userId,
      database,
      eventType: "portal.recipient.role_updated",
      metadata: { isRequiredApprover, roleTemplate },
      portal,
      recipientId,
      timestamp,
    }),
  ]);
}

export async function resendClientPortalRecipientInvitation({
  actor,
  database,
  portalId,
  recipientId,
}: {
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  portalId: string;
  recipientId: string;
}): Promise<ClientPortalRecipientCredentialResult> {
  const portal = await resolvePortal({ actor, database, portalId }, "recipient:remind");
  const recipient = await requireRecipient(database, portal.id, recipientId);
  return rotateCredential({ actor, database, eventType: "portal.recipient.resent", portal, recipient });
}

export async function revokeClientPortalRecipient({
  actor,
  database,
  portalId,
  recipientId,
}: {
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  portalId: string;
  recipientId: string;
}) {
  const portal = await resolvePortal({ actor, database, portalId }, "recipient:revoke");
  const recipient = await requireRecipient(database, portal.id, recipientId);
  const timestamp = new Date().toISOString();

  await runBatch(database, [
    statement(
      database,
      `UPDATE client_portal_recipients
       SET status = 'revoked', recipient_credential_version = ?, revoked_at = ?, updated_at = ?
       WHERE id = ? AND portal_id = ?`,
      [recipient.recipient_credential_version + 1, timestamp, timestamp, recipient.id, portal.id],
    ),
    statement(
      database,
      `UPDATE client_portal_recipient_credentials
       SET status = 'revoked', revoked_at = ?
       WHERE recipient_id = ? AND status = 'active'`,
      [timestamp, recipient.id],
    ),
    ...queueAuditAndNotification({
      actorId: actor.userId,
      database,
      eventType: "portal.recipient.revoked",
      metadata: { recipientCredentialVersion: recipient.recipient_credential_version + 1 },
      portal,
      recipientId: recipient.id,
      timestamp,
    }),
  ]);
}
