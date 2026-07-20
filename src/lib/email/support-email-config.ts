/**
 * Server/Worker-safe support mailbox configuration.
 * Fail-closed: inbound processing stays disabled unless explicitly enabled.
 */

export const DEFAULT_SUPPORT_MAILBOX = "support@archestimator.com";
export const DEFAULT_SUPPORT_FROM_NAME = "Archestimator Support";

export const SUPPORT_MAX_MESSAGE_BYTES_DEFAULT = 1_500_000;
export const SUPPORT_MAX_ATTACHMENT_BYTES_DEFAULT = 5_000_000;
export const SUPPORT_MAX_ATTACHMENTS_DEFAULT = 10;
export const SUPPORT_MAX_TOTAL_ATTACHMENT_BYTES_DEFAULT = 10_000_000;

type EnvLike = Record<string, unknown> | NodeJS.ProcessEnv;

function readString(env: EnvLike, name: string): string | undefined {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeEnabled(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "enabled";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseAliasList(value: string | undefined, fallback: string[]): string[] {
  const source = value?.trim() ? value : fallback.join(",");
  const aliases = source
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return aliases.length > 0 ? [...new Set(aliases)] : fallback.map((alias) => alias.toLowerCase());
}

export type SupportEmailConfig = {
  inboundEnabled: boolean;
  supportMailbox: string;
  inboundAliases: string[];
  supportFrom: string;
  supportFromName: string;
  forwardEnabled: boolean;
  forwardTo: string | null;
  maxMessageBytes: number;
  maxAttachmentBytes: number;
  maxAttachments: number;
  maxTotalAttachmentBytes: number;
};

export function readSupportEmailConfig(env: EnvLike = process.env): SupportEmailConfig {
  const supportMailbox = (readString(env, "ARCHESTIMATOR_SUPPORT_MAILBOX") ?? DEFAULT_SUPPORT_MAILBOX).toLowerCase();
  const supportFrom =
    (readString(env, "ARCHESTIMATOR_SUPPORT_EMAIL_FROM") ?? supportMailbox).toLowerCase();
  const inboundAliases = parseAliasList(readString(env, "ARCHESTIMATOR_INBOUND_EMAIL_ALIASES"), [supportMailbox]);
  const forwardTo = readString(env, "ARCHESTIMATOR_SUPPORT_FORWARD_TO")?.toLowerCase() ?? null;

  return {
    inboundEnabled: normalizeEnabled(readString(env, "ARCHESTIMATOR_INBOUND_EMAIL_ENABLED")),
    supportMailbox,
    inboundAliases,
    supportFrom,
    supportFromName: readString(env, "ARCHESTIMATOR_SUPPORT_EMAIL_FROM_NAME") ?? DEFAULT_SUPPORT_FROM_NAME,
    forwardEnabled: normalizeEnabled(readString(env, "ARCHESTIMATOR_SUPPORT_FORWARD_ENABLED")) && Boolean(forwardTo),
    forwardTo,
    maxMessageBytes: parsePositiveInt(readString(env, "ARCHESTIMATOR_SUPPORT_MAX_MESSAGE_BYTES"), SUPPORT_MAX_MESSAGE_BYTES_DEFAULT),
    maxAttachmentBytes: parsePositiveInt(
      readString(env, "ARCHESTIMATOR_SUPPORT_MAX_ATTACHMENT_BYTES"),
      SUPPORT_MAX_ATTACHMENT_BYTES_DEFAULT,
    ),
    maxAttachments: parsePositiveInt(readString(env, "ARCHESTIMATOR_SUPPORT_MAX_ATTACHMENTS"), SUPPORT_MAX_ATTACHMENTS_DEFAULT),
    maxTotalAttachmentBytes: parsePositiveInt(
      readString(env, "ARCHESTIMATOR_SUPPORT_MAX_TOTAL_ATTACHMENT_BYTES"),
      SUPPORT_MAX_TOTAL_ATTACHMENT_BYTES_DEFAULT,
    ),
  };
}

export function isInboundAliasAllowed(mailbox: string, config: SupportEmailConfig) {
  const normalized = mailbox.trim().toLowerCase();
  if (!normalized) return false;
  return config.inboundAliases.some((alias) => alias === normalized || stripPlusAddress(normalized) === alias);
}

/** Strip plus-tag for allowlist comparison: support+token@domain → support@domain */
export function stripPlusAddress(address: string) {
  const at = address.indexOf("@");
  if (at <= 0) return address.toLowerCase();
  const local = address.slice(0, at);
  const domain = address.slice(at + 1).toLowerCase();
  const plus = local.indexOf("+");
  const baseLocal = plus >= 0 ? local.slice(0, plus) : local;
  return `${baseLocal.toLowerCase()}@${domain}`;
}

export function extractPlusRoutingToken(address: string): string | null {
  const at = address.indexOf("@");
  if (at <= 0) return null;
  const local = address.slice(0, at);
  const plus = local.indexOf("+");
  if (plus < 0 || plus === local.length - 1) return null;
  const token = local.slice(plus + 1).trim().toLowerCase();
  return token || null;
}

export function buildPlusAddress(mailbox: string, routingToken: string) {
  const at = mailbox.indexOf("@");
  if (at <= 0) return mailbox;
  const local = mailbox.slice(0, at);
  const domain = mailbox.slice(at + 1);
  const baseLocal = local.includes("+") ? local.slice(0, local.indexOf("+")) : local;
  return `${baseLocal}+${routingToken}@${domain}`;
}

export function supportOutboundConfigured(env: EnvLike = process.env) {
  const config = readSupportEmailConfig(env);
  const deliveryEnabled = normalizeEnabled(readString(env, "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED"));
  const provider = (readString(env, "ARCHESTIMATOR_EMAIL_PROVIDER") ?? "").toLowerCase();
  const cloudflareProvider =
    provider === "cloudflare" || provider === "cloudflare-email" || provider === "cloudflare-email-service";
  return deliveryEnabled && cloudflareProvider && Boolean(config.supportFrom);
}
