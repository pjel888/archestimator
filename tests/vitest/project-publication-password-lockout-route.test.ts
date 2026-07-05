import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;

const durableMocks = vi.hoisted(() => {
  const lockoutWindowMs = 15 * 60 * 1000;
  const failureRows: Array<{ at: number; ip: string; token: string }> = [];

  function clientIp(request: Request) {
    return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  }

  function prune(now = Date.now()) {
    for (let i = failureRows.length - 1; i >= 0; i -= 1) {
      if (now - failureRows[i].at >= lockoutWindowMs) failureRows.splice(i, 1);
    }
  }

  function countFailures(token: string, request: Request, now = Date.now()) {
    const ip = clientIp(request);
    prune(now);
    return failureRows.filter((row) => row.token === token && row.ip === ip).length;
  }

  function removeFailures(token: string, request: Request) {
    const ip = clientIp(request);
    for (let i = failureRows.length - 1; i >= 0; i -= 1) {
      const row = failureRows[i];
      if (row.token === token && row.ip === ip) failureRows.splice(i, 1);
    }
  }

  return {
    failureRows,
    reset() {
      failureRows.length = 0;
    },
    checkProjectPublicationPasswordRateLimit: vi.fn(async ({ token, request }: { request: Request; token: string }) => {
      if (countFailures(token, request) >= 5) {
        return {
          allowed: false,
          message: "Too many attempts. Please wait 900 seconds.",
          retryAfter: 900,
        };
      }
      return { allowed: true };
    }),
    clearProjectPublicationPasswordFailures: vi.fn(async ({ token, request }: { request: Request; token: string }) => {
      removeFailures(token, request);
    }),
    recordProjectPublicationAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
    recordProjectPublicationEvent: vi.fn().mockResolvedValue(undefined),
    recordProjectPublicationPasswordFailure: vi.fn(async ({ token, request }: { request: Request; token: string }) => {
      prune();
      failureRows.push({ at: Date.now(), ip: clientIp(request), token });
      return { delayMs: 0 };
    }),
    verifyProjectPublicationPasswordByToken: vi.fn(async (_token: string, password: string) => {
      if (password !== "client-secret") return false;
      return {
        credentialVersion: "credential-version-1",
        publicationId: "publication-1",
      };
    }),
  };
});

const nextServerMocks = vi.hoisted(() => {
  const afterCallbacks: Array<() => unknown> = [];
  return {
    afterCallbacks,
    after: vi.fn((callback: () => unknown) => {
      afterCallbacks.push(callback);
    }),
  };
});

function params(token = "client-token") {
  return { params: Promise.resolve({ token }) };
}

function passwordRequest(password: string, ip = "203.0.113.42") {
  return new Request("https://archestimator.test/api/share/client-token/password", {
    method: "POST",
    headers: {
      origin: "https://archestimator.test",
      cookie: "ae_publication_csrf=csrf-token",
      "content-type": "application/json",
      "x-archestimator-csrf": "csrf-token",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify({ password }),
  });
}

async function importPasswordRouteAfterModuleReset() {
  vi.resetModules();
  vi.doMock("@/lib/publication/public-repository", () => durableMocks);
  vi.doMock("next/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/server")>();
    return {
      ...actual,
      after: nextServerMocks.after,
    };
  });
  return import("@/app/api/share/[token]/password/route");
}

async function postPassword(POST: typeof import("@/app/api/share/[token]/password/route").POST, password: string) {
  const responsePromise = POST(passwordRequest(password), params());
  await vi.advanceTimersByTimeAsync(30_000);
  return responsePromise;
}

describe("publication password route durable lockout", () => {
  beforeEach(() => {
    durableMocks.reset();
    vi.clearAllMocks();
    nextServerMocks.afterCallbacks.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.doUnmock("@/lib/publication/public-repository");
    vi.doUnmock("next/server");
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does not import or export process-local password lockout state", () => {
    const routeSource = readFileSync("src/app/api/share/[token]/password/route.ts", "utf8");
    const securitySource = readFileSync("src/lib/publication/security.ts", "utf8");

    expect(routeSource).not.toContain("isPasswordLocked");
    expect(routeSource).not.toContain("recordPasswordFailure");
    expect(routeSource).not.toContain("recordPasswordSuccess");
    expect(securitySource).not.toContain("passwordAttemptStore");
    expect(securitySource).not.toContain("__resetPasswordAttemptStoreForTest");
  });

  it("returns 429 after five wrong passwords for the same token and IP", async () => {
    const { POST } = await importPasswordRouteAfterModuleReset();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await postPassword(POST, "wrong");
      expect(response.status).toBe(401);
    }

    durableMocks.verifyProjectPublicationPasswordByToken.mockClear();
    const lockedResponse = await postPassword(POST, "wrong");

    expect(lockedResponse.status).toBe(429);
    expect(lockedResponse.headers.get("retry-after")).toBe(String(LOCKOUT_WINDOW_SECONDS));
    expect(await lockedResponse.json()).toEqual({ error: "Too many attempts. Please wait 900 seconds." });
    expect(durableMocks.verifyProjectPublicationPasswordByToken).not.toHaveBeenCalled();
  });

  it("keeps lockout after the route module is reset", async () => {
    let route = await importPasswordRouteAfterModuleReset();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await postPassword(route.POST, "wrong");
    }

    route = await importPasswordRouteAfterModuleReset();
    durableMocks.verifyProjectPublicationPasswordByToken.mockClear();
    const lockedResponse = await postPassword(route.POST, "client-secret");

    expect(lockedResponse.status).toBe(429);
    expect(lockedResponse.headers.get("set-cookie")).toBeNull();
    expect(durableMocks.verifyProjectPublicationPasswordByToken).not.toHaveBeenCalled();
  });

  it("allows the correct password after durable lockout rows expire", async () => {
    const { POST } = await importPasswordRouteAfterModuleReset();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await postPassword(POST, "wrong");
    }

    vi.setSystemTime(Date.now() + LOCKOUT_WINDOW_MS + 1);
    durableMocks.verifyProjectPublicationPasswordByToken.mockClear();
    const successResponse = await postPassword(POST, "client-secret");

    expect(successResponse.status).toBe(204);
    expect(successResponse.headers.get("set-cookie")).toContain("ae_publication_access_");
    expect(durableMocks.verifyProjectPublicationPasswordByToken).toHaveBeenCalledWith("client-token", "client-secret");
    expect(durableMocks.clearProjectPublicationPasswordFailures).toHaveBeenCalledWith({
      token: "client-token",
      request: expect.any(Request),
    });
  });
});
