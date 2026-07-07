import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveProjectPublicationAccessByToken: vi.fn(),
  resolveProjectPublicationSnapshotByToken: vi.fn(),
  recordProjectPublicationEvent: vi.fn(),
  recordProjectPublicationAnalyticsEvent: vi.fn(),
  verifyProjectPublicationPasswordByToken: vi.fn(),
  checkProjectPublicationEventRateLimit: vi.fn(),
  checkProjectPublicationPasswordRateLimit: vi.fn(),
  checkProjectPublicationSnapshotRateLimit: vi.fn(),
  clearProjectPublicationPasswordFailures: vi.fn(),
  recordProjectPublicationPasswordFailure: vi.fn(),
}));

vi.mock("@/lib/publication/public-repository", () => mocks);

const nextServerMocks = vi.hoisted(() => {
  const afterCallbacks: Array<() => unknown> = [];
  return {
    afterCallbacks,
    after: vi.fn((callback: () => unknown) => {
      afterCallbacks.push(callback);
    }),
  };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: nextServerMocks.after,
  };
});

import { GET } from "@/app/api/share/[token]/route";
import { POST } from "@/app/api/share/[token]/events/route";
import { POST as POST_PASSWORD } from "@/app/api/share/[token]/password/route";
import { createPublicationAccessCookie } from "@/lib/publication/security";
import { sharedLinkUnavailableErrorBody } from "@/lib/publication/share-copy";

const snapshot = {
  schemaVersion: 1,
  generatedAt: "2026-05-27T00:00:00.000Z",
  project: {
    id: "project-1",
    name: "Valencia Residence",
    projectCode: "VR-001",
    clientName: "Client Family",
    location: "Quezon City",
    currencyCode: "PHP",
  },
  estimateCount: 1,
  rowCount: 1,
  totalCost: 2300,
  estimates: [
    {
      id: "estimate-1",
      name: "Main Estimate",
      sheetCode: "ES-001",
      updatedAt: "2026-05-26T00:00:00.000Z",
      rowCount: 1,
      totalCost: 2300,
      rows: [
        {
          id: "row-1",
          description: "Concrete works",
          designation: "CW-01",
          discipline: "Structural",
          material: "Concrete",
          quantity: 2,
          unit: "cu.m",
          unitCost: 1000,
          miscCost: 100,
          contingencyPercentage: 10,
          rowTotal: 2300,
          imageUrl: null,
          nodeId: null,
        },
      ],
    },
  ],
};

const publicSnapshot = {
  ...snapshot,
  estimates: [
    {
      ...snapshot.estimates[0],
      rows: [
        {
          id: "row-1",
          description: "Concrete works",
          designation: "CW-01",
          discipline: "Structural",
          material: "Concrete",
          quantity: 2,
          unit: "cu.m",
          rowTotal: 2300,
          imageUrl: null,
          nodeId: null,
        },
      ],
    },
  ],
};

function params(token = "client-token") {
  return { params: Promise.resolve({ token }) };
}

