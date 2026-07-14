import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { updateClientPortalAccess } from "@/lib/client-portal/access-service";

const actor = { kind: "internal" as const, userId: "owner_1", workspaceId: "workspace_1", projectId: "project_1", projectRole: "viewer" as const, portalGrants: ["manager"] as const };

function accessDatabase() {
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const portal = { access_credential_version: 4, current_issue_id: "issue_1", id: "portal_1", password_hash: null, project_id: "project_1", status: "live" as const, workspace_id: "workspace_1" };
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() { return portal as T; },
        async all<T>() { return { results: [], success: true } as D1Result<T>; },
        async run<T>() { return { meta: { changes: 1 }, success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(batchStatements) {
      return batchStatements.map(() => ({ meta: { changes: 1 }, success: true }));
    },
  };
  return { database, statements };
}

describe("Client Portal access service", () => {
  it("rotates the portal access version when setting a password without persisting plaintext", async () => {
    const { database, statements } = accessDatabase();
    const result = await updateClientPortalAccess({ accessEnabled: true, actor, database, password: "super-secret", passwordAction: "replace", portalId: "portal_1" });

    expect(result).toEqual({ accessCredentialVersion: 5, passwordEnabled: true, status: "live" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("scrypt-sha256-v1:");
    expect(serialized).toContain("portal.access.rotated");
    expect(serialized).not.toContain("super-secret");
  });

  it("turns access off and advances the version used by every recipient session", async () => {
    const { database, statements } = accessDatabase();
    await expect(updateClientPortalAccess({ accessEnabled: false, actor, database, passwordAction: "keep", portalId: "portal_1" })).resolves.toEqual({ accessCredentialVersion: 5, passwordEnabled: false, status: "access_off" });
    expect(statements.some((entry) => entry.sql.startsWith("UPDATE client_portals") && entry.values.includes("access_off"))).toBe(true);
  });

  it("rejects malformed replacement passwords before any access write", async () => {
    const { database, statements } = accessDatabase();
    await expect(updateClientPortalAccess({ accessEnabled: true, actor, database, password: "abc", passwordAction: "replace", portalId: "portal_1" })).rejects.toMatchObject({ code: "client_portal_access_invalid" });
    expect(statements.some((entry) => entry.sql.startsWith("UPDATE client_portals"))).toBe(false);
  });
});
