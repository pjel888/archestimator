/**
 * Resend email client wrapper for Shared Link Overhaul (V2).
 *
 * - Thin, typed wrapper around the Resend SDK.
 * - Production-like runtime: requires RESEND_API_KEY plus an explicit sender.
 * - Test runtime: automatic mock fallback (no network, always succeeds for tests).
 * - Never throws on send failure in normal paths; returns structured result.
 * - No secrets or keys in source.
 *
 * Used by P4+ for recipient transactional emails. Error handling supports
 * graceful degradation (link generation succeeds even if email fails).
 */

import { Resend, type CreateEmailOptions } from "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string; // optional override; otherwise uses RESEND_FROM
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult =
  | { ok: true; messageId?: string; mocked?: boolean }
  | { ok: false; error: string; code?: string };

const isTestEnv = process.env.NODE_ENV === "test";

let resendInstance: Resend | null = null;
let resendInstanceApiKey: string | null = null;

export type EmailDeliveryConfig = {
  apiKey: string;
  from: string;
  configured: boolean;
};

export function readEmailDeliveryConfig(env: NodeJS.ProcessEnv = process.env): EmailDeliveryConfig {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.RESEND_FROM?.trim() ?? "";
  return {
    apiKey,
    from,
    configured: Boolean(apiKey && from),
  };
}

function getResendClient(apiKey: string): Resend | null {
  if (isTestEnv || !apiKey) {
    return null;
  }
  if (!resendInstance || resendInstanceApiKey !== apiKey) {
    // Safe: key read only from process.env at runtime
    resendInstance = new Resend(apiKey);
    resendInstanceApiKey = apiKey;
  }
  return resendInstance;
}

// P12: circuit breaker for email dispatch (>50% failure over window -> 10min pause)
// Additive wrapper around existing sendEmail (happy path unchanged, best-effort callers unaffected until open).
const EMAIL_CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const EMAIL_CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;
const EMAIL_CIRCUIT_MIN_SAMPLES = 4;
const EMAIL_CIRCUIT_THRESHOLD = 0.5;

let emailAttemptTimes: number[] = [];
let emailFailTimes: number[] = [];
let emailCircuitOpenUntil = 0;

function pruneEmailCircuit(now: number) {
  emailAttemptTimes = emailAttemptTimes.filter((t) => now - t < EMAIL_CIRCUIT_WINDOW_MS);
  emailFailTimes = emailFailTimes.filter((t) => now - t < EMAIL_CIRCUIT_WINDOW_MS);
}

function recordEmailAttempt(now: number) {
  pruneEmailCircuit(now);
  emailAttemptTimes.push(now);
}

function recordEmailFail(now: number) {
  pruneEmailCircuit(now);
  emailFailTimes.push(now);
  const fails = emailFailTimes.length;
  const attempts = Math.max(emailAttemptTimes.length, 1);
  if (attempts >= EMAIL_CIRCUIT_MIN_SAMPLES && fails / attempts > EMAIL_CIRCUIT_THRESHOLD) {
    emailCircuitOpenUntil = now + EMAIL_CIRCUIT_COOLDOWN_MS;
  }
}

function isEmailCircuitOpen(now: number): boolean {
  if (now < emailCircuitOpenUntil) return true;
  if (emailCircuitOpenUntil > 0 && now >= emailCircuitOpenUntil) {
    emailCircuitOpenUntil = 0;
    emailFailTimes = [];
    emailAttemptTimes = [];
  }
  return false;
}

/**
 * Send a transactional email.
 * In test: returns mocked success when no real client is configured.
 * Outside test: fails closed when Resend key or sender config is missing.
 * On real failure: returns structured error (never throws to caller).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const now = Date.now();
  recordEmailAttempt(now);

  // P12 circuit: fast-fail if open (protects all P4/P8 email paths: digests, recipient links)
  if (isEmailCircuitOpen(now)) {
    const errMsg = "Email dispatch temporarily paused due to high failure rate (circuit open).";
    console.error({ level: "error", route: "email/resend-client", errorCode: "CIRCUIT_OPEN", ipHash: "n/a", ts: new Date().toISOString(), subject: input.subject.slice(0, 60) });
    return { ok: false, error: errMsg, code: "CIRCUIT_OPEN" };
  }

  const config = readEmailDeliveryConfig();
  const from = input.from?.trim() || config.from;
  const client = getResendClient(config.apiKey);

  if (!client) {
    if (!isTestEnv) {
      console.error({
        level: "error",
        route: "email/resend-client",
        errorCode: "EMAIL_NOT_CONFIGURED",
        ipHash: "n/a",
        ts: new Date().toISOString(),
        subject: input.subject.slice(0, 60),
        missing: {
          resendApiKey: !config.apiKey,
          resendFrom: !from,
        },
      });
      return {
        ok: false,
        error: "Email delivery is not configured for this environment.",
        code: "EMAIL_NOT_CONFIGURED",
      };
    }

    // Mock fallback is restricted to tests.
    return {
      ok: true,
      mocked: true,
      // messageId omitted to signal non-real dispatch
    };
  }

  if (!from) {
    console.error({
      level: "error",
      route: "email/resend-client",
      errorCode: "EMAIL_NOT_CONFIGURED",
      ipHash: "n/a",
      ts: new Date().toISOString(),
      subject: input.subject.slice(0, 60),
      missing: {
        resendApiKey: false,
        resendFrom: true,
      },
    });
    return {
      ok: false,
      error: "Email delivery sender is not configured for this environment.",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }

  try {
    const response = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
    } as CreateEmailOptions);

    if (response.error) {
      recordEmailFail(Date.now());
      const errMsg = response.error.message ?? "Unknown Resend error";
      console.error({ level: "error", route: "email/resend-client", errorCode: "RESEND_ERROR", ipHash: "n/a", ts: new Date().toISOString(), subject: input.subject.slice(0, 60), code: response.error.name });
      return {
        ok: false,
        error: errMsg,
        code: response.error.name,
      };
    }

    return {
      ok: true,
      messageId: response.data?.id,
    };
  } catch (err: unknown) {
    recordEmailFail(Date.now());
    const message = err instanceof Error ? err.message : "Unexpected email send failure";
    // P12 enhanced structured log (additive fields + circuit awareness)
    console.error({ level: "error", route: "email/resend-client", errorCode: "SEND_EXCEPTION", ipHash: "n/a", ts: new Date().toISOString(), subject: input.subject.slice(0, 60), error: message });
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

const ResendEmailDefaultClient = { sendEmail };

export default ResendEmailDefaultClient;
