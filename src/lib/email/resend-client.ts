/**
 * Resend email client wrapper for Shared Link Overhaul (V2).
 *
 * - Thin, typed wrapper around the Resend SDK.
 * - Production: uses RESEND_API_KEY when present and NODE_ENV !== "test".
 * - Test / no-key: automatic mock fallback (no network, always succeeds for tests).
 * - Never throws on send failure in normal paths; returns structured result.
 * - No secrets or keys in source.
 *
 * Used by P4+ for recipient transactional emails. Error handling supports
 * graceful degradation (link generation succeeds even if email fails).
 */

import { Resend } from "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string; // optional override; defaults to env-configured or safe sender
};

export type SendEmailResult =
  | { ok: true; messageId?: string; mocked?: boolean }
  | { ok: false; error: string; code?: string };

const isTestEnv = process.env.NODE_ENV === "test";
const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim());

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  if (isTestEnv || !hasResendKey) {
    return null;
  }
  if (!resendInstance) {
    // Safe: key read only from process.env at runtime
    resendInstance = new Resend(process.env.RESEND_API_KEY!.trim());
  }
  return resendInstance;
}

/**
 * Send a transactional email.
 * In test or missing key: returns mocked success (no-op).
 * On real failure: returns structured error (never throws to caller).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    // Mock fallback for tests and pre-configured environments
    return {
      ok: true,
      mocked: true,
      // messageId omitted to signal non-real dispatch
    };
  }

  const from = input.from ?? process.env.RESEND_FROM ?? "Archestimator <no-reply@archestimator.com>";

  try {
    const response = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (response.error) {
      return {
        ok: false,
        error: response.error.message ?? "Unknown Resend error",
        code: response.error.name,
      };
    }

    return {
      ok: true,
      messageId: response.data?.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected email send failure";
    // Structured log (no PII or secrets)
    console.error("[resend-client] send failure", {
      toCount: Array.isArray(input.to) ? input.to.length : 1,
      subject: input.subject.slice(0, 60),
      error: message,
    });
    return { ok: false, error: message };
  }
}

/**
 * Optional named client for advanced use (e.g. future batch or template helpers).
 * P0 keeps surface minimal.
 */
export const ResendEmailClient = {
  send: sendEmail,
};

export default { sendEmail };