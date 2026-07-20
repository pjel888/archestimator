import { emitLogRecord } from "@/lib/observability/logger";

export type EmailAttachmentInput = {
  filename: string;
  content: ArrayBuffer | Uint8Array | string;
  type?: string;
  disposition?: "attachment" | "inline";
  contentId?: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachmentInput[];
};

export type SendEmailResult =
  | { ok: true; messageId?: string; mocked?: boolean }
  | { ok: false; error: string; code?: string };

type EmailAddress = {
  email: string;
  name?: string;
};

type CloudflareSendEmailBinding = {
  send: (message: {
    to: string | EmailAddress | Array<string | EmailAddress>;
    from: string | EmailAddress;
    subject: string;
    replyTo?: string | EmailAddress;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    attachments?: Array<{
      filename: string;
      content: ArrayBuffer | Uint8Array | string;
      type?: string;
      disposition?: "attachment" | "inline";
      contentId?: string;
    }>;
  }) => Promise<{
    messageId?: string;
  }>;
};

type CloudflareEmailEnv = Record<string, unknown> & {
  EMAIL?: CloudflareSendEmailBinding;
  ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED?: string;
  ARCHESTIMATOR_EMAIL_PROVIDER?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  CLOUDFLARE_EMAIL_REPLY_TO?: string;
};

type CloudflareEmailContext = {
  env?: CloudflareEmailEnv;
};

export type CloudflareEmailClientOptions = {
  binding?: CloudflareSendEmailBinding | null;
  context?: CloudflareEmailContext | null;
  env?: Record<string, string | undefined>;
};

const isTestEnv = process.env.NODE_ENV === "test";

function normalizeEnabled(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "enabled";
}

function readContextString(context: CloudflareEmailContext | null | undefined, name: keyof CloudflareEmailEnv) {
  const value = context?.env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRuntimeString(
  context: CloudflareEmailContext | null | undefined,
  env: Record<string, string | undefined>,
  name: keyof CloudflareEmailEnv,
) {
  return readContextString(context, name) ?? env[name]?.trim() ?? process.env[name]?.trim() ?? undefined;
}

function normalizeProvider(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isCloudflareEmailProvider(provider: string) {
  return provider === "cloudflare" || provider === "cloudflare-email" || provider === "cloudflare-email-service";
}

async function loadCloudflareEmailContext(): Promise<CloudflareEmailContext | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return await getCloudflareContext({ async: true }) as unknown as CloudflareEmailContext;
  } catch {
    return null;
  }
}

function resolveBinding(options: CloudflareEmailClientOptions, context: CloudflareEmailContext | null) {
  return options.binding ?? context?.env?.EMAIL ?? null;
}

function readCloudflareEmailConfig(options: CloudflareEmailClientOptions, context: CloudflareEmailContext | null) {
  const env = options.env ?? process.env;
  const provider = normalizeProvider(readRuntimeString(context, env, "ARCHESTIMATOR_EMAIL_PROVIDER"));
  const from = readRuntimeString(context, env, "CLOUDFLARE_EMAIL_FROM") ?? "";
  const replyTo = readRuntimeString(context, env, "CLOUDFLARE_EMAIL_REPLY_TO");
  return {
    enabled: normalizeEnabled(readRuntimeString(context, env, "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED")),
    provider,
    cloudflareProviderSelected: isCloudflareEmailProvider(provider),
    from,
    replyTo,
    configured: normalizeEnabled(readRuntimeString(context, env, "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED"))
      && isCloudflareEmailProvider(provider)
      && Boolean(from),
  };
}

function describeCloudflareEmailError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    };
  }
  return {
    message: "Unexpected Cloudflare Email Service send failure.",
    code: undefined,
  };
}

export async function sendCloudflareEmail(
  input: SendEmailInput,
  options: CloudflareEmailClientOptions = {},
): Promise<SendEmailResult> {
  const context = options.context === undefined ? await loadCloudflareEmailContext() : options.context;
  const binding = resolveBinding(options, context);
  const config = readCloudflareEmailConfig(options, context);
  const from = input.from?.trim() || config.from;
  const replyTo = input.replyTo?.trim() || config.replyTo;

  if (!config.enabled || !config.cloudflareProviderSelected || !from) {
    return {
      ok: false,
      error: "Cloudflare Email Service delivery is not configured for this environment.",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }

  if (!binding) {
    if (isTestEnv) return { ok: true, mocked: true };
    return {
      ok: false,
      error: "Cloudflare Email Service binding EMAIL is not available.",
      code: "EMAIL_BINDING_MISSING",
    };
  }

  try {
    const response = await binding.send({
      to: input.to,
      from,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(replyTo ? { replyTo } : {}),
      ...(input.headers && Object.keys(input.headers).length > 0 ? { headers: input.headers } : {}),
      ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
    });
    return {
      ok: true,
      messageId: response.messageId,
    };
  } catch (error) {
    const { message, code } = describeCloudflareEmailError(error);
    const errorCode = code ?? "CLOUDFLARE_EMAIL_SEND_ERROR";
    emitLogRecord({
      level: "error",
      event: "cloudflare_email_send_error",
      message: "Cloudflare Email Service send failed.",
      action: "send_cloudflare_email",
      context: {
        route: "email/cloudflare-email-client",
        error_code: errorCode,
        subject_length: input.subject.length,
      },
    });
    return { ok: false, error: message, code: errorCode };
  }
}
