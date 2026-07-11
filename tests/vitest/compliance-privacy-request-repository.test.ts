import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrivacyRequestInput } from "@/lib/compliance/privacy-request-repository";

const fakeRows: unknown[] = [];
const prepared: Array<{ sql: string; values: unknown[] }> = [];

class FakeStatement {
  constructor(private sql: string) {}
  bind(...values: unknown[]) {
    prepared.push({ sql: this.sql, values });
    return this;
  }
  async first() {
    return null;
  }
  async all() {
    return { results: [...fakeRows] };
  }
  async run() {
    if (this.sql.toLowerCase().includes("insert into privacy_requests")) {
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 0 } };
  }
}

class FakeD1 {
  prepare(sql: string) {
    return new FakeStatement(sql);
  }
}

describe("privacy request register (P0.5)", () => {
  beforeEach(() => {
    fakeRows.length = 0;
    prepared.length = 0;
    vi.resetModules();
  });

  // Scenario PRIVACY-1 (REQ-005 ANON-1): anonymous submission accepted
  it("createPrivacyRequest accepts an anonymous submission with no email and returns id+createdAt (PRIVACY-1)", async () => {
    vi.doMock("@/lib/cloudflare/d1", () => ({
      getCloudflareD1Database: async () => new FakeD1(),
    }));
    const mod = await import("@/lib/compliance/privacy-request-repository");
    const input: PrivacyRequestInput = {
      requestKind: "access",
      description: "Please confirm what data you hold about me.",
    };
    const result = await mod.createPrivacyRequest(input);
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.status).toBe("submitted");
  });

  // Scenario VERIFY-1 (REQ-005): rejects invalid request_kind
  it("createPrivacyRequest rejects an invalid request kind (VERIFY-1)", async () => {
    vi.doMock("@/lib/cloudflare/d1", () => ({
      getCloudflareD1Database: async () => new FakeD1(),
    }));
    const mod = await import("@/lib/compliance/privacy-request-repository");
    await expect(
      mod.createPrivacyRequest({
        requestKind: "delete-all-things" as unknown as PrivacyRequestInput["requestKind"],
        description: "x",
      }),
    ).rejects.toThrow(/request_kind/i);
  });


  it("createPrivacyRequest rejects oversized requester fields and metadata", async () => {
    vi.doMock("@/lib/cloudflare/d1", () => ({
      getCloudflareD1Database: async () => new FakeD1(),
    }));
    const mod = await import("@/lib/compliance/privacy-request-repository");

    await expect(
      mod.createPrivacyRequest({
        requestKind: "access",
        description: "Please send my data.",
        requesterName: "x".repeat(201),
      }),
    ).rejects.toThrow(/requesterName/);

    await expect(
      mod.createPrivacyRequest({
        requestKind: "access",
        description: "Please send my data.",
        metadata: { nested: { value: "not accepted" } },
      }),
    ).rejects.toThrow(/metadata values/);
  });

  // Scenario SLA-1 (REQ-005): list returns rows for triage queue
  it("listPrivacyRequests returns rows from D1 ordered by created_at desc (SLA-1)", async () => {
    fakeRows.push(
      {
        id: "row-2",
        request_kind: "erasure",
        status: "submitted",
        created_at: "2026-07-05T10:00:00Z",
      },
      {
        id: "row-1",
        request_kind: "access",
        status: "in_triage",
        created_at: "2026-07-04T10:00:00Z",
      },
    );
    vi.doMock("@/lib/cloudflare/d1", () => ({
      getCloudflareD1Database: async () => new FakeD1(),
    }));
    const mod = await import("@/lib/compliance/privacy-request-repository");
    const rows = await mod.listPrivacyRequests();
    expect(rows.length).toBe(2);
    expect(rows[0]!.id).toBe("row-2");
  });

  it("exports and anonymizes activity through workspace-scoped privacy helpers", async () => {
    vi.doMock("@/lib/cloudflare/d1", () => ({
      getCloudflareD1Database: async () => new FakeD1(),
    }));
    const mod = await import("@/lib/compliance/privacy-request-repository");
    const database = new FakeD1();

    await mod.exportPrivacyRequestActivityData({ requesterUserId: "user-a", workspaceId: "workspace-a" }, database as never);
    await mod.erasePrivacyRequestActivityData({ requesterUserId: "user-a", workspaceId: "workspace-a" }, database as never);

    const exportStatement = prepared.find((statement) => statement.sql.includes("FROM estimate_sheet_events"));
    const anonymizeStatement = prepared.find((statement) => statement.sql.includes("SET actor_user_id"));
    expect(exportStatement?.sql).toContain("WHERE workspace_id = ? AND actor_user_id = ?");
    expect(exportStatement?.values).toEqual(["workspace-a", "user-a"]);
    expect(anonymizeStatement?.sql).toContain("WHERE workspace_id = ? AND actor_user_id = ?");
    expect(anonymizeStatement?.values).toEqual(["anonymized-activity-actor", "workspace-a", "user-a"]);
  });
});
