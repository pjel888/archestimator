import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationText = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join("supabase/migrations", file), "utf8"))
  .join("\n");

function readOptional(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("Resend shared-link delivery webhooks", () => {
  it("adds durable recipient columns for Resend delivery reconciliation", () => {
    const types = readFileSync("src/lib/supabase/types.ts", "utf8");

    expect(migrationText).toContain("resend_email_id text");
    expect(migrationText).toContain("resend_last_event_id text");
    expect(migrationText).toContain("resend_last_event_type text");
    expect(migrationText).toContain("resend_last_event_at timestamptz");
    expect(migrationText).toContain("resend_delivery_metadata jsonb");
    expect(migrationText).toContain("shared_link_recipients_resend_email_id_idx");
    expect(types).toContain("resend_email_id: string | null");
    expect(types).toContain("resend_last_event_type: string | null");
    expect(types).toContain("resend_delivery_metadata: Json");
  });

  it("verifies Resend webhooks from the raw request body before updating recipients", () => {
    const routeText = readOptional("src/app/api/webhooks/resend/route.ts");
    const webhookLib = readOptional("src/lib/email/resend-webhooks.ts");

    expect(routeText).toContain("req.text()");
    expect(routeText).not.toContain("req.json()");
    expect(routeText).toContain("RESEND_WEBHOOK_SECRET");
    expect(routeText).toContain("verifyResendWebhookPayload");
    expect(routeText).toContain("recordResendEmailWebhookEvent");
    expect(webhookLib).toContain("resend.webhooks.verify");
    expect(webhookLib).toContain("svix-id");
    expect(webhookLib).toContain("svix-timestamp");
    expect(webhookLib).toContain("svix-signature");
  });

  it("tags recipient emails and stores the returned Resend email id", () => {
    const emailClient = readFileSync("src/lib/email/resend-client.ts", "utf8");
    const actions = readFileSync("src/lib/publication/actions.ts", "utf8");

    expect(emailClient).toContain("tags?:");
    expect(actions).toContain("shared_link_recipient_id");
    expect(actions).toContain("resend_email_id");
    expect(actions).toContain("sendResult.messageId");
  });

  it("maps Resend email events to recipient delivery status updates", async () => {
    const modulePath = "../../src/lib/email/resend-webhooks";
    const mod = await import(modulePath).catch(() => null);
    expect(mod).toBeTruthy();
    if (!mod) return;

    const opened = mod.resolveResendRecipientDeliveryUpdate(
      {
        type: "email.opened",
        created_at: "2026-05-31T12:00:00.000Z",
        data: {
          created_at: "2026-05-31T11:59:59.000Z",
          email_id: "resend-email-1",
          from: "Archestimator <no-reply@example.com>",
          to: ["receiver@example.com"],
          subject: "Project Estimate",
          tags: {
            shared_link_recipient_id: "11111111-1111-4111-8111-111111111111",
          },
        },
      },
      "msg_1",
    );

    expect(opened).toMatchObject({
      deliveryStatus: "opened",
      emailId: "resend-email-1",
      eventId: "msg_1",
      eventType: "email.opened",
      lastOpenedAt: "2026-05-31T12:00:00.000Z",
      recipientId: "11111111-1111-4111-8111-111111111111",
    });

    const bounced = mod.resolveResendRecipientDeliveryUpdate(
      {
        type: "email.failed",
        created_at: "2026-05-31T12:01:00.000Z",
        data: {
          created_at: "2026-05-31T12:00:59.000Z",
          email_id: "resend-email-2",
          failed: { reason: "reached_daily_quota" },
          from: "Archestimator <no-reply@example.com>",
          to: ["receiver@example.com"],
          subject: "Project Estimate",
        },
      },
      "msg_2",
    );
    expect(bounced).toMatchObject({ deliveryStatus: "bounced", emailId: "resend-email-2" });

    expect(
      mod.resolveResendRecipientDeliveryUpdate(
        {
          type: "contact.created",
          created_at: "2026-05-31T12:02:00.000Z",
          data: {
            audience_id: "audience",
            created_at: "2026-05-31T12:02:00.000Z",
            email: "receiver@example.com",
            id: "contact",
            segment_ids: [],
            unsubscribed: false,
            updated_at: "2026-05-31T12:02:00.000Z",
          },
        },
        "msg_3",
      ),
    ).toBeNull();
  });
});
