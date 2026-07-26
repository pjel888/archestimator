import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { createSharedLinkSessionCookie, createSharedLinkSessionCookieName } from "@/lib/publication/security";

const mocks = vi.hoisted(() => ({ getDatabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/cloudflare/d1")>(), getCloudflareD1Database: mocks.getDatabase }));

import { readClientPortalRecipientSession, resolveClientPortalRecipientActor } from "@/lib/client-portal/public-repository";

const stableToken = "s".repeat(43);
const recipientToken = "r".repeat(43);

function recipientDatabase(options: { currentIssueId?: string | null } = {}) {
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM project_publications AS legacy")) return null;
          if (sql.includes("stable_token_hash")) return { access_credential_version: 9, access_policy_json: "{}", current_issue_id: options.currentIssueId === undefined ? "issue_1" : options.currentIssueId, id: "portal_1", name: "Client Review", password_hash: null, project_id: "project_1", status: "live", workspace_id: "workspace_1" } as T;
          if (sql.includes("SELECT status, valid_through FROM client_portal_issues")) return { status: "issued", valid_through: "2099-01-01T00:00:00.000Z" } as T;
          if (sql.includes("FROM client_portal_recipient_credentials c")) return { client_organization: null, credential_id: "credential_1", display_name: "Avery", id: "recipient_1", is_required_approver: 1, recipient_credential_version: 4, role_template: "approver", status: "active", verification_state: "unverified" } as T;
          return null;
        },
        async all<T>() { return { results: [], success: true } as D1Result<T>; },
        async run<T>() { return { meta: { changes: 1 }, success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(batchStatements) { return batchStatements.map(() => ({ meta: { changes: 1 }, success: true })); },
  };
  return { database, statements };
}

function sessionDatabase(overrides: Partial<{ access_credential_version: number; issue_status: string | null; portal_status: string; status: string; valid_through: string | null; verification_state: string }> = {}) {
  const row = { access_credential_version: 9, client_organization: null, display_name: "Avery", id: "recipient_1", is_required_approver: 1, issue_status: "issued", portal_id: "portal_1", portal_status: "live", recipient_credential_version: 4, role_template: "approver", status: "active", valid_through: "2099-01-01T00:00:00.000Z", verification_state: "verified", ...overrides };
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      const prepared: D1PreparedStatementLike = {
        bind() { return prepared; },
        async first<T>() { return sql.includes("FROM client_portal_recipients r JOIN client_portals") ? row as T : null; },
        async all<T>() { return { results: [], success: true } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
  };
  return database;
}

function sessionCookie(credentialVersion = "4:9") {
  const setCookie = createSharedLinkSessionCookie({ token: stableToken, publicationId: "portal_1", credentialVersion, recipientId: "recipient_1" });
  return `${createSharedLinkSessionCookieName(stableToken)}=${setCookie.split("=")[1]?.split(";")[0]}`;
}

beforeEach(() => mocks.getDatabase.mockReset());

describe("Client Portal recipient access", () => {
  it("atomically consumes first redemption, verifies the recipient, and binds both credential versions", async () => {
    const { database, statements } = recipientDatabase();
    mocks.getDatabase.mockResolvedValue(database);

    const result = await resolveClientPortalRecipientActor(stableToken, recipientToken);

    expect(result).toMatchObject({ credentialVersion: "4:9", actor: { recipientId: "recipient_1", verificationState: "verified" } });
    expect(statements.some((entry) => entry.sql.includes("status = 'used'"))).toBe(true);
    expect(statements.some((entry) => entry.sql.includes("portal.recipient.verified"))).toBe(true);
    expect(JSON.stringify(statements)).not.toContain(recipientToken);
  });

  it("allows recipient redemption and sessions before the first issue exists", async () => {
    const { database, statements } = recipientDatabase({ currentIssueId: null });
    mocks.getDatabase.mockResolvedValue(database);

    await expect(resolveClientPortalRecipientActor(stableToken, recipientToken)).resolves.toMatchObject({
      actor: { recipientId: "recipient_1" },
    });
    expect(statements.some((entry) => entry.sql.includes("FROM client_portal_issues"))).toBe(false);

    mocks.getDatabase.mockResolvedValue(sessionDatabase({ issue_status: null, valid_through: null }));
    await expect(readClientPortalRecipientSession(stableToken, sessionCookie())).resolves.toMatchObject({ recipientId: "recipient_1" });
  });

  it("rejects sessions after recipient or portal version rotation", async () => {
    mocks.getDatabase.mockResolvedValue(sessionDatabase());
    await expect(readClientPortalRecipientSession(stableToken, sessionCookie())).resolves.toMatchObject({ recipientId: "recipient_1" });

    mocks.getDatabase.mockResolvedValue(sessionDatabase({ access_credential_version: 10 }));
    await expect(readClientPortalRecipientSession(stableToken, sessionCookie())).resolves.toBeNull();
    mocks.getDatabase.mockResolvedValue(sessionDatabase());
    await expect(readClientPortalRecipientSession(stableToken, sessionCookie("5:9"))).resolves.toBeNull();
  });

  it("rejects sessions when access is off or the current issue is withdrawn or expired", async () => {
    for (const database of [
      sessionDatabase({ portal_status: "access_off" }),
      sessionDatabase({ issue_status: "withdrawn" }),
      sessionDatabase({ valid_through: "2020-01-01T00:00:00.000Z" }),
    ]) {
      mocks.getDatabase.mockResolvedValue(database);
      await expect(readClientPortalRecipientSession(stableToken, sessionCookie())).resolves.toBeNull();
    }
  });
});
