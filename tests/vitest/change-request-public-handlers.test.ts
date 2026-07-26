import { describe, expect, it, vi } from "vitest";

import type { ProjectChangeRequest, ProjectChangeRequestExposure } from "@/lib/change-requests/contracts";
import {
  amendPublicChangeRequestResponse,
  createPublicChangeRequestResponse,
  listPublicChangeRequestsResponse,
  withdrawPublicChangeRequestResponse,
  type PublicChangeRequestDependencies,
} from "@/lib/change-requests/public-handlers";

vi.mock("server-only", () => ({}));

const actor = {
  kind: "recipient" as const,
  recipientId: "recipient-1",
  displayName: "Avery Client",
  portalId: "portal-1",
  role: "requester" as const,
  status: "active" as const,
  verificationState: "verified" as const,
  organization: "Client Co",
  isRequiredApprover: false,
  overrides: {},
};

const database = {} as never;
const context = {
  database,
  mappedIssueId: null,
  portal: {
    id: "portal-1",
    workspace_id: "workspace-1",
    project_id: "project-1",
    current_issue_id: null,
  },
  policyPortal: {
    id: "portal-1",
    workspaceId: "workspace-1",
    projectId: "project-1",
    status: "live" as const,
    allowAnonymousView: false,
  },
} as never;

function changeRequest(overrides: Partial<ProjectChangeRequest> = {}): ProjectChangeRequest {
  return {
    id: "request-internal-1",
    workspaceId: "workspace-1",
    projectId: "project-1",
    originPortalId: "portal-1",
    requestNumber: 1,
    requestCode: "CR-0001",
    currentVersionId: "version-internal-1",
    currentVersion: {
      requestId: "request-internal-1",
      versionId: "version-internal-1",
      versionNumber: 1,
      contentHash: "a".repeat(64),
      title: "Move east wall",
      description: "Move the east wall by 300mm.",
      reason: null,
      requestedEffectiveDate: "2026-08-01",
      metadata: {},
      createdByActorType: "recipient",
      createdByActorId: "recipient-1",
      createdAt: "2026-07-26T00:00:00.000Z",
      supersedesVersionId: null,
      targets: [],
      artifacts: [],
    },
    status: "submitted",
    requestedByActorType: "recipient",
    requestedByActorId: "recipient-1",
    requestedByNameSnapshot: "Avery Client",
    requestedByEmailSnapshot: "avery@example.test",
    requestedByDomainRoleSnapshot: "client",
    requestedByPermissionRoleSnapshot: "requester",
    requestedByOrganizationSnapshot: "Client Co",
    requestedAt: "2026-07-26T00:00:00.000Z",
    acknowledgedByUserId: null,
    acknowledgedAt: null,
    assessmentOwnerUserId: null,
    resolvedByIssueId: null,
    resolvedAt: null,
    withdrawnAt: null,
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

function exposure(overrides: Partial<ProjectChangeRequestExposure> = {}): ProjectChangeRequestExposure {
  return {
    requestId: "request-internal-1",
    portalId: "portal-1",
    publicRequestId: "public-request-1",
    status: "visible",
    exposureKind: "automatic",
    policySnapshot: {},
    exposedByActorType: "recipient",
    exposedByActorId: "recipient-1",
    exposedAt: "2026-07-26T00:00:00.000Z",
    withdrawnAt: null,
    withdrawalReason: null,
    ...overrides,
  };
}

function allowedDecision() {
  return { allowed: true, reasonCode: "allowed" as const, hideResource: false, effectiveCapabilities: [] };
}

function dependencies(overrides: Partial<PublicChangeRequestDependencies> = {}) {
  const current = changeRequest();
  const visible = exposure();
  return {
    amendRequest: vi.fn(async () => ({ request: current, version: current.currentVersion, replayed: false })),
    createRequest: vi.fn(async () => ({ request: current, exposure: visible, replayed: false })),
    evaluatePolicy: vi.fn(() => allowedDecision()),
    listExposedRequests: vi.fn(async () => [{ exposure: visible, request: current }]),
    readExposedRequest: vi.fn(async () => ({ exposure: visible, request: current })),
    readRecipientIdentity: vi.fn(async () => ({ email_normalized: "avery@example.test", domain_role: "client" })),
    readRecipientSession: vi.fn(async () => actor),
    readRateLimit: vi.fn(async () => ({ allowed: true as const })),
    requiresPassword: vi.fn(async () => false),
    resolveBaseContext: vi.fn(async () => context),
    mutationRateLimit: vi.fn(async () => ({ allowed: true as const })),
    withdrawRequest: vi.fn(async () => ({ request: changeRequest({ status: "withdrawn" }), replayed: false })),
    ...overrides,
  } as unknown as PublicChangeRequestDependencies;
}

function mutationRequest(body: Record<string, unknown>, idempotency = "request-key") {
  return new Request("https://portal.example.test/api/share/token/requests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "ae_publication_csrf=csrf-token",
      "idempotency-key": idempotency,
      origin: "https://portal.example.test",
      "x-archestimator-csrf": "csrf-token",
    },
    body: JSON.stringify(body),
  });
}

