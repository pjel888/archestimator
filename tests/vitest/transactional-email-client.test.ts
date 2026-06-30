import { afterEach, describe, expect, it, vi } from "vitest";

const emailMocks = vi.hoisted(() => ({
  sendCloudflareEmail: vi.fn(),
}));

vi.mock("@/lib/email/cloudflare-email-client", () => emailMocks);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("transactional email client provider selection", () => {
  it("routes existing sendEmail callers through Cloudflare Email Service when selected", async () => {
    emailMocks.sendCloudflareEmail.mockResolvedValue({ ok: true, messageId: "cf-email-1" });
    vi.stubEnv("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED", "true");
    vi.stubEnv("ARCHESTIMATOR_EMAIL_PROVIDER", "cloudflare-email");
    vi.stubEnv("CLOUDFLARE_EMAIL_FROM", "Archestimator <noreply@archestimator.com>");
    vi.stubEnv("CLOUDFLARE_EMAIL_REPLY_TO", "support@archestimator.com");

    const { readEmailDeliveryConfig, sendEmail } = await import("@/lib/email/transactional-email-client");
    const config = readEmailDeliveryConfig();
    const result = await sendEmail({
      to: "client@example.com",
      subject: "Project Estimate",
      text: "View your estimate.",
      html: "<p>View your estimate.</p>",
      tags: [{ name: "archestimator_surface", value: "shared_link" }],
    });

    expect(config).toMatchObject({
      configured: true,
      provider: "cloudflare-email",
      cloudflareFrom: "Archestimator <noreply@archestimator.com>",
    });
    expect(result).toEqual({ ok: true, messageId: "cf-email-1" });
    expect(emailMocks.sendCloudflareEmail).toHaveBeenCalledWith({
      to: "client@example.com",
      subject: "Project Estimate",
      text: "View your estimate.",
      html: "<p>View your estimate.</p>",
      from: undefined,
      replyTo: undefined,
    });
  });

  it("keeps Cloudflare email disabled until a sender is configured", async () => {
    vi.stubEnv("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED", "true");
    vi.stubEnv("ARCHESTIMATOR_EMAIL_PROVIDER", "cloudflare-email");
    vi.stubEnv("CLOUDFLARE_EMAIL_FROM", "");

    const { readEmailDeliveryConfig } = await import("@/lib/email/transactional-email-client");

    expect(readEmailDeliveryConfig()).toMatchObject({
      configured: false,
      provider: "cloudflare-email",
    });
  });
});
