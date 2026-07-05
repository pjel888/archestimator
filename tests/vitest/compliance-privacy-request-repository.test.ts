import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrivacyRequestInput } from "@/lib/compliance/privacy-request-repository";

const fakeRows: unknown[] = [];

class FakeStatement {
  constructor(private sql: string) {}
  bind(..._vals: unknown[]) {
    void _vals;
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
});
