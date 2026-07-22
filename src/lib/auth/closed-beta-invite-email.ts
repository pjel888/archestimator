import "server-only";

import { sendCloudflareEmail, type CloudflareEmailClientOptions } from "@/lib/email/cloudflare-email-client";
import { sendEmail } from "@/lib/email/transactional-email-client";

const BETA_SIGN_IN_PATH = "/login";
const DEFAULT_ORIGIN = "https://archestimator.com";
const LOGO_PATH = "/favicon_io/apple-touch-icon.png";
const SUPPORT_EMAIL = "support@archestimator.com";
const BRAND_ORANGE = "#F24405";
const INK = "#292929";
const MUTED = "#5D5D5D";
const HAIRLINE = "#E8E8E8";
const SURFACE = "#FAFAFA";

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

export function buildClosedBetaInviteEmailContent({
  email,
  origin = DEFAULT_ORIGIN,
}: {
  email: string;
  origin?: string;
}) {
  const signInUrl = new URL(BETA_SIGN_IN_PATH, origin).toString();
  const logoUrl = new URL(LOGO_PATH, origin).toString();
  const supportMailto = `mailto:${SUPPORT_EMAIL}`;
  const subject = "You're invited to the Archestimator closed beta";

  const text = [
    "Hi,",
    "",
    "I'm Philip, and I'm inviting you into the Archestimator closed beta.",
    "",
    "Archestimator is still early. You will hit rough edges, and that is expected. What I care about most is hearing how it fits (or does not fit) the way you actually estimate, quote, and propose.",
    "",
    "It would mean the world to me to get your thoughts, ideas, and honest reactions. Tell me through any channel that works for you: Instagram, Messenger, email, or whatever you prefer. I read everything.",
    "",
    `Sign in here: ${signInUrl}`,
    "",
    `If anything blocks you, reply to this email or write ${SUPPORT_EMAIL}.`,
    "",
    "Thank you for helping me shape this.",
    "",
    "Philip",
    "Founder, Archestimator",
  ].join("\n");

  const safeSignInUrl = escapeHtml(signInUrl);
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeSupportMailto = escapeHtml(supportMailto);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);
  const safeRecipient = escapeHtml(email);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${SURFACE};color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SURFACE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:8px;">
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <img src="${safeLogoUrl}" width="48" height="48" alt="Archestimator" style="display:block;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${INK};">
              You're invited to the closed beta
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
              <p style="margin:0 0 14px 0;">Hi,</p>
              <p style="margin:0 0 14px 0;">I'm Philip, and I'm inviting you into the Archestimator closed beta.</p>
              <p style="margin:0 0 14px 0;">Archestimator is still early. You will hit rough edges, and that is expected. What I care about most is hearing how it fits (or does not fit) the way you actually estimate, quote, and propose.</p>
              <p style="margin:0 0 14px 0;">It would mean the world to me to get your thoughts, ideas, and honest reactions. Tell me through any channel that works for you: Instagram, Messenger, email, or whatever you prefer. I read everything.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;">
              <a href="${safeSignInUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1;padding:14px 18px;text-decoration:none;border-radius:6px;">
                Sign in to Archestimator
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:${MUTED};">
              <p style="margin:0 0 14px 0;">Or open this link: <a href="${safeSignInUrl}" style="color:${BRAND_ORANGE};">${safeSignInUrl}</a></p>
              <p style="margin:0 0 14px 0;">If anything blocks you, reply to this email or write <a href="${safeSupportMailto}" style="color:${BRAND_ORANGE};">${safeSupportEmail}</a>.</p>
              <p style="margin:0 0 4px 0;color:${INK};">Thank you for helping me shape this.</p>
              <p style="margin:16px 0 0 0;color:${INK};">
                Philip<br />
                <span style="color:${MUTED};">Founder, Archestimator</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};border-top:1px solid ${HAIRLINE};">
              Sent to ${safeRecipient}. You received this because you were invited to the Archestimator closed beta.
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
