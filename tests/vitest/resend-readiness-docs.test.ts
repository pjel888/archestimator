import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readEmailDeliveryConfig } from "@/lib/email/resend-client";

const artifact = readFileSync(
  ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-email-readiness-blocked-2026-06-02.md",
  "utf8",
);
const readinessArtifact = JSON.parse(readFileSync(
  ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-readiness-b0e04f4-2026-06-02.json",
  "utf8",
));
const sendTestArtifact = JSON.parse(readFileSync(
  ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-send-test-domain-unverified-2026-06-04T1151Z.json",
  "utf8",
));
const envExample = readFileSync(".env.example", "utf8");
const emailClient = readFileSync("src/lib/email/resend-client.ts", "utf8");
const resendWebhookRoute = readFileSync("src/app/api/webhooks/resend/route.ts", "utf8");
const publicationActions = readFileSync("src/lib/publication/actions.ts", "utf8");
const collaborationActions = readFileSync("src/lib/collaboration/actions.ts", "utf8");

describe("Resend launch readiness docs", () => {
  it("keeps required Resend env keys documented without treating placeholders as proof", () => {
    expect(envExample).toContain("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false");
    expect(envExample).toContain("RESEND_API_KEY=");
    expect(envExample).toContain("RESEND_FROM=");
    expect(envExample).toContain("RESEND_REPLY_TO=support@archestimator.com");
    expect(envExample).toContain("RESEND_WEBHOOK_SECRET=");
    expect(artifact).toContain("Vercel returned `No Environment Variables found`");
    expect(artifact).toContain("RESEND_FROM=missing_or_empty");
    expect(artifact).toContain("RESEND_REPLY_TO=missing_or_empty");
    expect(artifact).toContain("RESEND_WEBHOOK_SECRET=missing_or_empty");
    expect(readinessArtifact.resendReady).toBe(false);
    expect(readinessArtifact.localRuntimeEnv.present).toEqual(["RESEND_API_KEY"]);
    expect(readinessArtifact.localRuntimeEnv.missing).toContain("RESEND_FROM");
    expect(readinessArtifact.vercelEnv.missing).toContain("RESEND_WEBHOOK_SECRET");
    expect(JSON.stringify(readinessArtifact)).not.toMatch(/re_/);
  });

  it("keeps source proof tied to real email and webhook behavior", () => {
    expect(emailClient).toContain("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED");
    expect(emailClient).toContain("RESEND_API_KEY");
    expect(emailClient).toContain("EMAIL_NOT_CONFIGURED");
    expect(emailClient).toContain("mocked: true");
    expect(emailClient).toContain("RESEND_FROM");
    expect(emailClient).not.toContain("Archestimator <no-reply@archestimator.com>");
    expect(resendWebhookRoute).toContain("RESEND_WEBHOOK_SECRET");
    expect(resendWebhookRoute).toContain("status: 503");
    expect(publicationActions).toContain("sendEmail");
    expect(publicationActions).toContain("readSharedLinkEmailDeliveryReadiness");
    expect(collaborationActions).toContain("sendEmail");
    expect(artifact).toContain("recipient entry, send, and resend controls");
  });

  it("fails closed when delivery config lacks a key or sender outside test mocks", () => {
    expect(readEmailDeliveryConfig({ RESEND_API_KEY: "", RESEND_FROM: "" }).configured).toBe(false);
    expect(readEmailDeliveryConfig({ RESEND_API_KEY: "re_test", RESEND_FROM: "" }).configured).toBe(false);
    expect(
      readEmailDeliveryConfig({
        ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED: "false",
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "Archestimator <support@archestimator.com>",
      }).configured,
    ).toBe(false);
    expect(
      readEmailDeliveryConfig({
        ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED: "true",
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "Archestimator <support@archestimator.com>",
      }).configured,
    ).toBe(true);
  });

  it("keeps the launch meaning blocked until delivery and webhook proof exist", () => {
    expect(artifact).toContain("negative/blocked provider readiness evidence");
    expect(artifact).toContain("recipient email controls are disabled");
    expect(artifact).toContain("must not be considered launch-ready or re-enabled");
    expect(artifact).toContain("Vercel env values, verified sender/domain/DNS, a configured webhook secret, and real delivery/bounce/open webhook evidence");
    expect(readinessArtifact.note).toContain("does not prove sender/domain verification");
    expect(sendTestArtifact.sendAttempt.sent).toBe(false);
    expect(sendTestArtifact.sendAttempt.status).toBe(403);
    expect(sendTestArtifact.sendAttempt.error).toContain("domain is not verified");
    expect(sendTestArtifact.resendDashboardObserved.dkimStatus).toBe("Verified");
    expect(sendTestArtifact.resendDashboardObserved.missingRecords).toEqual([
      {
        type: "MX",
        host: "send.contact",
        value: "feedback-smtp.ap-northeast-1.amazonses.com",
        ttl: "Auto",
        priority: 10,
        status: "Failed",
      },
      {
        type: "TXT",
        host: "send.contact",
        value: "v=spf1 include:amazonses.com ~all",
        ttl: "Auto",
        status: "Failed",
      },
    ]);
    expect(sendTestArtifact.betaImpact.manualInviteFallbackReady).toBe(true);
  });
});
