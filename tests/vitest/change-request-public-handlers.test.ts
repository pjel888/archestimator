import { describe, expect, it, vi } from "vitest";

import type { ProjectChangeRequest, ProjectChangeRequestExposure } from "@/lib/change-requests/contracts";
import {
  amendPublicChangeRequestResponse,
  createPublicChangeRequestResponse,
  listExposedRequests,
  listPublicChangeRequestsResponse,
  readAutomaticRequestExposurePolicy,
  readExposedRequest,
  withdrawPublicChangeRequestResponse,
  type PublicChangeRequestDependencies,
} from "@/lib/change-requests/public-handlers";
import { evaluateClientPortalPolicy } from "@/lib/client-portal/policy";

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
    policySnapshot: { capability: "request:view", allowedRecipientIds: ["recipient-1"] },
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
    readAutomaticExposurePolicy: vi.fn(async () => ({
      capability: "request:view" as const,
      allowedRecipientIds: ["recipient-1", "recipient-reviewer"],
    })),
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
      exposurePolicySnapshot: {
        capability: "request:view",
        allowedRecipientIds: ["recipient-1", "recipient-reviewer"],
      },
      originPortalId: "portal-1",
      sourceKind: "client_portal",
    });
    expect(input?.requestId).toMatch(/^request_[a-f0-9]{32}$/);
    expect(input?.publicRequestId).toMatch(/^public_request_[a-f0-9]{32}$/);
    expect(JSON.stringify(payload)).not.toContain("request-internal-1");
  });

  it("uses immutable exposure allowlists with the production evaluator", async () => {
    const reviewer = {
      ...actor,
      recipientId: "recipient-reviewer",
      role: "reviewer" as const,
      overrides: [],
    };
    const allowedExposure = exposure({
      policySnapshot: {
        capability: "request:view",
        allowedRecipientIds: ["recipient-1", reviewer.recipientId],
        allowedOrganizations: ["Client Co"],
      },
    });
    const samePortal = dependencies({
      evaluatePolicy: evaluateClientPortalPolicy,
      listExposedRequests: vi.fn(async () => [{ exposure: allowedExposure, request: changeRequest() }]) as never,
      readRecipientSession: vi.fn(async () => reviewer) as never,
    });

    const allowedResponse = await listPublicChangeRequestsResponse(
      new Request("https://portal.example.test/api/share/token/requests"),
      "share-token",
      samePortal,
    );
    expect(await allowedResponse.json()).toMatchObject({
      requests: [{ publicRequestId: "public-request-1" }],
    });

    const wrongOrganization = dependencies({
      evaluatePolicy: evaluateClientPortalPolicy,
      listExposedRequests: vi.fn(async () => [{ exposure: allowedExposure, request: changeRequest() }]) as never,
      readRecipientSession: vi.fn(async () => ({ ...reviewer, organization: "Other Co" })) as never,
    });
    const organizationDeniedResponse = await listPublicChangeRequestsResponse(
      new Request("https://portal.example.test/api/share/token/requests"),
      "share-token",
      wrongOrganization,
    );
    expect(await organizationDeniedResponse.json()).toEqual({ requests: [] });

    const crossToken = dependencies({
      evaluatePolicy: evaluateClientPortalPolicy,
      listExposedRequests: vi.fn(async () => [{ exposure: allowedExposure, request: changeRequest() }]) as never,
      readRecipientSession: vi.fn(async () => ({ ...reviewer, portalId: "portal-other" })) as never,
    });
    const deniedResponse = await listPublicChangeRequestsResponse(
      new Request("https://portal.example.test/api/share/other-token/requests"),
      "other-token",
      crossToken,
    );
    expect(await deniedResponse.json()).toEqual({ requests: [] });
  });

  it("keeps automatic exposure requester-only when portal visibility policy is absent", async () => {
    const all = vi.fn(async () => ({
      results: [
        { id: "recipient-1", role_template: "requester" },
        { id: "recipient-reviewer", role_template: "reviewer" },
        { id: "recipient-approver", role_template: "approver" },
        { id: "recipient-viewer", role_template: "viewer" },
      ],
    }));
    const first = vi.fn(async () => ({ access_policy_json: "{}" }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => sql.includes("FROM client_portals") ? { first } : { all }),
    }));

    await expect(readAutomaticRequestExposurePolicy({ prepare } as never, "portal-1", "recipient-1")).resolves.toEqual({
      capability: "request:view",
      allowedRecipientIds: ["recipient-1"],
    });
    expect(prepare.mock.calls.some(([sql]) => String(sql).includes("access_policy_json"))).toBe(true);
    expect(prepare.mock.calls.some(([sql]) => String(sql).includes("role_template"))).toBe(true);
  });

  it("keeps automatic exposure requester-only when portal visibility fields are malformed", async () => {
    const all = vi.fn(async () => ({
      results: [
        { id: "recipient-reviewer", role_template: "reviewer" },
        { id: "recipient-viewer", role_template: "viewer" },
      ],
    }));
    const first = vi.fn(async () => ({
      access_policy_json: JSON.stringify({
        requestVisibility: {
          allowedRecipientIds: "recipient-viewer",
          allowedRoleTemplates: { role: "reviewer" },
        },
      }),
    }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => sql.includes("FROM client_portals") ? { first } : { all }),
    }));

    await expect(readAutomaticRequestExposurePolicy({ prepare } as never, "portal-1", "recipient-1")).resolves.toEqual({
      capability: "request:view",
      allowedRecipientIds: ["recipient-1"],
    });
  });

  it.each([
    { allowedRoleTemplates: ["reviewer", 7] },
    { allowedRecipientIds: ["recipient-viewer", null] },
  ])("rejects mixed valid and invalid visibility arrays: %j", async (requestVisibility) => {
    const all = vi.fn(async () => ({
      results: [
        { id: "recipient-reviewer", role_template: "reviewer" },
        { id: "recipient-viewer", role_template: "viewer" },
      ],
    }));
    const first = vi.fn(async () => ({ access_policy_json: JSON.stringify({ requestVisibility }) }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => sql.includes("FROM client_portals") ? { first } : { all }),
    }));

    await expect(readAutomaticRequestExposurePolicy({ prepare } as never, "portal-1", "recipient-1")).resolves.toEqual({
      capability: "request:view",
      allowedRecipientIds: ["recipient-1"],
    });
  });

  it("uses explicit portal request visibility to narrow or broaden automatic exposure", async () => {
    const all = vi.fn(async () => ({
      results: [
        { id: "recipient-reviewer", role_template: "reviewer" },
        { id: "recipient-viewer", role_template: "viewer" },
        { id: "recipient-commenter", role_template: "commenter" },
      ],
    }));
    const first = vi.fn(async () => ({
      access_policy_json: JSON.stringify({
        requestVisibility: {
          allowedRecipientIds: ["recipient-commenter"],
          allowedRoleTemplates: ["viewer"],
        },
      }),
    }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => sql.includes("FROM client_portals") ? { first } : { all }),
    }));

    await expect(readAutomaticRequestExposurePolicy({ prepare } as never, "portal-1", "recipient-1")).resolves.toEqual({
      capability: "request:view",
      allowedRecipientIds: ["recipient-1", "recipient-commenter", "recipient-viewer"],
    });
  });

  it("selects and strictly parses immutable policy snapshots before loading requests", async () => {
    const malformedRows = [{
      policy_snapshot_json: JSON.stringify({ capability: "request:view" }),
      public_request_id: "public-request-1",
      request_id: "request-internal-1",
      status: "visible",
    }];
    const all = vi.fn(async () => ({ results: malformedRows }));
    const first = vi.fn(async () => malformedRows[0]);
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => sql.includes("public_request_id = ?") ? { first } : { all }),
    }));
    const malformedDatabase = { prepare } as never;

    await expect(listExposedRequests(malformedDatabase, context)).resolves.toEqual([]);
    await expect(readExposedRequest(malformedDatabase, context, "public-request-1")).resolves.toBeNull();
    expect(prepare.mock.calls.every(([sql]) => String(sql).includes("policy_snapshot_json"))).toBe(true);
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
