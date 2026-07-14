import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { hashPublicationPassword, validatePublicationPassword } from "@/lib/publication/security";

type PortalStatus = "draft" | "ready" | "live" | "access_off" | "archived";
type PortalRow = {
  access_credential_version: number;
  current_issue_id: string | null;
  id: string;
  password_hash: string | null;
  project_id: string;
  status: PortalStatus;
  workspace_id: string;
};

export type ClientPortalAccessInput = {
  accessEnabled: boolean;
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  passwordAction: "keep" | "remove" | "replace";
  password?: string;
  portalId: string;
};

export class ClientPortalAccessError extends Error {
  constructor(readonly code: "client_portal_access_denied" | "client_portal_access_invalid" | "client_portal_access_not_found" | "client_portal_access_write_failed", message: string) {
    super(message);
  }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

function accessStatus(portal: PortalRow, accessEnabled: boolean): PortalStatus {
  if (!accessEnabled) return "access_off";
  if (portal.status !== "access_off") return portal.status;
  return portal.current_issue_id ? "live" : "ready";
}

export async function updateClientPortalAccess(input: ClientPortalAccessInput) {
  const portal = await input.database.prepare<PortalRow>("SELECT id, workspace_id, project_id, status, current_issue_id, password_hash, access_credential_version FROM client_portals WHERE id = ? LIMIT 1").bind(input.portalId).first<PortalRow>();
  if (!portal) throw new ClientPortalAccessError("client_portal_access_not_found", "Client Portal was not found.");
  if (portal.status === "archived") throw new ClientPortalAccessError("client_portal_access_invalid", "Archived Client Portal access cannot be changed.");

  const authorization = evaluateClientPortalPolicy({
    actor: input.actor,
    action: input.passwordAction === "keep" ? "access:configure" : "access:rotate",
    portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false },
  });
  if (!authorization.allowed) throw new ClientPortalAccessError("client_portal_access_denied", "Actor cannot change Client Portal access.");

  let passwordHash = portal.password_hash;
  if (input.passwordAction === "remove") passwordHash = null;
  if (input.passwordAction === "replace") {
    const password = input.password ?? "";
    const validation = validatePublicationPassword(password);
    if (!validation.ok) throw new ClientPortalAccessError("client_portal_access_invalid", validation.message);
    passwordHash = await hashPublicationPassword(password);
  }

  const status = accessStatus(portal, input.accessEnabled);
  const passwordChanged = input.passwordAction !== "keep";
  if (!passwordChanged && status === portal.status) {
    return { accessCredentialVersion: portal.access_credential_version, passwordEnabled: Boolean(portal.password_hash), status: portal.status };
  }
  if (!input.database.batch) throw new ClientPortalAccessError("client_portal_access_write_failed", "Client Portal access changes require D1 batch support.");

  const timestamp = new Date().toISOString();
  const accessCredentialVersion = portal.access_credential_version + 1;
  const results = await input.database.batch([
    statement(input.database, "UPDATE client_portals SET status = ?, password_hash = ?, access_credential_version = ?, updated_at = ? WHERE id = ? AND access_credential_version = ?", [status, passwordHash, accessCredentialVersion, timestamp, portal.id, portal.access_credential_version]),
    statement(input.database, "INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) SELECT ?, ?, ?, current_issue_id, 'internal_user', ?, 'portal.access.rotated', 'security', ?, ?, ? FROM client_portals WHERE id = ? AND access_credential_version = ? AND updated_at = ?", [`audit_${randomUUID()}`, portal.workspace_id, portal.id, input.actor.userId, JSON.stringify({ accessCredentialVersion, accessEnabled: status !== "access_off", passwordAction: input.passwordAction }), timestamp, timestamp, portal.id, accessCredentialVersion, timestamp]),
  ]);
  if (results.some((result) => result.success === false) || (results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) {
    throw new ClientPortalAccessError("client_portal_access_write_failed", "Client Portal access could not be changed.");
  }

  return { accessCredentialVersion, passwordEnabled: Boolean(passwordHash), status };
}
