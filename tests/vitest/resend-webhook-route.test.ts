import { beforeEach, describe, expect, it, vi } from "vitest";

import { RESEND_WEBHOOK_MAX_BODY_BYTES } from "@/lib/email/resend-webhook-route-constants";

const webhookMocks = vi.hoisted(() => ({
  recordResendEmailWebhookEvent: vi.fn(async () => ({ ok: true, matched: true })),
  verifyResendWebhookPayload: vi.fn(() => ({
    created_at: "2026-06-04T00:00:00.000Z",
    data: {
      created_at: "2026-06-04T00:00:00.000Z",
      email_id: "email_123",
      from: "Archestimator <noreply@contact.archestimator.com>",
      subject: "Shared estimate",
      to: ["client@example.com"],
    },
    type: "email.delivered",
  })),
}));

vi.mock("@/lib/email/resend-webhooks", () => webhookMocks);

function request(body: string, headers: HeadersInit = {}) {
  return new Request("https://archestimator.test/api/webhooks/resend", {
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_123",
      "svix-signature": "v1,test",
      "svix-timestamp": "1780548600",
      ...headers,
    },
    method: "POST",
  });
}

describe("Resend webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_test");
    webhookMocks.recordResendEmailWebhookEvent.mockClear();
    webhookMocks.verifyResendWebhookPayload.mockClear();
  });

  it("rejects oversized webhook payloads before signature verification or persistence", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const body = "x".repeat(RESEND_WEBHOOK_MAX_BODY_BYTES + 1);

    const response = await POST(request(body, { "content-length": String(body.length) }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "Webhook payload is too large." });
    expect(webhookMocks.verifyResendWebhookPayload).not.toHaveBeenCalled();
    expect(webhookMocks.recordResendEmailWebhookEvent).not.toHaveBeenCalled();
  });

  it("still verifies and records webhook payloads within the body limit", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const body = JSON.stringify({ type: "email.delivered" });

    const response = await POST(request(body, { "content-length": String(body.length) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, matched: true });
    expect(webhookMocks.verifyResendWebhookPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: body,
        webhookSecret: "whsec_test",
      }),
    );
    expect(webhookMocks.recordResendEmailWebhookEvent).toHaveBeenCalledWith(expect.any(Object), "msg_123");
  });
});