describe("public change request handlers", () => {
  it("returns only policy-visible public DTOs without internal identifiers or hidden counts", async () => {
    const hidden = { exposure: exposure({ publicRequestId: "public-request-hidden" }), request: changeRequest({ id: "request-hidden" }) };
    const deps = dependencies({
      listExposedRequests: vi.fn(async () => [
        { exposure: exposure(), request: changeRequest() },
        hidden,
      ]) as never,
      evaluatePolicy: vi.fn((input) => input.target?.ownerRecipientId === "recipient-1" ? allowedDecision() : {
        allowed: false,
        reasonCode: "target_hidden" as const,
        hideResource: true,
        effectiveCapabilities: [],
      }) as never,
    });
    hidden.request.requestedByActorId = "recipient-hidden";

    const response = await listPublicChangeRequestsResponse(
      new Request("https://portal.example.test/api/share/token/requests"),
      "share-token",
      deps,
    );
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ requests: [{ publicRequestId: "public-request-1", requestCode: "CR-0001" }] });
    expect(JSON.stringify(payload)).not.toContain("request-internal-1");
    expect(payload).not.toHaveProperty("total");
  });

  it("creates deterministic idempotent identities and returns the public request projection", async () => {
    const deps = dependencies();
    const response = await createPublicChangeRequestResponse(
      mutationRequest({
        title: "Move east wall",
        description: "Move the east wall by 300mm.",
        requestedEffectiveDate: "2026-08-01",
      }),
      "share-token",
      deps,
    );
    const input = vi.mocked(deps.createRequest).mock.calls[0]?.[0];
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(input).toMatchObject({
      actor: { id: "recipient-1", type: "recipient" },
      originPortalId: "portal-1",
      sourceKind: "client_portal",
    });
    expect(input?.requestId).toMatch(/^request_[a-f0-9]{32}$/);
    expect(input?.publicRequestId).toMatch(/^public_request_[a-f0-9]{32}$/);
    expect(JSON.stringify(payload)).not.toContain("request-internal-1");
  });

  it("enforces content-hash CAS and exact owner policy before amendments", async () => {
    const deps = dependencies();
    const stale = await amendPublicChangeRequestResponse(
      mutationRequest({ title: "Moved wall", description: "Updated", contentHash: "stale" }),
      "share-token",
      "public-request-1",
      deps,
    );
    expect(stale.status).toBe(409);
    expect(deps.amendRequest).not.toHaveBeenCalled();

    const saved = await amendPublicChangeRequestResponse(
      mutationRequest({ title: "Moved wall", description: "Updated", contentHash: "a".repeat(64) }),
      "share-token",
      "public-request-1",
      deps,
    );
    expect(saved.status).toBe(200);
    expect(deps.amendRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedCurrentVersionId: "version-internal-1",
      requestId: "request-internal-1",
    }));
    expect(vi.mocked(deps.evaluatePolicy).mock.calls.some(([input]) =>
      input.action === "request:amend_own"
      && input.target?.kind === "change_request"
      && input.target.ownerRecipientId === "recipient-1"
    )).toBe(true);
  });

  it("withdraws the owned request while returning only its public identity", async () => {
    const deps = dependencies();
    const response = await withdrawPublicChangeRequestResponse(
      mutationRequest({ note: "No longer required" }),
      "share-token",
      "public-request-1",
      deps,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      replayed: false,
      request: { publicRequestId: "public-request-1", requestCode: "CR-0001", status: "withdrawn" },
    });
    expect(deps.withdrawRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: "request-internal-1" }));
  });

  it("fails closed before database reads without a verified recipient session", async () => {
    const deps = dependencies({ readRecipientSession: vi.fn(async () => null) as never });
    const response = await listPublicChangeRequestsResponse(
      new Request("https://portal.example.test/api/share/token/requests"),
      "share-token",
      deps,
    );

    expect(response.status).toBe(401);
    expect(deps.listExposedRequests).not.toHaveBeenCalled();
  });
});
