import { beforeEach, describe, expect, it, vi } from "vitest";

type RateLimitEvent = {
  id: string;
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
      if (normalized.includes("where id in")) {
        const ids = new Set(this.values.map(String));
        for (let index = rateLimitEvents.length - 1; index >= 0; index -= 1) {
          if (ids.has(rateLimitEvents[index]!.id)) rateLimitEvents.splice(index, 1);
        }
      } else {
        const [now] = this.values.map(String);
        for (let index = rateLimitEvents.length - 1; index >= 0; index -= 1) {
          if (rateLimitEvents[index]!.expiresAt < now) rateLimitEvents.splice(index, 1);
        }
      }
    }
    if (normalized.includes("insert into security_rate_limit_events")) {
      const [id, scope, keyHash, , occurredAt, expiresAt, countScope, countKeyHash, windowStart, activeAt, maxAttempts] = this.values.map(String);
      const count = rateLimitEvents.filter(
        (event) =>
          event.scope === countScope &&
          event.keyHash === countKeyHash &&
          event.occurredAt >= windowStart &&
          event.expiresAt > activeAt,
      ).length;
      if (count >= Number(maxAttempts)) return { success: true, meta: { changes: 0 } };
      rateLimitEvents.push({ id, scope, keyHash, occurredAt, expiresAt });
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

function streamRequest(chunks: string[]) {
  let cancelled = false;
  const encoder = new TextEncoder();
  const pendingChunks = chunks.map((chunk) => encoder.encode(chunk));
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = pendingChunks.shift();
      if (next) {
        controller.enqueue(next);
        return;
      }
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  const init = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.7",
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" };

  return {
    get cancelled() {
      return cancelled;
    },
    request: new Request("https://archestimator.com/api/compliance/privacy-requests", init),
  };
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

  it("stream-enforces oversized request bodies without Content-Length", async () => {
    const { POST } = await import("@/app/api/compliance/privacy-requests/route");
    const streamed = streamRequest([
      "{\"requestKind\":\"access\",\"description\":\"",
      "x".repeat(16 * 1024),
      "\",\"requesterEmail\":\"person@example.com\"}",
    ]);

    const response = await POST(streamed.request);

    expect(response.status).toBe(413);
    expect(streamed.cancelled).toBe(true);
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

  it("does not consume IP quota when the email quota is already exhausted", async () => {
    const { POST } = await import("@/app/api/compliance/privacy-requests/route");
    const payload = {
      requestKind: "access",
      description: "Please send my data.",
      requesterEmail: "person@example.com",
    };

    for (let index = 0; index < 3; index += 1) {
      expect((await POST(request(payload, { "cf-connecting-ip": "203.0.113.7" }))).status).toBe(201);
    }
    const ipEventsBeforeBlockedEmail = rateLimitEvents.filter((event) => event.scope === "privacy_request_ip").length;

    const blocked = await POST(request(payload, { "cf-connecting-ip": "203.0.113.99" }));

    expect(blocked.status).toBe(429);
    expect(rateLimitEvents.filter((event) => event.scope === "privacy_request_ip")).toHaveLength(ipEventsBeforeBlockedEmail);
    expect(privacyRequestWrites).toBe(3);
  });

  it("caps parallel IP-only submissions with conditional D1 reservations", async () => {
    const { POST } = await import("@/app/api/compliance/privacy-requests/route");
    const payload = {
      requestKind: "access",
      description: "Please send my data.",
    };

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => POST(request(payload, { "cf-connecting-ip": "203.0.113.88" }))),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 201, 201, 201, 201, 429]);
    expect(privacyRequestWrites).toBe(5);
    expect(rateLimitEvents.filter((event) => event.scope === "privacy_request_ip")).toHaveLength(5);
  });
});
