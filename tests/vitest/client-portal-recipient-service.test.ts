import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  inviteClientPortalRecipient,
  revokeClientPortalRecipient,
  updateClientPortalRecipientRole,
} from "@/lib/client-portal/recipient-service";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase(options: { existingRecipient?: { id: string; recipient_credential_version: number; status: "active" | "revoked" } } = {}) {
  const statements: CapturedStatement[] = [];
  const portal = { encrypted_stable_token: "aes-256-gcm-v1:stable", id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "ready" };
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) {
          values = nextValues;
          statements.push({ sql, values });
          return prepared;
        },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return portal as T;
          if (sql.includes("email_normalized")) return (options.existingRecipient ?? null) as T | null;
          if (sql.includes("WHERE id = ? AND portal_id")) return (options.existingRecipient ?? { id: "recipient_1", recipient_credential_version: 4, status: "active" }) as T;
          return null;
        },
        async all<T>() {
          return { success: true, results: [] } as D1Result<T>;
        },
        async run<T>() {
          return { success: true } as D1Result<T>;
        },
      };
      return prepared;
    },
    async batch(batchStatements) {
      statements.push(...batchStatements.map(() => ({ sql: "__batch__", values: [] })));
      return batchStatements.map(() => ({ success: true }));
    },
  };
  return { database, statements };
}

const actor = {
  kind: "internal" as const,
  userId: "user_1",
  workspaceId: "workspace_1",
  projectId: "project_1",
  projectRole: "owner" as const,
  portalGrants: [],
};

describe("client portal recipient service", () => {
  it("creates stable recipient membership, stores only a credential hash, and queues safe delivery intent", async () => {
    const { database, statements } = createDatabase();
    const result = await inviteClientPortalRecipient({
      actor,
      database,
      portalId: "portal_1",
      recipient: {
        clientOrganization: "Northstar Construction",
        displayName: "Client Reviewer",
        domainRole: "quantity_surveyor",
        domainRoleLabel: "Commercial lead",
        email: "Client@example.com",
        roleTemplate: "requester",
        isRequiredApprover: true,
      },
    });

    expect(result).toMatchObject({ deliveryState: "pending", recipientCredentialVersion: 1 });
    expect(result.recipientId).toMatch(/^recipient_/);
    expect(result.outboxId).toMatch(/^outbox_/);
    expect(statements.some((entry) => entry.sql.includes("INSERT INTO client_portal_recipients"))).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("domain_role") && entry.values.includes("quantity_surveyor") && entry.values.includes("Commercial lead") && entry.values.includes("requester") && entry.values.includes(1))).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("INSERT INTO client_portal_recipient_credentials"))).toBe(true);
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("portal.recipient.invited");
    expect(serialized).toContain("hmac-sha256-v1:");
    expect(serialized).toContain("aes-256-gcm-v1:");
    expect(serialized).toContain("encryptedBootstrapToken");
    expect(serialized).toContain("expires_at");
    expect(result).not.toHaveProperty("bootstrapToken");
  });

  it("rotates existing credentials without replacing the recipient identity", async () => {
    const { database, statements } = createDatabase({ existingRecipient: { id: "recipient_existing", recipient_credential_version: 4, status: "active" } });
    const result = await inviteClientPortalRecipient({
      actor,
      database,
      portalId: "portal_1",
      recipient: { email: "client@example.com", roleTemplate: "reviewer" },
    });

    expect(result).toMatchObject({ recipientId: "recipient_existing", recipientCredentialVersion: 5 });
    expect(statements.some((entry) => entry.sql.includes("UPDATE client_portal_recipient_credentials") && entry.sql.includes("status = 'active'"))).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("UPDATE client_portal_recipients") && entry.sql.includes("role_template"))).toBe(true);
  });

  it("revokes active credentials and increments the session version without deleting history", async () => {
    const { database, statements } = createDatabase();
    await revokeClientPortalRecipient({ actor, database, portalId: "portal_1", recipientId: "recipient_1" });

    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("status = 'revoked'");
    expect(serialized).toContain("portal.recipient.revoked");
    expect(serialized).not.toContain("DELETE FROM client_portal_recipients");
  });

  it("updates permission role, domain identity, and required-approver authority independently of credential rotation", async () => {
    const { database, statements } = createDatabase();
    await updateClientPortalRecipientRole({
      actor,
      database,
      portalId: "portal_1",
      recipientId: "recipient_1",
      clientOrganization: "Owner Team",
      domainRole: "owner_representative",
      domainRoleLabel: "Project sponsor",
      roleTemplate: "viewer",
      isRequiredApprover: true,
    });

    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("portal.recipient.role_updated");
    expect(serialized).toContain("owner_representative");
    expect(serialized).toContain("Project sponsor");
    expect(statements.some((entry) => entry.sql.includes("SET client_organization") && entry.values.includes("viewer") && entry.values.includes(1))).toBe(true);
    expect(serialized).not.toContain("INSERT INTO client_portal_recipient_credentials");
  });

  it("does not infer approval authority from the permission role", async () => {
    const { database, statements } = createDatabase();
    await updateClientPortalRecipientRole({
      actor,
      database,
      portalId: "portal_1",
      recipientId: "recipient_1",
      roleTemplate: "approver",
      isRequiredApprover: false,
    });

    expect(statements.some((entry) => entry.sql.includes("SET client_organization") && entry.values.includes("approver") && entry.values.includes(0))).toBe(true);
  });

  it("denies a manager whose project relationship does not match the portal", async () => {
    const { database } = createDatabase();
    await expect(inviteClientPortalRecipient({
      actor: { ...actor, projectId: "project_other" },
      database,
      portalId: "portal_1",
      recipient: { email: "client@example.com", roleTemplate: "viewer" },
    })).rejects.toMatchObject({ code: "client_portal_recipient_denied" });
  });
});
