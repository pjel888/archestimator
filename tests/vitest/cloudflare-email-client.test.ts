import { describe, expect, it, vi } from "vitest";

import { sendCloudflareEmail } from "@/lib/email/cloudflare-email-client";

const CLOUDFLARE_EMAIL_ENV = {
  ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED: "true",
  ARCHESTIMATOR_EMAIL_PROVIDER: "cloudflare-email",
  CLOUDFLARE_EMAIL_FROM: "Archestimator <noreply@archestimator.com>",
  CLOUDFLARE_EMAIL_REPLY_TO: "support@archestimator.com",
};

describe("Cloudflare Email Service client", () => {
  it("sends through the Worker EMAIL binding without requiring Resend", async () => {
    const send = vi.fn(async () => ({ messageId: "cf-email-1" }));

    const result = await sendCloudflareEmail(
      {
        to: "owner@example.com",
        subject: "Sign in to Archestimator",
        text: "Use this secure link.",
        html: "<p>Use this secure link.</p>",
      },
      {
        binding: { send },
        env: CLOUDFLARE_EMAIL_ENV,
        context: null,
      },
    );

    expect(result).toEqual({ ok: true, messageId: "cf-email-1" });
    expect(send).toHaveBeenCalledWith({
      to: "owner@example.com",
      from: "Archestimator <noreply@archestimator.com>",
      replyTo: "support@archestimator.com",
      subject: "Sign in to Archestimator",
      text: "Use this secure link.",
      html: "<p>Use this secure link.</p>",
    });
  });

  it("fails closed when Cloudflare email delivery is not explicitly selected", async () => {
    const send = vi.fn(async () => ({ messageId: "should-not-send" }));

    const result = await sendCloudflareEmail(
      {
        to: "owner@example.com",
        subject: "Sign in to Archestimator",
        text: "Use this secure link.",
      },
      {
        binding: { send },
        env: {
          ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED: "true",
          ARCHESTIMATOR_EMAIL_PROVIDER: "resend",
          CLOUDFLARE_EMAIL_FROM: "noreply@archestimator.com",
        },
        context: null,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "EMAIL_NOT_CONFIGURED",
    });
    expect(send).not.toHaveBeenCalled();
  });
});
