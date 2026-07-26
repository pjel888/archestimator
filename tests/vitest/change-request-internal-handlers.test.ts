import { describe, expect, it, vi } from "vitest";

import {
  actOnInternalChangeRequestResponse,
  createInternalChangeRequestResponse,
  listInternalChangeRequestsResponse,
  type InternalChangeRequestDependencies,
} from "@/lib/change-requests/internal-handlers";

vi.mock("server-only", () => ({}));

const access = {
  ok: true as const,
  database: {} as never,
  projectId: "project-1",
  workspaceId: "workspace-1",
  actor: { id: "user-1", type: "internal_user" as const },
};

function dependencies(overrides: Partial<InternalChangeRequestDependencies> = {}) {
  return {
    acknowledgeRequest: vi.fn(async () => ({ request: { status: "acknowledged" }, replayed: false })),
    assignAssessment: vi.fn(async () => ({ request: { status: "under_assessment" }, replayed: false })),
    createRequest: vi.fn(async () => ({ request: { id: "request-1" }, exposure: null, replayed: false })),
    listRequests: vi.fn(async () => [{ id: "request-1", requestCode: "CR-0001" }]),
    readRequest: vi.fn(async () => null),
    rejectRequest: vi.fn(async () => ({ request: { status: "rejected" }, replayed: false })),
    resolveAccess: vi.fn(async () => access),
    updateAssessment: vi.fn(async () => ({ request: { status: "under_assessment" }, replayed: false })),
    withdrawRequest: vi.fn(async () => ({ request: { status: "withdrawn" }, replayed: false })),
    ...overrides,
  } as unknown as InternalChangeRequestDependencies;
}

function request(body: Record<string, unknown>, idempotency = "internal-key") {
  return new Request("https://app.example.test/api/projects/project-1/requests", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotency },
    body: JSON.stringify(body),
  });
}

describe("internal change request handlers", () => {
  it("uses read access for project-scoped request listing", async () => {
    const deps = dependencies();
    const response = await listInternalChangeRequestsResponse(
      new Request("https://app.example.test/api/projects/project-1/requests?limit=25"),
      "project-1",
      deps,
    );

    expect(response.status).toBe(200);
    expect(deps.resolveAccess).toHaveBeenCalledWith("project-1", "read");
    expect(deps.listRequests).toHaveBeenCalledWith(expect.objectContaining({
      limit: 25,
      projectId: "project-1",
      workspaceId: "workspace-1",
    }));
  });

  it("creates an immutable internal request with deterministic idempotent identities", async () => {
    const deps = dependencies();
    const response = await createInternalChangeRequestResponse(
      request({
        sourceKind: "email",
        title: "Relocate door",
        description: "Client email requested a door relocation.",
      }),
      "project-1",
      deps,
    );
    const input = vi.mocked(deps.createRequest).mock.calls[0]?.[0];

    expect(response.status).toBe(201);
    expect(deps.resolveAccess).toHaveBeenCalledWith("project-1", "write");
    expect(input).toMatchObject({
      actor: { id: "user-1", type: "internal_user" },
      sourceKind: "email",
      projectId: "project-1",
      workspaceId: "workspace-1",
    });
    expect(input?.requestId).toMatch(/^request_[a-f0-9]{32}$/);
    expect(input?.versionId).toMatch(/^request_version_[a-f0-9]{32}$/);
  });

  it("dispatches assessment actions without exposing a baseline mutation path", async () => {
    const deps = dependencies();
    const response = await actOnInternalChangeRequestResponse(
      request({ action: "update_assessment", assessment: { costImpact: "pending", scheduleImpactDays: 4 } }),
      "project-1",
      "request-1",
      deps,
    );

    expect(response.status).toBe(200);
    expect(deps.updateAssessment).toHaveBeenCalledWith(expect.objectContaining({
      assessment: { costImpact: "pending", scheduleImpactDays: 4 },
      requestId: "request-1",
    }));
    expect(deps.createRequest).not.toHaveBeenCalled();
  });

  it("returns the existing authorization response before reading request data", async () => {
    const denied = Response.json({ error: "Denied" }, { status: 403 });
    const deps = dependencies({ resolveAccess: vi.fn(async () => ({ ok: false as const, response: denied })) as never });
    const response = await listInternalChangeRequestsResponse(
      new Request("https://app.example.test/api/projects/project-1/requests"),
      "project-1",
      deps,
    );

    expect(response.status).toBe(403);
    expect(deps.listRequests).not.toHaveBeenCalled();
  });
});
