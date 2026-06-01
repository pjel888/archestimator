import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readEmailDeliveryConfig } from "@/lib/email/resend-client";

const artifact = readFileSync(
  ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-email-readiness-blocked-2026-06-02.md",
  "utf8",
);
const envExample = readFileSync(".env.example", "utf8");
const emailClient = readFileSync("src/lib/email/resend-client.ts", "utf8");
const resendWebhookRoute = readFileSync("src/app/api/webhooks/resend/route.ts", "utf8");
const publicationActions = readFileSync("src/lib/publication/actions.ts", "utf8");
const collaborationActions = readFileSync("src/lib/collaboration/actions.ts", "utf8");

describe("Resend launch readiness docs", () => {
  it("keeps required Resend env keys documented without treating placeholders as proof", () => {
    expect(envExample).toContain("RESEND_API_KEY=");
    expect(envExample).toContain("RESEND_FROM=");
    expect(envExample).toContain("RESEND_REPLY_TO=support@archestimator.com");
    expect(envExample).toContain("RESEND_WEBHOOK_SECRET=");
    expect(artifact).toContain("Vercel returned `No Environment Variables found`");
    expect(artifact).toContain("RESEND_FROM=missing_or_empty");
    expect(artifact).toContain("RESEND_REPLY_TO=missing_or_empty");
    expect(artifact).toContain("RESEND_WEBHOOK_SECRET=missing_or_empty");
  });

  it("keeps source proof tied to real email and webhook behavior", () => {
    expect(emailClient).toContain("RESEND_API_KEY");
    expect(emailClient).toContain("EMAIL_NOT_CONFIGURED");
    expect(emailClient).toContain("mocked: true");
    expect(emailClient).toContain("RESEND_FROM");
    expect(emailClient).not.toContain("Archestimator <no-reply@archestimator.com>");
    expect(resendWebhookRoute).toContain("RESEND_WEBHOOK_SECRET");
    expect(resendWebhookRoute).toContain("status: 503");
    expect(publicationActions).toContain("sendEmail");
    expect(collaborationActions).toContain("sendEmail");
  });

  it("fails closed when delivery config lacks a key or sender outside test mocks", () => {
    expect(readEmailDeliveryConfig({ RESEND_API_KEY: "", RESEND_FROM: "" }).configured).toBe(false);
    expect(readEmailDeliveryConfig({ RESEND_API_KEY: "re_test", RESEND_FROM: "" }).configured).toBe(false);
    expect(
      readEmailDeliveryConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "Archestimator <support@archestimator.com>",
      }).configured,
    ).toBe(true);
  });

  it("keeps the launch meaning blocked until delivery and webhook proof exist", () => {
    expect(artifact).toContain("negative/blocked provider readiness evidence");
    expect(artifact).toContain("Visible shared-link recipient email, owner digest, collaboration invite, and resend flows must not be considered launch-ready");
    expect(artifact).toContain("Vercel env values, verified sender/domain/DNS, a configured webhook secret, and real delivery/bounce/open webhook evidence");
  });
});
