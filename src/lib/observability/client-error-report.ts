"use client";

type ClientErrorReportOptions = {
  route?: string;
  source: string;
};

export type ClientErrorReportPayload = {
  digest?: string;
  message?: string;
  name?: string;
  path?: string;
  route?: string;
  source: string;
  stack?: string;
};

export function sanitizeClientErrorText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  return value
    .slice(0, maxLength)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/\/Users\/[^\s)'"`]+/g, "[LOCAL_PATH]")
    .replace(/\bprivate_[A-Za-z0-9_]+\b/gi, "[REDACTED_IDENTIFIER]")
    .replace(/([?&](?:password|token|api_key|secret)=)([^&#\\\s]*)/gi, "$1[REDACTED]")
    .replace(/\b(?:password|token|api_key|secret|service_role_key|supabase_service_role_key)=[^\s,;&\\]+/gi, (match) => {
      const [key] = match.split("=");
      return `${key}=[REDACTED]`;
    })
    .replace(/[\r\n\t]/g, " ");
}

function readClientPath() {
  if (typeof window === "undefined") return undefined;
  return sanitizeClientErrorText(`${window.location.pathname}${window.location.search}`, 500);
}

export function buildClientErrorPayload(
  error: Error & { digest?: string },
  options: ClientErrorReportOptions,
): ClientErrorReportPayload {
  return {
    digest: sanitizeClientErrorText(error.digest, 160),
    message: sanitizeClientErrorText(error.message, 2000),
    name: sanitizeClientErrorText(error.name, 120),
    path: readClientPath(),
    route: sanitizeClientErrorText(options.route, 160),
    source: sanitizeClientErrorText(options.source, 120) ?? "client-error",
    stack: sanitizeClientErrorText(error.stack, 6000),
  };
}

export function postClientErrorReport(payload: ClientErrorReportPayload) {
  return fetch("/api/internal/client-error", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
