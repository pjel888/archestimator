import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseJsMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => supabaseJsMocks);

import {
  buildAiAskAuditEvent,
  buildAiPackageActionRun,
  hashAiAuditValue,
  recordAiPackageApplyAuthorization,
} from "@/lib/ai/audit";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  supabaseJsMocks.createClient.mockReset();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("AI audit event builder", () => {
  it("builds metadata-only Ask audit rows for authenticated workspace users", () => {
    const event = buildAiAskAuditEvent({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "supabase",
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

  it("records package Apply authorization rows through the audit client", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ insert }));
    supabaseJsMocks.createClient.mockReturnValue({ from });
    const actionRun = buildAiPackageActionRun({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "supabase",
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

    expect(supabaseJsMocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      expect.objectContaining({
        auth: { autoRefreshToken: false, persistSession: false },
      }),
    );
    expect(from).toHaveBeenCalledWith("ai_action_runs");
    expect(insert).toHaveBeenCalledWith(actionRun);
  });

  it("fails closed when package Apply authorization cannot create an audit client", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const actionRun = buildAiPackageActionRun({
      runId: "11111111-1111-4111-8111-111111111111",
      userContext: {
        userId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.com",
        workspaceId: "33333333-3333-4333-8333-333333333333",
        authMode: "supabase",
      },
      mode: "apply",
      status: "started",
      provider: "app-command",
      providerSendCategories: ["server_verified_draft_token"],
    });
    if (!actionRun) throw new Error("Expected authenticated package action run.");

    await expect(recordAiPackageApplyAuthorization(actionRun)).rejects.toThrow(
      "AI package Apply authorization audit client is not configured.",
    );
    await expect(recordAiPackageApplyAuthorization(null)).rejects.toThrow(
      "Package Apply authorization requires a Supabase workspace audit context.",
    );
  });
});
