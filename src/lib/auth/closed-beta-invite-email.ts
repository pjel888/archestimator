import "server-only";

import { sendCloudflareEmail, type CloudflareEmailClientOptions } from "@/lib/email/cloudflare-email-client";
import { sendEmail } from "@/lib/email/transactional-email-client";

const BETA_SIGN_IN_PATH = "/login";
const DEFAULT_ORIGIN = "https://archestimator.com";
const SUPPORT_MAILBOX = "support@archestimator.com";
const FOUNDER_REPLY_TO = "philip@archestimator.com";
const EMAIL_LOGO_PATH = "/email/archestimator-mark.png";

export type ClosedBetaInviteEmailResult =
  | { ok: true; messageId?: string; mocked?: boolean }
  | { ok: false; error: string; code?: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resolveClosedBetaInviteOrigin(env: Record<string, string | undefined> = process.env) {
  const candidates = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.BETTER_AUTH_URL,
    ...(env.ARCHESTIMATOR_ALLOWED_APP_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // ignore invalid origins
    }
  }

  return DEFAULT_ORIGIN;
}

/**
 * Closed-beta invitation copy for allowlist adds.
 * Keep this founder-voiced, free of em dashes, and safe for HTML email clients.
 */
export function buildClosedBetaInviteEmailContent({
  email,
  origin = DEFAULT_ORIGIN,
}: {
  email: string;
  origin?: string;
}) {
  const signInUrl = new URL(BETA_SIGN_IN_PATH, origin).toString();
  const logoUrl = new URL(EMAIL_LOGO_PATH, origin).toString();
  const siteUrl = new URL("/", origin).toString();
  const subject = "You're invited to the Archestimator closed beta";

  const text = [
    "Hi,",
    "",
    "You're invited to the Archestimator closed beta. Thank you for being willing to try it while it is still early.",
    "",
    "Archestimator is a workspace for building itemized construction estimates and client-ready proposals. The product is still a work in progress, so you may hit rough edges. That is expected, and honest feedback is exactly what helps right now.",
    "",
    "It would mean the world to me to hear your thoughts, ideas, friction points, and anything that feels off or missing. Reply to this email, or reach me on Instagram, Messenger, or whatever channel is easiest for you.",
    "",
    `Sign in here: ${signInUrl}`,
    "",
    "Use the Google account this invite was sent to. If anything blocks you, just reply and I will help.",
    "",
    "Looking forward to what you notice.",
    "",
    "Philip Lewis",
    "Founder, Archestimator",
    FOUNDER_REPLY_TO,
    siteUrl,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;color:#3D3D3D;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    You're invited to the Archestimator closed beta. Your feedback would mean the world.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;margin:0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #F2F2F2;border-radius:3px;">
          <tr>
            <td style="padding:28px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="Archestimator" style="display:block;border:0;outline:none;text-decoration:none;" />
              <p style="margin:14px 0 0 0;font-size:11px;line-height:14px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:#7F7F7F;">Closed beta invitation</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;line-height:28px;font-weight:500;color:#3D3D3D;">You're invited to Archestimator</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#3D3D3D;">
              <p style="margin:0 0 16px 0;">Hi,</p>
              <p style="margin:0 0 16px 0;">You're invited to the Archestimator closed beta. Thank you for being willing to try it while it is still early.</p>
              <p style="margin:0 0 16px 0;">Archestimator is a workspace for building itemized construction estimates and client-ready proposals. The product is still a work in progress, so you may hit rough edges. That is expected, and honest feedback is exactly what helps right now.</p>
              <p style="margin:0 0 16px 0;"><strong style="font-weight:500;color:#3D3D3D;">It would mean the world to me</strong> to hear your thoughts, ideas, friction points, and anything that feels off or missing. Reply to this email, or reach me on Instagram, Messenger, or whatever channel is easiest for you.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:3px;background:#292929;">
                    <a href="${escapeHtml(signInUrl)}" style="display:inline-block;padding:12px 18px;font-size:14px;line-height:18px;font-weight:500;color:#FFFFFF;text-decoration:none;">Sign in to Archestimator</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#3D3D3D;">
              <p style="margin:0 0 16px 0;font-size:13px;line-height:20px;color:#5D5D5D;">Use the Google account this invite was sent to (${escapeHtml(email)}). If anything blocks you, just reply and I will help.</p>
              <p style="margin:0 0 16px 0;">Looking forward to what you notice.</p>
              <p style="margin:0;font-size:15px;line-height:22px;color:#3D3D3D;">
                Philip Lewis<br />
                <span style="color:#7F7F7F;font-size:13px;line-height:18px;">Founder, Archestimator</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #F2F2F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#7F7F7F;">
              <p style="margin:0 0 6px 0;">
                <a href="${escapeHtml(signInUrl)}" style="color:#5D5D5D;text-decoration:underline;">${escapeHtml(signInUrl)}</a>
              </p>
              <p style="margin:0;">
                Questions anytime:
                <a href="mailto:${FOUNDER_REPLY_TO}" style="color:#5D5D5D;text-decoration:underline;">${FOUNDER_REPLY_TO}</a>
                or
                <a href="mailto:${SUPPORT_MAILBOX}" style="color:#5D5D5D;text-decoration:underline;">${SUPPORT_MAILBOX}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html, signInUrl, logoUrl };
}

export async function sendClosedBetaInviteEmail({
  email,
  origin,
  cloudflareOptions,
}: {
  email: string;
  origin?: string;
  cloudflareOptions?: CloudflareEmailClientOptions;
}): Promise<ClosedBetaInviteEmailResult> {
  const content = buildClosedBetaInviteEmailContent({
    email,
    origin: origin ?? resolveClosedBetaInviteOrigin(
      (cloudflareOptions?.env as Record<string, string | undefined> | undefined) ?? process.env,
    ),
  });

  const payload = {
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    // Keep the configured Cloudflare From identity for deliverability; route replies to Philip.
    replyTo: FOUNDER_REPLY_TO,
  };

  if (cloudflareOptions) {
    return sendCloudflareEmail(payload, cloudflareOptions);
  }

  return sendEmail({
    ...payload,
    tags: [
      { name: "archestimator_surface", value: "closed_beta" },
      { name: "closed_beta_event", value: "invite_email" },
    ],
  });
}