describe("shared link publication route handlers (Shared Link V2 audit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextServerMocks.afterCallbacks.length = 0;
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: 7,
      credentialVersion: "open",
    });
    mocks.resolveProjectPublicationSnapshotByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: 7,
      credentialVersion: "open",
      snapshot: publicSnapshot,
    });
    mocks.recordProjectPublicationEvent.mockResolvedValue(undefined);
    mocks.recordProjectPublicationAnalyticsEvent.mockResolvedValue({ recorded: true });
    mocks.checkProjectPublicationEventRateLimit.mockResolvedValue({ allowed: true });
    mocks.checkProjectPublicationPasswordRateLimit.mockResolvedValue({ allowed: true });
    mocks.checkProjectPublicationSnapshotRateLimit.mockResolvedValue({ allowed: true });
    mocks.clearProjectPublicationPasswordFailures.mockResolvedValue(undefined);
    mocks.recordProjectPublicationPasswordFailure.mockResolvedValue({ delayMs: 0 });
  });

  it("serves a token-scoped snapshot without current-user workspace auth", async () => {
    const response = await GET(new Request("https://archestimator.test/api/share/client-token"), params());

    expect(mocks.resolveProjectPublicationAccessByToken).toHaveBeenCalledWith("client-token");
    expect(mocks.resolveProjectPublicationSnapshotByToken).toHaveBeenCalledWith("client-token");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(await response.json()).toEqual({
      publicationId: "project-1",
      passwordRequired: false,
      snapshot: publicSnapshot,
    });
    expect(nextServerMocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();

    await nextServerMocks.afterCallbacks[0]?.();

    expect(mocks.checkProjectPublicationEventRateLimit).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "open",
      request: expect.any(Request),
      metadata: {},
    });
  });

  it("does not block or fail snapshot JSON when deferred open telemetry rejects", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordProjectPublicationEvent.mockRejectedValueOnce(new Error("event insert timed out"));

    const response = await GET(new Request("https://archestimator.test/api/share/client-token"), params());

    expect(response.status).toBe(200);
    expect((await response.json()).snapshot).toEqual(publicSnapshot);
    expect(nextServerMocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();

    await expect(Promise.resolve(nextServerMocks.afterCallbacks[0]?.())).resolves.toBeUndefined();
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[publication] Failed to record public snapshot open event",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("does not block snapshot JSON when deferred open telemetry is event-rate-limited", async () => {
    mocks.checkProjectPublicationEventRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });

    const response = await GET(new Request("https://archestimator.test/api/share/client-token"), params());

    expect(response.status).toBe(200);
    expect((await response.json()).snapshot).toEqual(publicSnapshot);
    expect(nextServerMocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();

    await nextServerMocks.afterCallbacks[0]?.();

    expect(mocks.checkProjectPublicationEventRateLimit).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("rate limits snapshot reads before resolving publication state", async () => {
    mocks.checkProjectPublicationSnapshotRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });

    const response = await GET(new Request("https://archestimator.test/api/share/client-token"), params());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: "Too many attempts. Please wait 60 seconds." });
    expect(mocks.resolveProjectPublicationAccessByToken).not.toHaveBeenCalled();
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown, expired, or revoked token", async () => {
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce(null);

    const response = await GET(new Request("https://archestimator.test/api/share/missing-token"), params("missing-token"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(sharedLinkUnavailableErrorBody());
    expect(mocks.resolveProjectPublicationSnapshotByToken).not.toHaveBeenCalled();
  });

  it("returns a safe error envelope when the snapshot route throws unexpectedly", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.resolveProjectPublicationAccessByToken.mockRejectedValueOnce(
      new Error("database password leaked token=provider-secret"),
    );

    const response = await GET(new Request("https://archestimator.test/api/share/client-token"), params());

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({
      ok: false,
      trace_id: expect.stringMatching(/^err_/),
      error: {
        kind: "internal",
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again in a moment.",
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/provider-secret|password leaked/i);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("does not expose password-protected snapshots until the access cookie is present", async () => {
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: true,
      snapshotVersion: 7,
      credentialVersion: "cred-test",
    });

    const lockedResponse = await GET(new Request("https://archestimator.test/api/share/client-token"), params());
    expect(lockedResponse.status).toBe(423);
    expect(await lockedResponse.json()).toEqual({
      error: "Publication password required.",
      passwordRequired: true,
    });
    expect(mocks.resolveProjectPublicationSnapshotByToken).not.toHaveBeenCalled();

    const forgedResponse = await GET(
      new Request("https://archestimator.test/api/share/client-token", {
        headers: { cookie: "ae_publication_access_rPa28cSSoBjYbXvbAYUh=unlocked" },
      }),
      params(),
    );
    expect(forgedResponse.status).toBe(423);

    const signedCookie = createPublicationAccessCookie({
      token: "client-token",
      publicationId: "publication-1",
      credentialVersion: "cred-test",
    });
    const unlockedResponse = await GET(
      new Request("https://archestimator.test/api/share/client-token", {
        headers: { cookie: signedCookie.split(";")[0] },
      }),
      params(),
    );
    expect(unlockedResponse.status).toBe(200);
    expect((await unlockedResponse.json()).snapshot).toEqual(publicSnapshot);
  });

  it("records public events only after same-origin CSRF verification", async () => {
    const response = await POST(
      new Request("https://archestimator.test/api/share/client-token/events", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ eventType: "open" }),
      }),
      params(),
    );

    expect(response.status).toBe(204);
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "open",
      request: expect.any(Request),
      metadata: {},
    });
  });

  it("records only allowlisted bounded public event metadata", async () => {
    const response = await POST(
      new Request("https://archestimator.test/api/share/client-token/events", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({
          eventType: "download_attempt_blocked",
          metadata: {
            reason: "password_required",
            source: "share_page",
            success: false,
          },
        }),
      }),
      params(),
    );

    expect(response.status).toBe(204);
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "download_attempt_blocked",
      request: expect.any(Request),
      metadata: {
        reason: "password_required",
        source: "share_page",
        success: false,
      },
    });
  });

  it("rejects arbitrary nested public event metadata before rate limiting", async () => {
    const response = await POST(
      new Request("https://archestimator.test/api/share/client-token/events", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({
          eventType: "open",
          metadata: {
            source: "share_page",
            nested: { debug: "raw client object" },
          },
        }),
      }),
      params(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Publication event metadata is invalid." });
    expect(mocks.checkProjectPublicationEventRateLimit).not.toHaveBeenCalled();
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized public event metadata before rate limiting", async () => {
    const response = await POST(
      new Request("https://archestimator.test/api/share/client-token/events", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({
          eventType: "open",
          metadata: { source: "x".repeat(161) },
        }),
      }),
      params(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Publication event metadata is invalid." });
    expect(mocks.checkProjectPublicationEventRateLimit).not.toHaveBeenCalled();
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("rate limits public event writes before recording the event", async () => {
    mocks.checkProjectPublicationEventRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });

    const response = await POST(
      new Request("https://archestimator.test/api/share/client-token/events", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ eventType: "open" }),
      }),
      params(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: "Too many attempts. Please wait 60 seconds." });
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("blocks cross-origin public event writes", async () => {
    const response = await POST(
      new Request("https://archestimator.test/api/share/client-token/events", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          cookie: "ae_publication_csrf=csrf-token",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ eventType: "open" }),
      }),
      params(),
    );

    expect(response.status).toBe(403);
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("verifies publication passwords with same-origin CSRF before setting the access cookie", async () => {
    mocks.verifyProjectPublicationPasswordByToken.mockResolvedValueOnce({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: true,
      snapshotVersion: 7,
      credentialVersion: "cred-test",
    });

    const response = await POST_PASSWORD(
      new Request("https://archestimator.test/api/share/client-token/password", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "content-type": "application/json",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ password: "client-secret" }),
      }),
      params(),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("ae_publication_access_rPa28cSSoBjYbXvbAYUh=");
    expect(response.headers.get("set-cookie")).not.toContain("=unlocked");
    expect(response.headers.get("set-cookie")).toContain("Path=/;");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(mocks.verifyProjectPublicationPasswordByToken).toHaveBeenCalledWith("client-token", "client-secret");
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "password_attempt",
      request: expect.any(Request),
      metadata: { success: true },
    });
    expect(mocks.clearProjectPublicationPasswordFailures).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
    expect(nextServerMocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.recordProjectPublicationAnalyticsEvent).not.toHaveBeenCalled();

    await Promise.all(nextServerMocks.afterCallbacks.map((callback) => callback()));

    expect(mocks.recordProjectPublicationAnalyticsEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "password_attempt",
      accessStage: "password_unlocked",
      passwordSuccess: true,
      request: expect.any(Request),
    });
  });

  it("does not set a password access cookie when durable failure clearing fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.verifyProjectPublicationPasswordByToken.mockResolvedValueOnce({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: true,
      snapshotVersion: 7,
      credentialVersion: "cred-test",
    });
    mocks.clearProjectPublicationPasswordFailures.mockRejectedValueOnce(new Error("delete failed"));

    const response = await POST_PASSWORD(
      new Request("https://archestimator.test/api/share/client-token/password", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "content-type": "application/json",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ password: "client-secret" }),
      }),
      params(),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ error: "Unable to unlock publication." });
    expect(mocks.clearProjectPublicationPasswordFailures).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
    expect(nextServerMocks.after).not.toHaveBeenCalled();
    expect(mocks.recordProjectPublicationAnalyticsEvent).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[share] failed to clear password failure lockout state after successful unlock",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("rate limits publication password attempts before password verification", async () => {
    mocks.checkProjectPublicationPasswordRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 900 seconds.",
      retryAfter: 900,
    });

    const response = await POST_PASSWORD(
      new Request("https://archestimator.test/api/share/client-token/password", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "content-type": "application/json",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ password: "wrong" }),
      }),
      params(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(await response.json()).toEqual({ error: "Too many attempts. Please wait 900 seconds." });
    expect(mocks.verifyProjectPublicationPasswordByToken).not.toHaveBeenCalled();
  });

  it("normalizes password route tokens before rate limiting and lockout bookkeeping", async () => {
    mocks.verifyProjectPublicationPasswordByToken.mockResolvedValueOnce(false);

    const response = await POST_PASSWORD(
      new Request("https://archestimator.test/api/share/%20client-token%20/password", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "content-type": "application/json",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ password: "wrong" }),
      }),
      params(" client-token "),
    );

    expect(response.status).toBe(401);
    expect(mocks.checkProjectPublicationPasswordRateLimit).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
    expect(mocks.verifyProjectPublicationPasswordByToken).toHaveBeenCalledWith("client-token", "wrong");
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "password_attempt",
      request: expect.any(Request),
      metadata: { success: false },
    });
    expect(mocks.recordProjectPublicationPasswordFailure).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
  });

  it("rejects invalid publication passwords without setting an access cookie", async () => {
    mocks.verifyProjectPublicationPasswordByToken.mockResolvedValueOnce(false);

    const response = await POST_PASSWORD(
      new Request("https://archestimator.test/api/share/client-token/password", {
        method: "POST",
        headers: {
          origin: "https://archestimator.test",
          cookie: "ae_publication_csrf=csrf-token",
          "content-type": "application/json",
          "x-archestimator-csrf": "csrf-token",
        },
        body: JSON.stringify({ password: "wrong" }),
      }),
      params(),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "password_attempt",
      request: expect.any(Request),
      metadata: { success: false },
    });
    expect(mocks.recordProjectPublicationPasswordFailure).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
  });
});
