import { describe, expect, it } from "vitest";

import { buildAiAskAuditEvent, hashAiAuditValue } from "@/lib/ai/audit";

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
      provider_send_categories: ["user_message", "bounded_route_context"],
    });
    expect(event?.actionRun.request_message_hash).toMatch(/^sha256:/);
    expect(event?.actionRun.request_message_hash).not.toContain("3 bedroom");
    expect(event?.actionRun.route_context_hash).toBe(hashAiAuditValue({ projectName: "Lewis Residence", estimateName: "Initial Estimate" }));
    expect(event?.actionRun.user_agent_hash).toMatch(/^sha256:/);
    expect(event?.dataAccessEvent).toMatchObject({
      event_name: "ask_route_context",
      source_tables: [],
      row_count: 0,
      blocked_attempt: false,
      redaction_status: "metadata_only",
    });
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
});
