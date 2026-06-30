import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  recordAccountSecurityEventInD1,
  type AccountSecurityAuditRow,
} from "@/lib/auth/account-audit-d1-store";
import {
  buildAccountSecurityAuditRow,
  hashAccountSecurityValue,
} from "@/lib/auth/account-audit";

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first() {
    return null;
  }

  async all() {
    return { results: [] };
  }

  async run() {
    if (!this.sql.toLowerCase().includes("insert into account_security_events")) {
      return { success: true, meta: { changes: 0 } };
    }

    const [
      id,
      eventType,
      userId,
      workspaceId,
      requestId,
      ipHash,
      userAgentHash,
      metadataJson,
      createdAt,
    ] = this.values;

    const duplicate = this.database.rows.has(String(id));
    if (!duplicate) {
      this.database.rows.set(String(id), {
        created_at: String(createdAt),
        event_type: String(eventType),
        id: String(id),
        ip_hash: ipHash as string | null,
        metadata_json: String(metadataJson),
        request_id: requestId as string | null,
        user_agent_hash: userAgentHash as string | null,
        user_id: userId as string | null,
        workspace_id: workspaceId as string | null,
      });
    }

    return { success: true, meta: { changes: duplicate ? 0 : 1 } };
  }
}

class FakeD1Database {
  rows = new Map<string, Record<string, string | null>>();

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

describe("Cloudflare D1 account security audit store", () => {
  it("inserts sanitized account security events into D1", async () => {
    const database = new FakeD1Database();
    const row = buildAccountSecurityAuditRow({
      eventType: "auth_google_started",
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: null,
      requestId: "req_123",
      ipAddress: "203.0.113.10",
      userAgent: "Browser With Version",
      metadata: {
        provider: "google",
        raw_provider_payload: { access_token: "secret" },
        safe_next: "/workshop",
      },
    });

    const result = await recordAccountSecurityEventInD1(database, row);
    const stored = database.rows.get(result.id);

    expect(result.duplicate).toBe(false);
    expect(stored).toMatchObject({
      event_type: "auth_google_started",
      ip_hash: hashAccountSecurityValue("203.0.113.10"),
      request_id: "req_123",
      user_agent_hash: hashAccountSecurityValue("Browser With Version"),
      user_id: "11111111-1111-4111-8111-111111111111",
      workspace_id: null,
    });
    expect(JSON.parse(String(stored?.metadata_json))).toEqual({
      provider: "google",
      safe_next: "/workshop",
    });
    expect(JSON.stringify(stored)).not.toMatch(/secret|203\.0\.113\.10|Browser With Version/);
  });

  it("keeps account security event ids idempotent for backfills", async () => {
    const database = new FakeD1Database();
    const row: AccountSecurityAuditRow = {
      id: "event-1",
      created_at: "2026-06-30T00:00:00.000Z",
      event_type: "auth_callback_succeeded",
      ip_hash: null,
      metadata_json: {},
      request_id: null,
      user_agent_hash: null,
      user_id: "11111111-1111-4111-8111-111111111111",
      workspace_id: null,
    };

    await expect(recordAccountSecurityEventInD1(database, row)).resolves.toMatchObject({
      duplicate: false,
      id: "event-1",
    });
    await expect(recordAccountSecurityEventInD1(database, row)).resolves.toMatchObject({
      duplicate: true,
      id: "event-1",
    });
    expect(database.rows).toHaveLength(1);
  });

  it("keeps account security audit runtime off Supabase service-role clients", () => {
    const auditSource = readFileSync("src/lib/auth/account-audit.ts", "utf8");
    const storeSource = readFileSync("src/lib/auth/account-audit-d1-store.ts", "utf8");
    const accountDataSource = readFileSync("src/lib/auth/account-data.ts", "utf8");

    expect(auditSource).toContain("recordAccountSecurityEventInCloudflareD1");
    expect(storeSource).toContain("getCloudflareD1Database");
    expect([auditSource, storeSource, accountDataSource].join("\n")).not.toMatch(
      /SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js|@\/lib\/supabase\/types|createClient/,
    );
  });
});
