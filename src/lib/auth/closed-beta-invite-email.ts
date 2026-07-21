import "server-only";

import { sendCloudflareEmail, type CloudflareEmailClientOptions } from "@/lib/email/cloudflare-email-client";
import { sendEmail } from "@/lib/email/transactional-email-client";

const BETA_SIGN_IN_PATH = "/login";
const DEFAULT_ORIGIN = "https://archestimator.com";

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
  const subject = "You're invited to the Archestimator beta";
  const text = [
    "Hi,",
    "",
    "Thank you for joining the Archestimator beta. The product is still a work in progress, so you may hit rough edges — that's expected, and your feedback helps a lot.",
    "",
    `Sign in here: ${signInUrl}`,
    "",
    "Thanks again for testing with us.",
    "",
    "— Philip",
  ].join("\n");

  const html =
    `<!doctype html><html><body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#292929;line-height:1.5;">`
    + `<p>Hi,</p>`
    + `<p>Thank you for joining the Archestimator beta. The product is still a work in progress, so you may hit rough edges — that's expected, and your feedback helps a lot.</p>`
    + `<p><a href="${escapeHtml(signInUrl)}" style="display:inline-block;background:#292929;color:#fff;padding:10px 14px;text-decoration:none;border-radius:4px;">Sign in to Archestimator</a></p>`
    + `<p>Thanks again for testing with us.</p>`
    + `<p>— Philip</p>`
    + `</body></html>`;

  return { subject, text, html, signInUrl };
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
