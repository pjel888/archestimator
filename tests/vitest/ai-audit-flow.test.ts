import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

import {
  buildAiAskAuditEvent,
  buildAiPackageActionRun,
  hashAiAuditValue,
  recordAiAskAuditEvent,
  recordAiPackageApplyAuthorization,
} from "@/lib/ai/audit";
import { checkAiAskQuota } from "@/lib/ai/rate-limit";

type StoredRow = Record<string, unknown>;

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    const normalizedSql = this.sql.toLowerCase();
    if (!normalizedSql.includes("from security_rate_limit_events")) return null;
    const [scope, keyHash, since] = this.values;
    const count = this.database.rateLimitEvents.filter((event) =>
      event.scope === scope
      && event.key_hash === keyHash
      && String(event.occurred_at) >= String(since)
    ).length;
    return { count } as R;
  }

  async all<R>() {
    return { results: [] as R[] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("delete from security_rate_limit_events")) {
      const [now] = this.values;
      this.database.rateLimitEvents = this.database.rateLimitEvents.filter((event) =>
        String(event.expires_at) >= String(now)
      );
      return { success: true, meta: { changes: 1 } };
    }
    if (normalizedSql.includes("insert into security_rate_limit_events")) {
      const [id, scope, keyHash, metadataJson, occurredAt, expiresAt] = this.values;
      this.database.rateLimitEvents.push({
        expires_at: String(expiresAt),
        id: String(id),
        key_hash: String(keyHash),
        metadata_json: String(metadataJson),
        occurred_at: String(occurredAt),
        scope: String(scope),
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (normalizedSql.includes("insert into ai_action_runs")) {
      const [
        id,
        runId,
        workspaceId,
        actorUserId,
        mode,
        status,
        provider,
        model,
        providerResponseId,
        requestMessageHash,
        routeContextHash,
        providerSendCategoriesJson,
        redactionStatus,
        usageJson,
        errorClass,
        blockedReason,
        requestHost,
        userAgentHash,
        metadataJson,
        startedAt,
        completedAt,
        createdAt,
      ] = this.values;
      this.database.actionRuns.set(String(runId), {
        actor_user_id: String(actorUserId),
        blocked_reason: blockedReason,
        completed_at: completedAt,
        created_at: String(createdAt),
        error_class: errorClass,
        id: String(id),
        metadata_json: String(metadataJson),
        mode: String(mode),
        model: String(model),
        provider: String(provider),
        provider_response_id: providerResponseId,
        provider_send_categories_json: String(providerSendCategoriesJson),
        redaction_status: String(redactionStatus),
        request_host: requestHost,
        request_message_hash: requestMessageHash,
        route_context_hash: routeContextHash,
        run_id: String(runId),
        started_at: String(startedAt),
        status: String(status),
        usage_json: String(usageJson),
        user_agent_hash: userAgentHash,
        workspace_id: String(workspaceId),
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (normalizedSql.includes("insert into ai_data_access_events")) {
      const [
        id,
        runId,
        toolCallId,
        workspaceId,
        actorUserId,
        eventName,
        sourceTablesJson,
        targetProjectId,
        targetEstimateId,
        targetNodeId,
        targetRowId,
        filterHash,
        rowCount,
        blockedAttempt,
        blockedReason,
        redactionStatus,
        safeSummary,
        createdAt,
      ] = this.values;
      this.database.dataAccessEvents.push({
        actor_user_id: String(actorUserId),
        blocked_attempt: blockedAttempt,
        blocked_reason: blockedReason,
        created_at: String(createdAt),
        event_name: String(eventName),
        filter_hash: filterHash,
        id: String(id),
        redaction_status: String(redactionStatus),
        row_count: rowCount,
        run_id: String(runId),
        safe_summary: String(safeSummary),
        source_tables_json: String(sourceTablesJson),
        target_estimate_id: targetEstimateId,
        target_node_id: targetNodeId,
        target_project_id: targetProjectId,
        target_row_id: targetRowId,
        tool_call_id: toolCallId,
        workspace_id: String(workspaceId),
      });
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  actionRuns = new Map<string, StoredRow>();
  dataAccessEvents: StoredRow[] = [];
  rateLimitEvents: StoredRow[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

beforeEach(() => {
  d1Mocks.getCloudflareD1Database.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AI audit event builder", () => {
  it("builds metadata-only Ask audit rows for authenticated workspace users", () => {
    const event = buildAiAskAuditEvent({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "better-auth",
      },
      message: "Create a project for a 3 bedroom house",
      routeContext: { projectName: "Lewis Residence", estimateName: "Initial Estimate" },
      status: "completed",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      dataAccessEvents: [
        {
          eventName: "ask_count_accessible_projects",
          sourceTables: ["projects"],
          filter: { scope: "current_workspace", operation: "count" },
          rowCount: 4,
          safeSummary: "Read exact accessible project count for Ask Flip.",
        },
      ],
      requestHost: "localhost:3000",
      userAgent: "vitest",
    });

    expect(event).not.toBeNull();
    expect(event?.actionRun).toMatchObject({
      run_id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "33333333-3333-4333-8333-333333333333",
      actor_user_id: "22222222-2222-4222-8222-222222222222",
      mode: "ask",
      status: "completed",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      redaction_status: "metadata_only",
      provider_send_categories: ["user_message", "bounded_route_context", "server_scoped_read_context"],
    });
    expect(event?.actionRun.request_message_hash).toMatch(/^sha256:/);
    expect(event?.actionRun.request_message_hash).not.toContain("3 bedroom");
    expect(event?.actionRun.route_context_hash).toBe(hashAiAuditValue({ projectName: "Lewis Residence", estimateName: "Initial Estimate" }));
    expect(event?.actionRun.user_agent_hash).toMatch(/^sha256:/);
    expect(event?.dataAccessEvent).toMatchObject({
      event_name: "ask_count_accessible_projects",
      source_tables: ["projects"],
      row_count: 4,
      blocked_attempt: false,
      redaction_status: "metadata_only",
    });
    expect(event?.dataAccessEvents).toHaveLength(1);
  });

  it("does not create database audit rows for local dev bypass pseudo users", () => {
    const event = buildAiAskAuditEvent({
      userContext: {
        userId: "dev-auth-bypass",
        email: "dev@example.com",
        workspaceId: null,
        authMode: "dev-bypass",
      },
      message: "Hello",
      routeContext: {},
      status: "completed",
      provider: "deepseek",
    });

    expect(event).toBeNull();
  });

  it("requires D1 audit storage and upserts Ask action runs by run_id", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await recordAiAskAuditEvent({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "better-auth",
      },
      message: "How many projects do I have?",
      routeContext: { projectName: "Lewis Residence" },
      status: "started",
      provider: "deepseek",
      model: "deepseek-pending",
      dataAccessEvents: [
        {
          eventName: "ask_count_accessible_projects",
          sourceTables: ["projects"],
          filter: { scope: "current_workspace", operation: "count" },
          rowCount: 3,
          safeSummary: "Read exact accessible project count for Ask Flip.",
        },
      ],
    });

    expect(database.actionRuns.get("11111111-1111-4111-8111-111111111111")).toMatchObject({
      status: "started",
      provider_send_categories_json: JSON.stringify(["user_message", "bounded_route_context", "server_scoped_read_context"]),
    });
    expect(database.dataAccessEvents).toHaveLength(1);
    expect(database.dataAccessEvents[0]).toMatchObject({
      event_name: "ask_count_accessible_projects",
      row_count: 3,
    });
  });

  it("fails closed when Ask audit D1 storage is unavailable", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);

    await expect(recordAiAskAuditEvent({
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "better-auth",
      },
      message: "Hello",
      routeContext: {},
      status: "started",
      provider: "deepseek",
    })).rejects.toThrow("AI Ask audit D1 database is not configured.");
  });

  it("records package Apply authorization rows through D1", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actionRun = buildAiPackageActionRun({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "better-auth",
      },
      mode: "apply",
      status: "started",
      provider: "app-command",
      model: "server-authorization",
      providerSendCategories: [
        "server_verified_draft_token",
        "explicit_user_confirmation",
        "validated_draft_hash",
      ],
      metadata: {
        draftHash: "sha256:draft",
        draftTokenVerified: true,
        serverConfirmation: true,
      },
    });
    if (!actionRun) throw new Error("Expected authenticated package action run.");

    await recordAiPackageApplyAuthorization(actionRun);

    expect(database.actionRuns.get("11111111-1111-4111-8111-111111111111")).toMatchObject({
      mode: "apply",
      provider: "app-command",
      status: "started",
    });
  });

  it("fails closed when package Apply authorization cannot reach D1", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);
    const actionRun = buildAiPackageActionRun({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "better-auth",
      },
      mode: "apply",
      status: "started",
      provider: "app-command",
      providerSendCategories: ["server_verified_draft_token"],
    });
    if (!actionRun) throw new Error("Expected authenticated package action run.");

    await expect(recordAiPackageApplyAuthorization(actionRun)).rejects.toThrow(
      "AI package Apply authorization audit D1 database is not configured.",
    );
    await expect(recordAiPackageApplyAuthorization(null)).rejects.toThrow(
      "Package Apply authorization requires a Cloudflare D1 workspace audit context.",
    );
  });

  it("stores AI Ask quota events in D1 and blocks after the minute limit", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const request = new Request("https://example.com/api/ai/ask", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const userContext = {
      userId: "22222222-2222-4222-8222-222222222222",
      email: "user@example.com",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      authMode: "better-auth" as const,
    };

    for (let index = 0; index < 10; index += 1) {
      await expect(checkAiAskQuota({ request, userContext })).resolves.toEqual({ allowed: true });
    }
    await expect(checkAiAskQuota({ request, userContext })).resolves.toEqual({
      allowed: false,
      message: "AI quota exceeded. Please wait 60 seconds.",
      retryAfter: 60,
    });
    expect(database.rateLimitEvents).toHaveLength(11);
  });
});
