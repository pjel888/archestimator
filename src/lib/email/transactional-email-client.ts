/**
 * Cloudflare-native transactional email wrapper.
 *
 * The public API stays intentionally small so publication, collaboration, and
 * auth flows can keep graceful degradation while the provider underneath is now
 * Cloudflare Email Service only.
 */

import { sendCloudflareEmail } from "@/lib/email/cloudflare-email-client";
import { emitLogRecord } from "@/lib/observability/logger";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult =
  | { ok: true; messageId?: string; mocked?: boolean }
  | { ok: false; error: string; code?: string };

export type EmailDeliveryConfig = {
  enabled: boolean;
  provider: "cloudflare-email";
  cloudflareFrom: string;
  cloudflareReplyTo: string;
  configured: boolean;
};

const isTestEnv = process.env.NODE_ENV === "test";

export function isEmailDeliveryEnabled(env: NodeJS.ProcessEnv = process.env) {
  const normalized = env.ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "enabled";
}

function isCloudflareEmailProvider(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "cloudflare" || normalized === "cloudflare-email" || normalized === "cloudflare-email-service";
}

export function readEmailDeliveryConfig(env: NodeJS.ProcessEnv = process.env): EmailDeliveryConfig {
  const enabled = isEmailDeliveryEnabled(env);
  const providerSelected = isCloudflareEmailProvider(env.ARCHESTIMATOR_EMAIL_PROVIDER);
  const cloudflareFrom = env.CLOUDFLARE_EMAIL_FROM?.trim() ?? "";
  const cloudflareReplyTo = env.CLOUDFLARE_EMAIL_REPLY_TO?.trim() ?? "";
  return {
    enabled,
    provider: "cloudflare-email",
    cloudflareFrom,
    cloudflareReplyTo,
    configured: enabled && providerSelected && Boolean(cloudflareFrom),
  };
}

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

function isEmailCircuitOpen(now: number) {
  if (now < emailCircuitOpenUntil) return true;
  if (emailCircuitOpenUntil > 0 && now >= emailCircuitOpenUntil) {
    emailCircuitOpenUntil = 0;
    emailFailTimes = [];
    emailAttemptTimes = [];
  }
  return false;
}

function logEmailDispatchGuardrail(input: SendEmailInput, code: "CIRCUIT_OPEN" | "EMAIL_NOT_CONFIGURED", context: Record<string, unknown> = {}) {
  emitLogRecord({
    level: "error",
    event: "transactional_email_dispatch_error",
    message: "Transactional email dispatch failed before provider send.",
    action: "send_transactional_email",
    context: {
      route: "email/transactional-email-client",
      error_code: code,
      subject_length: input.subject.length,
      ...context,
    },
  });
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const now = Date.now();
  recordEmailAttempt(now);

  if (isEmailCircuitOpen(now)) {
    const errMsg = "Email dispatch temporarily paused due to high failure rate (circuit open).";
    logEmailDispatchGuardrail(input, "CIRCUIT_OPEN");
    return { ok: false, error: errMsg, code: "CIRCUIT_OPEN" };
  }

  const config = readEmailDeliveryConfig();
  if (!config.configured) {
    if (isTestEnv) return { ok: true, mocked: true };
    logEmailDispatchGuardrail(input, "EMAIL_NOT_CONFIGURED", {
      missing: {
        emailDeliveryEnabled: !config.enabled,
        cloudflareFrom: !config.cloudflareFrom,
      },
    });
    return {
      ok: false,
      error: "Cloudflare Email Service delivery is not configured for this environment.",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }

  const result = await sendCloudflareEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.from,
    replyTo: input.replyTo,
    headers: input.headers,
  });
  if (!result.ok) recordEmailFail(Date.now());
  return result;
}

export const TransactionalEmailClient = {
  send: sendEmail,
};

const TransactionalEmailDefaultClient = { sendEmail };

export default TransactionalEmailDefaultClient;
