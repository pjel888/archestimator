import { beforeEach, describe, expect, it, vi } from "vitest";

type RateLimitEvent = {
  scope: string;
  keyHash: string;
  occurredAt: string;
  expiresAt: string;
};

const rateLimitEvents: RateLimitEvent[] = [];
let privacyRequestWrites = 0;

class FakeStatement {
  private values: unknown[] = [];
  constructor(private sql: string) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    const normalized = this.sql.toLowerCase();
    if (normalized.includes("select count(*) as count from security_rate_limit_events")) {
      const [scope, keyHash, windowStart] = this.values.map(String);
      const count = rateLimitEvents.filter(
        (event) => event.scope === scope && event.keyHash === keyHash && event.occurredAt >= windowStart,
      ).length;
      return { count } as T;
    }
    return null;
  }

  async all() {
    return { results: [] };
  }

  async run() {
    const normalized = this.sql.toLowerCase();
    if (normalized.includes("delete from security_rate_limit_events")) {
      const [now] = this.values.map(String);
      for (let index = rateLimitEvents.length - 1; index >= 0; index -= 1) {
        if (rateLimitEvents[index]!.expiresAt < now) rateLimitEvents.splice(index, 1);
      }
    }
    if (normalized.includes("insert into security_rate_limit_events")) {
      const [, scope, keyHash, , occurredAt, expiresAt] = this.values.map(String);
      rateLimitEvents.push({ scope, keyHash, occurredAt, expiresAt });
    }
    if (normalized.includes("insert into privacy_requests")) {
      privacyRequestWrites += 1;
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1 {
  prepare(sql: string) {
    return new FakeStatement(sql);
  }
}

vi.mock("next/server", () => ({
  after: (callback: () => unknown) => callback(),
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: async () => new FakeD1(),
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("https://archestimator.com/api/compliance/privacy-requests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(text).length),
      "cf-connecting-ip": "203.0.113.7",
      ...headers,
    },
    body: text,
  });
}

describe("privacy request intake route", () => {
  beforeEach(() => {
    rateLimitEvents.length = 0;
    privacyRequestWrites = 0;
    vi.resetModules();
  });

  it("rejects oversized request bodies before D1 writes", async () => {
    const { POST } = await import("@/app/api/compliance/privacy-requests/route");
    const response = await POST(request("{}", { "content-length": String(16 * 1024 + 1) }));

    expect(response.status).toBe(413);
    expect(privacyRequestWrites).toBe(0);
    expect(rateLimitEvents).toHaveLength(0);
  });

  it("rejects nested metadata before D1 writes", async () => {
    const { POST } = await import("@/app/api/compliance/privacy-requests/route");
    const response = await POST(request({
      requestKind: "access",
      description: "Please send my data.",
      metadata: { nested: { value: "too much shape" } },
    }));

    expect(response.status).toBe(400);
    expect(privacyRequestWrites).toBe(0);
    expect(rateLimitEvents).toHaveLength(0);
  });

  it("durably rate limits repeated privacy requests before queue writes", async () => {
    const { POST } = await import("@/app/api/compliance/privacy-requests/route");
    const payload = {
      requestKind: "access",
      description: "Please send my data.",
      requesterEmail: "person@example.com",
    };

    const responses: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      const response = await POST(request(payload));
      responses.push(response.status);
    }

    expect(responses).toEqual([201, 201, 201, 429]);
    expect(privacyRequestWrites).toBe(3);
  });
});
