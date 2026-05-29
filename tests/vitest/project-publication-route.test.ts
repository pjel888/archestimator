import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveProjectPublicationAccessByToken: vi.fn(),
  resolveProjectPublicationSnapshotByToken: vi.fn(),
  recordProjectPublicationEvent: vi.fn(),
  verifyProjectPublicationPasswordByToken: vi.fn(),
}));

vi.mock("@/lib/publication/public-repository", () => mocks);

import { GET } from "@/app/api/share/[token]/route";
import { POST } from "@/app/api/share/[token]/events/route";
import { POST as POST_PASSWORD } from "@/app/api/share/[token]/password/route";
import { createPublicationAccessCookie } from "@/lib/publication/security";

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
  estimates: [],
};

function params(token = "client-token") {
  return { params: Promise.resolve({ token }) };
}

describe("shared link publication route handlers (Shared Link V2 audit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: "2026-05-27T00:00:00.000Z",
    });
    mocks.resolveProjectPublicationSnapshotByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: "2026-05-27T00:00:00.000Z",
      snapshot,
    });
    mocks.recordProjectPublicationEvent.mockResolvedValue(undefined);
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
      publicationId: "publication-1",
      passwordRequired: false,
      snapshot,
    });
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "open",
      request: expect.any(Request),
      metadata: {},
    });
  });

  it("returns 404 for an unknown, expired, or revoked token", async () => {
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce(null);

    const response = await GET(new Request("https://archestimator.test/api/share/missing-token"), params("missing-token"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Publication not found." });
    expect(mocks.resolveProjectPublicationSnapshotByToken).not.toHaveBeenCalled();
  });

  it("does not expose password-protected snapshots until the access cookie is present", async () => {
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: true,
      snapshotVersion: "2026-05-27T00:00:00.000Z",
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
      snapshotVersion: "2026-05-27T00:00:00.000Z",
    });
    const unlockedResponse = await GET(
      new Request("https://archestimator.test/api/share/client-token", {
        headers: { cookie: signedCookie.split(";")[0] },
      }),
      params(),
    );
    expect(unlockedResponse.status).toBe(200);
    expect((await unlockedResponse.json()).snapshot).toEqual(snapshot);
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
      snapshotVersion: "2026-05-27T00:00:00.000Z",
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
  });
});
